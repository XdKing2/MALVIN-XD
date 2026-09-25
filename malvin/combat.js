/**
 * malvin/combat.js
 * Combat & Shadows — Malvin-XD Sovereign RPG
 * 50 Commands: .hunt .dungeon .raid .boss .attack .skill .defend .flee
 *              .heal .meditate .extract .shadows .arise .release .scout
 *              .auto-hunt .duel .pillage + more
 */

const { mxd }  = require('../king');
const axios    = require('axios');
const { sendCanvasImage } = require('./rpg');
const {
    getPlayer, fetchPlayer,
    grantExp, addGold, addCrystals,
    updateHp, recoverHp, takeDamage,
    addKill, addDeath, addDungeonClear,
    addKarma, addItem, addShadow, removeShadow,
    checkCooldown, setCooldown, formatCooldown,
    buildBox, buildFooter, scaleRewards,
    unlockAchievement, unlockTitle,
} = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { GlobalPlayer } = require('../king/rpg/model');
const { getPlayerPassives } = require('../king/rpg/roles');
const { trackBloodmoon } = require('../king/rpg/worldTime');
const { trackQuestStat } = require('../king/rpg/questHooks');
const { tryFindPet, PET_SPECIES, RARITY_EMOJIS } = require('../king/rpg/pets');
const { getWorld } = require('../king/rpg/worlds');
const { applyDeath, buildDeathLines } = require('../king/rpg/deathSystem');

// ─── Combat helpers ───────────────────────────────────────────────────────────

// Cooldown durations (ms)
const CD = {
    hunt:        30  * 60 * 1000, // 30 min
    dungeon:     60  * 60 * 1000, // 1 hr
    raid:        4   * 60 * 60 * 1000, // 4 hrs
    boss:        2   * 60 * 60 * 1000, // 2 hrs
    duel:        10  * 60 * 1000, // 10 min
    pillage:     60  * 60 * 1000, // 1 hr
    scout:       15  * 60 * 1000, // 15 min
    meditate:    20  * 60 * 1000, // 20 min
    autohunt:    45  * 60 * 1000, // 45 min
    extract:     2   * 60 * 60 * 1000, // 2 hrs
};

// Enemy pool by zone
const ENEMIES = {
    starter_town: [
        { name: 'Goblin',       hp: 30,  atk: 5,  exp: 20,  gold: 15,  rank: 'E' },
        { name: 'Slime',        hp: 20,  atk: 3,  exp: 12,  gold: 8,   rank: 'E' },
        { name: 'Dire Wolf',    hp: 50,  atk: 10, exp: 35,  gold: 25,  rank: 'D' },
    ],
    demon_castle: [
        { name: 'Shadow Knight',hp: 200, atk: 40, exp: 150, gold: 120, rank: 'B' },
        { name: 'Lich',         hp: 180, atk: 50, exp: 180, gold: 150, rank: 'A' },
        { name: 'Demon Lord',   hp: 500, atk: 80, exp: 400, gold: 350, rank: 'S' },
    ],
    default: [
        { name: 'Orc',          hp: 80,  atk: 18, exp: 60,  gold: 45,  rank: 'D' },
        { name: 'Dark Mage',    hp: 60,  atk: 25, exp: 75,  gold: 55,  rank: 'C' },
        { name: 'Stone Golem',  hp: 150, atk: 22, exp: 90,  gold: 70,  rank: 'C' },
    ],
};

const DUNGEONS = [
    { name: 'Ant Colony',      rank: 'E', floors: 3,  expReward: 200,  goldReward: 150,  keyReq: 0 },
    { name: 'Red Gate',        rank: 'D', floors: 5,  expReward: 500,  goldReward: 350,  keyReq: 1 },
    { name: 'Demon Castle',    rank: 'B', floors: 8,  expReward: 1200, goldReward: 900,  keyReq: 2 },
    { name: 'Shadow Domain',   rank: 'A', floors: 10, expReward: 2500, goldReward: 2000, keyReq: 3 },
    { name: 'Monarchs Lair',   rank: 'S', floors: 15, expReward: 6000, goldReward: 5000, keyReq: 5 },
];

const BOSSES = [
    { name: 'Iron Fang',       hp: 1000, atk: 60,  exp: 800,  gold: 600,  crystal: 1 },
    { name: 'The Architect',   hp: 2000, atk: 90,  exp: 1500, gold: 1200, crystal: 2 },
    { name: 'Shadow Monarch',  hp: 5000, atk: 150, exp: 4000, gold: 3500, crystal: 5 },
];

const SHADOW_POOL = [
    { name: 'Igris',   rank: 'S', power: 9000 },
    { name: 'Beru',    rank: 'S', power: 9500 },
    { name: 'Tusk',    rank: 'A', power: 7000 },
    { name: 'Iron',    rank: 'B', power: 5000 },
    { name: 'Greed',   rank: 'A', power: 7500 },
    { name: 'Tank',    rank: 'B', power: 4500 },
    { name: 'Kaisel',  rank: 'S', power: 9200 },
    { name: 'Fangs',   rank: 'C', power: 3000 },
];

function getRandEnemy(locationId) {
    const pool = ENEMIES[locationId] || ENEMIES.default;
    return pool[Math.floor(Math.random() * pool.length)];
}

function calcWinChance(player, enemy) {
    const playerAtk = player.combat.attack + (player.stats.str - 1) * 3;
    const playerDef = player.combat.defense + (player.stats.def - 1) * 2;
    const netPower  = (playerAtk + playerDef) - (enemy.atk * 0.5);
    const base      = Math.min(0.9, Math.max(0.2, 0.5 + netPower / 200));
    return base;
}

function getRandShadow() {
    return SHADOW_POOL[Math.floor(Math.random() * SHADOW_POOL.length)];
}

