/**
 * malvin/origin.js
 * Origin Suite — Malvin-XD Sovereign RPG
 * 13 Admin Commands exclusively for the bot owner (JID: 263776388689)
 *
 * Commands: .bless .glitch .curse .set-player .world-reset
 *           .give-shadow .force-rank .system-bc .shadow-ban
 *           .maintenance .event-start .add-diamond .set-karma
 */

const { mxd } = require('../king');
const {
    getPlayer, fetchPlayer,
    addDiamonds, giveDiamonds, addGold, forceSetLevel, forceSetGold,
    shadowBan, unban, jailPlayer, releaseJail,
    addKarma, setKarma, setBloodline, addShadow,
    startWorldEvent, endWorldEvent, getActiveEvents,
    buildBox, buildFooter, getRankMultiplier,
} = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { GlobalPlayer, WorldEvent } = require('../king/rpg/model');

// ─── Owner guard ──────────────────────────────────────────────────────────────
const OWNER_JID = '263776388689';

function isOrigin(jid = '') {
    return jid.includes(OWNER_JID);
}

function originOnly(conText) {
    if (!isOrigin(conText.sender)) {
        conText.react('🚫');
        conText.reply(
            buildBox('ACCESS DENIED', [
                '  This command is restricted to',
                '       ⚔️  The Origin  ⚔️',
            ])
        );
        return false;
    }
    return true;
}

// Helper: get target JID from mention or quoted message
function getTarget(conText) {
    return conText.user
        || conText.quoted?.sender
        || conText.mentionedJid?.[0]
        || null;
}

// ─── .bless ───────────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'bless',
        category:    'origin',
        react:       '✨',
        description: '[ORIGIN] Bless a player with gold, diamonds & EXP',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply('❌ Tag or reply to a user to bless them.');

        const gold     = parseInt(args[0]) || 5000;
        const diamonds = parseInt(args[1]) || 10;
        const exp      = parseInt(args[2]) || 500;

        await getPlayer(target);
        await addGold(target, gold);
        await addDiamonds(target, diamonds);
        await GlobalPlayer.updateOne({ jid: target }, { $inc: { exp } });

        await react('✨');
        await reply(
            buildBox('🌟 DIVINE BLESSING', [
                `  Target: @${target.split('@')[0]}`,
                `  💰 Gold:     +${gold.toLocaleString()}`,
                `  💎 Diamonds: +${diamonds}`,
                `  ✨ EXP:      +${exp}`,
                `  Granted by the Origin 👑`,
            ])
        );
    }
);

// ─── .glitch ──────────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'glitch',
        category:    'origin',
        react:       '⚡',
        description: '[ORIGIN] Force a player to instantly level up X times',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply(t('origin.tag_or_reply_user'));

        const times = Math.min(parseInt(args[0]) || 1, 50); // cap at 50 levels

        await getPlayer(target);
        const player = await GlobalPlayer.findOneAndUpdate(
            { jid: target },
            { $inc: { level: times, diamonds: times * 5, statPoints: times, skillPoints: times } },
            { new: true }
        );

        const { rankName } = getRank(player.level, player.jid);
        await react('⚡');
        await reply(
            buildBox('⚡ SYSTEM GLITCH', [
                `  Target: @${target.split('@')[0]}`,
                `  📈 Levelled up x${times}`,
                `  ⭐ New Level: ${player.level}`,
                `  🏅 New Rank:  ${rankName}`,
                `  💎 +${times * 5} Diamonds`,
                `  📊 +${times} Stat Points`,
            ])
        );
    }
);

// ─── .curse ───────────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'curse',
        category:    'origin',
        react:       '🩸',
        description: '[ORIGIN] Curse a player — drain gold, reduce level, set dark karma',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply(t('origin.tag_or_reply_user'));

        const levels  = Math.min(parseInt(args[0]) || 1, 20);
        const goldDrain = parseInt(args[1]) || 1000;

        await getPlayer(target);
        const player = await GlobalPlayer.findOneAndUpdate(
            { jid: target },
            {
                $inc: { level: -levels, karma: -500 },
                $set: { alignment: 'Chaos', gold: 0 },
            },
            { new: true }
        );

        await react('🩸');
        await reply(
            buildBox('🩸 DIVINE CURSE', [
                `  Target: @${target.split('@')[0]}`,
                `  📉 Level: -${levels} → ${Math.max(1, player.level)}`,
                `  💰 Gold drained to 0`,
                `  ☠️  Karma: -500 (Chaos)`,
                `  Cursed by the Origin 👑`,
            ])
        );
    }
);

