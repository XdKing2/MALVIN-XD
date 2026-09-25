/**
 * malvin/register.js
 * Registration System — Malvin-XD Sovereign RPG
 *
 * Handles .start (with username), .setname, .whois, .checkname
 * Maps JID/LID → username so all cards show a real name.
 */

const { mxd } = require('../king');
const { getPlayer, fetchPlayer, buildBox } = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { xpRange, xpProgress } = require('../king/rpg/leveling');
const { GlobalPlayer } = require('../king/rpg/model');
const { unlockAchievement, unlockTitle, setActiveTitle } = require('../king/rpg/db');
const { getWorldTime } = require('../king/rpg/worldTime');

// ─── Username validation ──────────────────────────────────────────────────────
const USERNAME_REGEX = /^[a-zA-Z0-9_\-]{3,20}$/;

function validateUsername(name) {
    if (!name) return 'Username is required.';
    if (name.length < 3) return 'Username must be at least 3 characters.';
    if (name.length > 20) return 'Username must be 20 characters or less.';
    if (!USERNAME_REGEX.test(name)) return 'Only letters, numbers, _ and - allowed.';
    return null;
}

// ─── Helper: resolve display name ─────────────────────────────────────────────
/**
 * Returns the best display name for a player.
 * Priority: username → pushName → jid number
 */
function getDisplayName(player, fallbackName = null) {
    return player.username
        || fallbackName
        || player.jid.split('@')[0];
}

