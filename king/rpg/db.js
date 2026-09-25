/**
 * king/rpg/db.js
 * Core Database Functions — Malvin-XD Sovereign RPG
 * All functions needed across all 350+ commands.
 * Uses $inc / $set atomically — safe across multiple bot deployments.
 */

const { GlobalPlayer, Guild, WorldEvent } = require('./model');
const { canLevelUp, calcMessageExp, xpRange } = require('./leveling');
const { getRank } = require('./ranks');
const { fancy } = require("../fancyFont");
let _worldMods = null; // lazy-loaded to avoid circular deps
let _roles = null;     // lazy-loaded roles module
let _pets   = null;    // lazy-loaded pets module
let _worlds = null;    // lazy-loaded worlds module

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — PLAYER CORE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get or create a player. Always use this before any operation.
 */
async function getPlayer(jid, botId = '') {
    return GlobalPlayer.getOrCreate(jid, botId);
}

/**
 * Get full player doc. Returns null if not found.
 */
async function fetchPlayer(jid) {
    return GlobalPlayer.findOne({ jid }).lean();
}

/**
 * Check if a player exists.
 */
async function playerExists(jid) {
    return !!(await GlobalPlayer.exists({ jid }));
}

/**
 * Update lastBotUsed tracking.
 */
async function updateLastBot(jid, botId) {
    return GlobalPlayer.updateOne({ jid }, { $set: { lastBotUsed: botId } });
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — EXP & LEVELING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Add EXP and gold atomically. Returns updated player.
 */
async function addExp(jid, expAmt, goldAmt = 0, botId = '') {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        {
            $inc: { exp: expAmt, gold: goldAmt },
            $set: { lastBotUsed: botId },
        },
        { new: true }
    );
}

/**
 * Process level-ups for a player. Returns { levelled, newLevel, diamondsEarned }.
 */
async function processLevelUps(jid) {
    let player        = await GlobalPlayer.findOne({ jid });
    let levelled      = false;
    let diamondsEarned = 0;

    while (player && canLevelUp(player)) {
        player = await GlobalPlayer.findOneAndUpdate(
            { jid },
            { $inc: { level: 1, diamonds: 5, statPoints: 1, skillPoints: 1 } },
            { new: true }
        );
        diamondsEarned += 5;
        levelled = true;
    }

    return { levelled, newLevel: player?.level ?? 1, diamondsEarned };
}

/**
 * Full EXP grant: add exp + process level-ups.
 * Returns { player, levelled, newLevel }.
 */
async function grantExp(jid, expAmt, goldAmt = 0, botId = '') {
    await getPlayer(jid, botId);
    const player = await addExp(jid, expAmt, goldAmt, botId);
    const { levelled, newLevel, diamondsEarned } = await processLevelUps(jid);
    return { player, levelled, newLevel, diamondsEarned };
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — CURRENCY
// ════════════════════════════════════════════════════════════════════════════

async function addGold(jid, amount) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $inc: { gold: amount } },
        { new: true }
    );
}

async function removeGold(jid, amount) {
    // Only deduct if player has enough
    return GlobalPlayer.findOneAndUpdate(
        { jid, gold: { $gte: amount } },
        { $inc: { gold: -amount } },
        { new: true }
    );
}

async function addDiamonds(jid, amount) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $inc: { diamonds: amount } },
        { new: true }
    );
}

async function removeDiamonds(jid, amount) {
    return GlobalPlayer.findOneAndUpdate(
        { jid, diamonds: { $gte: amount } },
        { $inc: { diamonds: -amount } },
        { new: true }
    );
}

async function addCrystals(jid, amount) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $inc: { crystals: amount } },
        { new: true }
    );
}

/**
 * Transfer gold between two players atomically.
 * Returns { success, reason }.
 */