// ════════════════════════════════════════════════════════════════════════════
// .hunt — Random enemy encounter
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'hunt',
        aliases:     ['h', 'fight'],
        category:    'combat',
        react:       '⚔️',
        description: 'Hunt monsters in your current location for EXP and gold',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'hunt', CD.hunt);
        if (onCooldown) {
            return reply(
                buildBox('⚔️ ON COOLDOWN', [
                    `  Hunt again in: ${formatCooldown(remaining)}`,
                ])
            );
        }

        if (player.combat.hp <= 0) {
            return reply(buildBox('⚔️ TOO WEAK', ['  HP is 0. Use *.heal* first!']));
        }

        if (player.hunger < 20) {
            return reply(buildBox('⚔️ TOO HUNGRY', ['  Hunger critical! Use *.eat* first.']));
        }

        const enemy    = getRandEnemy(player.locationId);
        const winChance = calcWinChance(player, enemy);
        const won      = Math.random() < winChance;

        await setCooldown(sender, 'hunt');

        if (won) {
            const base   = { exp: enemy.exp, gold: enemy.gold };
            const scaled = await scaleRewards(base, player.level, player.jid, null, player);
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await trackBloodmoon(sender);
            // Guild contribution — 2% of gold goes to guild vault if member
            try {
                if (player.guild?.guildId) {
                    const guildCut = Math.floor(scaled.gold * 0.02);
                    if (guildCut > 0) {
                        await require('../king/rpg/model').Guild.findOneAndUpdate(
                            { guildId: player.guild.guildId },
                            { $inc: { 'vault.gold': guildCut } }
                        );
                    }
                }
            } catch(e) {}
            const huntNotify = (msg) => Malvin.sendMessage(from, { text: msg }, { quoted: ms });
            await trackQuestStat(sender, 'huntsWon', 1, huntNotify);
            // Track world quest progress
            try {
                const currWorld = player.currentWorld || 'aevoria';
                await require('../king/rpg/model').GlobalPlayer.findOneAndUpdate(
                    { jid: sender },
                    { $inc: { [`worldQuestProgress.${currWorld}.worldHunts`]: 1 } }
                );
            } catch(e) {}
            await trackQuestStat(sender, 'goldEarned', scaled.gold, null);

            // Pet drop chance during hunt
            try {
                const huntWt   = scaled.worldMods?.worldTime || await require('../king/rpg/worldTime').getWorldTime();
                const petFound = await tryFindPet(player, 'hunt', huntWt);
                if (petFound) {
                    const petSpecies = PET_SPECIES[petFound];
                    const rEmoji     = RARITY_EMOJIS[petSpecies.rarity];
                    const updPlayer  = await fetchPlayer(sender);
                    const maxPets    = updPlayer.maxPets || 3;
                    if ((updPlayer.pets || []).length < maxPets * 2) {
                        const { GlobalPlayer } = require('../king/rpg/model');
                        const isActive = (updPlayer.pets || []).filter(p => p.active).length < maxPets;
                        await GlobalPlayer.findOneAndUpdate(
                            { jid: sender },
                            { $push: { pets: {
                                species: petFound, name: petSpecies.name,
                                level: 1, exp: 0, hunger: 100, happiness: 100,
                                active: isActive, birthYear: huntWt.year, foundAt: 'hunt',
                            }}}
                        );
                        await Malvin.sendMessage(from, {
                            text: buildBox(`${petSpecies.emoji} PET FOUND!`, [
                                `  A wild *${petSpecies.name}* appeared!`,
                                `  Rarity: ${rEmoji} *${petSpecies.rarity}*`,
                                `  ───────`,
                                `  ${petSpecies.description}`,
                                `  ───────`,
                                `  Check *.pets* to see your new companion!`,
                            ]),
                        }, { quoted: ms });
                    }
                }
            } catch (e) { console.error('Pet find error:', e); }
            await addKill(sender);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { hunger: -10 } });

            // Rare shadow extract chance (5%)
            const shadowDrop = Math.random() < 0.05;

            await react('⚔️');
            await reply(
                buildBox('⚔️ HUNT — VICTORY', [
                    `  Enemy: ${enemy.name} (${enemy.rank}-Rank)`,
                    `  ───────`,
                    `  ✅ You defeated the ${enemy.name}!`,
                    `  ✨ EXP:  +${scaled.exp}`,
                    `  💰 Gold: +${scaled.gold}`,
                    ...(shadowDrop ? [`  👥 Shadow essence dropped!`] : []),
                    ...(scaled.worldMods?.activeEvent ? [`  ${scaled.worldMods.activeEvent.emoji} *${scaled.worldMods.activeEvent.name} Bonus Active!*`] : []),
                    ...(scaled.worldMods?.isNight ? [`  🌙 Night Bonus: +20% EXP & drops`] : []),
                    `  ───────`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            const dmg = Math.max(5, enemy.atk - player.stats.def);
            await takeDamage(sender, dmg);
            await addKarma(sender, -5);
            const deathResult = await applyDeath(sender, 'hunt');

            await react('💀');
            await reply(
                buildBox('⚔️ HUNT — DEFEAT', [
                    `  Enemy: *${enemy.name}* (${enemy.rank}-Rank)`,
                    `  ───────`,
                    ...buildDeathLines(deathResult, 'hunt'),
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .dungeon — Enter a dungeon
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'dungeon',
        aliases:     ['dg', 'gate'],
        category:    'combat',
        react:       '🏰',
        description: 'Enter a dungeon gate for big EXP and gold rewards',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'dungeon', CD.dungeon);
        if (onCooldown) {
            return reply(buildBox('🏰 ON COOLDOWN', [`  Dungeon resets in: ${formatCooldown(remaining)}`]));
        }

        // Pick dungeon by rank or name
        const input   = q?.toLowerCase();
        const dungeon = input
            ? DUNGEONS.find(d => d.name.toLowerCase().includes(input) || d.rank.toLowerCase() === input)
            : DUNGEONS[Math.min(Math.floor(player.level / 20), DUNGEONS.length - 1)];

        if (!dungeon) {
            const list = DUNGEONS.map(d => `  ${d.rank}-Rank: ${d.name} (${d.keyReq} keys)`).join('\n');
            return reply(buildBox('🏰 DUNGEONS', list.split('\n')));
        }

        if (player.inventory.keys < dungeon.keyReq) {
            return reply(
                buildBox('🏰 NOT ENOUGH KEYS', [
                    `  ${dungeon.name} requires ${dungeon.keyReq} key(s).`,
                    `  You have: ${player.inventory.keys}`,
                    `  Farm dungeons to find keys.`,
                ])
            );
        }

        // Success chance based on rank multiplier
        const mult       = getRank(player.level, player.jid).rankId;
        const successRate = Math.min(0.95, 0.4 + mult * 0.05);
        const cleared    = Math.random() < successRate;

        await setCooldown(sender, 'dungeon');
        if (dungeon.keyReq > 0) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.keys': -dungeon.keyReq } });
        }

        if (cleared) {
            const scaled = await scaleRewards(
                { exp: dungeon.expReward, gold: dungeon.goldReward },
                player.level, player.jid
            );
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await trackBloodmoon(sender);
            // Guild contribution — 2% of gold goes to guild vault if member
            try {
                if (player.guild?.guildId) {
                    const guildCut = Math.floor(scaled.gold * 0.02);
                    if (guildCut > 0) {
                        await require('../king/rpg/model').Guild.findOneAndUpdate(
                            { guildId: player.guild.guildId },
                            { $inc: { 'vault.gold': guildCut } }
                        );
                    }
                }
            } catch(e) {}
            const huntNotify = (msg) => Malvin.sendMessage(from, { text: msg }, { quoted: ms });
            await trackQuestStat(sender, 'huntsWon', 1, huntNotify);
            // Track world quest progress
            try {
                const currWorld = player.currentWorld || 'aevoria';
                await require('../king/rpg/model').GlobalPlayer.findOneAndUpdate(
                    { jid: sender },
                    { $inc: { [`worldQuestProgress.${currWorld}.worldHunts`]: 1 } }
                );
            } catch(e) {}
            await trackQuestStat(sender, 'goldEarned', scaled.gold, null);

            // Pet drop chance during hunt
            try {
                const huntWt   = scaled.worldMods?.worldTime || await require('../king/rpg/worldTime').getWorldTime();
                const petFound = await tryFindPet(player, 'hunt', huntWt);
                if (petFound) {
                    const petSpecies = PET_SPECIES[petFound];
                    const rEmoji     = RARITY_EMOJIS[petSpecies.rarity];
                    const updPlayer  = await fetchPlayer(sender);
                    const maxPets    = updPlayer.maxPets || 3;
                    if ((updPlayer.pets || []).length < maxPets * 2) {
                        const { GlobalPlayer } = require('../king/rpg/model');
                        const isActive = (updPlayer.pets || []).filter(p => p.active).length < maxPets;
                        await GlobalPlayer.findOneAndUpdate(
                            { jid: sender },
                            { $push: { pets: {
                                species: petFound, name: petSpecies.name,
                                level: 1, exp: 0, hunger: 100, happiness: 100,
                                active: isActive, birthYear: huntWt.year, foundAt: 'hunt',
                            }}}
                        );
                        await Malvin.sendMessage(from, {
                            text: buildBox(`${petSpecies.emoji} PET FOUND!`, [
                                `  A wild *${petSpecies.name}* appeared!`,
                                `  Rarity: ${rEmoji} *${petSpecies.rarity}*`,
                                `  ───────`,
                                `  ${petSpecies.description}`,
                                `  ───────`,
                                `  Check *.pets* to see your new companion!`,
                            ]),
                        }, { quoted: ms });
                    }
                }
            } catch (e) { console.error('Pet find error:', e); }
            await addDungeonClear(sender);
            await addKarma(sender, 10);
            if (Math.random() < 0.3) await addItem(sender, 'keys', 1);

            await react('🏰');
            await reply(
                buildBox(`🏰 DUNGEON CLEAR — ${dungeon.name}`, [
                    `  Rank: ${dungeon.rank}-Rank  |  Floors: ${dungeon.floors}`,
                    `  ───────`,
                    `  ✅ All floors cleared!`,
                    `  ✨ EXP:  +${scaled.exp.toLocaleString()}`,
                    `  💰 Gold: +${scaled.gold.toLocaleString()}`,
                    `  ⚖️  Karma: +10`,
                    Math.random() < 0.3 ? `  🗝️  +1 Key dropped!` : `  🗝️  No key drop this run.`,
                    `  ───────`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            const dmg = Math.floor(player.combat.maxHp * 0.3);
            await takeDamage(sender, dmg);
            await react('💀');
            await reply(
                buildBox(`🏰 DUNGEON FAILED — ${dungeon.name}`, [
                    `  ❌ Gate collapse! You barely escaped.`,
                    `  ❤️  HP: -${dmg}`,
                    `  Keys consumed: ${dungeon.keyReq}`,
                    `  Use *.heal* and try again.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .raid — Guild/group raid
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'raid',
        aliases:     ['guildraid'],
        category:    'combat',
        react:       '🔴',
        description: 'Join a group raid for massive rewards (long cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'raid', CD.raid);
        if (onCooldown) {
            return reply(buildBox('🔴 ON COOLDOWN', [`  Raid resets in: ${formatCooldown(remaining)}`]));
        }

        const success  = Math.random() < 0.6;
        const scaled   = await scaleRewards({ exp: 3000, gold: 2500 }, player.level, player.jid, null, player);
        await setCooldown(sender, 'raid');

        if (success) {
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await trackBloodmoon(sender);
            // Guild contribution — 2% of gold goes to guild vault if member
            try {
                if (player.guild?.guildId) {
                    const guildCut = Math.floor(scaled.gold * 0.02);
                    if (guildCut > 0) {
                        await require('../king/rpg/model').Guild.findOneAndUpdate(
                            { guildId: player.guild.guildId },
                            { $inc: { 'vault.gold': guildCut } }
                        );
                    }
                }
            } catch(e) {}
            const huntNotify = (msg) => Malvin.sendMessage(from, { text: msg }, { quoted: ms });
            await trackQuestStat(sender, 'huntsWon', 1, huntNotify);
            // Track world quest progress
            try {
                const currWorld = player.currentWorld || 'aevoria';
                await require('../king/rpg/model').GlobalPlayer.findOneAndUpdate(
                    { jid: sender },
                    { $inc: { [`worldQuestProgress.${currWorld}.worldHunts`]: 1 } }
                );
            } catch(e) {}
            await trackQuestStat(sender, 'goldEarned', scaled.gold, null);

            // Pet drop chance during hunt
            try {
                const huntWt   = scaled.worldMods?.worldTime || await require('../king/rpg/worldTime').getWorldTime();
                const petFound = await tryFindPet(player, 'hunt', huntWt);
                if (petFound) {
                    const petSpecies = PET_SPECIES[petFound];
                    const rEmoji     = RARITY_EMOJIS[petSpecies.rarity];
                    const updPlayer  = await fetchPlayer(sender);
                    const maxPets    = updPlayer.maxPets || 3;
                    if ((updPlayer.pets || []).length < maxPets * 2) {
                        const { GlobalPlayer } = require('../king/rpg/model');
                        const isActive = (updPlayer.pets || []).filter(p => p.active).length < maxPets;
                        await GlobalPlayer.findOneAndUpdate(
                            { jid: sender },
                            { $push: { pets: {
                                species: petFound, name: petSpecies.name,
                                level: 1, exp: 0, hunger: 100, happiness: 100,
                                active: isActive, birthYear: huntWt.year, foundAt: 'hunt',
                            }}}
                        );
                        await Malvin.sendMessage(from, {
                            text: buildBox(`${petSpecies.emoji} PET FOUND!`, [
                                `  A wild *${petSpecies.name}* appeared!`,
                                `  Rarity: ${rEmoji} *${petSpecies.rarity}*`,
                                `  ───────`,
                                `  ${petSpecies.description}`,
                                `  ───────`,
                                `  Check *.pets* to see your new companion!`,
                            ]),
                        }, { quoted: ms });
                    }
                }
            } catch (e) { console.error('Pet find error:', e); }
            await addCrystals(sender, 3);
            await addKarma(sender, 25);
            await addKill(sender);
            await react('🔴');
            await reply(
                buildBox('🔴 RAID — VICTORY', [
                    `  ${name} led the raid to victory!`,
                    `  ───────`,
                    `  ✨ EXP:      +${scaled.exp.toLocaleString()}`,
                    `  💰 Gold:     +${scaled.gold.toLocaleString()}`,
                    `  🔮 Crystals: +3`,
                    `  ⚖️  Karma:    +25`,
                    `  ───────`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            await takeDamage(sender, Math.floor(player.combat.maxHp * 0.5));
            await react('💀');
            await reply(
                buildBox('🔴 RAID — FAILED', [
                    `  The raid boss overwhelmed your team!`,
                    `  ❤️  HP: -50%`,
                    `  Regroup and try again in ${formatCooldown(CD.raid)}.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .boss — Solo boss fight
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'boss',
        aliases:     ['bossfight', 'bossraid'],
        category:    'combat',
        react:       '👹',
        description: 'Challenge a powerful boss monster',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'boss', CD.boss);
        if (onCooldown) {
            return reply(buildBox('👹 ON COOLDOWN', [`  Boss resets in: ${formatCooldown(remaining)}`]));
        }

        const boss = q
            ? BOSSES.find(b => b.name.toLowerCase().includes(q.toLowerCase()))
            : BOSSES[Math.min(Math.floor(player.level / 50), BOSSES.length - 1)];

        if (!boss) {
            return reply(
                buildBox('👹 BOSSES', BOSSES.map(b => `  ${b.name} — EXP:${b.exp} Gold:${b.gold} Crystal:${b.crystal}`))
            );
        }

        const { rankId } = getRank(player.level, player.jid);
        const winChance  = Math.min(0.85, 0.25 + rankId * 0.06);
        const won        = Math.random() < winChance;

        await setCooldown(sender, 'boss');

        if (won) {
            const scaled = await scaleRewards({ exp: boss.exp, gold: boss.gold }, player.level, player.jid, null, player);
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await trackBloodmoon(sender);
            // Guild contribution — 2% of gold goes to guild vault if member
            try {
                if (player.guild?.guildId) {
                    const guildCut = Math.floor(scaled.gold * 0.02);
                    if (guildCut > 0) {
                        await require('../king/rpg/model').Guild.findOneAndUpdate(
                            { guildId: player.guild.guildId },
                            { $inc: { 'vault.gold': guildCut } }
                        );
                    }
                }
            } catch(e) {}
            const huntNotify = (msg) => Malvin.sendMessage(from, { text: msg }, { quoted: ms });
            await trackQuestStat(sender, 'huntsWon', 1, huntNotify);
            // Track world quest progress
            try {
                const currWorld = player.currentWorld || 'aevoria';
                await require('../king/rpg/model').GlobalPlayer.findOneAndUpdate(
                    { jid: sender },
                    { $inc: { [`worldQuestProgress.${currWorld}.worldHunts`]: 1 } }
                );
            } catch(e) {}
            await trackQuestStat(sender, 'goldEarned', scaled.gold, null);

            // Pet drop chance during hunt
            try {
                const huntWt   = scaled.worldMods?.worldTime || await require('../king/rpg/worldTime').getWorldTime();
                const petFound = await tryFindPet(player, 'hunt', huntWt);
                if (petFound) {
                    const petSpecies = PET_SPECIES[petFound];
                    const rEmoji     = RARITY_EMOJIS[petSpecies.rarity];
                    const updPlayer  = await fetchPlayer(sender);
                    const maxPets    = updPlayer.maxPets || 3;
                    if ((updPlayer.pets || []).length < maxPets * 2) {
                        const { GlobalPlayer } = require('../king/rpg/model');
                        const isActive = (updPlayer.pets || []).filter(p => p.active).length < maxPets;
                        await GlobalPlayer.findOneAndUpdate(
                            { jid: sender },
                            { $push: { pets: {
                                species: petFound, name: petSpecies.name,
                                level: 1, exp: 0, hunger: 100, happiness: 100,
                                active: isActive, birthYear: huntWt.year, foundAt: 'hunt',
                            }}}
                        );
                        await Malvin.sendMessage(from, {
                            text: buildBox(`${petSpecies.emoji} PET FOUND!`, [
                                `  A wild *${petSpecies.name}* appeared!`,
                                `  Rarity: ${rEmoji} *${petSpecies.rarity}*`,
                                `  ───────`,
                                `  ${petSpecies.description}`,
                                `  ───────`,
                                `  Check *.pets* to see your new companion!`,
                            ]),
                        }, { quoted: ms });
                    }
                }
            } catch (e) { console.error('Pet find error:', e); }
            await addCrystals(sender, boss.crystal);
            await addKill(sender);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.bossKills': 1 } });
            await unlockAchievement(sender, `Boss Slayer: ${boss.name}`);
            await addKarma(sender, 30);

            await react('👹');
            await reply(
                buildBox(`👹 BOSS SLAIN — ${boss.name}`, [
                    `  ✅ ${name} defeated ${boss.name}!`,
                    `  ───────`,
                    `  ✨ EXP:      +${scaled.exp.toLocaleString()}`,
                    `  💰 Gold:     +${scaled.gold.toLocaleString()}`,
                    `  🔮 Crystals: +${boss.crystal}`,
                    `  ⚖️  Karma:    +30`,
                    `  ───────`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            const dmg = Math.floor(player.combat.maxHp * 0.6);
            await takeDamage(sender, dmg);
            const bossDeathResult = await applyDeath(sender, 'boss');
            await react('💀');
            await reply(
                buildBox(`👹 BOSS FIGHT — FAILED`, [
                    `  *${boss.name}* overpowered you!`,
                    `  ───────`,
                    ...buildDeathLines(bossDeathResult, 'boss'),
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .attack — Quick attack in active combat
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'attack',
        aliases:     ['atk', 'strike'],
        category:    'combat',
        react:       '⚡',
        description: 'Perform a basic attack (use during active combat)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const damage  = Math.floor((player.combat.attack + player.stats.str * 2) * (0.8 + Math.random() * 0.4));
        const expGain = Math.floor(damage * 0.5);

        await grantExp(sender, expGain, Math.floor(damage * 0.3), botId);
        await react('⚡');
        await reply(
            buildBox('⚡ ATTACK', [
                `  ⚔️  Damage dealt: ${damage}`,
                `  ✨ EXP gained: +${expGain}`,
                `  STR bonus: +${(player.stats.str - 1) * 2}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .skill — Use an unlocked skill
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'skill',
        aliases:     ['useskill', 'cast'],
        category:    'combat',
        react:       '💫',
        description: 'Use one of your unlocked skills in combat',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!q) {
            return reply(
                buildBox('💫 YOUR SKILLS', [
                    ...(player.skills.length
                        ? player.skills.map(s => `  ⚡ ${s.replace(/_/g, ' ')}`)
                        : ['  No skills unlocked. Use *.skills unlock <name>*']),
                ])
            );
        }

        const skillName = q.toLowerCase().replace(/ /g, '_');
        if (!player.skills.includes(skillName)) {
            return reply(`❌ You haven't unlocked *${q}*. Use *.skills* to see available skills.`);
        }

        const SKILL_EFFECTS = {
            slash:       { dmg: 30,  exp: 25,  mp: 10, desc: 'A swift blade slash' },
            fireball:    { dmg: 60,  exp: 50,  mp: 25, desc: 'A blazing fireball' },
            shadow_step: { dmg: 45,  exp: 35,  mp: 20, desc: 'Strike from the shadows' },
            arise:       { dmg: 0,   exp: 80,  mp: 40, desc: 'Command the dead to rise', special: 'shadow' },
            domain:      { dmg: 150, exp: 120, mp: 80, desc: 'Domain Expansion — absolute zone' },
            heal_pulse:  { dmg: 0,   exp: 20,  mp: 30, desc: 'Restore 30% HP', special: 'heal' },
        };

        const effect = SKILL_EFFECTS[skillName];
        if (!effect) return reply('❌ Skill effect not configured yet.');

        if (player.combat.mp < effect.mp) {
            return reply(buildBox('💫 NOT ENOUGH MP', [
                `  ${skillName} costs ${effect.mp} MP.`,
                `  Your MP: ${player.combat.mp}`,
                `  Use *.meditate* to restore MP.`,
            ]));
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -effect.mp } });

        if (effect.special === 'heal') {
            const healAmt = Math.floor(player.combat.maxHp * 0.3);
            await recoverHp(sender, healAmt);
            await react('💚');
            return reply(buildBox(`💚 ${skillName.toUpperCase()}`, [
                `  ${effect.desc}`,
                `  ❤️  HP restored: +${healAmt}`,
                `  💧 MP used: -${effect.mp}`,
            ]));
        }

        const scaled = await scaleRewards({ exp: effect.exp, gold: Math.floor(effect.dmg * 0.5) }, player.level, player.jid, null, player);
        await grantExp(sender, scaled.exp, scaled.gold, botId);

        await react('💫');
        await reply(
            buildBox(`💫 ${skillName.toUpperCase().replace(/_/g, ' ')}`, [
                `  ${effect.desc}`,
                `  ⚔️  Damage: ${effect.dmg}`,
                `  ✨ EXP: +${scaled.exp}`,
                `  💧 MP used: -${effect.mp}`,
                `  MP remaining: ${Math.max(0, player.combat.mp - effect.mp)}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .defend — Take a defensive stance
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'defend',
        aliases:     ['block', 'guard'],
        category:    'combat',
        react:       '🛡️',
        description: 'Take a defensive stance to reduce incoming damage',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);
        const defBonus = player.stats.def * 3;
        const expGain  = 10;
        await grantExp(sender, expGain, 5, botId);
        await react('🛡️');
        await reply(
            buildBox('🛡️ DEFENSIVE STANCE', [
                `  You brace for impact!`,
                `  DEF Bonus: +${defBonus} this turn`,
                `  ✨ EXP: +${expGain}`,
                `  Your DEF: ${player.stats.def}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .flee — Escape from combat
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'flee',
        aliases:     ['escape', 'run'],
        category:    'combat',
        react:       '🏃',
        description: 'Attempt to flee from battle (chance based on AGI)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player    = await fetchPlayer(sender);
        const fleeChance = Math.min(0.9, 0.4 + (player.stats.agi - 1) * 0.03);
        const fled      = Math.random() < fleeChance;

        if (fled) {
            await addKarma(sender, -2);
            await react('🏃');
            await reply(
                buildBox('🏃 FLED SUCCESSFULLY', [
                    `  You escaped from battle!`,
                    `  AGI: ${player.stats.agi} (flee rate: ${Math.floor(fleeChance * 100)}%)`,
                    `  ⚖️  Karma: -2 (cowardice penalty)`,
                ])
            );
        } else {
            const dmg = 15;
            await takeDamage(sender, dmg);
            await react('❌');
            await reply(
                buildBox('🏃 FLEE FAILED', [
                    `  You couldn't escape!`,
                    `  ❤️  HP: -${dmg}`,
                    `  Try upgrading AGI to flee faster.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .heal — Restore HP using potions
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'heal',
        aliases:     ['hp', 'usepot'],
        category:    'combat',
        react:       '💊',
        description: 'Use a potion to restore HP',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.inventory.potions < 1) {
            return reply(
                buildBox('💊 NO POTIONS', [
                    `  You have no potions left!`,
                    `  Buy potions at the shop or craft them.`,
                    `  Use *.alchemy* to craft potions.`,
                ])
            );
        }

        const healAmt = Math.floor(player.combat.maxHp * 0.4);
        await recoverHp(sender, healAmt);
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.potions': -1 } });

        await react('💊');
        await reply(
            buildBox('💊 HEALED', [
                `  ❤️  HP restored: +${healAmt}`,
                `  HP: ${Math.min(player.combat.maxHp, player.combat.hp + healAmt)} / ${player.combat.maxHp}`,
                `  Potions remaining: ${player.inventory.potions - 1}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .meditate — Restore MP
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'meditate',
        aliases:     ['mp', 'rest'],
        category:    'combat',
        react:       '🧘',
        description: 'Meditate to restore MP over time',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'meditate', CD.meditate);
        if (onCooldown) {
            return reply(buildBox('🧘 MEDITATING', [`  Still meditating: ${formatCooldown(remaining)}`]));
        }

        const mpRestored = Math.floor(player.combat.maxMp * 0.5);
        const newMp      = Math.min(player.combat.maxMp, player.combat.mp + mpRestored);
        await GlobalPlayer.updateOne({ jid: sender }, { $set: { 'combat.mp': newMp } });
        await setCooldown(sender, 'meditate');

        await react('🧘');
        await reply(
            buildBox('🧘 MEDITATION COMPLETE', [
                `  💧 MP restored: +${mpRestored}`,
                `  MP: ${newMp} / ${player.combat.maxMp}`,
                `  Mind and body restored.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .extract — Extract a shadow from defeated enemy
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'extract',
        aliases:     ['shadowextract'],
        category:    'combat',
        react:       '👥',
        description: 'Attempt to extract a shadow from a fallen enemy',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'extract', CD.extract);
        if (onCooldown) {
            return reply(buildBox('👥 ON COOLDOWN', [`  Extract resets in: ${formatCooldown(remaining)}`]));
        }

        if (!player.skills.includes('arise') && !player.skills.includes('extract')) {
            return reply(buildBox('👥 SKILL REQUIRED', [
                `  You need the *Arise* skill to extract shadows.`,
                `  Use *.skills unlock arise* (requires Level 50).`,
            ]));
        }

        const { rankId } = getRank(player.level, player.jid);
        const extractChance = Math.min(0.8, 0.2 + rankId * 0.07);
        const success = Math.random() < extractChance;

        await setCooldown(sender, 'extract');

        if (success) {
            const shadow = getRandShadow();
            const result = await addShadow(sender, shadow);

            if (!result.success) {
                return reply(buildBox('👥 SHADOW ARMY FULL', [
                    `  ${result.reason}`,
                    `  Use *.release <name>* to free a shadow.`,
                ]));
            }

            await react('👥');
            await reply(
                buildBox('👥 SHADOW EXTRACTED', [
                    `  🖤 ${shadow.name} has been extracted!`,
                    `  Rank:  ${shadow.rank}-Rank`,
                    `  Power: ${shadow.power.toLocaleString()}`,
                    `  Shadows: ${result.player.shadowCount} / ${result.player.maxShadows}`,
                    `  ───────`,
                    `  ARISE, ${shadow.name.toUpperCase()}! 👑`,
                ])
            );
        } else {
            await react('❌');
            await reply(
                buildBox('👥 EXTRACTION FAILED', [
                    `  The shadow resisted your command.`,
                    `  Extract chance: ${Math.floor(extractChance * 100)}%`,
                    `  Upgrade your rank to improve chances.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .shadows — View your shadow army
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'shadows',
        aliases:     ['army', 'shadowlist'],
        category:    'combat',
        react:       '👥',
        description: 'View your shadow soldier army',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const shadows = player.shadows || [];
        const lines   = shadows.length
            ? shadows.map(s => `  🖤 ${s.name} | ${s.rank}-Rank | Power: ${s.power.toLocaleString()}`)
            : ['  No shadows yet. Use *.extract* after combat.'];

        await react('👥');
        await reply(
            buildBox(`👥 SHADOW ARMY — ${name}`, [
                `  Shadows: ${player.shadowCount} / ${player.maxShadows}`,
                `  ───────`,
                ...lines,
                `  ───────`,
                `  Use *.arise* to deploy | *.release* to free`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .arise — Deploy shadows to auto-fight
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'arise',
        aliases:     ['deploy', 'shadowdeploy'],
        category:    'combat',
        react:       '🖤',
        description: 'Command your shadows to arise and fight for you',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const shadows = player.shadows || [];

        if (!shadows.length) {
            return reply(buildBox('🖤 NO SHADOWS', [
                `  You have no shadow soldiers.`,
                `  Use *.extract* after combat to gain shadows.`,
            ]));
        }

        const totalPower = shadows.reduce((sum, s) => sum + s.power, 0);
        const expGain    = Math.floor(totalPower * 0.1);
        const goldGain   = Math.floor(totalPower * 0.05);
        const scaled     = scaleRewards({ exp: expGain, gold: goldGain }, player.level, player.jid);

        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await react('🖤');
        await reply(
            buildBox('🖤 ARISE', [
                `  *ARISE, MY SHADOWS!* 👑`,
                `  ───────`,
                ...shadows.map(s => `  🖤 ${s.name} — deployed (${s.rank}-Rank)`),
                `  ───────`,
                `  Total Power: ${totalPower.toLocaleString()}`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .release — Free a shadow soldier
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'release',
        aliases:     ['freeshadow'],
        category:    'combat',
        react:       '🕊️',
        description: 'Release a shadow soldier from your army',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!q) return reply('❌ Usage: *.release <shadow name>*\nExample: *.release Igris*');

        const shadow = player.shadows?.find(s => s.name.toLowerCase() === q.toLowerCase());
        if (!shadow) {
            return reply(buildBox('🕊️ NOT FOUND', [
                `  Shadow "${q}" not in your army.`,
                `  Use *.shadows* to see your army.`,
            ]));
        }

        await removeShadow(sender, shadow.name);
        await react('🕊️');
        await reply(
            buildBox('🕊️ SHADOW RELEASED', [
                `  ${shadow.name} has been released.`,
                `  Rank: ${shadow.rank}-Rank`,
                `  Your army: ${player.shadowCount - 1} / ${player.maxShadows}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .scout — Scout an area before fighting
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'scout',
        aliases:     ['recon', 'survey'],
        category:    'combat',
        react:       '🔍',
        description: 'Scout your current area to preview enemy info',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'scout', CD.scout);
        if (onCooldown) {
            return reply(buildBox('🔍 ON COOLDOWN', [`  Scout resets in: ${formatCooldown(remaining)}`]));
        }

        const pool    = ENEMIES[player.locationId] || ENEMIES.default;
        const lines   = pool.map(e => `  ${e.rank}-Rank: ${e.name} | HP:${e.hp} ATK:${e.atk} EXP:${e.exp} Gold:${e.gold}`);
        const winRate = Math.floor(calcWinChance(player, pool[0]) * 100);

        await setCooldown(sender, 'scout');
        await react('🔍');
        await reply(
            buildBox(`🔍 SCOUT — ${player.locationId?.replace(/_/g, ' ').toUpperCase()}`, [
                `  Enemies spotted:`,
                ...lines,
                `  ───────`,
                `  Your win rate (avg): ~${winRate}%`,
                `  Your ATK: ${player.combat.attack}  DEF: ${player.combat.defense}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .auto-hunt — Automated hunting session
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'auto-hunt',
        aliases:     ['autohunt', 'grind'],
        category:    'combat',
        react:       '🤖',
        description: 'Auto-hunt 10 enemies in one session (45min cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'autohunt', CD.autohunt);
        if (onCooldown) {
            return reply(buildBox('🤖 ON COOLDOWN', [`  Auto-hunt resets in: ${formatCooldown(remaining)}`]));
        }

        if (player.hunger < 30) {
            return reply(buildBox('🤖 TOO HUNGRY', [`  Need 30%+ hunger to auto-hunt. Use *.eat* first.`]));
        }

        let totalExp  = 0;
        let totalGold = 0;
        let wins      = 0;
        const rounds  = 10;

        for (let i = 0; i < rounds; i++) {
            const enemy = getRandEnemy(player.locationId);
            const won   = Math.random() < calcWinChance(player, enemy);
            if (won) {
                const scaled = await scaleRewards({ exp: enemy.exp, gold: enemy.gold }, player.level, player.jid, null, player);
                totalExp  += scaled.exp;
                totalGold += scaled.gold;
                wins++;
            }
        }

        await grantExp(sender, totalExp, totalGold, botId);
        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'combat.kills': wins, hunger: -30 }
        });
        await setCooldown(sender, 'autohunt');

        await react('🤖');
        await reply(
            buildBox('🤖 AUTO-HUNT COMPLETE', [
                `  Hunter: ${name}`,
                `  Rounds: ${rounds}  |  Wins: ${wins}  |  Losses: ${rounds - wins}`,
                `  ───────`,
                `  ✨ Total EXP:  +${totalExp.toLocaleString()}`,
                `  💰 Total Gold: +${totalGold.toLocaleString()}`,
                `  🍖 Hunger: -30%`,
                `  ───────`,
                buildFooter(totalExp, totalGold, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .duel — PvP duel another player
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'duel',
        aliases:     ['pvp', 'challenge'],
        category:    'combat',
        react:       '⚔️',
        description: 'Duel another player for gold and glory',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, args, botId } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player you want to duel.\nExample: *.duel @player 500*');

        const betAmount = parseInt(args[0]) || 500;

        await getPlayer(sender, botId);
        const challenger = await fetchPlayer(sender);
        const name = challenger.username || pushName;
        const { onCooldown, remaining } = checkCooldown(challenger, 'duel', CD.duel);

        if (onCooldown) {
            return reply(buildBox('⚔️ ON COOLDOWN', [`  Duel resets in: ${formatCooldown(remaining)}`]));
        }

        if (challenger.gold < betAmount) {
            return reply(`❌ You need ${betAmount} gold to duel. You have ${challenger.gold}.`);
        }

        await getPlayer(targetJid, botId);
        const opponent = await fetchPlayer(targetJid);

        if (!opponent) return reply('❌ That player hasn\'t started yet. Tell them to use *.start*');
        if (opponent.gold < betAmount) {
            return reply(`❌ Opponent doesn't have enough gold for this bet.`);
        }

        // Combat calculation
        const chalPower = challenger.combat.attack + challenger.stats.str * 2 + Math.random() * 20;
        const oppPower  = opponent.combat.attack   + opponent.stats.str   * 2 + Math.random() * 20;
        const chalWon   = chalPower > oppPower;

        const winner = chalWon ? sender     : targetJid;
        const loser  = chalWon ? targetJid  : sender;
        const oppName = opponent.username || targetJid.split('@')[0];
        const winName = chalWon ? name  : oppName;
        const losName = chalWon ? oppName : name;

        await GlobalPlayer.updateOne({ jid: winner }, { $inc: { gold: betAmount } });
        await GlobalPlayer.updateOne({ jid: loser  }, { $inc: { gold: -betAmount } });
        await addKill(winner);
        await addKarma(winner, 15);
        await setCooldown(sender, 'duel');

        const expGain = scaleRewards({ exp: 200, gold: 0 }, challenger.level, challenger.jid).exp;
        await grantExp(winner, expGain, 0, botId);

        await react('⚔️');
        await reply(
            buildBox('⚔️ DUEL RESULT', [
                `  ${name} vs ${oppName}`,
                `  Bet: ${betAmount.toLocaleString()} Gold`,
                `  ───────`,
                `  🏆 WINNER: ${winName}`,
                `  💀 LOSER:  ${losName}`,
                `  ───────`,
                `  🏆 +${betAmount} Gold`,
                `  ✨ +${expGain} EXP`,
                `  ⚖️  +15 Karma`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .pillage — Raid a player's gold (dark alignment bonus)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'pillage',
        aliases:     ['raid-player', 'plunder'],
        category:    'combat',
        react:       '💀',
        description: 'Pillage another player\'s gold (Dark/Chaos alignment gets bonus)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to pillage.\nExample: *.pillage @player*');

        await getPlayer(sender, botId);
        const attacker = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(attacker, 'pillage', CD.pillage);
        if (onCooldown) {
            return reply(buildBox('💀 ON COOLDOWN', [`  Pillage resets in: ${formatCooldown(remaining)}`]));
        }

        const target = await fetchPlayer(targetJid);
        if (!target) return reply('❌ Target hasn\'t started yet.');

        // Dark/Chaos gets 2x steal rate
        const darkBonus = ['Dark', 'Chaos'].includes(attacker.alignment) ? 2 : 1;
        const stealRate = Math.min(0.3, 0.1 * darkBonus);
        const success   = Math.random() < (0.4 + (attacker.stats.str - 1) * 0.02);

        await setCooldown(sender, 'pillage');

        if (success) {
            const stolen = Math.floor(target.gold * stealRate);
            await GlobalPlayer.updateOne({ jid: targetJid }, { $inc: { gold: -stolen } });
            await GlobalPlayer.updateOne({ jid: sender   }, { $inc: { gold:  stolen } });
            await addKarma(sender, -20);
            await addKill(sender);

            await react('💀');
            await reply(
                buildBox('💀 PILLAGE SUCCESS', [
                    `  You raided ${targetJid.split('@')[0]}!`,
                    `  💰 Stolen: ${stolen.toLocaleString()} Gold`,
                    `  ⚖️  Karma: -20`,
                    ...(darkBonus > 1 ? [`  🌑 Dark Alignment Bonus: 2x steal`] : []),
                    `  ───────`,
                    buildFooter(0, stolen, attacker),
                ])
            );
        } else {
            const dmg = 20;
            await takeDamage(sender, dmg);
            await addKarma(sender, -5);
            await react('❌');
            await reply(
                buildBox('💀 PILLAGE FAILED', [
                    `  ${targetJid.split('@')[0]} fought you off!`,
                    `  ❤️  HP: -${dmg}`,
                    `  ⚖️  Karma: -5`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .hospital — Check/heal at hospital
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'hospital',
        aliases:     ['infirmary', 'clinic'],
        category:    'combat',
        react:       '🏥',
        description: 'Visit the hospital to fully restore HP for gold',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const missingHp = player.combat.maxHp - player.combat.hp;
        if (missingHp <= 0) {
            return reply(buildBox('🏥 FULLY HEALED', [`  You are already at full HP!`]));
        }

        const cost = missingHp * 2; // 2 gold per HP

        if (player.gold < cost) {
            return reply(
                buildBox('🏥 HOSPITAL', [
                    `  HP: ${player.combat.hp} / ${player.combat.maxHp}`,
                    `  Heal cost: ${cost} Gold`,
                    `  Your Gold: ${player.gold}`,
                    `  Not enough gold!`,
                ])
            );
        }

        await GlobalPlayer.updateOne(
            { jid: sender },
            { $set: { 'combat.hp': player.combat.maxHp }, $inc: { gold: -cost } }
        );

        await react('🏥');
        await reply(
            buildBox('🏥 FULLY HEALED', [
                `  ❤️  HP: ${player.combat.maxHp} / ${player.combat.maxHp}`,
                `  💰 Cost: -${cost} Gold`,
                `  You are fully restored!`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .combat-stats — View combat profile
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'combat-stats',
        aliases:     ['cs', 'battlestats'],
        category:    'combat',
        react:       '⚔️',
        description: 'View your full combat statistics',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;
        const { rankName } = getRank(player.level, player.jid);

        await react('⚔️');
        await reply(
            buildBox('⚔️ COMBAT PROFILE', [
                `  ${name}  |  ${rankName}`,
                `  ───────`,
                `  ❤️  HP: ${player.combat.hp} / ${player.combat.maxHp}`,
                `  💧 MP: ${player.combat.mp} / ${player.combat.maxMp}`,
                `  ⚔️  ATK: ${player.combat.attack}`,
                `  🛡️  DEF: ${player.combat.defense}`,
                `  ───────`,
                `  ☠️  Kills:   ${player.combat.kills}`,
                `  💀 Deaths:  ${player.combat.deaths}`,
                `  🔥 Death Streak: ${player.deathStreak || 0}`,
                `  🏰 Dungeons: ${player.combat.dungeonClears}`,
                `  👹 Bosses:  ${player.combat.bossKills}`,
                `  ───────`,
                `  👥 Shadows: ${player.shadowCount} / ${player.maxShadows}`,
                `  K/D Ratio: ${player.combat.deaths > 0 ? (player.combat.kills / player.combat.deaths).toFixed(2) : player.combat.kills}`,
            ])
        );
    }
);

module.exports = {};


// ══════════════════════════════════════════════════════════════════════
// EXTENDED COMMANDS — from new_cmds/combat2.js
// ══════════════════════════════════════════════════════════════════════
const CD_COMBAT2 = {
    trap:           30 * 60 * 1000,
    ambush:         45 * 60 * 1000,
    counter:         5 * 60 * 1000,
    combo:          10 * 60 * 1000,
    fury:           20 * 60 * 1000,
    ragemode:       60 * 60 * 1000,
    summon:          2 * 60 * 60 * 1000,
    barrier:        15 * 60 * 1000,
    poison:         30 * 60 * 1000,
    bleed:          20 * 60 * 1000,
    stun:           10 * 60 * 1000,
    chainattack:    15 * 60 * 1000,
    execute:        45 * 60 * 1000,
    parry:           5 * 60 * 1000,
    absorb:         20 * 60 * 1000,
    clone:           3 * 60 * 60 * 1000,
    taunt:          10 * 60 * 1000,
    flank:          30 * 60 * 1000,
    siege:           4 * 60 * 60 * 1000,
    laststand:       2 * 60 * 60 * 1000,
    warcry:         30 * 60 * 1000,
    bloodpact:       6 * 60 * 60 * 1000,
    voidstrike:      4 * 60 * 60 * 1000,
    domainexpand:    8 * 60 * 60 * 1000,
    monarchstrike:  12 * 60 * 60 * 1000,
    revive:          4 * 60 * 60 * 1000,
};


mxd(
    {
        pattern:     'pvp-rank',
        aliases:     ['pvplb', 'killlb'],
        category:    'combat',
        react:       '⚔️',
        description: 'View the global PvP kill leaderboard',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const top    = await GlobalPlayer.find({ registered: true })
            .sort({ 'combat.kills': -1 })
            .limit(10)
            .lean();

        if (!top.length) return reply('⚔️ No PvP data yet!');

        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

        await react('⚔️');
        await reply(
            buildBox('⚔️ PVP LEADERBOARD', [
                ...top.map((p, i) => {
                    const name = p.username || p.jid.split('@')[0];
                    const kd   = p.combat.deaths > 0
                        ? (p.combat.kills / p.combat.deaths).toFixed(2)
                        : p.combat.kills;
                    return `  ${medals[i]} *${name}* — ☠️ ${p.combat.kills} kills | K/D: ${kd}`;
                }),
            ])
        );
    }
);

mxd(
    {
        pattern:     'shadow-power',
        aliases:     ['armypower', 'shadowstr'],
        category:    'combat',
        react:       '👥',
        description: 'Check your shadow army total power rating',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player      = await fetchPlayer(sender);
        const name        = player.username || pushName;
        const shadows     = player.shadows || [];
        const totalPower  = shadows.reduce((s, sh) => s + sh.power, 0);
        const avgPower    = shadows.length ? Math.floor(totalPower / shadows.length) : 0;

        await react('👥');
        await reply(
            buildBox('👥 SHADOW ARMY POWER', [
                `  Commander: ${name}`,
                `  Shadows: ${shadows.length} / ${player.maxShadows}`,
                `  ───────`,
                ...( shadows.length
                    ? shadows.map(s => `  🖤 ${s.name} [${s.rank}] — ${s.power.toLocaleString()} pw`)
                    : ['  No shadows. Use *.extract* to gain some.']
                ),
                `  ───────`,
                `  Total Power: ${totalPower.toLocaleString()}`,
                `  Avg Power:   ${avgPower.toLocaleString()}`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'battle-log',
        aliases:     ['battlelog', 'combatlog'],
        category:    'combat',
        react:       '📜',
        description: 'View your full combat statistics',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player     = await fetchPlayer(sender);
        const name       = player.username || pushName;
        const { rankName } = getRank(player.level, player.jid);
        const kd         = player.combat.deaths > 0
            ? (player.combat.kills / player.combat.deaths).toFixed(2)
            : player.combat.kills;

        await react('📜');
        await reply(
            buildBox('📜 BATTLE LOG', [
                `  Hunter: ${name}  |  ${rankName}`,
                `  ───────`,
                `  ☠️  Kills:          ${player.combat.kills}`,
                `  💀 Deaths:         ${player.combat.deaths}`,
                `  📊 K/D Ratio:      ${kd}`,
                `  🏰 Dungeon Clears: ${player.combat.dungeonClears}`,
                `  👹 Boss Kills:     ${player.combat.bossKills}`,
                `  ───────`,
                `  ❤️  HP: ${player.combat.hp} / ${player.combat.maxHp}`,
                `  💧 MP: ${player.combat.mp} / ${player.combat.maxMp}`,
                `  ⚔️  ATK: ${player.combat.attack}  🛡️ DEF: ${player.combat.defense}`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'kill-streak',
        aliases:     ['killstreak', 'streak'],
        category:    'combat',
        react:       '🔥',
        description: 'Check your kill streak and bonus multiplier',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;
        const kills  = player.combat.kills;

        const tier =
            kills >= 100 ? { label: 'LEGENDARY',     mult: 3.0, emoji: '👑' } :
            kills >= 50  ? { label: 'UNSTOPPABLE',   mult: 2.5, emoji: '💥' } :
            kills >= 25  ? { label: 'DOMINATING',    mult: 2.0, emoji: '🔥' } :
            kills >= 10  ? { label: 'KILLING SPREE', mult: 1.5, emoji: '⚡' } :
            kills >= 5   ? { label: 'MULTI KILL',    mult: 1.2, emoji: '⚔️' } :
                           { label: 'STARTING OUT',  mult: 1.0, emoji: '🗡️' };

        const nextAt = kills >= 100 ? 'MAX' : kills >= 50 ? '100' :
                       kills >= 25 ? '50' : kills >= 10 ? '25' :
                       kills >= 5 ? '10' : '5';

        await react('🔥');
        await reply(
            buildBox('🔥 KILL STREAK', [
                `  Hunter: ${name}`,
                `  ───────`,
                `  ${tier.emoji} ${tier.label}`,
                `  Total Kills:    ${kills}`,
                `  EXP Multiplier: ${tier.mult}x`,
                `  ───────`,
                `  Next tier at: ${nextAt} kills`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'revive',
        aliases:     ['resurrect', 'respawn'],
        category:    'combat',
        react:       '✨',
        description: 'Revive from death using 3 diamonds',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'revive', CD.revive);
        if (onCooldown) return reply(buildBox('✨ ON COOLDOWN', [`  Revive resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.hp > 0) {
            return reply(buildBox('✨ STILL ALIVE', [
                `  HP: ${player.combat.hp} / ${player.combat.maxHp}`,
                `  You don't need to revive!`,
            ]));
        }

        const cost = 3;
        if (player.diamonds < cost) {
            return reply(buildBox('✨ NOT ENOUGH DIAMONDS', [
                `  Revive costs ${cost} 💎`,
                `  You have: ${player.diamonds}`,
            ]));
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { diamonds: -cost },
            $set: { 'combat.hp': player.combat.maxHp, 'combat.mp': player.combat.maxMp },
        });
        await setCooldown(sender, 'revive');

        await react('✨');
        await reply(
            buildBox('✨ REVIVED', [
                `  💎 Cost: -${cost} Diamonds`,
                `  ❤️  HP: ${player.combat.maxHp} / ${player.combat.maxHp}`,
                `  💧 MP: ${player.combat.maxMp} / ${player.combat.maxMp}`,
                `  Rise and fight again! ⚔️`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'ambush',
        aliases:     ['surprise', 'sneak'],
        category:    'combat',
        react:       '🥷',
        description: 'Ambush an enemy for a guaranteed first-strike bonus',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'ambush', CD.ambush);
        if (onCooldown) return reply(buildBox('🥷 ON COOLDOWN', [`  Ambush resets in: ${formatCooldown(remaining)}`]));

        const agiBonus = 1 + (player.stats.agi - 1) * 0.03;
        const scaled   = scaleRewards({ exp: 200, gold: 150 }, player.level, player.jid);
        const finalExp = Math.floor(scaled.exp * agiBonus);

        await grantExp(sender, finalExp, scaled.gold, botId);
        await addKill(sender);
        await setCooldown(sender, 'ambush');

        await react('🥷');
        await reply(
            buildBox('🥷 AMBUSH SUCCESS', [
                `  Strike from the shadows!`,
                `  ✨ EXP:  +${finalExp} (AGI boosted)`,
                `  💰 Gold: +${scaled.gold}`,
                `  🏃 AGI Bonus: ${agiBonus.toFixed(2)}x`,
                buildFooter(finalExp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'counter',
        aliases:     ['counterattack', 'retaliate'],
        category:    'combat',
        react:       '↩️',
        description: 'Perform a powerful counter-attack using DEF',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'counter', CD.counter);
        if (onCooldown) return reply(buildBox('↩️ ON COOLDOWN', [`  Counter resets in: ${formatCooldown(remaining)}`]));

        const defBonus = 1 + (player.stats.def - 1) * 0.04;
        const damage   = Math.floor(player.combat.attack * 1.5 * defBonus);
        const scaled   = scaleRewards({ exp: 80, gold: 50 }, player.level, player.jid);

        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'counter');

        await react('↩️');
        await reply(
            buildBox('↩️ COUNTER ATTACK', [
                `  You turned defense into offense!`,
                `  ⚔️  Counter damage: ${damage}`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  🛡️  DEF bonus: ${defBonus.toFixed(2)}x`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'combo',
        aliases:     ['comboattack', 'tripleattack'],
        category:    'combat',
        react:       '💥',
        description: 'Perform a 3-hit combo attack (costs 20 MP)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'combo', CD.combo);
        if (onCooldown) return reply(buildBox('💥 ON COOLDOWN', [`  Combo resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 20) return reply('❌ Combo costs 20 MP.');

        const hits   = [0, 1, 2].map(() => Math.floor(player.combat.attack * (0.8 + Math.random() * 0.6)));
        const total  = hits.reduce((s, h) => s + h, 0);
        const scaled = scaleRewards({ exp: 150, gold: 100 }, player.level, player.jid);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -20 } });
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'combo');

        await react('💥');
        await reply(
            buildBox('💥 COMBO ATTACK', [
                `  Hit 1: ${hits[0]} dmg`,
                `  Hit 2: ${hits[1]} dmg`,
                `  Hit 3: ${hits[2]} dmg`,
                `  ───────`,
                `  Total:  ${total} damage!`,
                `  ✨ EXP: +${scaled.exp}`,
                `  💧 MP:  -20`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'fury',
        aliases:     ['berserk', 'enrage'],
        category:    'combat',
        react:       '😡',
        description: 'Enter fury mode for a temporary ATK boost',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'fury', CD.fury);
        if (onCooldown) return reply(buildBox('😡 ON COOLDOWN', [`  Fury resets in: ${formatCooldown(remaining)}`]));

        const atkBoost = Math.floor(player.stats.str * 3);
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.attack': atkBoost } });
        const scaled = scaleRewards({ exp: 100, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'fury');

        await react('😡');
        await reply(
            buildBox('😡 FURY ACTIVATED', [
                `  Adrenaline surges through you!`,
                `  ⚔️  ATK Boost: +${atkBoost} (temp)`,
                `  ✨ EXP: +${scaled.exp}`,
                `  Duration: Until next *.sleep*`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'rage-mode',
        aliases:     ['ragemode', 'fullrage'],
        category:    'combat',
        react:       '🔥',
        description: 'Activate full rage — double ATK but lose 20% HP',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'ragemode', CD.ragemode);
        if (onCooldown) return reply(buildBox('🔥 ON COOLDOWN', [`  Rage Mode resets in: ${formatCooldown(remaining)}`]));

        const hpCost  = Math.floor(player.combat.maxHp * 0.2);
        const atkGain = player.combat.attack;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'combat.attack': atkGain, 'combat.hp': -hpCost }
        });

        const scaled = scaleRewards({ exp: 200, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'ragemode');

        await react('🔥');
        await reply(
            buildBox('🔥 RAGE MODE ACTIVATED', [
                `  Power doubles at the cost of blood!`,
                `  ⚔️  ATK: +${atkGain} (doubled!)`,
                `  ❤️  HP:  -${hpCost} (20% sacrifice)`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'summon',
        aliases:     ['callally', 'conjure'],
        category:    'combat',
        react:       '🌀',
        description: 'Summon a combat ally (costs 2 Crystal Ore)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'summon', CD.summon);
        if (onCooldown) return reply(buildBox('🌀 ON COOLDOWN', [`  Summon resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.crystalOre || 0) < 2) return reply('❌ Summoning requires 2 Crystal Ore.');

        const ALLIES = [
            { name: 'Spirit Wolf',    power: 500,  bonus: '+10% hunt EXP'     },
            { name: 'Fire Elemental', power: 800,  bonus: '+15% ATK'          },
            { name: 'Shadow Wraith',  power: 1200, bonus: '+20% crit chance'  },
            { name: 'Ice Golem',      power: 1000, bonus: '+15% DEF'          },
        ];

        const ally   = ALLIES[Math.floor(Math.random() * ALLIES.length)];
        const scaled = scaleRewards({ exp: 300, gold: 200 }, player.level, player.jid);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -2 } });
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'summon');

        await react('🌀');
        await reply(
            buildBox('🌀 ALLY SUMMONED', [
                `  ${ally.name} answers your call!`,
                `  Power: ${ally.power.toLocaleString()}`,
                `  Bonus: ${ally.bonus}`,
                `  ───────`,
                `  🔮 Crystal Ore: -2`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'barrier',
        aliases:     ['shield', 'ward'],
        category:    'combat',
        react:       '🛡️',
        description: 'Erect a magic barrier to absorb next attack (costs 30 MP)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'barrier', CD.barrier);
        if (onCooldown) return reply(buildBox('🛡️ ON COOLDOWN', [`  Barrier resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 30) return reply('❌ Barrier costs 30 MP.');

        const barrierHp = Math.floor(player.combat.maxHp * 0.3 + player.stats.def * 10);
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -30 } });
        await setCooldown(sender, 'barrier');

        await react('🛡️');
        await reply(
            buildBox('🛡️ BARRIER ERECTED', [
                `  A ${barrierHp} HP barrier surrounds you!`,
                `  💧 MP: -30`,
                `  DEF contribution: +${player.stats.def * 10}`,
                `  Active until next hit.`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'poison',
        aliases:     ['venom', 'toxic'],
        category:    'combat',
        react:       '☠️',
        description: 'Poison an enemy for damage over time (costs 3 Herbs)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'poison', CD.poison);
        if (onCooldown) return reply(buildBox('☠️ ON COOLDOWN', [`  Poison resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.herbs || 0) < 3) return reply('❌ Poisoning requires 3 Herbs.');

        const lukMult   = 1 + (player.stats.luk - 1) * 0.02;
        const poisonDmg = Math.floor(50 * lukMult);
        const scaled    = scaleRewards({ exp: 180, gold: 120 }, player.level, player.jid);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.herbs': -3 } });
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'poison');

        await react('☠️');
        await reply(
            buildBox('☠️ POISON APPLIED', [
                `  Enemy afflicted!`,
                `  🌿 Herbs: -3`,
                `  ☠️  Poison dmg: ${poisonDmg} per tick`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'bleed',
        aliases:     ['hemorrhage', 'lacerate'],
        category:    'combat',
        react:       '🩸',
        description: 'Apply a bleed effect (STR-scaled damage over time)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'bleed', CD.bleed);
        if (onCooldown) return reply(buildBox('🩸 ON COOLDOWN', [`  Bleed resets in: ${formatCooldown(remaining)}`]));

        const strMult   = 1 + (player.stats.str - 1) * 0.03;
        const bleedDmg  = Math.floor(40 * strMult);
        const scaled    = scaleRewards({ exp: 140, gold: 90 }, player.level, player.jid);

        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'bleed');

        await react('🩸');
        await reply(
            buildBox('🩸 BLEED APPLIED', [
                `  Deep wound inflicted!`,
                `  🩸 Bleed dmg: ${bleedDmg} per turn`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  ⚔️  STR bonus: ${strMult.toFixed(2)}x`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'stun',
        aliases:     ['paralyze', 'immobilize'],
        category:    'combat',
        react:       '⚡',
        description: 'Stun an enemy to skip their next action (costs 15 MP)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'stun', CD.stun);
        if (onCooldown) return reply(buildBox('⚡ ON COOLDOWN', [`  Stun resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 15) return reply('❌ Stun costs 15 MP.');

        const stunChance = Math.min(0.9, 0.5 + (player.stats.int - 1) * 0.02);
        const success    = Math.random() < stunChance;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -15 } });
        await setCooldown(sender, 'stun');

        if (success) {
            const scaled = scaleRewards({ exp: 100, gold: 70 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await react('⚡');
            await reply(
                buildBox('⚡ STUN SUCCESS', [
                    `  Enemy stunned!`,
                    `  💧 MP: -15`,
                    `  ✨ EXP: +${scaled.exp}`,
                    `  INT chance: ${Math.floor(stunChance * 100)}%`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            await react('❌');
            await reply(
                buildBox('⚡ STUN MISSED', [
                    `  Enemy resisted!`,
                    `  💧 MP: -15 (wasted)`,
                    `  Upgrade INT to improve hit rate.`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'chain-attack',
        aliases:     ['chainattack', 'rapidstrike'],
        category:    'combat',
        react:       '⚔️',
        description: 'Unleash 5 rapid attacks (costs 25 MP)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'chainattack', CD.chainattack);
        if (onCooldown) return reply(buildBox('⚔️ ON COOLDOWN', [`  Chain attack resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 25) return reply('❌ Chain attack costs 25 MP.');

        const hits   = Array.from({ length: 5 }, () =>
            Math.floor(player.combat.attack * 0.6 * (0.8 + Math.random() * 0.4))
        );
        const total  = hits.reduce((s, h) => s + h, 0);
        const scaled = scaleRewards({ exp: 200, gold: 150 }, player.level, player.jid);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -25 } });
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'chainattack');

        await react('⚔️');
        await reply(
            buildBox('⚔️ CHAIN ATTACK — 5 HITS', [
                ...hits.map((h, i) => `  Hit ${i + 1}: ${h} dmg`),
                `  ───────`,
                `  Total: ${total} damage!`,
                `  ✨ EXP: +${scaled.exp}`,
                `  💧 MP: -25`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'execute',
        aliases:     ['finish', 'killblow'],
        category:    'combat',
        react:       '💀',
        description: 'Execute a weakened enemy for bonus rewards',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'execute', CD.execute);
        if (onCooldown) return reply(buildBox('💀 ON COOLDOWN', [`  Execute resets in: ${formatCooldown(remaining)}`]));

        const { rankId }  = getRank(player.level, player.jid);
        const execChance  = Math.min(0.85, 0.4 + rankId * 0.05);
        const success     = Math.random() < execChance;

        await setCooldown(sender, 'execute');

        if (success) {
            const scaled = scaleRewards({ exp: 400, gold: 300 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await addKill(sender);
            await react('💀');
            await reply(
                buildBox('💀 EXECUTE — FATAL BLOW', [
                    `  Enemy eliminated!`,
                    `  ✨ EXP:  +${scaled.exp}`,
                    `  💰 Gold: +${scaled.gold}`,
                    `  ☠️  Kill recorded`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            await react('❌');
            await reply(buildBox('💀 EXECUTE MISSED', [
                `  Enemy survived!`,
                `  Try again after more damage.`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'parry',
        aliases:     ['deflect', 'riposte'],
        category:    'combat',
        react:       '🗡️',
        description: 'Parry an attack and reflect damage (AGI-based)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player    = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'parry', CD.parry);
        if (onCooldown) return reply(buildBox('🗡️ ON COOLDOWN', [`  Parry resets in: ${formatCooldown(remaining)}`]));

        const agiBonus  = 1 + (player.stats.agi - 1) * 0.03;
        const parryRate = Math.min(0.85, 0.45 * agiBonus);
        const success   = Math.random() < parryRate;

        await setCooldown(sender, 'parry');

        if (success) {
            const reflected = Math.floor(player.combat.attack * 0.8);
            const scaled    = scaleRewards({ exp: 80, gold: 50 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await react('🗡️');
            await reply(
                buildBox('🗡️ PERFECT PARRY', [
                    `  Attack deflected and returned!`,
                    `  ⚔️  Reflected: ${reflected} dmg`,
                    `  ✨ EXP:  +${scaled.exp}`,
                    `  🏃 AGI bonus: ${agiBonus.toFixed(2)}x`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            const dmg = Math.floor(player.combat.attack * 0.3);
            await takeDamage(sender, dmg);
            await react('❌');
            await reply(
                buildBox('🗡️ PARRY FAILED', [
                    `  Failed to deflect!`,
                    `  ❤️  HP: -${dmg}`,
                    `  Upgrade AGI to improve parry rate.`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'absorb',
        aliases:     ['drain', 'lifesteal'],
        category:    'combat',
        react:       '💜',
        description: 'Absorb enemy energy to restore MP (INT-scaled)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'absorb', CD.absorb);
        if (onCooldown) return reply(buildBox('💜 ON COOLDOWN', [`  Absorb resets in: ${formatCooldown(remaining)}`]));

        const intMult  = 1 + (player.stats.int - 1) * 0.04;
        const mpGained = Math.floor(player.combat.maxMp * 0.35 * intMult);
        const newMp    = Math.min(player.combat.maxMp, player.combat.mp + mpGained);

        await GlobalPlayer.updateOne({ jid: sender }, { $set: { 'combat.mp': newMp } });
        await grantExp(sender, 60, 0, botId);
        await setCooldown(sender, 'absorb');

        await react('💜');
        await reply(
            buildBox('💜 ENERGY ABSORBED', [
                `  Enemy mana drained!`,
                `  💧 MP: +${mpGained} → ${newMp} / ${player.combat.maxMp}`,
                `  🧠 INT bonus: ${intMult.toFixed(2)}x`,
                buildFooter(60, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'clone',
        aliases:     ['shadowclone', 'decoy'],
        category:    'combat',
        react:       '👤',
        description: 'Create a shadow clone to confuse enemies (costs 40 MP)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'clone', CD.clone);
        if (onCooldown) return reply(buildBox('👤 ON COOLDOWN', [`  Clone resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 40) return reply('❌ Shadow clone costs 40 MP.');
        if (!player.shadows?.length) return reply('❌ Need at least 1 shadow to create a clone.');

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -40 } });
        const scaled = scaleRewards({ exp: 250, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'clone');

        await react('👤');
        await reply(
            buildBox('👤 SHADOW CLONE', [
                `  ${name}'s clone takes the field!`,
                `  Enemies attack the decoy first.`,
                `  💧 MP: -40`,
                `  ✨ EXP: +${scaled.exp}`,
                `  Duration: Until hit once.`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'taunt',
        aliases:     ['provoke', 'challenge'],
        category:    'combat',
        react:       '😤',
        description: 'Taunt enemies to attack you — boosts DEF temporarily',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'taunt', CD.taunt);
        if (onCooldown) return reply(buildBox('😤 ON COOLDOWN', [`  Taunt resets in: ${formatCooldown(remaining)}`]));

        const defBoost = player.stats.def * 2;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.defense': defBoost } });
        await grantExp(sender, 50, 0, botId);
        await setCooldown(sender, 'taunt');

        await react('😤');
        await reply(
            buildBox('😤 TAUNTED', [
                `  All enemy attention drawn to you!`,
                `  🛡️  DEF: +${defBoost} (temp)`,
                `  ✨ EXP: +50`,
                buildFooter(50, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'flank',
        aliases:     ['sideattack', 'blindside'],
        category:    'combat',
        react:       '🗡️',
        description: 'Flank attack for a LUK-based critical hit',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'flank', CD.flank);
        if (onCooldown) return reply(buildBox('🗡️ ON COOLDOWN', [`  Flank resets in: ${formatCooldown(remaining)}`]));

        const lukMult = 1 + (player.stats.luk - 1) * 0.03;
        const isCrit  = Math.random() < (0.3 + (player.stats.luk - 1) * 0.01);
        const damage  = Math.floor(player.combat.attack * (isCrit ? 2.5 : 1.5) * lukMult);
        const scaled  = scaleRewards({ exp: 160, gold: 110 }, player.level, player.jid);

        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'flank');

        await react('🗡️');
        await reply(
            buildBox(`🗡️ FLANK ATTACK${isCrit ? ' — CRITICAL!' : ''}`, [
                isCrit ? `  💥 CRITICAL FLANK HIT!` : `  Struck from the blind side!`,
                `  ⚔️  Damage: ${damage}${isCrit ? ' (2.5x!)' : ''}`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  🍀 LUK:  ${lukMult.toFixed(2)}x`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'siege',
        aliases:     ['assault', 'storming'],
        category:    'combat',
        react:       '🏰',
        description: 'Lay siege to a stronghold (Level 30+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        if (player.level < 30) return reply('❌ Siege requires Level 30+.');

        const { onCooldown, remaining } = checkCooldown(player, 'siege', CD.siege);
        if (onCooldown) return reply(buildBox('🏰 ON COOLDOWN', [`  Siege resets in: ${formatCooldown(remaining)}`]));

        const { rankId } = getRank(player.level, player.jid);
        const success    = Math.random() < Math.min(0.8, 0.3 + rankId * 0.07);

        await setCooldown(sender, 'siege');

        if (success) {
            const scaled = scaleRewards({ exp: 1500, gold: 1200 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await addCrystals(sender, 2);
            await addKarma(sender, 20);
            await react('🏰');
            await reply(
                buildBox('🏰 SIEGE VICTORIOUS', [
                    `  ${name} breached the stronghold!`,
                    `  ✨ EXP:      +${scaled.exp.toLocaleString()}`,
                    `  💰 Gold:     +${scaled.gold.toLocaleString()}`,
                    `  🔮 Crystals: +2`,
                    `  ⚖️  Karma:    +20`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            const dmg = Math.floor(player.combat.maxHp * 0.3);
            await takeDamage(sender, dmg);
            await react('❌');
            await reply(
                buildBox('🏰 SIEGE REPELLED', [
                    `  The defenders held the wall!`,
                    `  ❤️  HP: -${dmg}`,
                    `  Regroup and try again.`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'last-stand',
        aliases:     ['laststand', 'finalstrike'],
        category:    'combat',
        react:       '💢',
        description: 'Desperate all-or-nothing attack when HP is below 30%',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player     = await fetchPlayer(sender);
        const hpPercent  = player.combat.hp / player.combat.maxHp;

        if (hpPercent > 0.3) {
            return reply(buildBox('💢 LAST STAND', [
                `  HP must be below 30% to use this!`,
                `  Current: ${player.combat.hp} / ${player.combat.maxHp} (${Math.floor(hpPercent * 100)}%)`,
            ]));
        }

        const { onCooldown, remaining } = checkCooldown(player, 'laststand', CD.laststand);
        if (onCooldown) return reply(buildBox('💢 ON COOLDOWN', [`  Last Stand resets in: ${formatCooldown(remaining)}`]));

        const despMult = 1 + (1 - hpPercent) * 3;
        const damage   = Math.floor(player.combat.attack * despMult);
        const scaled   = scaleRewards({ exp: 500, gold: 400 }, player.level, player.jid);

        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'laststand');

        await react('💢');
        await reply(
            buildBox('💢 LAST STAND', [
                `  On the brink of death — UNLEASH ALL!`,
                `  ❤️  HP: ${player.combat.hp} / ${player.combat.maxHp}`,
                `  ⚔️  Desperation dmg: ${damage} (${despMult.toFixed(2)}x!)`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'war-cry',
        aliases:     ['warcry', 'battlecry'],
        category:    'combat',
        react:       '📣',
        description: 'Let out a war cry to boost ATK stats',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'warcry', CD.warcry);
        if (onCooldown) return reply(buildBox('📣 ON COOLDOWN', [`  War Cry resets in: ${formatCooldown(remaining)}`]));

        const strBoost = Math.floor(player.stats.str * 1.5);
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.attack': strBoost } });
        await grantExp(sender, 70, 0, botId);
        await setCooldown(sender, 'warcry');

        await react('📣');
        await reply(
            buildBox('📣 WAR CRY', [
                `  Your battle cry shakes the earth!`,
                `  ⚔️  ATK: +${strBoost}`,
                `  ✨ EXP: +70`,
                buildFooter(70, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'blood-pact',
        aliases:     ['bloodpact', 'demonpact'],
        category:    'combat',
        react:       '🩸',
        description: 'Seal a blood pact — trade HP for power (Dark/Chaos only)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!['Dark', 'Chaos'].includes(player.alignment)) {
            return reply('❌ Blood Pact requires Dark or Chaos alignment.');
        }

        const { onCooldown, remaining } = checkCooldown(player, 'bloodpact', CD.bloodpact);
        if (onCooldown) return reply(buildBox('🩸 ON COOLDOWN', [`  Blood Pact resets in: ${formatCooldown(remaining)}`]));

        const hpSacrifice = Math.floor(player.combat.maxHp * 0.4);
        const atkGain     = Math.floor(player.stats.str * 10);
        const strGain     = 5;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'combat.hp': -hpSacrifice, 'combat.attack': atkGain, 'stats.str': strGain }
        });
        await addKarma(sender, -100);
        const scaled = scaleRewards({ exp: 800, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'bloodpact');

        await react('🩸');
        await reply(
            buildBox('🩸 BLOOD PACT SEALED', [
                `  Blood seals the dark contract!`,
                `  ❤️  HP:  -${hpSacrifice} (40% sacrifice)`,
                `  ⚔️  ATK: +${atkGain}`,
                `  ⚔️  STR: +${strGain} (permanent)`,
                `  ✨ EXP: +${scaled.exp}`,
                `  ⚖️  Karma: -100`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'void-strike',
        aliases:     ['voidstrike', 'dimensionstrike'],
        category:    'combat',
        react:       '🌌',
        description: 'Channel void energy for a dimension-piercing attack (Level 80+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.level < 80) return reply('❌ Void Strike requires Level 80+.');

        const { onCooldown, remaining } = checkCooldown(player, 'voidstrike', CD.voidstrike);
        if (onCooldown) return reply(buildBox('🌌 ON COOLDOWN', [`  Void Strike resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 60) return reply('❌ Void Strike costs 60 MP.');

        const damage = Math.floor(player.combat.attack * 4 + player.stats.int * 20);
        const scaled = scaleRewards({ exp: 1200, gold: 800 }, player.level, player.jid);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -60 } });
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await addCrystals(sender, 1);
        await setCooldown(sender, 'voidstrike');

        await react('🌌');
        await reply(
            buildBox('🌌 VOID STRIKE', [
                `  You tear through the fabric of space!`,
                `  ⚔️  Void damage: ${damage.toLocaleString()}`,
                `  ✨ EXP:      +${scaled.exp.toLocaleString()}`,
                `  💰 Gold:     +${scaled.gold.toLocaleString()}`,
                `  🔮 Crystals: +1`,
                `  💧 MP: -60`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'domain-expand',
        aliases:     ['domainexpand', 'domain'],
        category:    'combat',
        react:       '💥',
        description: 'Domain Expansion — absolute zone, guaranteed hits (Level 100+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        if (player.level < 100) return reply('❌ Domain Expansion requires Level 100+.');
        if (!player.skills?.includes('domain')) return reply('❌ Unlock the *Domain* skill first with *.skills unlock domain*');

        const { onCooldown, remaining } = checkCooldown(player, 'domainexpand', CD.domainexpand);
        if (onCooldown) return reply(buildBox('💥 ON COOLDOWN', [`  Domain Expansion resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 80) return reply('❌ Domain Expansion costs 80 MP.');

        const damage = Math.floor((player.combat.attack + player.stats.int * 30) * 5);
        const scaled = scaleRewards({ exp: 3000, gold: 2000 }, player.level, player.jid);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -80 } });
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await addCrystals(sender, 3);
        await addKill(sender);
        await setCooldown(sender, 'domainexpand');

        await react('💥');
        await reply(
            buildBox('💥 DOMAIN EXPANSION', [
                `  *${name}* — DOMAIN EXPANSION!`,
                `  All enemies trapped. Hits guaranteed.`,
                `  ───────`,
                `  ⚔️  Domain damage: ${damage.toLocaleString()}`,
                `  ✨ EXP:      +${scaled.exp.toLocaleString()}`,
                `  💰 Gold:     +${scaled.gold.toLocaleString()}`,
                `  🔮 Crystals: +3`,
                `  💧 MP: -80`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'monarch-strike',
        aliases:     ['monarchstrike', 'sovereignstrike'],
        category:    'combat',
        react:       '👑',
        description: 'The ultimate Monarch-class attack (Level 250+ / Monarch rank)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const { rankId } = getRank(player.level, player.jid);
        if (rankId < 10) return reply('❌ Monarch Strike requires Monarch rank (Level 250+).');

        const { onCooldown, remaining } = checkCooldown(player, 'monarchstrike', CD.monarchstrike);
        if (onCooldown) return reply(buildBox('👑 ON COOLDOWN', [`  Monarch Strike resets in: ${formatCooldown(remaining)}`]));

        if (player.combat.mp < 100) return reply('❌ Monarch Strike costs 100 MP.');

        const shadowBonus = player.shadowCount * 500;
        const damage      = Math.floor(player.combat.attack * 10 + player.stats.str * 50 + shadowBonus);
        const scaled      = scaleRewards({ exp: 10000, gold: 8000 }, player.level, player.jid);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.mp': -100 } });
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await addCrystals(sender, 10);
        await addKill(sender);
        await addKarma(sender, 50);
        await setCooldown(sender, 'monarchstrike');

        await react('👑');
        await reply(
            buildBox('👑 MONARCH STRIKE', [
                `  👑 *${name}* — MONARCH STRIKE! 👑`,
                `  The ground shatters. Reality breaks.`,
                `  ───────`,
                `  ⚔️  Strike damage: ${damage.toLocaleString()}`,
                `  👥 Shadow bonus:  +${shadowBonus.toLocaleString()}`,
                `  ───────`,
                `  ✨ EXP:      +${scaled.exp.toLocaleString()}`,
                `  💰 Gold:     +${scaled.gold.toLocaleString()}`,
                `  🔮 Crystals: +10`,
                `  ⚖️  Karma:    +50`,
                `  💧 MP: -100`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);
