/**
 * malvin/survival.js
 * Survival & Alignment — Malvin-XD Sovereign RPG
 * 35 Commands: .betray .atone .karma .eat .drink .cook .sleep
 *              .hospital .job .apprentice .mentor .heritage .hunger-status
 *              + supporting commands
 */

const { mxd } = require('../king');
const { getWorldModifiers } = require('../king/rpg/worldTime');
const {
    getPlayer, fetchPlayer,
    grantExp, addGold, addKarma,
    updateHunger, updateThirst, feed,
    checkCooldown, setCooldown, formatCooldown,
    buildBox, buildFooter, scaleRewards,
} = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { GlobalPlayer } = require('../king/rpg/model');

// ─── Cooldowns ────────────────────────────────────────────────────────────────
const CD = {
    eat:       30 * 60 * 1000,      // 30 min
    drink:     20 * 60 * 1000,      // 20 min
    cook:      45 * 60 * 1000,      // 45 min
    sleep:     8  * 60 * 60 * 1000, // 8 hrs
    atone:     24 * 60 * 60 * 1000, // 24 hrs
    betray:    48 * 60 * 60 * 1000, // 48 hrs
    heritage:  7  * 24 * 60 * 60 * 1000, // 7 days
    meditate:  2  * 60 * 60 * 1000, // 2 hrs
    pray:      12 * 60 * 60 * 1000, // 12 hrs
    pilgrimage:24 * 60 * 60 * 1000, // 24 hrs
};

// ─── Cook recipes ─────────────────────────────────────────────────────────────
const COOK_RECIPES = {
    'grilled fish': {
        ingredients: { fish: 2, wood: 1 },
        hunger: 30, thirst: 10,
        expBonus: 50,
        desc: 'Restores 30% hunger, 10% thirst',
    },
    'herb stew': {
        ingredients: { herbs: 3, food: 2, water: 2 },
        hunger: 50, thirst: 30,
        expBonus: 80,
        hpBonus: 20,
        desc: 'Restores 50% hunger, 30% thirst, +20 HP',
    },
    'hunters feast': {
        ingredients: { food: 5, fish: 3, herbs: 2, water: 3 },
        hunger: 100, thirst: 100,
        expBonus: 200,
        hpBonus: 50,
        desc: 'Full restore — hunger, thirst, +50 HP',
    },
    'crystal brew': {
        ingredients: { herbs: 5, water: 3, crystalOre: 1 },
        hunger: 20, thirst: 40,
        expBonus: 150,
        mpBonus: 30,
        desc: 'Restores 30% MP, boosts INT for 1 hour',
    },
};

// ─── Bloodline heritage bonuses ───────────────────────────────────────────────
const HERITAGE_BONUSES = {
    Common:    { bonus: 'None',                    statGain: {} },
    Hunter:    { bonus: '+5% EXP from all hunts',  statGain: { int: 1 } },
    Shadow:    { bonus: '+1 Shadow slot',          statGain: { luk: 1 } },
    Dragon:    { bonus: '+5 STR',                  statGain: { str: 5 } },
    Monarch:   { bonus: '+10 all stats',           statGain: { str: 3, int: 3, luk: 3 } },
    Sovereign: { bonus: '+20 all stats',           statGain: { str: 5, int: 5, luk: 5, agi: 5, vit: 5, def: 5 } },
};

// ─── Alignment paths ──────────────────────────────────────────────────────────
const ALIGNMENT_INFO = {
    Light:   { emoji: '☀️',  perks: 'Access human cities, arrest others, +10% karma gain',  restrict: 'Cannot enter Dark Zones' },
    Neutral: { emoji: '⚖️',  perks: 'No restrictions, balanced rates',                      restrict: 'No special bonuses'      },
    Dark:    { emoji: '🌑',  perks: '+10% gold from dark activities, dark zone access',      restrict: 'Shops may refuse service' },
    Chaos:   { emoji: '☠️',  perks: '2x ATK, dark zone access, pillage bonus',              restrict: 'Banned from human cities' },
};