async function transferGold(fromJid, toJid, amount) {
    if (amount <= 0) return { success: false, reason: 'Invalid amount.' };
    const sender = await GlobalPlayer.findOne({ jid: fromJid });
    if (!sender || sender.gold < amount) return { success: false, reason: 'Insufficient gold.' };
    await GlobalPlayer.updateOne({ jid: fromJid }, { $inc: { gold: -amount } });
    await GlobalPlayer.updateOne({ jid: toJid },   { $inc: { gold:  amount } });
    return { success: true };
}

/**
 * Deposit gold into bank.
 */
async function bankDeposit(jid, amount) {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player || player.gold < amount) return { success: false, reason: 'Insufficient gold.' };
    const space = player.bank.capacity - player.bank.balance;
    if (amount > space) return { success: false, reason: `Bank only has space for ${space} gold.` };
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        {
            $inc: { gold: -amount, 'bank.balance': amount },
            $set: { 'bank.lastDeposit': new Date() },
        },
        { new: true }
    );
}

/**
 * Withdraw gold from bank.
 */
async function bankWithdraw(jid, amount) {
    return GlobalPlayer.findOneAndUpdate(
        { jid, 'bank.balance': { $gte: amount } },
        { $inc: { gold: amount, 'bank.balance': -amount } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — STATS & SKILLS
// ════════════════════════════════════════════════════════════════════════════

const VALID_STATS  = ['str', 'int', 'luk', 'agi', 'vit', 'def'];
const VALID_SKILLS = ['slash', 'fireball', 'shadow_step', 'arise', 'domain', 'heal_pulse'];

async function upgradeStat(jid, stat) {
    if (!VALID_STATS.includes(stat)) return { success: false, reason: 'Invalid stat.' };
    return GlobalPlayer.findOneAndUpdate(
        { jid, statPoints: { $gte: 1 } },
        { $inc: { statPoints: -1, [`stats.${stat}`]: 1 } },
        { new: true }
    );
}

async function unlockSkill(jid, skill) {
    if (!VALID_SKILLS.includes(skill)) return { success: false, reason: 'Unknown skill.' };
    const player = await GlobalPlayer.findOne({ jid });
    if (!player) return { success: false, reason: 'Player not found.' };
    if (player.skills.includes(skill)) return { success: false, reason: 'Skill already unlocked.' };
    if (player.skillPoints < 1) return { success: false, reason: 'No skill points.' };
    return GlobalPlayer.findOneAndUpdate(
        { jid, skillPoints: { $gte: 1 } },
        { $inc: { skillPoints: -1 }, $push: { skills: skill } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — COMBAT & HP
// ════════════════════════════════════════════════════════════════════════════

async function updateHp(jid, delta) {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player) return null;
    const newHp = Math.min(player.combat.maxHp, Math.max(0, player.combat.hp + delta));
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { 'combat.hp': newHp } },
        { new: true }
    );
}

async function recoverHp(jid, amount) { return updateHp(jid, amount);  }
async function takeDamage(jid, amount) { return updateHp(jid, -amount); }

async function addKill(jid)  {
    return GlobalPlayer.updateOne({ jid }, { $inc: { 'combat.kills': 1 } });
}
async function addDeath(jid) {
    return GlobalPlayer.updateOne({ jid }, { $inc: { 'combat.deaths': 1 } });
}
async function addDungeonClear(jid) {
    return GlobalPlayer.updateOne({ jid }, { $inc: { 'combat.dungeonClears': 1 } });
}

/**
 * Recalculate and update max HP based on VIT stat.
 */
async function recalcMaxHp(jid) {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player) return null;
    const newMax = 100 + (player.stats.vit - 1) * 20;
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { 'combat.maxHp': newMax, 'combat.attack': 10 + (player.stats.str - 1) * 3 } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6 — KARMA & ALIGNMENT
// ════════════════════════════════════════════════════════════════════════════

async function addKarma(jid, amount) {
    const player = await GlobalPlayer.findOneAndUpdate(
        { jid },
        { $inc: { karma: amount } },
        { new: true }
    );
    if (!player) return null;
    // Recalculate alignment
    let alignment = 'Neutral';
    if (player.karma >= 500)       alignment = 'Light';
    else if (player.karma <= -500) alignment = 'Chaos';
    else if (player.karma < 0)     alignment = 'Dark';
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { alignment } },
        { new: true }
    );
}

async function setKarma(jid, value) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { karma: value } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7 — SURVIVAL (HUNGER / THIRST)
// ════════════════════════════════════════════════════════════════════════════

async function updateHunger(jid, delta) {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player) return null;
    const newVal = Math.min(100, Math.max(0, player.hunger + delta));
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { hunger: newVal } },
        { new: true }
    );
}

