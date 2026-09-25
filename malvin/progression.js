/**
 * malvin/progression.js
 * Core Progression Commands — Malvin-XD Sovereign RPG
 * 30 Commands: .start .profile .stats .addstat .rankup .level .skills
 *              .title .rebirth .awaken .bloodline .achievements .lb .prestige
 *              + supporting commands
 */

const { mxd } = require('../king');
const { ACHIEVEMENTS, TIERS, getAchievementRank, checkNewAchievements, getTotalPoints } = require('../king/rpg/achievements');
const { sendCanvasImage } = require('./rpg');
const {
    getPlayer, fetchPlayer, playerExists,
    grantExp, upgradeStat, unlockSkill,
    addDiamonds, removeDiamonds, addGold,
    triggerRebirth, setBloodline,
    unlockAchievement, unlockTitle, setActiveTitle,
    getTopByLevel, getTopByGold, getTopByKarma, getTopByShadows,
    buildBox, buildFooter, scaleRewards,
} = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { xpRange, xpProgress, xpForLevel } = require('../king/rpg/leveling');
const { GlobalPlayer } = require('../king/rpg/model');
const { getProfilePic } = require('../king/socket/groupListener');

// ─── Bloodline table ──────────────────────────────────────────────────────────
const BLOODLINES = {
    common:    { name: 'Common',    rank: 'F', bonus: 'None',              cost: 0     },
    hunter:    { name: 'Hunter',    rank: 'D', bonus: '+10% Hunt EXP',     cost: 500   },
    shadow:    { name: 'Shadow',    rank: 'B', bonus: '+1 Shadow Slot',     cost: 2000  },
    dragon:    { name: 'Dragon',    rank: 'A', bonus: '+20% Combat ATK',   cost: 5000  },
    monarch:   { name: 'Monarch',   rank: 'S', bonus: '2x Dark rewards',   cost: 15000 },
    sovereign: { name: 'Sovereign', rank: 'SS',bonus: 'All stats +5',      cost: 50000 },
};

// ─── Rebirth bonus table ──────────────────────────────────────────────────────
function getRebirthBonus(rebirths) {
    return {
        expMultiplier:  1 + rebirths * 0.15,
        goldMultiplier: 1 + rebirths * 0.10,
        statBonus:      rebirths * 2,
        maxShadows:     5 + rebirths * 2,
    };
}

// ─── Awaken thresholds ────────────────────────────────────────────────────────
const AWAKEN_LEVELS = [50, 100, 150, 200, 300];

// NOTE: .start / .register / .play are handled by malvin/register.js
// NOTE: .profile is handled by malvin/rpg.js