// ════════════════════════════════════════════════════════════════════════════
// .betray — Betray your guild/party for chaos karma
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'betray',
        aliases:     ['backstab', 'turncoat'],
        category:    'survival',
        react:       '🗡️',
        description: 'Betray your allies for dark power (heavy karma penalty)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'betray', CD.betray);
        if (onCooldown) return reply(buildBox('🗡️ ON COOLDOWN', [`  Betray resets in: ${formatCooldown(remaining)}`]));

        if (q?.toLowerCase() !== 'confirm') {
            return reply(
                buildBox('🗡️ BETRAYAL WARNING', [
                    `  ⚠️  This will:`,
                    `  ❌ Remove you from guild`,
                    `  ❌ Remove your party`,
                    `  ⚖️  Karma: -300`,
                    `  ✅ Dark Power: +50 STR temporarily`,
                    `  ✅ Alignment shifts to Chaos`,
                    `  ───────`,
                    `  Type *.betray confirm* to proceed.`,
                ])
            );
        }

        // Remove from guild and party
        if (player.guild?.guildId) {
            await GlobalPlayer.updateOne(
                { jid: sender },
                { $set: { guild: { guildId: null, guildName: null, role: 'member', joinedAt: null } } }
            );
        }
        await GlobalPlayer.updateOne({ jid: sender }, { $set: { party: null } });

        // Heavy karma hit, alignment to Chaos
        await addKarma(sender, -300);
        await GlobalPlayer.updateOne({ jid: sender }, {
            $set:  { alignment: 'Chaos' },
            $inc:  { 'stats.str': 5, 'stats.luk': 2 },
        });
        await setCooldown(sender, 'betray');

        await react('🗡️');
        await reply(
            buildBox('🗡️ BETRAYAL COMPLETE', [
                `  ${name} has betrayed their allies!`,
                `  ───────`,
                `  ⚖️  Karma: -300`,
                `  ☠️  Alignment: Chaos`,
                `  ⚔️  STR: +5`,
                `  🍀 LUK: +2`,
                `  ───────`,
                `  The path of darkness begins. 🌑`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .atone — Atone for sins, shift alignment toward Light
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'atone',
        aliases:     ['repent', 'redeem'],
        category:    'survival',
        react:       '☀️',
        description: 'Atone for your sins and shift alignment toward Light',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'atone', CD.atone);
        if (onCooldown) return reply(buildBox('☀️ ON COOLDOWN', [`  Atone resets in: ${formatCooldown(remaining)}`]));

        if (player.alignment === 'Light') {
            return reply(buildBox('☀️ ALREADY PURE', [
                `  Your alignment is already Light.`,
                `  No atonement needed.`,
            ]));
        }

        // Cost: 1000 gold per atonement
        const cost = 1000;
        if (player.gold < cost) return reply(`❌ Atonement costs ${cost} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await addKarma(sender, 100);

        // Recalculate alignment
        const newKarma = player.karma + 100;
        let alignment  = 'Neutral';
        if (newKarma >= 500)       alignment = 'Light';
        else if (newKarma <= -500) alignment = 'Chaos';
        else if (newKarma < 0)     alignment = 'Dark';

        await GlobalPlayer.updateOne({ jid: sender }, { $set: { alignment } });
        await setCooldown(sender, 'atone');

        await react('☀️');
        await reply(
            buildBox('☀️ ATONEMENT', [
                `  ${name} seeks redemption.`,
                `  ───────`,
                `  💰 Cost: -${cost} Gold`,
                `  ⚖️  Karma: +100`,
                `  New Karma: ${newKarma}`,
                `  ${ALIGNMENT_INFO[alignment].emoji} Alignment: ${alignment}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .karma — View karma and alignment info
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'karma',
        aliases:     ['alignment', 'karmacheck'],
        category:    'survival',
        react:       '⚖️',
        description: 'View your karma score and alignment details',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        const targetJid = conText.user || sender;

        await getPlayer(targetJid, botId);
        const player = await fetchPlayer(targetJid);
        const rawPlayer = await fetchPlayer(targetJid === sender ? sender : targetJid);
        const name   = rawPlayer?.username || (targetJid === sender ? pushName : targetJid.split('@')[0]);
        const info   = ALIGNMENT_INFO[player.alignment] || ALIGNMENT_INFO.Neutral;

        const karmaBar = player.karma >= 0
            ? '█'.repeat(Math.min(20, Math.floor(player.karma / 50))) + '░'.repeat(Math.max(0, 20 - Math.floor(player.karma / 50)))
            : '░'.repeat(Math.max(0, 20 + Math.floor(player.karma / 50))) + '█'.repeat(Math.min(20, Math.abs(Math.floor(player.karma / 50))));

        await react('⚖️');
        await reply(
            buildBox('⚖️ KARMA & ALIGNMENT', [
                `  Hunter: ${name}`,
                `  ───────`,
                `  ${info.emoji} Alignment: ${player.alignment}`,
                `  Karma: ${player.karma}`,
                `  [${karmaBar}]`,
                `  ───────`,
                `  PERKS:`,
                `  ✅ ${info.perks}`,
                `  RESTRICTIONS:`,
                `  ❌ ${info.restrict}`,
                `  ───────`,
                `  Thresholds:`,
                `  ☀️  Light:   +500 Karma`,
                `  ⚖️  Neutral: -499 to +499`,
                `  🌑 Dark:    -499 to -1`,
                `  ☠️  Chaos:   -500 Karma`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .eat — Eat food to restore hunger
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'eat',
        aliases:     ['food', 'eatfood'],
        category:    'survival',
        react:       '🍖',
        description: 'Eat food to restore hunger',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'eat', CD.eat);
        if (onCooldown) return reply(buildBox('🍖 ON COOLDOWN', [`  Eat again in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.food || 0) < 1) {
            return reply(
                buildBox('🍖 NO FOOD', [
                    `  You have no food!`,
                    `  Buy from *.shop food* or use *.farm*`,
                    `  or *.cook* a meal.`,
                ])
            );
        }

        if (player.hunger >= 100) {
            return reply(buildBox('🍖 ALREADY FULL', [`  Hunger: ${player.hunger}% — You are not hungry!`]));
        }

        const hungerRestore = 20;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.food': -1 } });
        await updateHunger(sender, hungerRestore);
        await setCooldown(sender, 'eat');

        await react('🍖');
        await reply(
            buildBox('🍖 MEAL CONSUMED', [
                `  🍖 Food: -1`,
                `  Hunger restored: +${hungerRestore}%`,
                `  Hunger: ${Math.min(100, player.hunger + hungerRestore)}%`,
                `  Food remaining: ${(player.inventory.food || 1) - 1}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .drink — Drink water to restore thirst
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'drink',
        aliases:     ['water', 'drinkwater'],
        category:    'survival',
        react:       '💧',
        description: 'Drink water to restore thirst',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'drink', CD.drink);
        if (onCooldown) return reply(buildBox('💧 ON COOLDOWN', [`  Drink again in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.water || 0) < 1) {
            return reply(
                buildBox('💧 NO WATER', [
                    `  You have no water!`,
                    `  Buy from *.shop water* or use *.harvest*`,
                ])
            );
        }

        if (player.thirst >= 100) {
            return reply(buildBox('💧 HYDRATED', [`  Thirst: ${player.thirst}% — Already hydrated!`]));
        }

        const thirstRestore = 25;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.water': -1 } });
        await updateThirst(sender, thirstRestore);
        await setCooldown(sender, 'drink');

        await react('💧');
        await reply(
            buildBox('💧 HYDRATED', [
                `  💧 Water: -1`,
                `  Thirst restored: +${thirstRestore}%`,
                `  Thirst: ${Math.min(100, player.thirst + thirstRestore)}%`,
                `  Water remaining: ${(player.inventory.water || 1) - 1}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .cook — Cook a meal for better restoration
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'cook',
        aliases:     ['cookfood', 'meal'],
        category:    'survival',
        react:       '🍳',
        description: 'Cook a meal for stronger hunger/thirst restoration',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) {
            const list = Object.entries(COOK_RECIPES).map(([name, r]) => {
                const mats = Object.entries(r.ingredients).map(([k, v]) => `${k}x${v}`).join(', ');
                return `  🍳 ${name}: ${mats} → ${r.desc}`;
            });
            return reply(buildBox('🍳 COOK MENU', [
                ...list,
                `  ───────`,
                `  Usage: *.cook <meal name>*`,
            ]));
        }

        const mealName = Object.keys(COOK_RECIPES).find(
            m => m.toLowerCase() === q.toLowerCase()
        );
        if (!mealName) return reply(`❌ Unknown recipe: *${q}*\nUse *.cook* to see recipes.`);

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'cook', CD.cook);
        if (onCooldown) return reply(buildBox('🍳 ON COOLDOWN', [`  Cook resets in: ${formatCooldown(remaining)}`]));

        const recipe  = COOK_RECIPES[mealName];
        const missing = [];

        for (const [mat, qty] of Object.entries(recipe.ingredients)) {
            if ((player.inventory[mat] || 0) < qty) {
                missing.push(`${mat}: need ${qty}, have ${player.inventory[mat] || 0}`);
            }
        }

        if (missing.length) return reply(buildBox('🍳 MISSING INGREDIENTS', missing.map(m => `  ❌ ${m}`)));

        for (const [mat, qty] of Object.entries(recipe.ingredients)) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { [`inventory.${mat}`]: -qty } });
        }

        await updateHunger(sender, recipe.hunger);
        await updateThirst(sender, recipe.thirst);
        if (recipe.hpBonus) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.hp': recipe.hpBonus } });
        }
        if (recipe.mpBonus) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': recipe.mpBonus } });
        }
        await grantExp(sender, recipe.expBonus, 0, botId);
        await setCooldown(sender, 'cook');

        await react('🍳');
        await reply(
            buildBox(`🍳 ${mealName.toUpperCase()} COOKED`, [
                `  ${recipe.desc}`,
                `  ───────`,
                `  🍖 Hunger: +${recipe.hunger}%`,
                `  💧 Thirst: +${recipe.thirst}%`,
                ...(recipe.hpBonus ? [`  ❤️  HP: +${recipe.hpBonus}`] : []),
                ...(recipe.mpBonus ? [`  💧 MP: +${recipe.mpBonus}`] : []),
                `  ✨ EXP: +${recipe.expBonus}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .sleep — Sleep to restore HP and MP fully (long cooldown)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'sleep',
        aliases:     ['rest', 'nap'],
        category:    'survival',
        react:       '😴',
        description: 'Sleep to fully restore HP and MP (8hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'sleep', CD.sleep);
        if (onCooldown) return reply(buildBox('😴 STILL TIRED', [`  Sleep again in: ${formatCooldown(remaining)}`]));

        await GlobalPlayer.updateOne({ jid: sender }, {
            $set: {
                'combat.hp': player.combat.maxHp,
                'combat.mp': player.combat.maxMp,
            }
        });
        // Apply winter hunger drain boost
        const sleepMods = await getWorldModifiers();
        const sleepDrain = Math.floor(-10 * (1 + (sleepMods.hungerDrainBoost || 0) / 100));
        await updateHunger(sender, sleepDrain); // sleeping drains a bit of hunger
        await grantExp(sender, 30, 0, botId);
        await setCooldown(sender, 'sleep');

        await react('😴');
        await reply(
            buildBox('😴 WELL RESTED', [
                `  ${name} slept soundly.`,
                `  ───────`,
                `  ❤️  HP: ${player.combat.maxHp} / ${player.combat.maxHp} (Full)`,
                `  💧 MP: ${player.combat.maxMp} / ${player.combat.maxMp} (Full)`,
                `  🍖 Hunger: -10% (burned while sleeping)`,
                `  ✨ EXP: +30`,
                `  ───────`,
                `  You feel ready to hunt! ⚔️`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .hunger-status — Full survival status check
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'hunger-status',
        aliases:     ['survival', 'vitals', 'status'],
        category:    'survival',
        react:       '📊',
        description: 'Check your full survival status — hunger, thirst, HP, MP',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const hungerBar = '█'.repeat(Math.floor(player.hunger / 5)) + '░'.repeat(20 - Math.floor(player.hunger / 5));
        const thirstBar = '█'.repeat(Math.floor(player.thirst / 5)) + '░'.repeat(20 - Math.floor(player.thirst / 5));
        const hpBar     = '█'.repeat(Math.floor((player.combat.hp / player.combat.maxHp) * 20)) + '░'.repeat(20 - Math.floor((player.combat.hp / player.combat.maxHp) * 20));
        const mpBar     = '█'.repeat(Math.floor((player.combat.mp / player.combat.maxMp) * 20)) + '░'.repeat(20 - Math.floor((player.combat.mp / player.combat.maxMp) * 20));

        const hungerWarn = player.hunger < 20 ? ' ⚠️ CRITICAL' : player.hunger < 50 ? ' ⚠️ LOW' : '';
        const thirstWarn = player.thirst < 20 ? ' ⚠️ CRITICAL' : player.thirst < 50 ? ' ⚠️ LOW' : '';

        await react('📊');
        await reply(
            buildBox('📊 SURVIVAL STATUS', [
                `  Hunter: ${name}`,
                `  ───────`,
                `  ❤️  HP [${hpBar}] ${player.combat.hp}/${player.combat.maxHp}`,
                `  💧 MP [${mpBar}] ${player.combat.mp}/${player.combat.maxMp}`,
                `  ───────`,
                `  🍖 Hunger [${hungerBar}] ${player.hunger}%${hungerWarn}`,
                `  💧 Thirst [${thirstBar}] ${player.thirst}%${thirstWarn}`,
                `  ───────`,
                `  ⚖️  Karma: ${player.karma}  |  ${ALIGNMENT_INFO[player.alignment]?.emoji} ${player.alignment}`,
                `  📍 Location: ${player.locationId?.replace(/_/g, ' ')}`,
                `  🔒 Jailed: ${player.isJailed ? 'Yes ⚠️' : 'No'}`,
                `  🏥 Hospitalized: ${player.isHospitalized ? 'Yes' : 'No'}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .heritage — Claim bloodline heritage bonus (weekly)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'heritage',
        aliases:     ['bloodlinebonus', 'lineage'],
        category:    'survival',
        react:       '🩸',
        description: 'Claim your bloodline heritage bonus (weekly)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'heritage', CD.heritage);
        if (onCooldown) return reply(buildBox('🩸 ON COOLDOWN', [`  Heritage resets in: ${formatCooldown(remaining)}`]));

        const heritageData = HERITAGE_BONUSES[player.bloodline] || HERITAGE_BONUSES.Common;

        if (player.bloodline === 'Common') {
            return reply(
                buildBox('🩸 COMMON HERITAGE', [
                    `  Your bloodline has no special heritage.`,
                    `  Unlock bloodlines via *.bloodline*`,
                    `  to access heritage bonuses!`,
                ])
            );
        }

        // Apply stat gains
        const inc = {};
        for (const [stat, val] of Object.entries(heritageData.statGain)) {
            inc[`stats.${stat}`] = val;
        }
        if (Object.keys(inc).length) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: inc });
        }

        // Gold and EXP bonus
        const goldBonus = 500 * (Object.keys(heritageData.statGain).length + 1);
        const expBonus  = 300 * (Object.keys(heritageData.statGain).length + 1);
        await grantExp(sender, expBonus, goldBonus, botId);
        await setCooldown(sender, 'heritage');

        const statLines = Object.entries(heritageData.statGain).map(([s, v]) => `  ⬆️  ${s.toUpperCase()}: +${v}`);

        await react('🩸');
        await reply(
            buildBox('🩸 HERITAGE CLAIMED', [
                `  Bloodline: ${player.bloodline}`,
                `  ${heritageData.bonus}`,
                `  ───────`,
                ...statLines,
                `  ✨ EXP:  +${expBonus}`,
                `  💰 Gold: +${goldBonus}`,
                `  ───────`,
                `  Returns in 7 days.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .pray — Pray for karma and light alignment bonus
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'pray',
        aliases:     ['prayer', 'worship'],
        category:    'survival',
        react:       '🙏',
        description: 'Pray at a shrine for karma and light blessings',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'pray', CD.pray);
        if (onCooldown) return reply(buildBox('🙏 ON COOLDOWN', [`  Pray again in: ${formatCooldown(remaining)}`]));

        // Chaos alignment gets punished
        if (player.alignment === 'Chaos') {
            await addKarma(sender, -10);
            return reply(buildBox('🙏 REJECTED', [
                `  The shrine rejects your Chaos energy!`,
                `  ⚖️  Karma: -10`,
                `  Atone before praying.`,
            ]));
        }

        const karmaGain = player.alignment === 'Light' ? 30 : 15;
        const expGain   = 50;
        await addKarma(sender, karmaGain);
        await grantExp(sender, expGain, 0, botId);
        // Apply winter hunger drain boost
        const prayMods = await getWorldModifiers();
        const prayDrain = Math.floor(-5 * (1 + (prayMods.hungerDrainBoost || 0) / 100));
        await updateHunger(sender, prayDrain); // prayer takes energy
        await setCooldown(sender, 'pray');

        await react('🙏');
        await reply(
            buildBox('🙏 PRAYER ANSWERED', [
                `  ${name} prays at the shrine.`,
                `  ───────`,
                `  ⚖️  Karma: +${karmaGain}`,
                `  ✨ EXP:   +${expGain}`,
                ...(player.alignment === 'Light' ? [`  ☀️  Light blessing: +2x karma gain`] : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .meditate — Gain EXP and karma through meditation
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'meditate-align',
        aliases:     ['soulmeditate', 'zen'],
        category:    'survival',
        react:       '🧘',
        description: 'Meditate to gain EXP and shift alignment',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'meditate', CD.meditate);
        if (onCooldown) return reply(buildBox('🧘 ON COOLDOWN', [`  Meditate resets in: ${formatCooldown(remaining)}`]));

        const expGain   = 80;
        const karmaGain = player.karma < 0 ? 20 : 10;
        const mpGain    = Math.floor(player.combat.maxMp * 0.3);

        await grantExp(sender, expGain, 0, botId);
        await addKarma(sender, karmaGain);
        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'combat.mp': mpGain }
        });
        await setCooldown(sender, 'meditate');

        await react('🧘');
        await reply(
            buildBox('🧘 MEDITATION COMPLETE', [
                `  Mind and soul aligned.`,
                `  ───────`,
                `  ✨ EXP:   +${expGain}`,
                `  ⚖️  Karma: +${karmaGain}`,
                `  💧 MP:    +${mpGain}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .pilgrimage — Long journey for massive karma and rewards
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'pilgrimage',
        aliases:     ['sacredjourney', 'holytrip'],
        category:    'survival',
        react:       '🚶',
        description: 'Go on a pilgrimage for massive karma rewards (24hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'pilgrimage', CD.pilgrimage);
        if (onCooldown) return reply(buildBox('🚶 ON COOLDOWN', [`  Pilgrimage resets in: ${formatCooldown(remaining)}`]));

        if (player.alignment === 'Chaos') {
            return reply(buildBox('🚶 PATH BLOCKED', [
                `  Chaos alignment cannot walk the sacred path.`,
                `  Use *.atone* first.`,
            ]));
        }

        const destinations = [
            { name: 'Temple of Light',   karma: 150, exp: 500  },
            { name: 'Sacred Mountain',   karma: 200, exp: 800  },
            { name: 'Ancient Shrine',    karma: 100, exp: 400  },
            { name: 'Crystal Cathedral', karma: 300, exp: 1000 },
        ];

        const dest   = destinations[Math.floor(Math.random() * destinations.length)];
        const scaled = await scaleRewards({ exp: dest.exp, gold: 200 }, player.level, player.jid);

        await addKarma(sender, dest.karma);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        // Apply winter hunger drain boost
        const travelMods = await getWorldModifiers();
        const travelDrain = Math.floor(-30 * (1 + (travelMods.hungerDrainBoost || 0) / 100));
        await updateHunger(sender, travelDrain); // long journey
        await updateThirst(sender, -30);
        await setCooldown(sender, 'pilgrimage');

        await react('🚶');
        await reply(
            buildBox('🚶 PILGRIMAGE COMPLETE', [
                `  ${name} journeyed to ${dest.name}!`,
                `  ───────`,
                `  ⚖️  Karma: +${dest.karma}`,
                `  ✨ EXP:   +${scaled.exp}`,
                `  💰 Gold:  +${scaled.gold}`,
                `  🍖 Hunger: -30%`,
                `  💧 Thirst: -30%`,
                `  ───────`,
                `  The journey has strengthened your spirit. ☀️`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .dark-ritual — Dark alignment power ritual
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'dark-ritual',
        aliases:     ['ritual', 'darkpower'],
        category:    'survival',
        react:       '🌑',
        description: 'Perform a dark ritual to gain power (Dark/Chaos only)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!['Dark', 'Chaos'].includes(player.alignment)) {
            return reply(buildBox('🌑 ALIGNMENT REQUIRED', [
                `  Dark Rituals require Dark or Chaos alignment.`,
                `  Use *.betray* to shift alignment.`,
            ]));
        }

        const { onCooldown, remaining } = checkCooldown(player, 'meditate', CD.meditate);
        if (onCooldown) return reply(buildBox('🌑 ON COOLDOWN', [`  Ritual resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.crystalOre || 0) < 2) {
            return reply('❌ Dark Ritual requires 2 Crystal Ore.');
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -2 } });

        const powerGain = player.alignment === 'Chaos' ? 2 : 1;
        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'stats.str': powerGain,
                'stats.luk': powerGain,
                'combat.attack': powerGain * 5,
            }
        });
        await addKarma(sender, -50);

        const expGain = await scaleRewards({ exp: 300, gold: 0 }, player.level, player.jid).exp;
        await grantExp(sender, expGain, 0, botId);
        await setCooldown(sender, 'meditate');

        await react('🌑');
        await reply(
            buildBox('🌑 DARK RITUAL COMPLETE', [
                `  ${name} channels dark energy!`,
                `  ───────`,
                `  ⚔️  STR: +${powerGain}`,
                `  🍀 LUK: +${powerGain}`,
                `  ⚔️  ATK: +${powerGain * 5}`,
                `  ✨ EXP: +${expGain}`,
                `  ⚖️  Karma: -50`,
                `  🔮 Crystal Ore: -2`,
                ...(player.alignment === 'Chaos' ? [`  ☠️  Chaos amplified all gains x2!`] : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .alignment-path — View alignment progression paths
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'alignment-path',
        aliases:     ['paths', 'alignmentguide'],
        category:    'survival',
        react:       '⚖️',
        description: 'View the two alignment paths and their perks',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        await react('⚖️');
        await reply(
            buildBox('⚖️ ALIGNMENT PATHS', [
                `  ☀️  LIGHT PATH:`,
                `  Karma: +500 threshold`,
                `  ✅ Arrest others`,
                `  ✅ Full city access`,
                `  ✅ +10% karma gain`,
                `  ✅ Pilgrimage access`,
                `  ❌ No dark zones`,
                `  ───────`,
                `  ☠️  CHAOS PATH:`,
                `  Karma: -500 threshold`,
                `  ✅ 2x ATK bonus`,
                `  ✅ Dark zone access`,
                `  ✅ 2x pillage steal rate`,
                `  ✅ Dark ritual power x2`,
                `  ❌ Banned from cities`,
                `  ❌ Cannot pray or pilgrimage`,
                `  ───────`,
                `  Use *.atone* or *.betray* to shift path.`,
            ])
        );
    }
);

module.exports = {};


// ══════════════════════════════════════════════════════════════════════
// EXTENDED COMMANDS — from new_cmds/survival2.js
// ══════════════════════════════════════════════════════════════════════
const CD_SURVIVAL2 = {
    fastheal:       10 * 60 * 1000,
    emergencyeat:   5  * 60 * 1000,
    purify:         6  * 60 * 60 * 1000,
    cleanse:        4  * 60 * 60 * 1000,
    lightblessing:  8  * 60 * 60 * 1000,
    darkembrace:    6  * 60 * 60 * 1000,
    chaossurge:     12 * 60 * 60 * 1000,
    naturebond:     4  * 60 * 60 * 1000,
    spiritlink:     8  * 60 * 60 * 1000,
    soulmend:       6  * 60 * 60 * 1000,
    endure:         30 * 60 * 1000,
    fortify:        2  * 60 * 60 * 1000,
    meditatedeep:   12 * 60 * 60 * 1000,
    alignmentshift: 24 * 60 * 60 * 1000,
    morale:         4  * 60 * 60 * 1000,
};


mxd(
    {
        pattern:     'fast-heal',
        aliases:     ['fastheal', 'quickheal'],
        category:    'survival',
        react:       '💚',
        description: 'Quickly restore 20% HP using 1 herb (10min cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'fastheal', CD.fastheal);
        if (onCooldown) return reply(buildBox('💚 ON COOLDOWN', [`  Fast Heal resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.herbs || 0) < 1) return reply('❌ Fast Heal requires 1 Herb.');

        const healAmt = Math.floor(player.combat.maxHp * 0.2);
        const newHp   = Math.min(player.combat.maxHp, player.combat.hp + healAmt);

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'inventory.herbs': -1 },
            $set: { 'combat.hp': newHp },
        });
        await setCooldown(sender, 'fastheal');

        await react('💚');
        await reply(
            buildBox('💚 FAST HEAL', [
                `  🌿 Herb consumed: -1`,
                `  ❤️  HP restored: +${healAmt}`,
                `  HP: ${newHp} / ${player.combat.maxHp}`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'emergency-eat',
        aliases:     ['emergencyeat', 'raweat'],
        category:    'survival',
        react:       '🌿',
        description: 'Emergency eat raw herbs when food is critical (5min cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'emergencyeat', CD.emergencyeat);
        if (onCooldown) return reply(buildBox('🌿 ON COOLDOWN', [`  Emergency Eat resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.herbs || 0) < 2) return reply('❌ Need 2 Herbs to eat raw.');
        if (player.hunger > 50) return reply('❌ Hunger is above 50% — not an emergency!');

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.herbs': -2 } });
        await updateHunger(sender, 15);
        await setCooldown(sender, 'emergencyeat');

        await react('🌿');
        await reply(
            buildBox('🌿 EMERGENCY RATION', [
                `  Raw herbs consumed in desperation!`,
                `  🌿 Herbs: -2`,
                `  🍖 Hunger: +15%`,
                `  Hunger: ${Math.min(100, player.hunger + 15)}%`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'purify',
        aliases:     ['bodypurify', 'detox'],
        category:    'survival',
        react:       '✨',
        description: 'Purify body and soul — restore HP, MP, hunger and thirst',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'purify', CD.purify);
        if (onCooldown) return reply(buildBox('✨ ON COOLDOWN', [`  Purify resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.crystalOre || 0) < 1) return reply('❌ Purify requires 1 Crystal Ore.');

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'inventory.crystalOre': -1 },
            $set: {
                'combat.hp': player.combat.maxHp,
                'combat.mp': player.combat.maxMp,
                hunger:       100,
                thirst:       100,
            }
        });

        const scaled = scaleRewards({ exp: 100, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'purify');

        await react('✨');
        await reply(
            buildBox('✨ PURIFICATION COMPLETE', [
                `  Body and soul cleansed!`,
                `  ❤️  HP:     Full`,
                `  💧 MP:     Full`,
                `  🍖 Hunger: 100%`,
                `  💧 Thirst: 100%`,
                `  🔮 Crystal Ore: -1`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'cleanse',
        aliases:     ['karmacleanse', 'soulcleanse'],
        category:    'survival',
        react:       '🌊',
        description: 'Cleanse negative karma effects using herbs and water',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'cleanse', CD.cleanse);
        if (onCooldown) return reply(buildBox('🌊 ON COOLDOWN', [`  Cleanse resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.herbs || 0) < 5 || (player.inventory.water || 0) < 3) {
            return reply('❌ Cleanse requires 5 Herbs + 3 Water.');
        }

        if (player.karma >= 0) return reply('❌ Your karma is already clean!');

        const karmaGain = Math.min(50, Math.abs(player.karma));
        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'inventory.herbs': -5,
                'inventory.water': -3,
                karma:              karmaGain,
            }
        });
        await setCooldown(sender, 'cleanse');

        await react('🌊');
        await reply(
            buildBox('🌊 CLEANSED', [
                `  Negative energy washed away!`,
                `  🌿 Herbs: -5  💧 Water: -3`,
                `  ⚖️  Karma: +${karmaGain}`,
                `  New Karma: ${player.karma + karmaGain}`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'light-blessing',
        aliases:     ['lightblessing', 'divineblessing'],
        category:    'survival',
        react:       '☀️',
        description: 'Receive a divine blessing from the Light Order (Light alignment)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.alignment !== 'Light') return reply('❌ Light Blessing requires Light alignment.');

        const { onCooldown, remaining } = checkCooldown(player, 'lightblessing', CD.lightblessing);
        if (onCooldown) return reply(buildBox('☀️ ON COOLDOWN', [`  Light Blessing resets in: ${formatCooldown(remaining)}`]));

        const karmaBonus = Math.floor(player.karma / 50);
        const scaled     = scaleRewards({ exp: 300 + karmaBonus * 10, gold: 200 }, player.level, player.jid);

        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await GlobalPlayer.updateOne({ jid: sender }, {
            $set: { 'combat.hp': player.combat.maxHp, 'combat.mp': player.combat.maxMp }
        });
        await addKarma(sender, 20);
        await setCooldown(sender, 'lightblessing');

        await react('☀️');
        await reply(
            buildBox('☀️ LIGHT BLESSING', [
                `  The Light Order blesses you!`,
                `  ❤️  HP restored to full`,
                `  💧 MP restored to full`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                `  ⚖️  Karma: +20`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'dark-embrace',
        aliases:     ['darkembrace', 'shadowembrace'],
        category:    'survival',
        react:       '🌑',
        description: 'Embrace the darkness for a power surge (Dark alignment)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!['Dark', 'Chaos'].includes(player.alignment)) return reply('❌ Dark Embrace requires Dark or Chaos alignment.');

        const { onCooldown, remaining } = checkCooldown(player, 'darkembrace', CD.darkembrace);
        if (onCooldown) return reply(buildBox('🌑 ON COOLDOWN', [`  Dark Embrace resets in: ${formatCooldown(remaining)}`]));

        const darkBonus = player.alignment === 'Chaos' ? 2 : 1;
        const atkGain   = Math.floor(player.stats.str * 2 * darkBonus);
        const scaled    = scaleRewards({ exp: 200, gold: 300 }, player.level, player.jid);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.attack': atkGain } });
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await addKarma(sender, -15);
        await setCooldown(sender, 'darkembrace');

        await react('🌑');
        await reply(
            buildBox('🌑 DARK EMBRACE', [
                `  The darkness flows through you!`,
                `  ⚔️  ATK: +${atkGain}${darkBonus > 1 ? ' (Chaos x2!)' : ''}`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                `  ⚖️  Karma: -15`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'chaos-surge',
        aliases:     ['chaossurge', 'chaospower'],
        category:    'survival',
        react:       '☠️',
        description: 'Unleash chaos energy for massive power — high risk (Chaos only)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.alignment !== 'Chaos') return reply('❌ Chaos Surge requires Chaos alignment.');

        const { onCooldown, remaining } = checkCooldown(player, 'chaossurge', CD.chaossurge);
        if (onCooldown) return reply(buildBox('☠️ ON COOLDOWN', [`  Chaos Surge resets in: ${formatCooldown(remaining)}`]));

        const hpCost  = Math.floor(player.combat.maxHp * 0.3);
        const atkGain = Math.floor(player.stats.str * 5);
        const strGain = 3;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'combat.hp': -hpCost, 'combat.attack': atkGain, 'stats.str': strGain }
        });

        const scaled = scaleRewards({ exp: 600, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await addKarma(sender, -80);
        await setCooldown(sender, 'chaossurge');

        await react('☠️');
        await reply(
            buildBox('☠️ CHAOS SURGE', [
                `  CHAOS UNLEASHED!`,
                `  ❤️  HP:  -${hpCost} (30% sacrifice)`,
                `  ⚔️  ATK: +${atkGain}`,
                `  ⚔️  STR: +${strGain} (permanent)`,
                `  ✨ EXP: +${scaled.exp}`,
                `  ⚖️  Karma: -80`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'nature-bond',
        aliases:     ['naturebond', 'earthbond'],
        category:    'survival',
        react:       '🌿',
        description: 'Bond with nature for gathering and survival bonuses',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'naturebond', CD.naturebond);
        if (onCooldown) return reply(buildBox('🌿 ON COOLDOWN', [`  Nature Bond resets in: ${formatCooldown(remaining)}`]));

        const herbGain = Math.floor(3 + player.stats.luk * 0.5);
        const woodGain = Math.floor(3 + player.stats.luk * 0.5);

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'inventory.herbs': herbGain, 'inventory.wood': woodGain }
        });
        await updateHunger(sender, 20);
        await updateThirst(sender, 20);

        const scaled = scaleRewards({ exp: 150, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'naturebond');

        await react('🌿');
        await reply(
            buildBox('🌿 NATURE BOND', [
                `  The earth provides for you!`,
                `  🌿 Herbs: +${herbGain}`,
                `  🪵 Wood:  +${woodGain}`,
                `  🍖 Hunger: +20%`,
                `  💧 Thirst: +20%`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'spirit-link',
        aliases:     ['spiritlink', 'spiritbond'],
        category:    'survival',
        react:       '👻',
        description: 'Link with a shadow spirit to passively regenerate MP',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'spiritlink', CD.spiritlink);
        if (onCooldown) return reply(buildBox('👻 ON COOLDOWN', [`  Spirit Link resets in: ${formatCooldown(remaining)}`]));

        if (!player.shadows?.length) return reply('❌ Spirit Link requires at least 1 shadow soldier.');

        const mpGain = Math.floor(player.combat.maxMp * 0.6);
        const newMp  = Math.min(player.combat.maxMp, player.combat.mp + mpGain);
        const intMult = 1 + (player.stats.int - 1) * 0.03;

        await GlobalPlayer.updateOne({ jid: sender }, { $set: { 'combat.mp': newMp } });
        const scaled = scaleRewards({ exp: 120, gold: 0 }, player.level, player.jid);
        await grantExp(sender, Math.floor(scaled.exp * intMult), 0, botId);
        await setCooldown(sender, 'spiritlink');

        await react('👻');
        await reply(
            buildBox('👻 SPIRIT LINK', [
                `  Shadow spirit merges with your soul!`,
                `  💧 MP restored: +${mpGain} → ${newMp}/${player.combat.maxMp}`,
                `  ✨ EXP: +${Math.floor(scaled.exp * intMult)}`,
                `  🧠 INT bonus: ${intMult.toFixed(2)}x`,
                buildFooter(Math.floor(scaled.exp * intMult), 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'soul-mend',
        aliases:     ['soulmend', 'soulrestore'],
        category:    'survival',
        react:       '💜',
        description: 'Mend your soul — restore HP, MP, hunger and thirst partially',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'soulmend', CD.soulmend);
        if (onCooldown) return reply(buildBox('💜 ON COOLDOWN', [`  Soul Mend resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 20) return reply('❌ Soul Mend requires 20 MP.');

        const hpGain     = Math.floor(player.combat.maxHp * 0.25);
        const hungerGain = 25;
        const thirstGain = 25;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'combat.mp': -20, 'combat.hp': hpGain }
        });
        await updateHunger(sender, hungerGain);
        await updateThirst(sender, thirstGain);

        const scaled = scaleRewards({ exp: 80, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'soulmend');

        await react('💜');
        await reply(
            buildBox('💜 SOUL MEND', [
                `  Your soul stitches itself back together.`,
                `  ❤️  HP:     +${hpGain}`,
                `  🍖 Hunger: +${hungerGain}%`,
                `  💧 Thirst: +${thirstGain}%`,
                `  💧 MP:     -20`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'endure',
        aliases:     ['toughen', 'steelheart'],
        category:    'survival',
        react:       '💪',
        description: 'Endure — temporarily boost VIT and DEF stats',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'endure', CD.endure);
        if (onCooldown) return reply(buildBox('💪 ON COOLDOWN', [`  Endure resets in: ${formatCooldown(remaining)}`]));

        const vitBoost = Math.floor(player.stats.vit * 2);
        const defBoost = Math.floor(player.stats.def * 2);

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'combat.defense': defBoost, 'combat.maxHp': vitBoost * 5 }
        });

        const scaled = scaleRewards({ exp: 60, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'endure');

        await react('💪');
        await reply(
            buildBox('💪 ENDURANCE ACTIVATED', [
                `  Body hardened against damage!`,
                `  🛡️  DEF: +${defBoost} (temp)`,
                `  💪 Max HP: +${vitBoost * 5} (temp)`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'fortify',
        aliases:     ['reinforce', 'strengthen'],
        category:    'survival',
        react:       '🏰',
        description: 'Fortify all survival stats using food and water',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'fortify', CD.fortify);
        if (onCooldown) return reply(buildBox('🏰 ON COOLDOWN', [`  Fortify resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.food || 0) < 2 || (player.inventory.water || 0) < 2) {
            return reply('❌ Fortify requires 2 Food + 2 Water.');
        }

        const vitGain = 2;
        const defGain = 2;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'inventory.food':  -2,
                'inventory.water': -2,
                'stats.vit':        vitGain,
                'stats.def':        defGain,
            }
        });

        await updateHunger(sender, 30);
        await updateThirst(sender, 30);

        const scaled = scaleRewards({ exp: 200, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'fortify');

        await react('🏰');
        await reply(
            buildBox('🏰 FORTIFIED', [
                `  Body fortified with nutrients!`,
                `  💪 VIT: +${vitGain} (permanent)`,
                `  🛡️  DEF: +${defGain} (permanent)`,
                `  🍖 Hunger: +30%  💧 Thirst: +30%`,
                `  🍖 Food: -2  💧 Water: -2`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'meditate-deep',
        aliases:     ['deepmeditate', 'zenstate'],
        category:    'survival',
        react:       '🧘',
        description: 'Enter deep meditation for massive karma and INT gain (12hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'meditatedeep', CD.meditatedeep);
        if (onCooldown) return reply(buildBox('🧘 ON COOLDOWN', [`  Deep Meditate resets in: ${formatCooldown(remaining)}`]));

        if (player.hunger < 30 || player.thirst < 30) {
            return reply('❌ Need 30%+ hunger and thirst to meditate deeply.');
        }

        const intGain    = 2;
        const karmaGain  = 80;
        const mpFull     = player.combat.maxMp;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'stats.int': intGain },
            $set: { 'combat.mp': mpFull }
        });
        await addKarma(sender, karmaGain);
        await updateHunger(sender, -20);
        await updateThirst(sender, -20);

        const scaled = scaleRewards({ exp: 500, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'meditatedeep');

        await react('🧘');
        await reply(
            buildBox('🧘 DEEP MEDITATION', [
                `  Transcended the physical world...`,
                `  🧠 INT: +${intGain} (permanent)`,
                `  💧 MP:  Full`,
                `  ⚖️  Karma: +${karmaGain}`,
                `  🍖 Hunger: -20%  💧 Thirst: -20%`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'aura-check',
        aliases:     ['auracheck', 'myaura'],
        category:    'survival',
        react:       '🔮',
        description: 'Check your current aura based on alignment and stats',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const AURAS = {
            Light:   { name: 'Divine Aura',   emoji: '☀️',  effect: '+10% EXP, +10% karma gain'    },
            Neutral: { name: 'Balanced Aura',  emoji: '⚖️',  effect: 'No bonus, no penalty'          },
            Dark:    { name: 'Shadow Aura',    emoji: '🌑',  effect: '+15% gold from dark activities' },
            Chaos:   { name: 'Chaos Aura',     emoji: '☠️',  effect: '2x ATK, 2x steal rate'         },
        };

        const aura       = AURAS[player.alignment] || AURAS.Neutral;
        const auraStrength = Math.min(100, Math.abs(player.karma) / 10);

        await react('🔮');
        await reply(
            buildBox('🔮 AURA READING', [
                `  Hunter: ${name}`,
                `  ───────`,
                `  ${aura.emoji} ${aura.name}`,
                `  Strength: ${auraStrength.toFixed(0)}%`,
                `  Effect:   ${aura.effect}`,
                `  ───────`,
                `  Karma:    ${player.karma}`,
                `  Alignment: ${player.alignment}`,
                `  Bloodline: ${player.bloodline}`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'alignment-shift',
        aliases:     ['alignmentshift', 'shiftpath'],
        category:    'survival',
        react:       '⚖️',
        description: 'Actively shift your alignment using gold (24hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        const direction = q?.toLowerCase();
        if (!direction || !['light', 'dark', 'neutral'].includes(direction)) {
            return reply(buildBox('⚖️ ALIGNMENT SHIFT', [
                `  Usage: *.alignment-shift <direction>*`,
                `  Options: light | dark | neutral`,
                `  Cost: 2000 Gold`,
                `  Shifts karma by +200 (light) or -200 (dark) or toward 0 (neutral)`,
            ]));
        }

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'alignmentshift', CD.alignmentshift);
        if (onCooldown) return reply(buildBox('⚖️ ON COOLDOWN', [`  Alignment Shift resets in: ${formatCooldown(remaining)}`]));

        const cost = 2000;
        if (player.gold < cost) return reply(`❌ Alignment Shift costs ${cost} Gold.`);

        let karmaChange = 0;
        if (direction === 'light')   karmaChange = 200;
        if (direction === 'dark')    karmaChange = -200;
        if (direction === 'neutral') karmaChange = player.karma > 0 ? -100 : 100;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost, karma: karmaChange } });

        const newKarma    = player.karma + karmaChange;
        let newAlignment  = 'Neutral';
        if (newKarma >= 500)       newAlignment = 'Light';
        else if (newKarma <= -500) newAlignment = 'Chaos';
        else if (newKarma < 0)     newAlignment = 'Dark';

        await GlobalPlayer.updateOne({ jid: sender }, { $set: { alignment: newAlignment } });
        await setCooldown(sender, 'alignmentshift');

        await react('⚖️');
        await reply(
            buildBox('⚖️ ALIGNMENT SHIFTED', [
                `  Direction: ${direction.toUpperCase()}`,
                `  💰 Cost: -${cost} Gold`,
                `  ⚖️  Karma: ${karmaChange > 0 ? '+' : ''}${karmaChange} → ${newKarma}`,
                `  New Alignment: ${newAlignment}`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'karma-rank',
        aliases:     ['karmarank', 'karmalb'],
        category:    'survival',
        react:       '⚖️',
        description: 'View the global karma leaderboard',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const topLight = await GlobalPlayer.find({ registered: true, karma: { $gt: 0 } })
            .sort({ karma: -1 }).limit(5).lean();
        const topDark  = await GlobalPlayer.find({ registered: true, karma: { $lt: 0 } })
            .sort({ karma: 1 }).limit(5).lean();

        await react('⚖️');
        await reply(
            buildBox('⚖️ KARMA LEADERBOARD', [
                `  ☀️  TOP LIGHT:`,
                ...topLight.map((p, i) => {
                    const name = p.username || p.jid.split('@')[0];
                    return `  ${i + 1}. *${name}* — ⚖️ +${p.karma}`;
                }),
                `  ───────`,
                `  ☠️  TOP DARK:`,
                ...topDark.map((p, i) => {
                    const name = p.username || p.jid.split('@')[0];
                    return `  ${i + 1}. *${name}* — ⚖️ ${p.karma}`;
                }),
            ])
        );
    }
);

mxd(
    {
        pattern:     'survival-rank',
        aliases:     ['survivalrank', 'survivallb'],
        category:    'survival',
        react:       '🏆',
        description: 'View the global survival score leaderboard',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const players = await GlobalPlayer.find({ registered: true }).lean();
        const scored  = players
            .map(p => ({
                name:  p.username || p.jid.split('@')[0],
                score: (p.hunger || 0) + (p.thirst || 0) + (p.combat?.hp || 0),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

        await react('🏆');
        await reply(
            buildBox('🏆 SURVIVAL LEADERBOARD', [
                ...(scored.length
                    ? scored.map((p, i) => `  ${medals[i]} *${p.name}* — Score: ${p.score}`)
                    : ['  No data yet.']),
                `  ───────`,
                `  Score = Hunger + Thirst + HP`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'hunger-rank',
        aliases:     ['hungerrank', 'foodlb'],
        category:    'survival',
        react:       '🍖',
        description: 'View the hunger management leaderboard',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const top    = await GlobalPlayer.find({ registered: true })
            .sort({ hunger: -1 }).limit(10).lean();
        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

        await react('🍖');
        await reply(
            buildBox('🍖 HUNGER LEADERBOARD', [
                ...top.map((p, i) => {
                    const name = p.username || p.jid.split('@')[0];
                    return `  ${medals[i]} *${name}* — 🍖 ${p.hunger || 0}%`;
                }),
            ])
        );
    }
);

mxd(
    {
        pattern:     'morale',
        aliases:     ['boostmorale', 'inspire'],
        category:    'survival',
        react:       '🎺',
        description: 'Boost morale for a temporary all-stat increase',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'morale', CD.morale);
        if (onCooldown) return reply(buildBox('🎺 ON COOLDOWN', [`  Morale resets in: ${formatCooldown(remaining)}`]));

        if (player.hunger < 40) return reply('❌ Need 40%+ hunger to boost morale.');

        const boost = 3;
        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'combat.attack':  boost * 2,
                'combat.defense': boost,
            }
        });

        const scaled = scaleRewards({ exp: 150, gold: 100 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await updateHunger(sender, -10);
        await setCooldown(sender, 'morale');

        await react('🎺');
        await reply(
            buildBox('🎺 MORALE BOOSTED', [
                `  ${name} rallies their spirit!`,
                `  ⚔️  ATK: +${boost * 2} (temp)`,
                `  🛡️  DEF: +${boost} (temp)`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                `  🍖 Hunger: -10%`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);