async function updateThirst(jid, delta) {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player) return null;
    const newVal = Math.min(100, Math.max(0, player.thirst + delta));
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { thirst: newVal } },
        { new: true }
    );
}

async function feed(jid, foodAmt, waterAmt = 0) {
    await updateHunger(jid, foodAmt);
    if (waterAmt) await updateThirst(jid, waterAmt);
    return GlobalPlayer.findOne({ jid });
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8 — LOCATION & TRAVEL
// ════════════════════════════════════════════════════════════════════════════

async function setLocation(jid, locationId) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { locationId } },
        { new: true }
    );
}

async function setHome(jid, locationId) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { homeLocation: locationId } },
        { new: true }
    );
}

async function addWaypoint(jid, locationId) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $addToSet: { waypoints: locationId } },
        { new: true }
    );
}

async function conquerTerritory(jid, territoryId) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $addToSet: { territoriesOwned: territoryId } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 9 — SHADOWS
// ════════════════════════════════════════════════════════════════════════════

async function addShadow(jid, shadow) {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player) return { success: false, reason: 'Player not found.' };
    if (player.shadowCount >= player.maxShadows) {
        return { success: false, reason: `Shadow army full (${player.maxShadows} max).` };
    }
    const updated = await GlobalPlayer.findOneAndUpdate(
        { jid },
        {
            $push: { shadows: shadow },
            $inc:  { shadowCount: 1 },
        },
        { new: true }
    );
    return { success: true, player: updated };
}

async function removeShadow(jid, shadowName) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        {
            $pull: { shadows: { name: shadowName } },
            $inc:  { shadowCount: -1 },
        },
        { new: true }
    );
}

async function expandShadowSlots(jid, amount = 1) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $inc: { maxShadows: amount } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 10 — INVENTORY
// ════════════════════════════════════════════════════════════════════════════

async function addItem(jid, itemType, amount = 1) {
    const validTypes = ['potions', 'food', 'water', 'keys', 'crystalOre', 'herbs', 'fish', 'wood', 'ore'];
    if (!validTypes.includes(itemType)) return { success: false, reason: 'Invalid item type.' };
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $inc: { [`inventory.${itemType}`]: amount } },
        { new: true }
    );
}

async function removeItem(jid, itemType, amount = 1) {
    return GlobalPlayer.findOneAndUpdate(
        { jid, [`inventory.${itemType}`]: { $gte: amount } },
        { $inc: { [`inventory.${itemType}`]: -amount } },
        { new: true }
    );
}

async function addWeapon(jid, weapon) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $push: { 'inventory.weapons': weapon } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 11 — SOCIAL
// ════════════════════════════════════════════════════════════════════════════

async function marry(jid, partnerJid, ring = null) {
    await GlobalPlayer.updateOne({ jid }, {
        $set: { 'marriage.partnerId': partnerJid, 'marriage.marriedAt': new Date(), 'marriage.ring': ring }
    });
    await GlobalPlayer.updateOne({ jid: partnerJid }, {
        $set: { 'marriage.partnerId': jid, 'marriage.marriedAt': new Date(), 'marriage.ring': ring }
    });
}