// ─── .set-player ──────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'set-player',
        category:    'origin',
        react:       '👤',
        description: '[ORIGIN] Designate this month\'s chosen Player (uncapped growth)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply(t('origin.tag_or_reply_user'));

        // Clear previous Player designation first
        await GlobalPlayer.updateMany({ isPlayer: true }, { $set: { isPlayer: false } });
        await GlobalPlayer.updateOne({ jid: target }, { $set: { isPlayer: true } });

        await react('👤');
        await reply(
            buildBox('👤 THE PLAYER AWAKENS', [
                `  @${target.split('@')[0]} has been chosen`,
                `  as this month's THE PLAYER.`,
                `  ∞ Growth cap: REMOVED`,
                `  ⚡ All rewards: 2x`,
                `  Chosen by the Origin 👑`,
            ])
        );
    }
);

// ─── .world-reset ─────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'world-reset',
        category:    'origin',
        react:       '🌍',
        description: '[ORIGIN] Broadcast a world reset warning (does NOT wipe data)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const reason = args.join(' ') || 'The Origin has decreed it.';

        await react('🌍');
        await reply(
            buildBox('⚠️  WORLD RESET INCOMING', [
                `  ⚠️  A world reset has been called.`,
                `  Reason: ${reason}`,
                `  All seasonal data will be archived.`,
                `  New season begins shortly.`,
                `  — The Origin 👑`,
            ])
        );
    }
);

// ─── .give-shadow ─────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'give-shadow',
        category:    'origin',
        react:       '👥',
        description: '[ORIGIN] Grant a named shadow soldier to a player',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply(t('origin.tag_or_reply_user'));

        const shadowName  = args[0] || 'Igris';
        const shadowRank  = args[1]?.toUpperCase() || 'S';
        const shadowPower = parseInt(args[2]) || 9999;

        await getPlayer(target);
        const result = await addShadow(target, {
            name:  shadowName,
            rank:  shadowRank,
            level: 1,
            power: shadowPower,
        });

        if (!result.success) {
            return reply(`❌ ${result.reason}`);
        }

        await react('👥');
        await reply(
            buildBox('👥 SHADOW GRANTED', [
                `  Target: @${target.split('@')[0]}`,
                `  Shadow: ${shadowName}`,
                `  Rank:   ${shadowRank}-Rank`,
                `  Power:  ${shadowPower.toLocaleString()}`,
                `  Granted by the Origin 👑`,
            ])
        );
    }
);

// ─── .force-rank ──────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'force-rank',
        category:    'origin',
        react:       '🏅',
        description: '[ORIGIN] Force set a player\'s level to match a specific rank',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply(t('origin.tag_or_reply_user'));

        const rankLevelMap = {
            'f': 1, 'e': 10, 'd': 25, 'c': 45, 'b': 65,
            'a': 85, 's': 100, 'ss': 125, 'sss': 150,
            'national': 200, 'monarch': 250, 'origin': 400,
        };

        const rankInput = args[0]?.toLowerCase();
        const level     = rankLevelMap[rankInput];

        if (!level) {
            return reply(
                `❌ Invalid rank. Choose from:\n` +
                `F, E, D, C, B, A, S, SS, SSS, National, Monarch, Origin`
            );
        }

        await getPlayer(target);
        await forceSetLevel(target, level);
        const { rankName } = getRank(level, target);

        await react('🏅');
        await reply(
            buildBox('🏅 RANK FORCED', [
                `  Target: @${target.split('@')[0]}`,
                `  🏅 Rank:  ${rankName}`,
                `  ⭐ Level: ${level}`,
                `  Set by the Origin 👑`,
            ])
        );
    }
);

// ─── .system-bc ───────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'system-bc',
        category:    'origin',
        react:       '📢',
        description: '[ORIGIN] Send a global system broadcast message',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, q, t } = conText;
        if (!q) return reply('❌ Usage: .system-bc <message>');

        await react('📢');
        await reply(
            buildBox('📢 SYSTEM BROADCAST', [
                ``,
                `  ${q}`,
                ``,
                `  — Origin Malvin-XD 👑`,
            ])
        );
    }
);

// ─── .shadow-ban ──────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'shadow-ban',
        category:    'origin',
        react:       '🚫',
        description: '[ORIGIN] Shadow ban a player from using RPG commands',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply(t('origin.tag_or_reply_user'));

        // Optional duration in hours (default: permanent)
        const hours  = parseInt(args[0]) || 0;
        const until  = hours ? new Date(Date.now() + hours * 3600000) : null;

        await getPlayer(target);
        await shadowBan(target, until);

        await react('🚫');
        await reply(
            buildBox('🚫 SHADOW BAN', [
                `  Target: @${target.split('@')[0]}`,
                `  Duration: ${hours ? `${hours} hour(s)` : 'Permanent'}`,
                `  Status: Exiled from the system`,
                `  By the Origin 👑`,
            ])
        );
    }
);

