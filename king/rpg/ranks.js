/**
 * king/rpg/ranks.js
 * Rank mapping logic for Malvin-XD GUD RPG
 * Interfaces with api.malvin.gleeze.com canvas endpoints.
 */

const axios = require('axios');
const { MalvinTechApi, MalvinApiKey } = require('../mxdcore2');

// ─── Owner JID fragment ───────────────────────────────────────────────────────
const OWNER_JID_FRAGMENT = '263776388689';

// ─── Default background for all canvas cards ──────────────────────────────────
// Replace this URL with any image you want as the card background.
const DEFAULT_BG = 'https://i.ibb.co/bjwZ2j1s/image.jpg';

// ─── Rank table ───────────────────────────────────────────────────────────────
const RANKS = [
    { name: 'F-Rank',   id: 0,  minLevel: 0   },
    { name: 'E-Rank',   id: 1,  minLevel: 10  },
    { name: 'D-Rank',   id: 2,  minLevel: 25  },
    { name: 'C-Rank',   id: 3,  minLevel: 45  },
    { name: 'B-Rank',   id: 4,  minLevel: 65  },
    { name: 'A-Rank',   id: 5,  minLevel: 85  },
    { name: 'S-Rank',   id: 6,  minLevel: 100 },
    { name: 'SS-Rank',  id: 7,  minLevel: 125 },
    { name: 'SSS-Rank', id: 8,  minLevel: 150 },
    { name: 'National', id: 9,  minLevel: 200 },
    { name: 'Monarch',  id: 10, minLevel: 250 },
    { name: 'Origin',   id: 11, minLevel: 400 },
];

/**
 * Get rank info for a player.
 * Owner bypass: any JID containing 263776388689 always returns Origin (ID 11).
 *
 * @param {number} level - player's current level
 * @param {string} jid   - player's WhatsApp JID
 * @returns {{ rankName: string, rankId: number }}
 */
function getRank(level, jid = '') {
    // Owner always gets Origin regardless of level
    if (jid.includes(OWNER_JID_FRAGMENT)) {
        return { rankName: 'Origin', rankId: 11 };
    }

    // Walk ranks from highest down to find the right tier
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (level >= RANKS[i].minLevel) {
            return { rankName: RANKS[i].name, rankId: RANKS[i].id };
        }
    }

    return { rankName: 'F-Rank', rankId: 0 };
}

// ─── Profile card URL builder ─────────────────────────────────────────────────
/**
 * Build the full URL for the /canvas/profile endpoint.
 * Matches: /canvas/profile?backgroundURL=&avatarURL=&rankName=&rankId=&exp=&requireExp=&level=&name=&apikey=
 */
function buildProfileUrl(params) {
    const { backgroundURL, avatarURL, rankName, rankId, exp, requireExp, level, name } = params;
    const url = new URL(`${MalvinTechApi}/canvas/profile`);
    url.searchParams.set('backgroundURL', backgroundURL);
    url.searchParams.set('avatarURL',     avatarURL);
    url.searchParams.set('rankName',      rankName);
    url.searchParams.set('rankId',        rankId);
    url.searchParams.set('exp',           exp);
    url.searchParams.set('requireExp',    requireExp);
    url.searchParams.set('level',         level);
    url.searchParams.set('name',          name);
    url.searchParams.set('apikey',        MalvinApiKey);
    return url.toString();
}

// ─── Level-up card URL builder ────────────────────────────────────────────────
/**
 * Build the full URL for the /canvas/level-up endpoint.
 * Matches: /canvas/level-up?backgroundURL=&avatarURL=&fromLevel=&toLevel=&name=&apikey=
 */
function buildLevelUpUrl(params) {
    const { backgroundURL, avatarURL, fromLevel, toLevel, name } = params;
    const url = new URL(`${MalvinTechApi}/canvas/level-up`);
    url.searchParams.set('backgroundURL', backgroundURL);
    url.searchParams.set('avatarURL',     avatarURL);
    url.searchParams.set('fromLevel',     fromLevel);
    url.searchParams.set('toLevel',       toLevel);
    url.searchParams.set('name',          name);
    url.searchParams.set('apikey',        MalvinApiKey);
    return url.toString();
}

