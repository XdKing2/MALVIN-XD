/**
 * malvin/rpgAdmin.js
 * RPG Admin Panel — Malvin-XD Sovereign RPG
 * Owner-only commands to manage the RPG system
 *
 * .rpg-give        — Give gold/diamonds/items to a player
 * .rpg-reset       — Reset a player's RPG data
 * .rpg-setlevel    — Set a player's level
 * .rpg-setrole     — Force set a player's role
 * .rpg-ban         — Ban a player from RPG
 * .rpg-unban       — Unban a player from RPG
 * .rpg-stats       — View global RPG stats
 * .rpg-broadcast   — Send message to all registered players
 * .rpg-setworld    — Force move player to a world
 * .rpg-immortal    — Toggle immortal for a player
 * .rpg-economy     — View/adjust global economy stats
 */

const { mxd } = require('../king');
const {
    buildBox, fetchPlayer, getPlayer,
    addGold, addDiamonds, addCrystals,
    unlockTitle, unlockAchievement,
} = require('../king/rpg/db');
const { GlobalPlayer, Guild } = require('../king/rpg/model');
const { getWorldTime } = require('../king/rpg/worldTime');
const { WORLDS } = require('../king/rpg/worlds');
const { SHOP_ITEMS } = require('../king/rpg/shopItems');

