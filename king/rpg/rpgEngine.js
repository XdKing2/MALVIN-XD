/**
 * king/rpg/rpgEngine.js
 * Universal EXP Listener & Level-Up Handler — Malvin-XD Sovereign RPG
 *
 * IMPORTANT: Only registered players earn EXP.
 * Unregistered users are completely ignored — no DB records created.
 */

const axios = require('axios');
const { GlobalPlayer }   = require('./model');
const { canLevelUp, calcMessageExp } = require('./leveling');
const { sendLevelUpCard, getRank } = require('./ranks');
const { standardizeJid } = require('../socket/msgSerializer');
const { getProfilePic }  = require('../socket/groupListener');

// ─── Anti-spam cooldown store ─────────────────────────────────────────────────
const _cooldowns = new Map();

function _isOnCooldown(jid) {
    const last = _cooldowns.get(jid);
    if (!last) return false;
    const window = 30000 + Math.floor(Math.random() * 30000);
    return Date.now() - last < window;
}

function _setCooldown(jid) {
    _cooldowns.set(jid, Date.now());
    setTimeout(() => _cooldowns.delete(jid), 90000);
}

// ─── Core level-up processor ──────────────────────────────────────────────────
async function _processLevelUps(player, Malvin, from, pushName) {
    let levelled  = false;
    let fromLevel = player.level;

    while (canLevelUp(player)) {
        const prevLevel = player.level;
        player = await GlobalPlayer.findOneAndUpdate(
            { jid: player.jid },
            { $inc: { level: 1, diamonds: 5, statPoints: 1 } },
            { new: true }
        );
        fromLevel = prevLevel;
        levelled  = true;
    }

    if (levelled) {
        const pfpUrl = await getProfilePic(Malvin, player.jid).catch(
            () => 'https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg'
        );
        // Use username on level-up card
        player.pushName = player.username || pushName || player.jid.split('@')[0];
        await sendLevelUpCard(Malvin, from, player, pfpUrl, fromLevel);
    }

    return levelled;
}

// ─── EXP grant (atomic $inc) ──────────────────────────────────────────────────
async function grantEXP(jid, expAmt, goldAmt = 0, Malvin, from, botId, pushName) {
    try {
        // Only grant to registered players — no upsert
        const player = await GlobalPlayer.findOneAndUpdate(
            { jid, registered: true },
            {
                $inc: { exp: expAmt, gold: goldAmt },
                $set: { lastBotUsed: botId },
            },
            { new: true }
        );

        if (!player) return; // not registered — silently skip
        await _processLevelUps(player, Malvin, from, pushName);
    } catch (err) {
        console.error('[RPG] grantEXP error:', err.message);
    }
}

// ─── Main message EXP handler ─────────────────────────────────────────────────
async function handleMessageEXP(ms, Malvin, botId) {
    try {
        if (!ms?.message || !ms?.key) return;

        const { key, message, pushName } = ms;
        const from = standardizeJid(key.remoteJid);

        if (!from || from === 'status@broadcast') return;

        const playerJid = key.fromMe
            ? standardizeJid(botId)
            : standardizeJid(key.participant || key.remoteJid);

        if (!playerJid) return;

        // ── REGISTERED PLAYERS ONLY ──────────────────────────────────────────
        // Do NOT create any records here. Only lookup existing registered players.
        const player = await GlobalPlayer.findOne({ jid: playerJid, registered: true });
        if (!player) return; // unregistered — completely ignored

        // Auto-update LID silently if available
        const lid = key.senderPn || key.lid || null;
        if (lid && !player.lid) {
            GlobalPlayer.updateOne({ jid: playerJid }, { $set: { lid } }).catch(() => {});
        }

        if (_isOnCooldown(playerJid)) return;
        _setCooldown(playerJid);

        const body =
            message?.conversation ||
            message?.extendedTextMessage?.text ||
            message?.imageMessage?.caption ||
            message?.videoMessage?.caption ||
            '';

        if (!body || body.startsWith('.')) return;

        const intStat = player.stats?.int || 1;
        const expAmt  = calcMessageExp(body.length, intStat);
        const goldAmt = Math.floor(expAmt * 0.3);

        await grantEXP(playerJid, expAmt, goldAmt, Malvin, from, botId, pushName);
    } catch (err) {
        console.error('[RPG] handleMessageEXP error:', err.message);
    }
}

// ─── Command bonus (registered only) ─────────────────────────────────────────
async function grantCommandBonus(sender, Malvin, from, botId, pushName) {
    if (!sender) return;
    await grantEXP(sender, 25, 10, Malvin, from, botId, pushName).catch(() => {});
}

module.exports = {
    handleMessageEXP,
    grantEXP,
    grantCommandBonus,
};
