/**
 * malvin/worldTravel.js
 * World Travel + World Time Commands — Malvin-XD Sovereign RPG
 *
 * ── World Travel ──────────────────────────────────────────────────────────
 * .worlds       — View all worlds
 * .worldtravel  — Travel to another world
 * .worldescape  — Emergency escape back to Aevoria (costs gold)
 * .myworldinfo  — View current world info + weather
 * .wquests      — View world quests for current world
 * .wquestclaim  — Claim a world quest reward
 *
 * ── World Time ────────────────────────────────────────────────────────────
 * .worldtime  — View current world time
 * .worldmod   — View active gameplay modifiers
 * .settime    — [Owner] Set time multiplier
 * .forceevent — [Owner] Force a world event
 * .skipseason — [Owner] Skip to a season
 * .clearworld — [Owner] Clear forced events
 */

const { mxd } = require('../king');
const {
    buildBox, fetchPlayer, getPlayer,
    removeGold, addGold, addDiamonds, grantExp, unlockTitle,
} = require('../king/rpg/db');
const {
    WORLDS, getWorld, getWorldWeather, getWorldQuests,
    getWorldQuestDef, canTravelTo,
} = require('../king/rpg/worlds');
const {
    getWorldTime,
    getWorldModifiers,
    formatWorldTime,
    setTimeMultiplier,
    forceEvent,
    clearForcedEvent,
    skipToSeason,
    getPlayerAge,
} = require('../king/rpg/worldTime');
const { GlobalPlayer } = require('../king/rpg/model');

const TRAVEL_COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours

function formatCooldown(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
}