async function divorce(jid) {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player?.marriage?.partnerId) return { success: false, reason: 'Not married.' };
    const partnerId = player.marriage.partnerId;
    await GlobalPlayer.updateOne({ jid }, {
        $set: { 'marriage.partnerId': null, 'marriage.marriedAt': null, 'marriage.ring': null }
    });
    await GlobalPlayer.updateOne({ jid: partnerId }, {
        $set: { 'marriage.partnerId': null, 'marriage.marriedAt': null, 'marriage.ring': null }
    });
    return { success: true };
}

async function setMentor(jid, mentorJid) {
    await GlobalPlayer.updateOne({ jid }, { $set: { mentor: mentorJid } });
    await GlobalPlayer.updateOne({ jid: mentorJid }, { $addToSet: { apprentices: jid } });
}

async function setJob(jid, job) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { job } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 12 — ACHIEVEMENTS & TITLES
// ════════════════════════════════════════════════════════════════════════════

async function unlockAchievement(jid, achievement) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $addToSet: { 'achievements.list': achievement } },
        { new: true }
    );
}

async function unlockTitle(jid, title) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $addToSet: { 'achievements.titles': title } },
        { new: true }
    );
}

async function setActiveTitle(jid, title) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { 'achievements.activeTitle': title } },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 13 — COOLDOWNS (DB-persisted, survive restarts)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if a command cooldown has expired.
 * @param {object} player - full player doc
 * @param {string} cmd    - cooldown key (e.g. 'hunt')
 * @param {number} ms     - cooldown duration in milliseconds
 * @returns {{ onCooldown: boolean, remaining: number }}
 */
function checkCooldown(player, cmd, ms) {
    const last = player?.cooldowns?.[cmd];
    if (!last) return { onCooldown: false, remaining: 0 };
    const remaining = ms - (Date.now() - new Date(last).getTime());
    return remaining > 0
        ? { onCooldown: true, remaining }
        : { onCooldown: false, remaining: 0 };
}

/**
 * Set a cooldown timestamp in DB.
 */
async function setCooldown(jid, cmd) {
    return GlobalPlayer.updateOne(
        { jid },
        { $set: { [`cooldowns.${cmd}`]: new Date() } }
    );
}

/**
 * Format remaining cooldown into human-readable string.
 */
function formatCooldown(ms) {
    if (ms < 60000)  return `${Math.ceil(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.ceil(ms / 60000)}m`;
    return `${Math.ceil(ms / 3600000)}h`;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 14 — ADMIN / ORIGIN FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

async function shadowBan(jid, until = null) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { isBanned: true, bannedUntil: until } },
        { new: true }
    );
}

async function unban(jid) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { isBanned: false, bannedUntil: null } },
        { new: true }
    );
}

async function jailPlayer(jid, durationMs) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { isJailed: true, jailUntil: new Date(Date.now() + durationMs) } },
        { new: true }
    );
}

async function releaseJail(jid) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { isJailed: false, jailUntil: null } },
        { new: true }
    );
}

async function forceSetLevel(jid, level) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { level } },
        { new: true }
    );
}

async function forceSetGold(jid, gold) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { gold } },
        { new: true }
    );
}

async function giveDiamonds(jid, amount) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $inc: { diamonds: amount } },
        { new: true }
    );
}

async function setBloodline(jid, bloodline, bloodlineRank = 'F') {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { bloodline, bloodlineRank } },
        { new: true }
    );
}