// ─── .maintenance ─────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'maintenance',
        category:    'origin',
        react:       '🔧',
        description: '[ORIGIN] Toggle maintenance mode message',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, q, t } = conText;

        const msg = q || 'System undergoing maintenance. Back soon.';
        await react('🔧');
        await reply(
            buildBox('🔧 MAINTENANCE MODE', [
                `  ⚠️  System is under maintenance.`,
                `  ${msg}`,
                `  Please stand by...`,
                `  — Origin Malvin-XD 👑`,
            ])
        );
    }
);

// ─── .event-start ─────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'event-start',
        category:    'origin',
        react:       '🎉',
        description: '[ORIGIN] Start a global world event',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, sender, t } = conText;

        // Usage: .event-start <type> <name> <duration_hours> <gold> <diamonds>
        const type     = args[0] || 'festival';
        const name     = args[1]?.replace(/_/g, ' ') || 'World Event';
        const hours    = parseInt(args[2]) || 24;
        const goldRew  = parseInt(args[3]) || 5000;
        const diaRew   = parseInt(args[4]) || 20;

        const validTypes = ['boss', 'raid', 'festival', 'war', 'rift'];
        if (!validTypes.includes(type)) {
            return reply(`❌ Event type must be: ${validTypes.join(', ')}`);
        }

        const event = await startWorldEvent(
            {
                name,
                type,
                endsAt: new Date(Date.now() + hours * 3600000),
                rewards: { gold: goldRew, diamonds: diaRew, exp: 1000, crystals: 5 },
            },
            sender
        );

        await react('🎉');
        await reply(
            buildBox(`🎉 EVENT STARTED: ${name.toUpperCase()}`, [
                `  Type:     ${type.toUpperCase()}`,
                `  Duration: ${hours} hour(s)`,
                `  💰 Gold:     ${goldRew.toLocaleString()}`,
                `  💎 Diamonds: ${diaRew}`,
                `  ✨ EXP:      1,000`,
                `  🔮 Crystals: 5`,
                `  Started by the Origin 👑`,
            ])
        );
    }
);

// ─── .add-diamond ─────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'add-diamond',
        category:    'origin',
        react:       '💎',
        description: '[ORIGIN] Add diamonds to a player',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply(t('origin.tag_or_reply_user'));

        const amount = parseInt(args[0]) || 10;
        if (amount <= 0) return reply('❌ Amount must be positive.');

        await getPlayer(target);
        const player = await addDiamonds(target, amount);

        await react('💎');
        await reply(
            buildBox('💎 DIAMONDS GRANTED', [
                `  Target:  @${target.split('@')[0]}`,
                `  +${amount} Diamonds`,
                `  Total:   ${player.diamonds} 💎`,
                `  By the Origin 👑`,
            ])
        );
    }
);

// ─── .set-karma ───────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'set-karma',
        category:    'origin',
        react:       '⚖️',
        description: '[ORIGIN] Set a player\'s karma to an exact value',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, args, t } = conText;
        const target = getTarget(conText);
        if (!target) return reply(t('origin.tag_or_reply_user'));

        const value = parseInt(args[0]);
        if (isNaN(value)) return reply('❌ Usage: .set-karma @user <value>\nExample: .set-karma @user -1000');

        await getPlayer(target);
        const player = await setKarma(target, value);

        const alignEmoji = {
            Light:   '☀️',
            Neutral: '⚖️',
            Dark:    '🌑',
            Chaos:   '☠️',
        }[player.alignment] || '⚖️';

        await react('⚖️');
        await reply(
            buildBox('⚖️  KARMA SET', [
                `  Target:    @${target.split('@')[0]}`,
                `  Karma:     ${value}`,
                `  Alignment: ${alignEmoji} ${player.alignment}`,
                `  Set by the Origin 👑`,
            ])
        );
    }
);

// ─── .wipe-users ─────────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'wipe-users',
        category:    'origin',
        react:       '☠️',
        description: '[ORIGIN] Permanently delete ALL RPG player data from MongoDB',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        if (!originOnly(conText)) return;
        const { reply, react, q, t } = conText;

        // Require confirmation phrase to prevent accidents
        if (q?.trim() !== 'CONFIRM') {
            return reply(
                buildBox('☠️  WIPE USERS — CONFIRMATION REQUIRED', [
                    `  This will permanently delete ALL player data.`,
                    `  There is NO undo.`,
                    `  ─────────────────────`,
                    `  To confirm, type:`,
                    `  *.wipe-users CONFIRM*`,
                ])
            );
        }

        await react('⏳');

        const result = await GlobalPlayer.deleteMany({});

        await react('☠️');
        await reply(
            buildBox('☠️  DATABASE WIPED', [
                `  All RPG player data has been deleted.`,
                `  Players deleted: ${result.deletedCount}`,
                `  ─────────────────────`,
                `  The database is now empty.`,
                `  Players must re-register with *.start*`,
                `  ─────────────────────`,
                `  Executed by: Origin 👑`,
            ])
        );
    }
);

module.exports = {};