// ─── Send profile card ────────────────────────────────────────────────────────
/**
 * Fetch and send the profile rank card.
 * Returns true on success, false if API call failed (caller handles fallback).
 */
async function sendProfileCard(Malvin, from, mek, player, pfpUrl) {
    const name            = player.pushName || player.jid.split('@')[0];
    const { rankName, rankId } = getRank(player.level, player.jid);

    // EXP within the current level (not cumulative total)
    const { xpRange } = require('./leveling');
    const { min, needed } = xpRange(player.level);
    const currentExp = Math.max(0, player.exp - min);

    try {
        const res = await axios.get(`${MalvinTechApi}/canvas/profile`, {
            params: {
                backgroundURL: DEFAULT_BG,
                avatarURL:     pfpUrl,
                rankName,
                rankId,
                exp:           currentExp,
                requireExp:    needed,
                level:         player.level,
                name,
                apikey:        MalvinApiKey,
            },
            timeout: 30000,
            validateStatus: () => true,
        });

        // Endpoint now defaults to JSON { data: { url } } instead of raw
        // image bytes — just hand the URL to WhatsApp directly.
        if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
            throw new Error(res.data?.error || `HTTP ${res.status}`);
        }
        const imageUrl = res.data.data.url;

        const { xpProgress } = require('./leveling');
        const progress = xpProgress(player);

        const caption =
            `🎮 *GUD RPG — PLAYER PROFILE*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `👤 *${name}*  |  🏅 ${rankName}\n` +
            `⭐ Level: *${player.level}*\n` +
            `✨ EXP: *${currentExp.toLocaleString()}* / *${needed.toLocaleString()}*  (${progress}%)\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `💰 Gold:     *${player.gold.toLocaleString()}*\n` +
            `💎 Diamonds: *${player.diamonds.toLocaleString()}*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `⚔️  STR: ${player.stats.str}  🧠 INT: ${player.stats.int}  🍀 LUK: ${player.stats.luk}\n` +
            `📌 Stat Points: *${player.statPoints}*\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `> *Malvin-XD GUD RPG* 💎`;

        await Malvin.sendMessage(from, { image: { url: imageUrl }, caption }, { quoted: mek });
        return true;
    } catch (err) {
        console.error('[RPG] Profile card error:', err.message);
        return false;
    }
}

// ─── Send level-up card ───────────────────────────────────────────────────────
async function sendLevelUpCard(Malvin, from, player, pfpUrl, fromLevel) {
    const name    = player.pushName || player.jid.split('@')[0];
    const toLevel = player.level;
    const { rankName } = getRank(toLevel, player.jid);

    try {
        const res = await axios.get(`${MalvinTechApi}/canvas/level-up`, {
            params: {
                backgroundURL: DEFAULT_BG,
                avatarURL:     pfpUrl,
                fromLevel,
                toLevel,
                name,
                apikey: MalvinApiKey,
            },
            timeout: 30000,
            validateStatus: () => true,
        });

        if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
            throw new Error(res.data?.error || `HTTP ${res.status}`);
        }
        const imageUrl = res.data.data.url;

        await Malvin.sendMessage(from, {
            image: { url: imageUrl },
            caption:
                `🎉 *LEVEL UP!*\n` +
                `╔══════════════════╗\n` +
                `  💎 *${name}* is now *Level ${toLevel}*!\n` +
                `  🏅 Rank: *${rankName}*\n` +
                `  ✨ +5 Diamonds earned!\n` +
                `  📊 +1 Stat Point available!\n` +
                `  Use *.upgrade <str|int|luk>* to power up!\n` +
                `╚══════════════════╝`,
        });
        return true;
    } catch (err) {
        console.error('[RPG] Level-up card error:', err.message);
        // Text fallback
        await Malvin.sendMessage(from, {
            text:
                `🎉 *LEVEL UP!*\n` +
                `*${name}* reached *Level ${toLevel}* — ${rankName}!\n` +
                `💎 +5 Diamonds | 📊 +1 Stat Point\n` +
                `Use *.upgrade <str|int|luk>* to spend your points!`,
        });
        return false;
    }
}

module.exports = {
    getRank,
    buildProfileUrl,
    buildLevelUpUrl,
    sendProfileCard,
    sendLevelUpCard,
};
