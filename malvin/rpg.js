/**
 * malvin/rpg.js
 * RPG Commands — Malvin-XD Sovereign RPG
 * Uses the sendCanvasImage helper exactly like canvas.js
 */

const { mxd }  = require('../king');
const { mrxd } = require('../king/mrxd');
const axios    = require('axios');
const { classifyApiError } = require('../king/mxdcore2');
const { GlobalPlayer } = require('../king/rpg/model');
const { xpRange, xpProgress } = require('../king/rpg/leveling');
const { getRank } = require('../king/rpg/ranks');
const { getProfilePic } = require('../king/socket/groupListener');
const { getPlayer, fetchPlayer, getTopByLevel, buildFooter, buildBox } = require('../king/rpg/db');
const { getWorldTime, getPlayerAge } = require('../king/rpg/worldTime');
const { formatRoles } = require('../king/rpg/roles');
const { getWorld } = require('../king/rpg/worlds');
const { fancy } = require("../king/fancyFont");

// ─── Canvas helper (same pattern as canvas.js) ────────────────────────────────
async function sendCanvasImage(from, Malvin, conText, endpoint, params, caption) {
    const { react, MalvinTechApi, MalvinApiKey, mek } = conText;
    try {
        await react('🎨');
        // Default JSON response: { status, data: { url }, timestamp }.
        // Just hand the URL straight to WhatsApp — no need to download the
        // bytes ourselves and re-upload them.
        const res = await axios.get(`${MalvinTechApi}/canvas/${endpoint}`, {
            params: { apikey: MalvinApiKey, ...params },
            timeout: 30000,
            validateStatus: () => true,
        });

        if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
            const { rawMessage } = classifyApiError(res.status, res.data);
            throw new Error(rawMessage);
        }

        await Malvin.sendMessage(from, {
            image:   { url: res.data.data.url },
            caption: caption,
        }, { quoted: mek });
        await react('✅');
        return true;
    } catch (err) {
        console.error(`[RPG] ${endpoint} error:`, err.message);
        await react('❌');
        return false;
    }
}