// ════════════════════════════════════════════════════════════════════════════
// .worlds — View all available worlds
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'worlds',
        aliases:     ['worldlist', 'allworlds', 'realms'],
        category:    'rpg',
        react:       '🌍',
        description: 'View all available worlds',
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const worldLines = Object.entries(WORLDS).map(([key, w]) => {
            const unlocked = player.level >= w.minLevel;
            const current  = player.currentWorld === key;
            const status   = current ? '📍' : unlocked ? '✅' : '🔒';
            return [
                `  ${status} ${w.emoji} *${w.name}*${current ? ' *(HERE)*' : ''}`,
                `     ${w.description}`,
                `     Req: Lv.${w.minLevel} · Cost: ${w.travelCost ? w.travelCost.toLocaleString() + 'g' : 'FREE'}`,
                `     EXP: ${w.multipliers.exp}x · Gold: ${w.multipliers.gold}x`,
            ].join('\n');
        });

        await react('🌍');
        await reply(
            buildBox('🌍 WORLDS OF AEVORIA', [
                `  Your Level: *${player.level}*`,
                `  Current World: *${getWorld(player.currentWorld).name}*`,
                `  ───────`,
                ...worldLines.map((l, i) => i < worldLines.length - 1 ? l + '\n  ───────' : l),
                `  ───────`,
                `  Use *.worldtravel <world>* to travel`,
                `  Travel cooldown: *6 hours*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .worldtravel — Travel to another world
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'worldtravel',
        aliases:     ['tworld', 'wtravel', 'enterworld'],
        category:    'rpg',
        react:       '🌀',
        description: 'Travel to another world — .worldtravel <world name>',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        if (!q) return reply(
            buildBox('🌀 WORLD TRAVEL', [
                `  Usage: *.worldtravel <world>*`,
                `  ───────`,
                `  🌍 aevoria   — Starter realm (free)`,
                `  🌑 voidmere  — Lv50+ (5,000g)`,
                `  🔥 infernum  — Lv100+ (15,000g)`,
                `  ❄️ glacivorn — Lv150+ (25,000g)`,
            ])
        );

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);
        const name     = player.username || pushName;
        const worldKey = q.trim().toLowerCase();
        const world    = WORLDS[worldKey];

        if (!world) return reply(`❌ Unknown world *${q}*.\nOptions: aevoria, voidmere, infernum, glacivorn`);

        // Already there
        if (player.currentWorld === worldKey) {
            return reply(`❌ You are already in *${world.name}*!`);
        }

        // Check travel cooldown (skip for Aevoria return — that uses .worldescape)
        const now      = Date.now();
        const lastTravel = player.lastWorldTravel ? new Date(player.lastWorldTravel).getTime() : 0;
        const elapsed  = now - lastTravel;

        if (elapsed < TRAVEL_COOLDOWN && lastTravel > 0) {
            const remaining = TRAVEL_COOLDOWN - elapsed;
            return reply(
                buildBox('⏳ TRAVEL COOLDOWN', [
                    `  You must wait before traveling again.`,
                    `  ───────`,
                    `  ⏱️ Ready in: *${formatCooldown(remaining)}*`,
                    `  ───────`,
                    `  Emergency escape: *.worldescape* (5,000g)`,
                ])
            );
        }

        // Check level + gold requirements
        const check = canTravelTo(player, worldKey);
        if (!check.can) {
            return reply(buildBox('❌ CANNOT TRAVEL', [`  ${check.reason}`]));
        }

        // Deduct travel cost
        if (world.travelCost > 0) {
            await removeGold(sender, world.travelCost);
        }

        // Set world + cooldown
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            {
                $set: {
                    currentWorld:    worldKey,
                    lastWorldTravel: new Date(),
                }
            }
        );

        // Get current weather in new world
        const weather = getWorldWeather(worldKey);
        const wt      = await getWorldTime();

        await react('🌀');
        await reply(
            buildBox(`${world.emoji} ARRIVED IN ${world.name.toUpperCase()}`, [
                `  Welcome, *${name}*!`,
                `  ───────`,
                `  ${world.description}`,
                `  ───────`,
                `  ${weather.emoji} Weather: *${weather.name}*`,
                `  ${weather.desc}`,
                `  ───────`,
                `  📈 EXP:   *${world.multipliers.exp}x*`,
                `  💰 Gold:  *${world.multipliers.gold}x*`,
                `  🎁 Drops: *${world.multipliers.drop}x*`,
                `  ───────`,
                world.travelCost ? `  💰 Travel cost: -${world.travelCost.toLocaleString()} Gold` : `  ✅ Free travel`,
                `  ⏳ Next travel available in *6 hours*`,
                `  ───────`,
                `  Use *.wquests* for world quests`,
                `  Use *.worldescape* to return early (5,000g)`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .worldescape — Emergency escape back to Aevoria
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'worldescape',
        aliases:     ['wescape', 'escapworld', 'returnworld'],
        category:    'rpg',
        react:       '🚪',
        description: 'Emergency escape back to Aevoria (costs 5,000 Gold)',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        if (player.currentWorld === 'aevoria') {
            return reply(`❌ You are already in *Aevoria*!`);
        }

        const ESCAPE_COST = 5000;
        if (player.gold < ESCAPE_COST) {
            return reply(
                buildBox('❌ INSUFFICIENT GOLD', [
                    `  Emergency escape costs *5,000 Gold*`,
                    `  Your balance: *${player.gold.toLocaleString()} Gold*`,
                    `  ───────`,
                    `  Wait for cooldown or earn more gold!`,
                ])
            );
        }

        const prevWorld = getWorld(player.currentWorld);
        await removeGold(sender, ESCAPE_COST);
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            {
                $set: {
                    currentWorld:    'aevoria',
                    lastWorldTravel: new Date(),
                }
            }
        );

        await react('🚪');
        await reply(
            buildBox('🚪 ESCAPED TO AEVORIA', [
                `  *${name}* has returned to Aevoria!`,
                `  ───────`,
                `  From: ${prevWorld.emoji} *${prevWorld.name}*`,
                `  To:   🌍 *Aevoria*`,
                `  ───────`,
                `  💰 Escape cost: -5,000 Gold`,
                `  ⏳ Travel cooldown reset`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .myworldinfo — Current world info + weather
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'myworldinfo',
        aliases:     ['worldinfo', 'winfo', 'currentworld'],
        category:    'rpg',
        react:       '🌐',
        description: 'View your current world info and weather',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const name    = player.username || pushName;
        const world   = getWorld(player.currentWorld);
        const weather = getWorldWeather(player.currentWorld);
        const wt      = await getWorldTime();

        const now      = Date.now();
        const last     = player.lastWorldTravel ? new Date(player.lastWorldTravel).getTime() : 0;
        const elapsed  = now - last;
        const cdLeft   = Math.max(0, TRAVEL_COOLDOWN - elapsed);

        await react('🌐');
        await reply(
            buildBox(`${world.emoji} ${world.name.toUpperCase()}`, [
                `  Hunter: *${name}*`,
                `  ───────`,
                `  ${world.description}`,
                `  ───────`,
                `  ${weather.emoji} Weather: *${weather.name}*`,
                `  ${weather.desc}`,
                `  ───────`,
                `  📈 EXP:    *${world.multipliers.exp}x*`,
                `  💰 Gold:   *${world.multipliers.gold}x*`,
                `  🎁 Drops:  *${world.multipliers.drop}x*`,
                `  🌾 Gather: *${world.multipliers.gather}x*`,
                `  ───────`,
                `  ${wt.timeEmoji} *${wt.timeOfDay}*  ${wt.seasonEmoji} *${wt.season}*`,
                `  ───────`,
                cdLeft > 0
                    ? `  ⏳ Travel cooldown: *${formatCooldown(cdLeft)}*`
                    : `  ✅ Ready to travel!`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .wquests — View world quests for current world
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'wquests',
        aliases:     ['worldquests', 'wq', 'worldmission'],
        category:    'rpg',
        react:       '📋',
        description: 'View world quests for your current world',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);
        const name     = player.username || pushName;
        const worldKey = player.currentWorld || 'aevoria';
        const world    = getWorld(worldKey);
        const quests   = getWorldQuests(worldKey);
        const done     = player.worldQuestsComplete || [];
        const claimable= player.worldQuestsClaimable || [];
        const progress = player.worldQuestProgress?.get?.(worldKey) || {};

        function buildBar(cur, target, len = 8) {
            const pct    = Math.min(1, cur / target);
            const filled = Math.floor(pct * len);
            return `[${'▓'.repeat(filled)}${'░'.repeat(len - filled)}]`;
        }

        const questLines = quests.map(q => {
            const isDone      = done.includes(q.id);
            const isClaim     = claimable.includes(q.id);
            const cur         = (progress[q.track] || 0);
            const pct         = Math.min(100, Math.floor((cur / q.target) * 100));
            const bar         = buildBar(cur, q.target);
            const status      = isDone ? '✅' : isClaim ? '🎁' : `${cur}/${q.target}`;
            const rewardParts = [];
            if (q.reward.gold)     rewardParts.push(`💰${q.reward.gold.toLocaleString()}`);
            if (q.reward.exp)      rewardParts.push(`✨${q.reward.exp.toLocaleString()}`);
            if (q.reward.diamonds) rewardParts.push(`💎${q.reward.diamonds}`);

            return [
                `  ${q.emoji} *${q.title}*`,
                `     ${q.desc}`,
                `     ${bar} ${status}`,
                `     ${rewardParts.join(' · ')}`,
                isClaim ? `     *.wquestclaim ${q.id}*` : '',
            ].filter(Boolean).join('\n');
        });

        await react('📋');
        await reply(
            buildBox(`${world.emoji} ${world.name.toUpperCase()} QUESTS`, [
                `  Hunter: *${name}*`,
                `  ───────`,
                ...questLines.map((l, i) => i < questLines.length - 1 ? l + '\n  ───────' : l),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .wquestclaim — Claim a world quest reward
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'wquestclaim',
        aliases:     ['claimwquest', 'wqclaim'],
        category:    'rpg',
        react:       '🎁',
        description: 'Claim a world quest reward — .wquestclaim <quest id>',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.wquestclaim <quest id>*\nCheck *.wquests* for claimable rewards.');

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);
        const name     = player.username || pushName;
        const id       = q.trim();
        const def      = getWorldQuestDef(id);

        if (!def) return reply(`❌ World quest *${id}* not found.`);

        const done     = player.worldQuestsComplete  || [];
        const claimable= player.worldQuestsClaimable || [];

        if (done.includes(id))      return reply(`❌ Already claimed *${def.title}*!`);
        if (!claimable.includes(id)) return reply(`❌ Quest not ready to claim yet.\nCheck *.wquests* for progress.`);

        // Move to completed
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            {
                $pull:     { worldQuestsClaimable: id },
                $addToSet: { worldQuestsComplete:  id },
            }
        );

        // Grant rewards
        const reward = def.reward;
        if (reward.gold)     await addGold(sender, reward.gold);
        if (reward.diamonds) await addDiamonds(sender, reward.diamonds);
        if (reward.exp)      await grantExp(sender, reward.exp, 0, botId);
        if (reward.title)    await unlockTitle(sender, reward.title);

        const world = getWorld(def.world);
        await react('🎁');
        await reply(
            buildBox(`🎁 WORLD QUEST COMPLETE!`, [
                `  ${def.emoji} *${def.title}*`,
                `  World: ${world.emoji} *${world.name}*`,
                `  ───────`,
                `  Rewards:`,
                ...(reward.gold     ? [`  💰 +${reward.gold.toLocaleString()} Gold`]   : []),
                ...(reward.exp      ? [`  ✨ +${reward.exp.toLocaleString()} EXP`]     : []),
                ...(reward.diamonds ? [`  💎 +${reward.diamonds} Diamonds`]            : []),
                ...(reward.title    ? [`  🎯 Title: *${reward.title}*`]                : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .worldtime — View current Aevoria world time
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'worldtime',
        aliases:     ['wtime', 'aevoria', 'worldclock'],
        category:    'rpg',
        react:       '🌍',
        description: 'View current Aevoria world time',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player?.username || pushName;
        const wt     = await getWorldTime();
        const wtLines = await formatWorldTime();

        // Player age
        let ageLine = null;
        if (player?.birthYear) {
            const age = await getPlayerAge(player);
            ageLine = `  👤 ${name} — Age *${age}* AE${player.immortal ? ' ♾️' : ''}`;
        }

        const hourStr = String(wt.hour).padStart(2, '0');
        const minStr  = String(wt.minute).padStart(2, '0');

        await react('🌍');
        await reply(
            buildBox('🌍 AEVORIA WORLD TIME', [
                ...wtLines,
                ...(ageLine ? [`  ───────`, ageLine] : []),
                `  ───────`,
                `  ⚡ Speed: *${wt.timeMultiplier === 0 ? 'FROZEN' : wt.timeMultiplier + 'x'}*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .worldmod — View active world gameplay modifiers
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'worldmod',
        aliases:     ['worldbuff', 'worldeffect', 'wmod'],
        category:    'rpg',
        react:       '⚡',
        description: 'View active world gameplay modifiers',
    },
    async (from, Malvin, conText) => {
        const { reply, react, t } = conText;

        const mods = await getWorldModifiers();
        const wt   = mods.worldTime;

        const lines = [
            `  🌍 *${wt.worldName}* — ${wt.timeEmoji} ${wt.timeOfDay}`,
            `  ${wt.seasonEmoji} Season: *${wt.season}*`,
            `  ───────`,
            `  📈 EXP Multiplier:  *${mods.expMultiplier.toFixed(1)}x*`,
            `  💰 Gold Multiplier: *${mods.goldMultiplier.toFixed(1)}x*`,
            `  🎁 Drop Rate Bonus: *+${mods.dropRateBonus}%*`,
            `  ⚔️ Enemy Power:     *+${mods.enemyPowerBoost}%*`,
            `  🌾 Harvest Bonus:   *+${mods.harvestBonus}%*`,
            `  🍖 Hunger Drain:    *+${mods.hungerDrainBoost}%*`,
        ];

        if (mods.description.length > 0) {
            lines.push(`  ───────`);
            lines.push(`  Active Effects:`);
            mods.description.forEach(d => lines.push(`  • ${d}`));
        }

        await react('⚡');
        await reply(buildBox('⚡ WORLD MODIFIERS', lines));
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .settime — [Owner] Set world time multiplier
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'settime',
        aliases:     ['settimemult', 'worldspeed'],
        category:    'owner',
        react:       '⏱️',
        description: 'Set world time multiplier (0=freeze, 1=normal, 2=double)',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q, isSuperUser, t } = conText;

        if (!isSuperUser) return reply(t('common.owner_only'));
        if (!q) return reply('❌ Usage: *.settime <multiplier>*\nExamples: *.settime 0* (freeze) · *.settime 1* (normal) · *.settime 2* (2x speed)');

        const mult = parseFloat(q);
        if (isNaN(mult) || mult < 0 || mult > 10) {
            return reply('❌ Multiplier must be between 0 and 10.');
        }

        await setTimeMultiplier(mult);
        await react('✅');
        await reply(
            buildBox('⏱️ WORLD TIME UPDATED', [
                `  ⚡ Multiplier: *${mult === 0 ? 'FROZEN ❄️' : mult + 'x'}*`,
                `  ───────`,
                mult === 0
                    ? `  Time is frozen across Aevoria.`
                    : `  Time flows at *${mult}x* normal speed.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .forceevent — [Owner] Force a world event
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'forceevent',
        aliases:     ['wevent', 'worldevent'],
        category:    'owner',
        react:       '🌕',
        description: 'Force a world event (bloodmoon/eclipse) for X hours',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q, isSuperUser, t } = conText;

        if (!isSuperUser) return reply(t('common.owner_only'));
        if (!q) return reply('❌ Usage: *.forceevent <bloodmoon|eclipse> [hours]*\nExample: *.forceevent bloodmoon 3*');

        const args     = q.trim().split(/\s+/);
        const event    = args[0]?.toLowerCase();
        const duration = parseInt(args[1]) || 3;

        const validEvents = ['bloodmoon', 'eclipse'];
        if (!validEvents.includes(event)) {
            return reply(`❌ Valid events: *bloodmoon*, *eclipse*`);
        }

        await forceEvent(event, duration);
        await react('🌕');
        await reply(
            buildBox(`🌕 EVENT FORCED`, [
                `  Event: *${event.charAt(0).toUpperCase() + event.slice(1)}*`,
                `  Duration: *${duration} hours*`,
                `  ───────`,
                event === 'bloodmoon'
                    ? `  🌕 +50% EXP · +30% drops · enemies LETHAL`
                    : `  🌑 +30% EXP · +20% drops`,
                `  ───────`,
                `  Auto-clears after ${duration} hours.`,
                `  Use *.clearworld* to end early.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .skipseason — [Owner] Skip world to a specific season
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'skipseason',
        aliases:     ['setseason', 'worldseason'],
        category:    'owner',
        react:       '🍂',
        description: 'Skip world time to a specific season',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q, isSuperUser, t } = conText;

        if (!isSuperUser) return reply(t('common.owner_only'));
        if (!q) return reply('❌ Usage: *.skipseason <winter|spring|summer|autumn>*');

        const season = q.trim().toLowerCase();
        const valid  = ['winter', 'spring', 'summer', 'autumn'];
        if (!valid.includes(season)) {
            return reply(`❌ Valid seasons: *winter*, *spring*, *summer*, *autumn*`);
        }

        try {
            await skipToSeason(season);
            const wt = await getWorldTime();
            await react('✅');
            await reply(
                buildBox('🍂 SEASON CHANGED', [
                    `  Season: *${wt.season}* ${wt.seasonEmoji}`,
                    `  Month:  *${wt.month}*`,
                    `  Year:   *${wt.year} AE*`,
                ])
            );
        } catch (e) {
            await reply(`❌ ${e.message}`);
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .clearworld — [Owner] Clear all forced world events
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'clearworld',
        aliases:     ['clearevent', 'worldclear'],
        category:    'owner',
        react:       '🔄',
        description: 'Clear all forced world events',
    },
    async (from, Malvin, conText) => {
        const { reply, react, isSuperUser, t } = conText;

        if (!isSuperUser) return reply(t('common.owner_only'));

        await clearForcedEvent();
        await react('✅');
        await reply(
            buildBox('🔄 WORLD CLEARED', [
                `  All forced events have been cleared.`,
                `  Aevoria returns to natural time.`,
            ])
        );
    }
);