// ════════════════════════════════════════════════════════════════════════════
// .start — Register with a username
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'start',
        aliases:     ['register', 'play'],
        category:    'rpg',
        react:       '⚔️',
        description: 'Begin your journey — .start <username> <gender> <age>',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        // Check if LID is available from conText for mapping
        const lid = conText.lid || conText.senderLid || null;

        await getPlayer(sender, botId);
        const existing = await fetchPlayer(sender);

        // Already registered
        if (existing.registered) {
            return reply(
                buildBox('⚔️ ALREADY REGISTERED', [
                    `  Hunter: ${getDisplayName(existing, pushName)}`,
                    `  Level:  ${existing.level}`,
                    `  Use *.profile* to see your stats.`,
                    `  Use *.setname <name>* to change username.`,
                ])
            );
        }

        // No username provided — prompt them
        if (!q) {
            return reply(
                buildBox('⚔️ REGISTRATION', [
                    `  Welcome to *Aevoria* — Malvin-XD RPG!`,
                    `  ───────`,
                    `  Usage: *.start <username> <gender> <age>*`,
                    `  ───────`,
                    `  Username rules:`,
                    `  • 3–20 characters`,
                    `  • Letters, numbers, _ and - only`,
                    `  • Must be unique`,
                    `  ───────`,
                    `  Example: *.start MalvinXD male 19*`,
                ])
            );
        }

        // Parse args — username gender age
        const args     = q.trim().split(/\s+/);
        const username = args[0];
        const gender   = args[1]?.toLowerCase() || null;
        const ageInput = args[2] ? parseInt(args[2]) : null;

        // Validate username
        const error = validateUsername(username);
        if (error) return reply(`❌ ${error}`);

        // Validate gender
        const validGenders = ['male', 'female', 'other'];
        if (gender && !validGenders.includes(gender)) {
            return reply(`❌ Gender must be: *male*, *female*, or *other*`);
        }

        // Validate age
        if (ageInput !== null && (isNaN(ageInput) || ageInput < 1 || ageInput > 120)) {
            return reply(`❌ Age must be a number between 1 and 120.`);
        }

        // Check if username taken
        const taken = await GlobalPlayer.isUsernameTaken(username);
        if (taken) {
            return reply(
                buildBox('⚔️ NAME TAKEN', [
                    `  *${username}* is already taken!`,
                    `  Choose a different hunter name.`,
                    `  *.start <username> <gender> <age>*`,
                ])
            );
        }

        // Get current world year for birthYear
        const wt = await getWorldTime();

        // Register
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            {
                $set: {
                    username:    username,
                    registered:  true,
                    gender:      gender,
                    birthYear:   wt.year,
                    currentWorld:'Aevoria',
                    ...(lid ? { lid } : {}),
                }
            }
        );

        await unlockAchievement(sender, 'First Steps');
        await unlockTitle(sender, 'Newcomer');
        await setActiveTitle(sender, 'Newcomer');

        const genderDisplay = gender
            ? gender.charAt(0).toUpperCase() + gender.slice(1)
            : 'Unknown';

        await react('⚔️');
        await reply(
            buildBox('⚔️ WELCOME TO AEVORIA', [
                `  Hunter: *${username}*`,
                `  Gender: ${genderDisplay}`,
                `  Born:   Year ${wt.year} AE`,
                `  World:  🌍 Aevoria`,
                `  ───────`,
                `  🏅 Rank:  F-Rank`,
                `  ⭐ Level: 1`,
                `  💰 Gold:  1,000`,
                `  ───────`,
                `  ${wt.timeEmoji} ${wt.timeOfDay} · ${wt.seasonEmoji} ${wt.season}`,
                `  📅 ${wt.dayOfMonth}th ${wt.month}, Year ${wt.year} AE`,
                `  ───────`,
                `  The gate has opened, ${username}.`,
                `  Your journey in Aevoria begins now.`,
                `  ───────`,
                `  *.profile* — View your hunter card`,
                `  *.hunt*    — Start earning EXP`,
                `  *.worldtime* — Check world time`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .setname — Change your username
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'setname',
        aliases:     ['changename', 'rename'],
        category:    'rpg',
        react:       '✏️',
        description: 'Change your hunter username (costs 500 gold)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.setname <new username>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.registered) {
            return reply('❌ Register first with *.start <username>*');
        }

        const error = validateUsername(q);
        if (error) return reply(`❌ ${error}`);

        if (player.username?.toLowerCase() === q.toLowerCase()) {
            return reply('❌ That is already your username!');
        }

        const cost = 500;
        if (player.gold < cost) {
            return reply(`❌ Renaming costs ${cost} Gold. You have ${player.gold}.`);
        }

        const taken = await GlobalPlayer.isUsernameTaken(q);
        if (taken) return reply(`❌ *${q}* is already taken!`);

        const oldName = player.username || player.jid.split('@')[0];
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            {
                $set: { username: q },
                $inc: { gold: -cost },
            }
        );

        await react('✏️');
        await reply(
            buildBox('✏️ NAME CHANGED', [
                `  Old: ${oldName}`,
                `  New: *${q}*`,
                `  💰 Cost: -${cost} Gold`,
                `  Your new name is now live! ✅`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .whois — Look up a player by username, JID or LID
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'whois',
        aliases:     ['lookup', 'findplayer'],
        category:    'rpg',
        react:       '🔍',
        description: 'Look up a player by username, JID number, or LID',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        // Also support tag/mention
        const targetJid = conText.user || conText.mentionedJid?.[0];

        if (!q && !targetJid) {
            return reply('❌ Usage: *.whois <username>* or tag a player');
        }

        await react('⏳');

        let player;
        if (targetJid) {
            player = await fetchPlayer(targetJid);
        } else {
            player = await GlobalPlayer.findByIdentifier(q);
        }

        if (!player) {
            return reply(
                buildBox('🔍 NOT FOUND', [
                    `  No player found for: *${q || targetJid}*`,
                    `  They may not be registered yet.`,
                ])
            );
        }

        const { rankName } = getRank(player.level, player.jid);
        const { min, needed } = xpRange(player.level);
        const currentExp = Math.max(0, player.exp - min);
        const progress   = xpProgress(player);
        const displayName = getDisplayName(player);

        await react('🔍');
        await reply(
            buildBox('🔍 PLAYER FOUND', [
                `  Hunter:  *${displayName}*`,
                `  JID:     ${player.jid.split('@')[0]}`,
                ...(player.lid ? [`  LID:     ${player.lid}`] : []),
                `  ─────────────────────`,
                `  🏅 Rank:  ${rankName}`,
                `  ⭐ Level: ${player.level}`,
                `  ✨ EXP:   ${currentExp.toLocaleString()} / ${needed.toLocaleString()} (${progress}%)`,
                `  ─────────────────────`,
                `  💰 Gold:     ${player.gold.toLocaleString()}`,
                `  💎 Diamonds: ${player.diamonds}`,
                `  ⚖️  Alignment: ${player.alignment}`,
                `  🩸 Bloodline: ${player.bloodline}`,
                `  ─────────────────────`,
                `  Title: ${player.achievements?.activeTitle || 'None'}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .checkname — Check if a username is available
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'checkname',
        aliases:     ['nameavail', 'availname'],
        category:    'rpg',
        react:       '🔎',
        description: 'Check if a username is available',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;

        if (!q) return reply('❌ Usage: *.checkname <username>*');

        const error = validateUsername(q);
        if (error) return reply(`❌ ${error}`);

        const taken = await GlobalPlayer.isUsernameTaken(q);
        await react(taken ? '❌' : '✅');
        await reply(
            buildBox('🔎 NAME CHECK', [
                `  Username: *${q}*`,
                taken
                    ? `  ❌ Already taken!`
                    : `  ✅ Available! Use *.start ${q}* to claim it.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .myname — View your current username and linked IDs
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'myname',
        aliases:     ['myid', 'myinfo'],
        category:    'rpg',
        react:       '👤',
        description: 'View your registered username and linked IDs',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        await react('👤');
        await reply(
            buildBox('👤 YOUR IDENTITY', [
                `  Username: *${player.username || 'Not set'}*`,
                `  JID:      ${sender.split('@')[0]}`,
                ...(player.lid ? [`  LID:      ${player.lid}`] : []),
                `  WA Name:  ${pushName}`,
                `  ─────────────────────`,
                !player.registered
                    ? `  ⚠️  Not registered yet!`
                    : `  ✅ Registered`,
                `  ─────────────────────`,
                `  *.setname <name>* — Change username (500g)`,
                `  *.whois <name>*   — Look up any player`,
            ])
        );
    }
);

// ─── Export display name helper for use in other files ───────────────────────
module.exports = { getDisplayName };

// ─── .setgender — Update gender ───────────────────────────────────────────────
mxd(
    {
        pattern:     'setgender',
        aliases:     ['gender', 'mygender'],
        category:    'rpg',
        react:       '⚧️',
        description: 'Set your gender — .setgender <male|female|other>',
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.setgender <male|female|other>*');

        const gender = q.trim().toLowerCase();
        if (!['male', 'female', 'other'].includes(gender))
            return reply('❌ Valid options: *male*, *female*, *other*');

        await getPlayer(sender, botId);
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            { $set: { gender } }
        );

        const emoji = gender === 'male' ? '♂️' : gender === 'female' ? '♀️' : '⚧️';
        await react('✅');
        await reply(buildBox(`${emoji} GENDER UPDATED`, [
            `  Gender set to: *${gender.charAt(0).toUpperCase() + gender.slice(1)}*`,
        ]));
    }
);