async function triggerRebirth(jid) {
    // Reset level/exp but keep diamonds, rebirths counter, and bloodline
    const player = await GlobalPlayer.findOne({ jid });
    if (!player) return null;
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        {
            $set: {
                level: 1, exp: 0, gold: 1000,
                stats: { str: 1, int: 1, luk: 1, agi: 1, vit: 1, def: 1 },
                statPoints: 5, skillPoints: 0, // bonus points for rebirthing
                'combat.hp': 100, 'combat.maxHp': 100,
                awakened: false,
            },
            $inc: { rebirths: 1 },
        },
        { new: true }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 15 — GUILD FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

async function createGuild(masterId, name) {
    const existing = await Guild.findOne({ name });
    if (existing) return { success: false, reason: 'Guild name already taken.' };
    const guildId = `guild_${Date.now()}`;
    const guild = await Guild.create({ guildId, name, masterId, members: [masterId] });
    await GlobalPlayer.updateOne(
        { jid: masterId },
        { $set: { guild: { guildId, guildName: name, role: 'master', joinedAt: new Date() } } }
    );
    return { success: true, guild };
}

async function joinGuild(jid, guildId) {
    const guild = await Guild.findOneAndUpdate(
        { guildId },
        { $addToSet: { members: jid } },
        { new: true }
    );
    if (!guild) return { success: false, reason: 'Guild not found.' };
    await GlobalPlayer.updateOne(
        { jid },
        { $set: { guild: { guildId, guildName: guild.name, role: 'member', joinedAt: new Date() } } }
    );
    return { success: true, guild };
}

async function depositToGuildVault(jid, guildId, gold) {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player || player.gold < gold) return { success: false, reason: 'Insufficient gold.' };
    await GlobalPlayer.updateOne({ jid }, { $inc: { gold: -gold } });
    await Guild.updateOne({ guildId }, { $inc: { 'vault.gold': gold } });
    return { success: true };
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 16 — WORLD EVENTS
// ════════════════════════════════════════════════════════════════════════════

async function startWorldEvent(eventData, startedBy) {
    const eventId = `event_${Date.now()}`;
    return WorldEvent.create({ ...eventData, eventId, startedBy, active: true });
}

async function getActiveEvents() {
    return WorldEvent.find({ active: true }).lean();
}

async function endWorldEvent(eventId) {
    return WorldEvent.updateOne({ eventId }, { $set: { active: false } });
}

async function joinEvent(eventId, jid) {
    return WorldEvent.updateOne(
        { eventId },
        { $addToSet: { participants: jid } }
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 17 — LEADERBOARDS
// ════════════════════════════════════════════════════════════════════════════

async function getTopByLevel(limit = 10) {
    return GlobalPlayer.find({ isBanned: false })
        .sort({ level: -1, exp: -1 })
        .limit(limit)
        .lean();
}

async function getTopByGold(limit = 10) {
    return GlobalPlayer.find({ isBanned: false })
        .sort({ gold: -1 })
        .limit(limit)
        .lean();
}

async function getTopByKarma(limit = 10) {
    return GlobalPlayer.find({ isBanned: false })
        .sort({ karma: -1 })
        .limit(limit)
        .lean();
}

async function getTopByShadows(limit = 10) {
    return GlobalPlayer.find({ isBanned: false })
        .sort({ shadowCount: -1 })
        .limit(limit)
        .lean();
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 18 — STATUS FOOTER BUILDER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Returns the compact one-line status footer for grinding commands.
 * Format: [ +XP | +Gold | Karma: 0 | Hunger: 80% | Location: Demon Castle ]
 */
function buildFooter(expGained, goldGained, player) {
    const karma   = player.karma ?? 0;
    const hunger  = player.hunger ?? 100;
    const loc     = player.locationId?.replace(/_/g, ' ') ?? 'Unknown';
    return `[ +${expGained} XP | +${goldGained} Gold | Karma: ${karma} | Hunger: ${hunger}% | Location: ${loc} ]`;
}

/**
 * Solo Leveling blue-box ASCII border wrapper.
 * Usage: buildBox('HUNT RESULT', lines)
 */
function buildBox(title, lines = []) {
    const top    = `┌─⊷ ${title}`;
    const bottom = `└───────────`;
    const footer = `> _${fancy("malvin xd rpg", "smallcaps")}_ 💎`;

    // Clean up legacy formatting from line content
    const cleanLine = (line) => {
        // Convert old divider lines to short uniform divider
        if (/^\s*─+\s*$/.test(line)) return `▢ ───────`;
        // Strip leading spaces used for old ║ padding
        line = line.replace(/^\s{1,2}/, '');
        // Skip empty lines after strip
        if (!line.trim()) return null;
        return `▢ ${line}`;
    };

    const body = lines.map(cleanLine).filter(Boolean);

    return [top, ...body, bottom, footer].join('\n');
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 19 — RANK SCALING MULTIPLIERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get reward multiplier based on rank.
 * F = 1x ... S = 5x ... Origin = 20x
 */
function getRankMultiplier(level, jid = '') {
    const { rankId } = getRank(level, jid);
    const multipliers = {
        0:  1,   // F-Rank
        1:  1.5, // E-Rank
        2:  2,   // D-Rank
        3:  2.5, // C-Rank
        4:  3,   // B-Rank
        5:  4,   // A-Rank
        6:  5,   // S-Rank
        7:  7,   // SS-Rank
        8:  10,  // SSS-Rank
        9:  13,  // National
        10: 16,  // Monarch
        11: 20,  // Origin
    };
    return multipliers[rankId] ?? 1;
}

/**
 * Scale rewards by rank multiplier + world modifiers.
 * World modifiers are applied on top of rank scaling.
 * Uses cached world mods (refreshed by worldTime module every 5 min).
 */
async function scaleRewards(base, level, jid = '', worldMods = null, player = null) {
    const mult = getRankMultiplier(level, jid);

    // Lazy-load world modifiers
    let mods = worldMods;
    if (!mods) {
        try {
            if (!_worldMods) _worldMods = require('./worldTime');
            const result = await _worldMods.getWorldModifiers();
            mods = result;
        } catch (e) {
            mods = { expMultiplier: 1, goldMultiplier: 1 };
        }
    }

    // Apply world multipliers from current world
    let worldExpMult  = 1.0;
    let worldGoldMult = 1.0;
    if (player?.currentWorld && player.currentWorld !== 'aevoria') {
        try {
            if (!_worlds) _worlds = require('./worlds');
            const w = _worlds.getWorld(player.currentWorld);
            worldExpMult  = w.multipliers.exp  || 1.0;
            worldGoldMult = w.multipliers.gold || 1.0;
        } catch (e) {}
    }

    // Lazy-load role + pet passives
    let roleExpBonus  = 0;
    let roleGoldBonus = 0;
    if (player) {
        try {
            if (!_roles) _roles = require('./roles');
            const rolePassives = _roles.getPlayerPassives(player);
            roleExpBonus  = rolePassives.expBonus  || 0;
            roleGoldBonus = rolePassives.goldBonus || 0;
            if (mods.isBloodmoon && rolePassives.bloodmoonMultiplier > 1) {
                mods = {
                    ...mods,
                    expMultiplier:  mods.expMultiplier  * rolePassives.bloodmoonMultiplier,
                    goldMultiplier: mods.goldMultiplier * rolePassives.bloodmoonMultiplier,
                };
            }
        } catch (e) {}
        try {
            if (!_pets) _pets = require('./pets');
            const petPassives = _pets.getPetPassives(player.pets || []);
            roleExpBonus  += petPassives.expBonus  || 0;
            roleGoldBonus += petPassives.goldBonus || 0;
        } catch (e) {}
    }

    return {
        exp:  Math.floor(base.exp  * mult * (mods.expMultiplier  || 1) * (1 + roleExpBonus) * worldExpMult),
        gold: Math.floor(base.gold * mult * (mods.goldMultiplier || 1) * (1 + roleGoldBonus) * worldGoldMult),
        worldMods: mods,
    };
}

/**
 * Sync version — no world modifiers (for non-async contexts).
 */
function scaleRewardsSync(base, level, jid = '') {
    const mult = getRankMultiplier(level, jid);
    return {
        exp:  Math.floor(base.exp  * mult),
        gold: Math.floor(base.gold * mult),
    };
}

module.exports = {
    // Player core
    getPlayer, fetchPlayer, playerExists, updateLastBot,
    // EXP & leveling
    addExp, processLevelUps, grantExp,
    // Currency
    addGold, removeGold, addDiamonds, removeDiamonds, addCrystals,
    transferGold, bankDeposit, bankWithdraw,
    // Stats & skills
    upgradeStat, unlockSkill,
    // Combat
    updateHp, recoverHp, takeDamage, addKill, addDeath,
    addDungeonClear, recalcMaxHp,
    // Karma
    addKarma, setKarma,
    // Survival
    updateHunger, updateThirst, feed,
    // Location
    setLocation, setHome, addWaypoint, conquerTerritory,
    // Shadows
    addShadow, removeShadow, expandShadowSlots,
    // Inventory
    addItem, removeItem, addWeapon,
    // Social
    marry, divorce, setMentor, setJob,
    // Achievements
    unlockAchievement, unlockTitle, setActiveTitle,
    // Cooldowns
    checkCooldown, setCooldown, formatCooldown,
    // Admin
    shadowBan, unban, jailPlayer, releaseJail,
    forceSetLevel, forceSetGold, giveDiamonds,
    setBloodline, triggerRebirth,
    // Guilds
    createGuild, joinGuild, depositToGuildVault,
    // World events
    startWorldEvent, getActiveEvents, endWorldEvent, joinEvent,
    // Leaderboards
    getTopByLevel, getTopByGold, getTopByKarma, getTopByShadows,
    // UI helpers
    buildFooter, buildBox,
    // Rank scaling
    getRankMultiplier, scaleRewards,
};

// ════════════════════════════════════════════════════════════════════════════
// SECTION 20 — USERNAME / DISPLAY NAME HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get display name for any player.
 * Priority: username → fallbackName → JID number
 */
function getDisplayName(player, fallbackName = null) {
    return player?.username || fallbackName || player?.jid?.split('@')[0] || 'Unknown';
}

/**
 * Find a player by username, JID, or LID.
 */
async function findByIdentifier(identifier) {
    return GlobalPlayer.findByIdentifier(identifier);
}

/**
 * Set a player's LID mapping (call when bot receives a message with LID).
 */
async function setLid(jid, lid) {
    if (!lid) return;
    return GlobalPlayer.updateOne({ jid }, { $set: { lid } });
}

/**
 * Set username directly (used by admin .set-player etc).
 */
async function setUsername(jid, username) {
    return GlobalPlayer.findOneAndUpdate(
        { jid },
        { $set: { username } },
        { new: true }
    );
}

module.exports = {
    // Player core
    getPlayer, fetchPlayer, playerExists, updateLastBot,
    // EXP & leveling
    addExp, processLevelUps, grantExp,
    // Currency
    addGold, removeGold, addDiamonds, removeDiamonds, addCrystals,
    transferGold, bankDeposit, bankWithdraw,
    // Stats & skills
    upgradeStat, unlockSkill,
    // Combat
    updateHp, recoverHp, takeDamage, addKill, addDeath,
    addDungeonClear, recalcMaxHp,
    // Karma
    addKarma, setKarma,
    // Survival
    updateHunger, updateThirst, feed,
    // Location
    setLocation, setHome, addWaypoint, conquerTerritory,
    // Shadows
    addShadow, removeShadow, expandShadowSlots,
    // Inventory
    addItem, removeItem, addWeapon,
    // Social
    marry, divorce, setMentor, setJob,
    // Achievements
    unlockAchievement, unlockTitle, setActiveTitle,
    // Cooldowns
    checkCooldown, setCooldown, formatCooldown,
    // Admin
    shadowBan, unban, jailPlayer, releaseJail,
    forceSetLevel, forceSetGold, giveDiamonds,
    setBloodline, triggerRebirth,
    // Guilds
    createGuild, joinGuild, depositToGuildVault,
    // World events
    startWorldEvent, getActiveEvents, endWorldEvent, joinEvent,
    // Leaderboards
    getTopByLevel, getTopByGold, getTopByKarma, getTopByShadows,
    // UI helpers
    buildFooter, buildBox,
    // Rank scaling
    getRankMultiplier, scaleRewards,
    // Username / display name
    getDisplayName, findByIdentifier, setLid, setUsername,
};