// ════════════════════════════════════════════════════════════════════════════
// .rpg-give — Give resources to a player
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-give',
        aliases:     ['giverpg', 'rpggive', 'admingiverpg'],
        category:    'owner',
        react:       '🎁',
        description: 'Give gold/diamonds/items to a player — .rpg-give @player gold 10000',
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, mentionedJid, isSuperUser, botId, t } = conText;

        if (!isSuperUser) return reply('❌ Owner only command.');

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag a player.\nUsage: *.rpg-give @player <type> <amount>*');

        const type   = args[1]?.toLowerCase();
        const amount = parseInt(args[2]);

        if (!type || !amount) return reply('❌ Usage: *.rpg-give @player <gold|diamonds|crystals|item> <amount>*');

        await getPlayer(targetJid, botId);
        const target = await fetchPlayer(targetJid);
        const tName  = target?.username || targetJid.split('@')[0];

        let resultLine = '';

        if (type === 'gold') {
            await addGold(targetJid, amount);
            resultLine = `💰 +${amount.toLocaleString()} Gold`;
        } else if (type === 'diamonds') {
            await addDiamonds(targetJid, amount);
            resultLine = `💎 +${amount} Diamonds`;
        } else if (type === 'crystals') {
            await addCrystals(targetJid, amount);
            resultLine = `🔮 +${amount} Crystals`;
        } else if (SHOP_ITEMS[type]) {
            const item = SHOP_ITEMS[type];
            await GlobalPlayer.findOneAndUpdate(
                { jid: targetJid },
                { $inc: { [`inventory.${item.item}`]: amount } }
            );
            resultLine = `${item.emoji} +${amount} ${item.name}`;
        } else {
            return reply(`❌ Unknown type *${type}*.\nUse: gold, diamonds, crystals, or item name`);
        }

        await react('✅');
        await reply(
            buildBox('🎁 ADMIN GIVE', [
                `  To: *${tName}*`,
                `  ───────`,
                `  ${resultLine}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rpg-setlevel — Set a player's level
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-setlevel',
        aliases:     ['setlevelrpg', 'adminsetlevel'],
        category:    'owner',
        react:       '⭐',
        description: 'Set a player\'s level — .rpg-setlevel @player 50',
    },
    async (from, Malvin, conText) => {
        const { reply, react, args, mentionedJid, isSuperUser, botId, t } = conText;

        if (!isSuperUser) return reply(t('common.owner_only'));

        const targetJid = conText.user || mentionedJid?.[0];
        const level     = parseInt(args[1]);

        if (!targetJid || !level) return reply('❌ Usage: *.rpg-setlevel @player <level>*');
        if (level < 1 || level > 500) return reply('❌ Level must be 1-500.');

        await getPlayer(targetJid, botId);
        const target = await fetchPlayer(targetJid);
        const tName  = target?.username || targetJid.split('@')[0];

        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            { $set: { level, statPoints: level * 2 } }
        );

        await react('✅');
        await reply(
            buildBox('⭐ LEVEL SET', [
                `  Player: *${tName}*`,
                `  Level: *${level}*`,
                `  Stat Points: *${level * 2}*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rpg-reset — Reset a player's RPG data
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-reset',
        aliases:     ['resetrpg', 'adminresetrpg'],
        category:    'owner',
        react:       '🔄',
        description: 'Reset a player\'s RPG — .rpg-reset @player confirm',
    },
    async (from, Malvin, conText) => {
        const { reply, react, args, mentionedJid, isSuperUser, botId, t } = conText;

        if (!isSuperUser) return reply(t('common.owner_only'));

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply(t('rpgadmin.tag_player'));

        if (args[1] !== 'confirm') {
            return reply(buildBox('⚠️ CONFIRM RESET', [
                `  This will WIPE the player\'s RPG data!`,
                `  ───────`,
                `  Add *confirm* to proceed:`,
                `  *.rpg-reset @player confirm*`,
            ]));
        }

        await getPlayer(targetJid, botId);
        const target = await fetchPlayer(targetJid);
        const tName  = target?.username || targetJid.split('@')[0];

        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            {
                $set: {
                    level: 1, exp: 0, gold: 1000, diamonds: 0,
                    crystals: 0, rebirths: 0, statPoints: 0,
                    pets: [], jobRole: null, specialRole: null,
                    currentWorld: 'aevoria', bloodmoonsSeen: 0,
                    'stats.str': 1, 'stats.int': 1, 'stats.luk': 1,
                    'stats.agi': 1, 'stats.vit': 1, 'stats.def': 1,
                    'combat.kills': 0, 'combat.deaths': 0,
                    'combat.bossKills': 0, 'combat.dungeonClears': 0,
                    'achievements.list': [], 'achievements.titles': [],
                    'quests.completed': [], 'quests.claimable': [],
                }
            }
        );

        await react('🔄');
        await reply(buildBox('🔄 RPG RESET', [`  *${tName}*\'s RPG data has been reset.`]));
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rpg-ban / .rpg-unban — Ban player from RPG
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-ban',
        aliases:     ['banrpg', 'rpgban'],
        category:    'owner',
        react:       '🔨',
        description: 'Ban a player from RPG — .rpg-ban @player',
    },
    async (from, Malvin, conText) => {
        const { reply, react, mentionedJid, isSuperUser, botId, t } = conText;
        if (!isSuperUser) return reply(t('common.owner_only'));

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply(t('rpgadmin.tag_player'));

        await getPlayer(targetJid, botId);
        const target = await fetchPlayer(targetJid);
        const tName  = target?.username || targetJid.split('@')[0];

        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            { $set: { rpgBanned: true } }
        );

        await react('🔨');
        await reply(buildBox('🔨 RPG BANNED', [
            `  *${tName}* is banned from the RPG system.`,
        ]));
    }
);