// ─── .profile ─────────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'profile',
        aliases:     ['rank', 'me'],
        category:    'rpg',
        react:       '🎮',
        description: 'View your global RPG rank card',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        const targetJid = conText.user || sender;

        try {
            await react('⏳');

            const player = await getPlayer(targetJid, botId);
            const name   = player.username || (targetJid === sender ? pushName : targetJid.split('@')[0]);

            const pfpUrl = await getProfilePic(Malvin, targetJid).catch(
                () => 'https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg'
            );

            const { min, needed } = xpRange(player.level);
            const currentExp      = Math.max(0, player.exp - min);
            const progress        = xpProgress(player);
            const { rankName, rankId } = getRank(player.level, player.jid);

            const worldTime       = await getWorldTime();
            const playerAge       = await getPlayerAge(player);
            const { jobLine, specialLine } = formatRoles(player);
            const currentWorldDef = getWorld(player.currentWorld || 'aevoria');
            const caption =
                `┌─⊷ 🎮 *PLAYER PROFILE*\n` +
                `▢ 👤 Hunter: *${name}*\n` +
                `▢ ${player.gender === 'male' ? '♂️' : player.gender === 'female' ? '♀️' : '⚧️'} Gender: *${player.gender ? player.gender.charAt(0).toUpperCase() + player.gender.slice(1) : 'Not set'}*\n` +
                `▢ 🏅 Rank: *${rankName}*\n` +
                `▢ ⭐ Level: *${player.level}*\n` +
                `▢ ✨ XP: *${currentExp.toLocaleString()} / ${needed.toLocaleString()}*  (${progress}%)\n` +
                `└───────────\n` +
                `┌─⊷ 💰 *CURRENCY*\n` +
                `▢ 💰 Gold: *${player.gold.toLocaleString()}*\n` +
                `▢ 💎 Diamonds: *${player.diamonds.toLocaleString()}*\n` +
                `▢ 🔮 Crystals: *${player.crystals.toLocaleString()}*\n` +
                `└───────────\n` +
                `┌─⊷ ⚔️ *STATS*\n` +
                `▢ ⚔️ STR: *${player.stats.str}*  🧠 INT: *${player.stats.int}*  🍀 LUK: *${player.stats.luk}*\n` +
                `▢ 🏃 AGI: *${player.stats.agi}*  💪 VIT: *${player.stats.vit}*  🛡️ DEF: *${player.stats.def}*\n` +
                `▢ 📌 Stat Points: *${player.statPoints}*\n` +
                `└───────────\n` +
                `▢ 🩸 Bloodline: *${player.bloodline}*  ⚖️ *${player.alignment}*\n` +
                `▢ 🎯 Title: *${player.achievements?.activeTitle || 'None'}*\n` +
                `└───────────\n` +
                `┌─⊷ 🎭 *ROLES*\n` +
                `▢ ⚔️ Job:     ${jobLine}\n` +
                `▢ 👁️ Special: ${specialLine || '*None yet*'}\n` +
                `└───────────\n` +
                `┌─⊷ 🌍 *AEVORIA*\n` +
                `▢ ${worldTime.timeEmoji} *${worldTime.timeOfDay}*  ${worldTime.seasonEmoji} *${worldTime.season}*\n` +
                `▢ 📅 ${worldTime.dayOfMonth}th ${worldTime.month}, Year *${worldTime.year} AE*\n` +
                `▢ 🎂 Age: *${(playerAge !== null && playerAge > 0) ? playerAge + ' AE' : player.birthYear ? '< 1 AE' : 'Unknown'}*${player.immortal ? ' ♾️ Immortal' : ''}\n` +
                `▢ 🌐 World: *${currentWorldDef.emoji} ${currentWorldDef.name}*\n` +
                `> _${fancy("malvin xd rpg", "smallcaps")}_ 💎`;

            const sent = await sendCanvasImage(from, Malvin, conText, 'profile', {
                backgroundURL: 'https://i.ibb.co/bjwZ2j1s/image.jpg',
                avatarURL:  pfpUrl,
                rankName,
                rankId,
                exp:        currentExp,
                requireExp: needed,
                level:      player.level,
                name,
            }, caption);

            if (!sent) await reply(caption);

        } catch (err) {
            console.error('[RPG] .profile error:', err.message);
            await reply('❌ Failed to fetch your profile. Try again shortly.');
        }
    }
);

// ─── .leaderboard ─────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'leaderboard',
        aliases:     ['lb', 'top10'],
        category:    'rpg',
        react:       '🏆',
        description: 'View the Top 10 global RPG players',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        try {
            await react('⏳');

            const top10  = await getTopByLevel(10);
            const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

            if (!top10.length) {
                return reply('🏆 No players yet. Start chatting to earn EXP!');
            }

            let text = `┌─⊷ 🏆 *GLOBAL LEADERBOARD*\n`;

            top10.forEach((p, i) => {
                const name = p.username || p.jid.split('@')[0];
                const { rankName } = getRank(p.level, p.jid);
                text +=
                    `▢ ${medals[i]} *${name}*  ·  🏅 ${rankName}\n` +
                `   ⭐ Lv.${p.level}  ✨ ${p.exp.toLocaleString()} EXP  💎 ${p.diamonds}\n`;
            });

            text += `└───────────\n> _${fancy("malvin xd rpg", "smallcaps")}_ 💎`;

            await reply(text);
            await react('🏆');
        } catch (err) {
            console.error('[RPG] .leaderboard error:', err.message);
            await reply('❌ Could not fetch leaderboard. Try again shortly.');
        }
    }
);