// ════════════════════════════════════════════════════════════════════════════
// .stats — Detailed stat breakdown
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'stats',
        aliases:     ['stat', 'attributes'],
        category:    'progression',
        react:       '📊',
        description: 'View your detailed RPG stat breakdown',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        const targetJid = conText.user || sender;

        await react('⏳');
        const player = await getPlayer(targetJid, botId);
        const { rankName } = getRank(player.level, player.jid);
        const mult = await scaleRewards({ exp: 100, gold: 100 }, player.level, player.jid);

        await reply(
            buildBox('📊 STAT SHEET', [
                `  Hunter: ${player.username || (targetJid === sender ? pushName : targetJid.split('@')[0])}`,
                `  Rank: ${rankName}  |  Level: ${player.level}`,
                `  ─────────────────────`,
                `  ⚔️  STR: ${player.stats.str}  → ATK bonus: +${(player.stats.str - 1) * 3}`,
                `  🧠 INT: ${player.stats.int}  → EXP mult: ${(1 + (player.stats.int - 1) * 0.05).toFixed(2)}x`,
                `  🍀 LUK: ${player.stats.luk}  → Luck bonus: +${(player.stats.luk - 1) * 2}%`,
                `  🏃 AGI: ${player.stats.agi}  → Flee rate: +${(player.stats.agi - 1) * 3}%`,
                `  💪 VIT: ${player.stats.vit}  → Max HP: ${100 + (player.stats.vit - 1) * 20}`,
                `  🛡️  DEF: ${player.stats.def}  → DMG reduce: ${(player.stats.def - 1) * 2}%`,
                `  ─────────────────────`,
                `  📌 Stat Points: ${player.statPoints}`,
                `  ⚡ Skill Points: ${player.skillPoints}`,
                `  🎯 Rank Multiplier: ${await scaleRewards({ exp: 1, gold: 1 }, player.level, player.jid).exp}x`,
                `  ─────────────────────`,
                `  ❤️  HP: ${player.combat.hp} / ${player.combat.maxHp}`,
                `  💫 MP: ${player.combat.mp} / ${player.combat.maxMp}`,
                `  ⚔️  ATK: ${player.combat.attack}  🛡️ DEF: ${player.combat.defense}`,
                `  ─────────────────────`,
                `  ☠️  Kills: ${player.combat.kills}  |  Deaths: ${player.combat.deaths}`,
                `  🏰 Dungeon Clears: ${player.combat.dungeonClears}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .addstat — Spend stat points
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'addstat',
        aliases:     ['upgrade', 'upstat'],
        category:    'progression',
        react:       '📈',
        description: 'Spend stat points on STR, INT, LUK, AGI, VIT, or DEF',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        const validStats = ['str', 'int', 'luk', 'agi', 'vit', 'def'];
        const input = q?.trim().toLowerCase();

        if (!input || !validStats.includes(input)) {
            return reply(
                buildBox('📈 ADDSTAT USAGE', [
                    `  *.addstat <stat>*`,
                    `  ─────────────────────`,
                    `  ⚔️  str — Strength  (ATK)`,
                    `  🧠 int — Intelligence (EXP)`,
                    `  🍀 luk — Luck  (economy)`,
                    `  🏃 agi — Agility (flee/speed)`,
                    `  💪 vit — Vitality (max HP)`,
                    `  🛡️  def — Defense (DMG reduce)`,
                ])
            );
        }

        await getPlayer(sender, botId);
        const updated = await upgradeStat(sender, input);

        if (!updated) {
            return reply('❌ No stat points available. Level up to earn more!');
        }

        const statEmoji = { str:'⚔️', int:'🧠', luk:'🍀', agi:'🏃', vit:'💪', def:'🛡️' };
        await react('📈');
        await reply(
            buildBox('📈 STAT UPGRADED', [
                `  ${statEmoji[input]} ${input.toUpperCase()} → ${updated.stats[input]}`,
                `  📌 Points remaining: ${updated.statPoints}`,
                `  ─────────────────────`,
                `  ⚔️ STR:${updated.stats.str} 🧠 INT:${updated.stats.int} 🍀 LUK:${updated.stats.luk}`,
                `  🏃 AGI:${updated.stats.agi} 💪 VIT:${updated.stats.vit} 🛡️ DEF:${updated.stats.def}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rankup — Check rank progress
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rankup',
        aliases:     ['rankcheck', 'nextrank'],
        category:    'progression',
        react:       '🏅',
        description: 'Check your rank progress and what\'s needed for the next rank',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const { rankName, rankId } = getRank(player.level, player.jid);

        const rankThresholds = [
            { name: 'E-Rank',   level: 10  },
            { name: 'D-Rank',   level: 25  },
            { name: 'C-Rank',   level: 45  },
            { name: 'B-Rank',   level: 65  },
            { name: 'A-Rank',   level: 85  },
            { name: 'S-Rank',   level: 100 },
            { name: 'SS-Rank',  level: 125 },
            { name: 'SSS-Rank', level: 150 },
            { name: 'National', level: 200 },
            { name: 'Monarch',  level: 250 },
            { name: 'Origin',   level: 400 },
        ];

        const next = rankThresholds.find(r => r.level > player.level);
        const levelsNeeded = next ? next.level - player.level : 0;

        await react('🏅');
        await reply(
            buildBox('🏅 RANK STATUS', [
                `  Current: ${rankName} (ID: ${rankId})`,
                `  Level:   ${player.level}`,
                `  ─────────────────────`,
                next
                    ? `  Next: ${next.name} at Level ${next.level}`
                    : `  You are at the highest rank!`,
                next
                    ? `  Levels needed: ${levelsNeeded}`
                    : `  👑 Origin Status Achieved`,
                `  ─────────────────────`,
                `  EXP Multiplier: ${await scaleRewards({exp:1,gold:1}, player.level, player.jid).exp}x`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .level — Check level & EXP progress
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'level',
        aliases:     ['exp', 'xp'],
        category:    'progression',
        react:       '⭐',
        description: 'Check your current level and EXP progress',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        const targetJid = conText.user || sender;

        await getPlayer(targetJid, botId);
        const player = await fetchPlayer(targetJid);
        const { min, needed } = xpRange(player.level);
        const currentExp = Math.max(0, player.exp - min);
        const progress   = xpProgress(player);
        const bar        = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));

        await react('⭐');
        await reply(
            buildBox('⭐ LEVEL PROGRESS', [
                `  Hunter: ${player.username || (targetJid === sender ? pushName : targetJid.split('@')[0])}`,
                `  Level: ${player.level}`,
                `  ─────────────────────`,
                `  [${bar}]`,
                `  ${currentExp.toLocaleString()} / ${needed.toLocaleString()} EXP`,
                `  Progress: ${progress}%`,
                `  ─────────────────────`,
                `  Total EXP: ${player.exp.toLocaleString()}`,
                `  Next level needs: ${(needed - currentExp).toLocaleString()} more EXP`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .skills — View and manage skills
// ════════════════════════════════════════════════════════════════════════════
const ALL_SKILLS = {
    slash:       { cost: 1, desc: 'Basic attack skill', req: 1  },
    fireball:    { cost: 2, desc: '+30% magic damage',  req: 10 },
    shadow_step: { cost: 2, desc: '+20% flee rate',     req: 20 },
    arise:       { cost: 3, desc: 'Extract enemy shadows', req: 50 },
    domain:      { cost: 5, desc: 'Domain Expansion — +50% all stats in combat', req: 100 },
    heal_pulse:  { cost: 2, desc: 'Recover 30% HP after dungeon', req: 15 },
};

mxd(
    {
        pattern:     'skills',
        aliases:     ['skill', 'skillshop'],
        category:    'progression',
        react:       '⚡',
        description: 'View your skills or unlock new ones',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        // .skills unlock <name>
        if (q?.startsWith('unlock ')) {
            const skillName = q.replace('unlock ', '').trim().toLowerCase().replace(/ /g, '_');
            const skillData = ALL_SKILLS[skillName];

            if (!skillData) return reply(`❌ Unknown skill: *${skillName}*`);
            if (player.level < skillData.req) {
                return reply(`❌ Requires Level *${skillData.req}*. You are Level ${player.level}.`);
            }

            const result = await unlockSkill(sender, skillName);
            if (!result) return reply('❌ No skill points or skill already unlocked.');

            await react('⚡');
            return reply(
                buildBox('⚡ SKILL UNLOCKED', [
                    `  ✅ ${skillName.replace(/_/g, ' ').toUpperCase()}`,
                    `  ${skillData.desc}`,
                    `  Skill Points left: ${result.skillPoints}`,
                ])
            );
        }

        // Show skills list
        const unlockedLines = player.skills.length
            ? player.skills.map(s => `  ✅ ${s.replace(/_/g, ' ')} — ${ALL_SKILLS[s]?.desc || ''}`)
            : ['  None unlocked yet.'];

        const availableLines = Object.entries(ALL_SKILLS)
            .filter(([k]) => !player.skills.includes(k))
            .map(([k, v]) => `  🔒 ${k.replace(/_/g, ' ')} (Lv.${v.req}, ${v.cost}pt) — ${v.desc}`);

        await react('⚡');
        await reply(
            buildBox('⚡ SKILL PANEL', [
                `  ⚡ Skill Points: ${player.skillPoints}`,
                `  ─────────────────────`,
                `  UNLOCKED:`,
                ...unlockedLines,
                `  ─────────────────────`,
                `  AVAILABLE:`,
                ...availableLines,
                `  ─────────────────────`,
                `  Use: *.skills unlock <name>*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .title — Manage titles
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'title',
        aliases:     ['titles', 'settitle'],
        category:    'progression',
        react:       '🎯',
        description: 'View your titles or set an active one',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const titles  = player.achievements?.titles || [];

        if (q) {
            // Set active title
            const match = titles.find(t => t.toLowerCase() === q.toLowerCase());
            if (!match) return reply(`❌ You don't own the title *${q}*.\nUse *.title* to see your titles.`);
            await setActiveTitle(sender, match);
            await react('🎯');
            return reply(
                buildBox('🎯 TITLE EQUIPPED', [
                    `  Active Title: *${match}*`,
                    `  Your title is now displayed on your profile.`,
                ])
            );
        }

        await react('🎯');
        await reply(
            buildBox('🎯 YOUR TITLES', [
                `  Active: ${player.achievements?.activeTitle || 'None'}`,
                `  ─────────────────────`,
                ...(titles.length
                    ? titles.map(t => `  🏷️  ${t}`)
                    : ['  No titles earned yet.']),
                `  ─────────────────────`,
                `  Use: *.title <name>* to equip`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rebirth — Prestige reset
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rebirth',
        aliases:     ['reset', 'reincarnate'],
        category:    'progression',
        react:       '🔄',
        description: 'Rebirth at Level 100+ for permanent bonuses',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.level < 100) {
            return reply(
                buildBox('🔄 REBIRTH LOCKED', [
                    `  Requires: Level 100`,
                    `  Your Level: ${player.level}`,
                    `  ${100 - player.level} levels remaining.`,
                ])
            );
        }

        // Require confirmation
        if (q?.toLowerCase() !== 'confirm') {
            const bonus = getRebirthBonus(player.rebirths + 1);
            return reply(
                buildBox('🔄 REBIRTH CONFIRMATION', [
                    `  ⚠️  This will RESET your level to 1!`,
                    `  ─────────────────────`,
                    `  PERMANENT BONUSES GAINED:`,
                    `  ✨ EXP Mult: ${bonus.expMultiplier.toFixed(2)}x`,
                    `  💰 Gold Mult: ${bonus.goldMultiplier.toFixed(2)}x`,
                    `  📊 Bonus Stats: +${bonus.statBonus}`,
                    `  👥 Max Shadows: ${bonus.maxShadows}`,
                    `  ─────────────────────`,
                    `  Type *.rebirth confirm* to proceed.`,
                ])
            );
        }

        const newPlayer = await triggerRebirth(sender);
        const bonus     = getRebirthBonus(newPlayer.rebirths);
        await unlockTitle(sender, `Reborn x${newPlayer.rebirths}`);
        await unlockAchievement(sender, `Rebirth ${newPlayer.rebirths}`);

        await react('🔄');
        await reply(
            buildBox('🔄 REBIRTH COMPLETE', [
                `  ${newPlayer.username || pushName} has been reborn!`,
                `  Rebirths: ${newPlayer.rebirths}`,
                `  ─────────────────────`,
                `  Level reset to 1`,
                `  +5 Bonus Stat Points`,
                `  ✨ EXP Mult: ${bonus.expMultiplier.toFixed(2)}x`,
                `  💰 Gold Mult: ${bonus.goldMultiplier.toFixed(2)}x`,
                `  ─────────────────────`,
                `  The journey begins again. 🔥`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .awaken — Post-rebirth power awakening
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'awaken',
        aliases:     ['awakening'],
        category:    'progression',
        react:       '💥',
        description: 'Awaken your hidden power at milestone levels',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.awakened) {
            return reply(
                buildBox('💥 ALREADY AWAKENED', [
                    `  ${player.username || pushName} has already awakened.`,
                    `  Your power is already unleashed.`,
                    `  Keep leveling for the next threshold.`,
                ])
            );
        }

        const threshold = AWAKEN_LEVELS.find(l => player.level >= l && player.rebirths >= 1);
        if (!threshold) {
            return reply(
                buildBox('💥 AWAKENING LOCKED', [
                    `  Requirements:`,
                    `  ⭐ Level 50+ AND 1+ Rebirth`,
                    `  Your Level: ${player.level}`,
                    `  Rebirths:   ${player.rebirths}`,
                ])
            );
        }

        // Grant awakening bonuses
        await GlobalPlayer.updateOne(
            { jid: sender },
            {
                $set: { awakened: true },
                $inc: { statPoints: 10, 'stats.str': 3, 'stats.int': 3, 'stats.luk': 3 },
            }
        );
        await unlockTitle(sender, 'Awakened Hunter');
        await unlockAchievement(sender, 'Awakened');

        await react('💥');
        await reply(
            buildBox('💥 AWAKENING TRIGGERED', [
                `  ⚡ ${player.username || pushName} HAS AWAKENED! ⚡`,
                `  ─────────────────────`,
                `  +10 Stat Points`,
                `  +3 STR, +3 INT, +3 LUK`,
                `  Title: "Awakened Hunter"`,
                `  ─────────────────────`,
                `  Your true power is now unleashed.`,
                `  ⚔️  Arise. 👑`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .bloodline — View or change bloodline
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'bloodline',
        aliases:     ['bl', 'ancestry'],
        category:    'progression',
        react:       '🩸',
        description: 'View your bloodline or unlock a new one',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (q) {
            const key = q.toLowerCase();
            const bl  = BLOODLINES[key];
            if (!bl) {
                return reply(`❌ Unknown bloodline: *${q}*\nUse *.bloodline* to see available ones.`);
            }
            if (bl.cost > 0 && player.gold < bl.cost) {
                return reply(`❌ Requires *${bl.cost.toLocaleString()} Gold*. You have ${player.gold.toLocaleString()}.`);
            }
            if (bl.cost > 0) {
                await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bl.cost } });
            }
            await setBloodline(sender, bl.name, bl.rank);
            await unlockTitle(sender, `${bl.name} Bloodline`);

            await react('🩸');
            return reply(
                buildBox('🩸 BLOODLINE AWAKENED', [
                    `  Bloodline: ${bl.name}`,
                    `  Rank:      ${bl.rank}-Rank`,
                    `  Bonus:     ${bl.bonus}`,
                    `  Cost:      ${bl.cost.toLocaleString()} Gold`,
                ])
            );
        }

        const blLines = Object.entries(BLOODLINES).map(([k, v]) =>
            `  ${v.rank}-Rank | ${v.name} — ${v.bonus} (${v.cost.toLocaleString()}g)`
        );

        await react('🩸');
        await reply(
            buildBox('🩸 BLOODLINE REGISTRY', [
                `  Current: ${player.bloodline} (${player.bloodlineRank}-Rank)`,
                `  Gold: ${player.gold.toLocaleString()}`,
                `  ─────────────────────`,
                ...blLines,
                `  ─────────────────────`,
                `  Use: *.bloodline <name>* to unlock`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .achievements — View all achievements
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'achievements',
        aliases:     ['achv', 'medals'],
        category:    'progression',
        react:       '🏆',
        description: 'View your earned achievements and titles',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const achvs   = player.achievements?.list   || [];
        const titles  = player.achievements?.titles || [];

        // Check for newly earned achievements
        const newlyEarned = checkNewAchievements(player, achvs);
        if (newlyEarned.length > 0) {
            const newIds = newlyEarned.map(a => a.id);
            await GlobalPlayer.findOneAndUpdate(
                { jid: sender },
                { $addToSet: { 'achievements.list': { $each: newIds } } }
            );
            // Grant rewards for newly earned
            for (const achv of newlyEarned) {
                if (achv.reward?.gold)     await addGold(sender, achv.reward.gold);
                if (achv.reward?.diamonds) await addDiamonds(sender, achv.reward.diamonds);
                if (achv.reward?.title)    await unlockTitle(sender, achv.reward.title);
                achvs.push(achv.id);
            }
        }

        const totalPoints = getTotalPoints(achvs);
        const rank        = getAchievementRank(totalPoints);

        // Group by tier
        const byTier = { legend: [], platinum: [], gold: [], silver: [], bronze: [] };
        for (const id of achvs) {
            const a = ACHIEVEMENTS[id];
            if (a) byTier[a.tier]?.push(a);
        }

        const tierLines = [];
        for (const [tier, list] of Object.entries(byTier)) {
            if (!list.length) continue;
            const t = TIERS[tier];
            tierLines.push(`  ${t.emoji} *${t.label}* (${list.length})`);
            list.forEach(a => tierLines.push(`     ${a.emoji} ${a.name}`));
        }

        // Next tier progress
        const tierEntries = Object.entries(TIERS);
        const nextTierEntry = tierEntries.find(([k, t]) => t.minPoints > totalPoints);
        const nextLine = nextTierEntry
            ? `  Progress to ${nextTierEntry[1].emoji} *${nextTierEntry[1].label}*: *${totalPoints}/${nextTierEntry[1].minPoints} pts*`
            : `  *MAX RANK ACHIEVED!* 👑`;

        await react('🏆');
        await reply(
            buildBox('🏆 ACHIEVEMENTS', [
                `  Hunter: *${player.username || pushName}*`,
                `  Rank: ${rank.emoji} *${rank.label}*`,
                `  Points: *${totalPoints}*  |  Earned: *${achvs.length}/${Object.keys(ACHIEVEMENTS).length}*`,
                `  ───────`,
                nextLine,
                `  ───────`,
                ...(tierLines.length ? tierLines : [`  No achievements yet. Start grinding!`]),
                `  ───────`,
                `  TITLES (${titles.length}):`,
                ...(titles.length
                    ? titles.map(t => `  🏷️ *${t}*`)
                    : [`  No titles earned yet.`]),
                ...(newlyEarned.length > 0 ? [
                    `  ───────`,
                    `  🎉 *NEW: ${newlyEarned.map(a => a.name).join(', ')}*`,
                ] : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .lb — Leaderboards (multiple categories)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'lb',
        aliases:     ['leaderboard', 'top', 'top10'],
        category:    'progression',
        react:       '🏆',
        description: 'View global leaderboards — level, gold, karma, shadows',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;

        const type    = q?.toLowerCase() || 'level';
        const medals  = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

        await react('⏳');

        let players, title;
        if (type === 'gold') {
            players = await getTopByGold(10);
            title   = '💰 GOLD LEADERBOARD';
        } else if (type === 'karma') {
            players = await getTopByKarma(10);
            title   = '⚖️  KARMA LEADERBOARD';
        } else if (type === 'shadows') {
            players = await getTopByShadows(10);
            title   = '👥 SHADOW LEADERBOARD';
        } else {
            players = await getTopByLevel(10);
            title   = '⭐ LEVEL LEADERBOARD';
        }

        if (!players.length) return reply('🏆 No players on the leaderboard yet!');

        const lines = players.map((p, i) => {
            const name = p.username || p.jid.split('@')[0];
            const { rankName } = getRank(p.level, p.jid);
            if (type === 'gold')    return `  ${medals[i]} ${name} — 💰 ${p.gold.toLocaleString()}`;
            if (type === 'karma')   return `  ${medals[i]} ${name} — ⚖️  ${p.karma}`;
            if (type === 'shadows') return `  ${medals[i]} ${name} — 👥 ${p.shadowCount} shadows`;
            return `  ${medals[i]} ${name} — Lv.${p.level} ${rankName}`;
        });

        await react('🏆');
        await reply(
            buildBox(title, [
                ...lines,
                `  ─────────────────────`,
                `  Also: *.lb gold* | *.lb karma* | *.lb shadows*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .prestige — Overview of prestige system
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'prestige',
        aliases:     ['prestigeinfo'],
        category:    'progression',
        react:       '👑',
        description: 'View the prestige and rebirth system overview',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const bonus  = getRebirthBonus(player.rebirths);

        await react('👑');
        await reply(
            buildBox('👑 PRESTIGE SYSTEM', [
                `  Your Rebirths: ${player.rebirths}`,
                `  ─────────────────────`,
                `  CURRENT BONUSES:`,
                `  ✨ EXP Mult:  ${bonus.expMultiplier.toFixed(2)}x`,
                `  💰 Gold Mult: ${bonus.goldMultiplier.toFixed(2)}x`,
                `  📊 Stat Bonus: +${bonus.statBonus}`,
                `  👥 Max Shadows: ${bonus.maxShadows}`,
                `  ─────────────────────`,
                `  MILESTONES:`,
                `  🔄 Rebirth 1 — Basic bonuses`,
                `  🔄 Rebirth 3 — Shadow expansion`,
                `  🔄 Rebirth 5 — Bloodline upgrade`,
                `  🔄 Rebirth 10 — Monarch Path`,
                `  ─────────────────────`,
                `  Use *.rebirth* at Level 100+ to begin.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .daily — Claim daily rewards
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'daily',
        aliases:     ['dailyreward', 'claim'],
        category:    'progression',
        react:       '🎁',
        description: 'Claim your daily EXP and gold reward',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const lastDaily = player.cooldowns?.daily;
        const cooldownMs = 24 * 60 * 60 * 1000;

        if (lastDaily && Date.now() - new Date(lastDaily).getTime() < cooldownMs) {
            const remaining = cooldownMs - (Date.now() - new Date(lastDaily).getTime());
            const hrs = Math.floor(remaining / 3600000);
            const mins = Math.floor((remaining % 3600000) / 60000);
            return reply(
                buildBox('🎁 DAILY COOLDOWN', [
                    `  Already claimed today!`,
                    `  Come back in: ${hrs}h ${mins}m`,
                ])
            );
        }

        const { exp: baseExp, gold: baseGold } = await scaleRewards(
            { exp: 200, gold: 500 }, player.level, player.jid
        );
        const diamonds = player.level >= 50 ? 2 : 0;

        await grantExp(sender, baseExp, baseGold, botId);
        if (diamonds) await addDiamonds(sender, diamonds);
        await GlobalPlayer.updateOne({ jid: sender }, { $set: { 'cooldowns.daily': new Date() } });

        await react('🎁');
        await reply(
            buildBox('🎁 DAILY REWARD CLAIMED', [
                `  Hunter: ${player.username || pushName}`,
                `  ─────────────────────`,
                `  ✨ EXP:      +${baseExp.toLocaleString()}`,
                `  💰 Gold:     +${baseGold.toLocaleString()}`,
                ...(diamonds ? [`  💎 Diamonds: +${diamonds}`] : []),
                `  ─────────────────────`,
                `  Come back tomorrow for more!`,
                buildFooter(baseExp, baseGold, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .balance — Quick currency check
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'balance',
        aliases:     ['bal', 'wallet'],
        category:    'progression',
        react:       '💰',
        description: 'Check your gold, diamonds and crystals',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        await react('💰');
        await reply(
            buildBox('💰 WALLET', [
                `  Hunter: ${player.username || pushName}`,
                `  ─────────────────────`,
                `  💰 Gold:     ${player.gold.toLocaleString()}`,
                `  💎 Diamonds: ${player.diamonds}`,
                `  🔮 Crystals: ${player.crystals}`,
                `  ─────────────────────`,
                `  🏦 Bank:     ${player.bank.balance.toLocaleString()} / ${player.bank.capacity.toLocaleString()}`,
            ])
        );
    }
);

module.exports = {};