mxd(
    {
        pattern:     'rpg-unban',
        aliases:     ['unbanrpg', 'rpgunban'],
        category:    'owner',
        react:       '✅',
        description: 'Unban a player from RPG',
    },
    async (from, Malvin, conText) => {
        const { reply, react, mentionedJid, isSuperUser, botId, t } = conText;
        if (!isSuperUser) return reply(t('common.owner_only'));

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply(t('rpgadmin.tag_player'));

        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            { $set: { rpgBanned: false } }
        );

        const target = await fetchPlayer(targetJid);
        const tName  = target?.username || targetJid.split('@')[0];

        await react('✅');
        await reply(buildBox('✅ RPG UNBANNED', [`  *${tName}* can access the RPG again.`]));
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rpg-stats — Global RPG statistics
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-stats',
        aliases:     ['rpgstats', 'rpgglobal', 'adminrpg'],
        category:    'owner',
        react:       '📊',
        description: 'View global RPG statistics',
    },
    async (from, Malvin, conText) => {
        const { reply, react, isSuperUser, t } = conText;
        if (!isSuperUser) return reply(t('common.owner_only'));

        const [
            totalPlayers,
            registeredPlayers,
            totalGuilds,
            topPlayer,
            wt,
        ] = await Promise.all([
            GlobalPlayer.countDocuments(),
            GlobalPlayer.countDocuments({ registered: true }),
            Guild.countDocuments(),
            GlobalPlayer.findOne().sort({ level: -1, exp: -1 }).select('username level exp gold'),
            getWorldTime(),
        ]);

        // World distribution
        const worldDist = await GlobalPlayer.aggregate([
            { $match: { registered: true } },
            { $group: { _id: '$currentWorld', count: { $sum: 1 } } },
        ]);

        const worldLines = worldDist.map(w => {
            const world = WORLDS[w._id] || { emoji: '🌍', name: w._id };
            return `  ${world.emoji} ${world.name}: *${w.count}*`;
        });

        await react('📊');
        await reply(
            buildBox('📊 RPG GLOBAL STATS', [
                `  👥 Total Players:  *${totalPlayers}*`,
                `  ✅ Registered:     *${registeredPlayers}*`,
                `  🏰 Total Guilds:   *${totalGuilds}*`,
                `  ───────`,
                `  🏆 Top Player: *${topPlayer?.username || 'None'}*`,
                `     Lv.${topPlayer?.level || 0} · 💰${topPlayer?.gold?.toLocaleString() || 0}`,
                `  ───────`,
                `  🌍 World Distribution:`,
                ...worldLines,
                `  ───────`,
                `  🕐 World Time: *${wt.timeOfDay}*`,
                `  📅 ${wt.dayOfMonth}th ${wt.month}, Year *${wt.year} AE*`,
                `  ⚡ Speed: *${wt.timeMultiplier}x*`,
                ...(wt.activeEvent ? [`  ${wt.activeEvent.emoji} *${wt.activeEvent.name} ACTIVE*`] : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rpg-setworld — Force move player to a world
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-setworld',
        aliases:     ['setworld', 'adminsetworld'],
        category:    'owner',
        react:       '🌍',
        description: 'Force move a player to a world — .rpg-setworld @player voidmere',
    },
    async (from, Malvin, conText) => {
        const { reply, react, args, mentionedJid, isSuperUser, botId, t } = conText;
        if (!isSuperUser) return reply(t('common.owner_only'));

        const targetJid = conText.user || mentionedJid?.[0];
        const worldKey  = args[1]?.toLowerCase();

        if (!targetJid || !worldKey) return reply('❌ Usage: *.rpg-setworld @player <world>*');
        if (!WORLDS[worldKey]) return reply(`❌ Unknown world. Options: ${Object.keys(WORLDS).join(', ')}`);

        await getPlayer(targetJid, botId);
        const target = await fetchPlayer(targetJid);
        const tName  = target?.username || targetJid.split('@')[0];
        const world  = WORLDS[worldKey];

        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            { $set: { currentWorld: worldKey } }
        );

        await react('✅');
        await reply(buildBox('🌍 WORLD SET', [
            `  Player: *${tName}*`,
            `  World: ${world.emoji} *${world.name}*`,
        ]));
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rpg-immortal — Toggle immortal for a player
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-immortal',
        aliases:     ['setimmortal', 'adminimmortal'],
        category:    'owner',
        react:       '♾️',
        description: 'Toggle immortal for a player — .rpg-immortal @player',
    },
    async (from, Malvin, conText) => {
        const { reply, react, mentionedJid, isSuperUser, botId, t } = conText;
        if (!isSuperUser) return reply(t('common.owner_only'));

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply(t('rpgadmin.tag_player'));

        await getPlayer(targetJid, botId);
        const target   = await fetchPlayer(targetJid);
        const tName    = target?.username || targetJid.split('@')[0];
        const newState = !target?.immortal;

        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            { $set: { immortal: newState } }
        );

        await react(newState ? '♾️' : '✅');
        await reply(buildBox('♾️ IMMORTAL TOGGLED', [
            `  Player: *${tName}*`,
            `  Immortal: *${newState ? 'ON ♾️' : 'OFF'}*`,
        ]));
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rpg-broadcast — Send message to all registered players
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-broadcast',
        aliases:     ['rpgbroadcast', 'rpgannounce'],
        category:    'owner',
        react:       '📢',
        description: 'Broadcast a message to all active RPG players',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q, isSuperUser, t } = conText;
        if (!isSuperUser) return reply(t('common.owner_only'));
        if (!q) return reply('❌ Usage: *.rpg-broadcast <message>*');

        const players = await GlobalPlayer.find({
            registered: true,
            lastActiveChat: { $exists: true, $ne: null },
        }).select('lastActiveChat').limit(500);

        const msg = buildBox('📢 RPG ANNOUNCEMENT', [
            `  ${q}`,
        ]);

        let sent = 0;
        for (const player of players) {
            try {
                await Malvin.sendMessage(player.lastActiveChat, { text: msg });
                sent++;
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {}
        }

        await react('✅');
        await reply(buildBox('📢 BROADCAST SENT', [
            `  Message delivered to *${sent}* players`,
        ]));
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rpg-lookup — Look up any player's full profile
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpg-lookup',
        aliases:     ['rpglookup', 'adminlookup', 'playerinfo'],
        category:    'owner',
        react:       '🔍',
        description: 'Look up a player\'s full RPG info — .rpg-lookup @player',
    },
    async (from, Malvin, conText) => {
        const { reply, react, mentionedJid, isSuperUser, botId, t } = conText;
        if (!isSuperUser) return reply(t('common.owner_only'));

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply(t('rpgadmin.tag_player'));

        await getPlayer(targetJid, botId);
        const player = await fetchPlayer(targetJid);
        if (!player) return reply(t('social.player_not_found'));

        const world = WORLDS[player.currentWorld] || WORLDS.aevoria;

        await react('🔍');
        await reply(
            buildBox('🔍 PLAYER LOOKUP', [
                `  👤 *${player.username || 'Unregistered'}*`,
                `  JID: ${targetJid.split('@')[0]}`,
                `  ───────`,
                `  ⭐ Level: *${player.level}*`,
                `  ✨ EXP:   *${player.exp?.toLocaleString()}*`,
                `  💰 Gold:  *${player.gold?.toLocaleString()}*`,
                `  💎 Diamonds: *${player.diamonds}*`,
                `  ───────`,
                `  🌍 World: *${world.emoji} ${world.name}*`,
                `  🎭 Role:  *${player.jobRole || 'None'}*`,
                `  👁️ Special: *${player.specialRole || 'None'}*`,
                `  🐾 Pets: *${(player.pets || []).length}*`,
                `  ───────`,
                `  ⚔️ Kills:   *${player.combat?.kills || 0}*`,
                `  💀 Deaths:  *${player.combat?.deaths || 0}*`,
                `  🔄 Rebirths: *${player.rebirths || 0}*`,
                `  🏰 Dungeon: *${player.combat?.dungeonClears || 0}*`,
                `  ───────`,
                `  🚫 RPG Banned: *${player.rpgBanned ? 'YES' : 'No'}*`,
                `  ♾️ Immortal: *${player.immortal ? 'YES' : 'No'}*`,
            ])
        );
    }
);