// ─── .upgrade ─────────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'upgrade',
        aliases:     ['upstat'],
        category:    'rpg',
        react:       '📊',
        description: 'Spend stat points to boost STR, INT, LUK, AGI, VIT or DEF',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        const validStats = ['str', 'int', 'luk', 'agi', 'vit', 'def'];
        const input = q?.trim().toLowerCase();

        if (!input || !validStats.includes(input)) {
            return reply(
                `📊 *Usage:* *.upgrade <stat>*\n\n` +
                `Available stats:\n` +
                `⚔️  *str* — Strength (ATK)\n` +
                `🧠 *int* — Intelligence (EXP gain)\n` +
                `🍀 *luk* — Luck (economy rewards)\n` +
                `🏃 *agi* — Agility (flee rate)\n` +
                `💪 *vit* — Vitality (max HP)\n` +
                `🛡️  *def* — Defense (damage reduction)\n\n` +
                `Example: *.upgrade int*`
            );
        }

        try {
            await react('⏳');

            const player = await getPlayer(sender, botId);

            if (player.statPoints < 1) {
                return reply(`❌ You have *0 stat points* available.\nLevel up to earn more! 🎮`);
            }

            const updated = await GlobalPlayer.findOneAndUpdate(
                { jid: sender, statPoints: { $gte: 1 } },
                { $inc: { statPoints: -1, [`stats.${input}`]: 1 } },
                { new: true }
            );

            if (!updated) return reply('❌ Update failed — not enough stat points.');

            const statEmoji = { str:'⚔️', int:'🧠', luk:'🍀', agi:'🏃', vit:'💪', def:'🛡️' };
            const { rankName } = getRank(updated.level, updated.jid);

            await reply(
                `┌─⊷ ${statEmoji[input]} *STAT UPGRADED!*\n` +
                `▢ 📈 ${input.toUpperCase()}: *${updated.stats[input]}*\n` +
                `▢ 🏅 Rank: *${rankName}*\n` +
                `▢ 📌 Points left: *${updated.statPoints}*\n` +
                `└───────────\n` +
                `┌─⊷ ⚔️ *CURRENT STATS*\n` +
                `▢ ⚔️ STR: *${updated.stats.str}*  🧠 INT: *${updated.stats.int}*  🍀 LUK: *${updated.stats.luk}*\n` +
                `▢ 🏃 AGI: *${updated.stats.agi}*  💪 VIT: *${updated.stats.vit}*  🛡️ DEF: *${updated.stats.def}*\n` +
                `└───────────\n` +
                `> _${fancy("malvin xd rpg", "smallcaps")}_ 💎`
            );
            await react('✅');
        } catch (err) {
            console.error('[RPG] .upgrade error:', err.message);
            await reply('❌ Upgrade failed. Try again shortly.');
        }
    }
);

// ─── .level-up card (auto-triggered — exported for rpgEngine) ────────────────
async function sendLevelUpCanvas(from, Malvin, conText, player, pfpUrl, fromLevel) {
    const name    = player.username || player.pushName || player.jid.split('@')[0];
    const { rankName } = getRank(player.level, player.jid);

    const caption =
        `┌─⊷ 🎉 *LEVEL UP!*\n` +
        `▢ 👤 Hunter: *${name}*\n` +
        `▢ ⭐ Now Level: *${player.level}*\n` +
        `▢ 🏅 Rank: *${rankName}*\n` +
        `▢ ✨ +5 Diamonds earned!\n` +
        `▢ 📌 +1 Stat Point available!\n` +
        `└───────────\n` +
        `▢ Use *.upgrade <stat>* to power up!\n` +
        `> _${fancy("malvin xd rpg", "smallcaps")}_ 💎`;

    try {
        const { MalvinTechApi, MalvinApiKey } = conText || {};
        const res = await axios.get(`${MalvinTechApi}/canvas/level-up`, {
            params: {
                apikey:        MalvinApiKey,
                backgroundURL: 'https://i.ibb.co/bjwZ2j1s/image.jpg',
                avatarURL:     pfpUrl,
                fromLevel,
                toLevel:       player.level,
                name,
            },
            timeout: 30000,
            validateStatus: () => true,
        });

        if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
            const { rawMessage } = classifyApiError(res.status, res.data);
            throw new Error(rawMessage);
        }

        await Malvin.sendMessage(from, { image: { url: res.data.data.url }, caption });
    } catch (err) {
        console.error('[RPG] level-up card error:', err.message);
        await Malvin.sendMessage(from, { text: caption });
    }
}

module.exports = { sendCanvasImage, sendLevelUpCanvas };
