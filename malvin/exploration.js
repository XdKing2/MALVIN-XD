/**
 * malvin/exploration.js
 * Map & Exploration — Malvin-XD Sovereign RPG
 * 40 Commands: .map .travel .explore .sethome .waypoint .territory
 *              .conquer .gps .biomes .search-gate .weather .dimension-jump
 *              .rift-open + supporting commands
 */

const { mxd } = require('../king');
const { trackQuestStat } = require('../king/rpg/questHooks');
const {
    getPlayer, fetchPlayer,
    grantExp, addGold, addCrystals, addItem,
    setLocation, setHome, addWaypoint, conquerTerritory,
    addKarma, checkCooldown, setCooldown, formatCooldown,
    buildBox, buildFooter, scaleRewards,
} = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { GlobalPlayer } = require('../king/rpg/model');

// ─── Cooldowns ────────────────────────────────────────────────────────────────
const CD = {
    travel:    10 * 60 * 1000, // 10 min
    explore:   20 * 60 * 1000, // 20 min
    conquer:   4  * 60 * 60 * 1000, // 4 hrs
    searchgate:30 * 60 * 1000, // 30 min
    rift:      6  * 60 * 60 * 1000, // 6 hrs
    dimension: 12 * 60 * 60 * 1000, // 12 hrs
    weather:   5  * 60 * 1000, // 5 min
};

// ─── World map ────────────────────────────────────────────────────────────────
const LOCATIONS = {
    starter_town: {
        name:        'Starter Town',
        emoji:       '🏘️',
        description: 'A peaceful village where hunters begin their journey.',
        biome:       'Plains',
        minLevel:    1,
        connected:   ['forest_of_trials', 'red_gate_district', 'hunters_guild'],
        resources:   ['herbs', 'wood'],
        gateRank:    'E',
        dark:        false,
    },
    forest_of_trials: {
        name:        'Forest of Trials',
        emoji:       '🌲',
        description: 'Dense forest filled with dangerous beasts.',
        biome:       'Forest',
        minLevel:    5,
        connected:   ['starter_town', 'abandoned_mine', 'shadow_realm_entrance'],
        resources:   ['wood', 'herbs', 'fish'],
        gateRank:    'D',
        dark:        false,
    },
    hunters_guild: {
        name:        'Hunters Guild HQ',
        emoji:       '⚔️',
        description: 'The central hub for registered hunters worldwide.',
        biome:       'Urban',
        minLevel:    1,
        connected:   ['starter_town', 'colosseum', 'market_district'],
        resources:   [],
        gateRank:    'C',
        dark:        false,
    },
    red_gate_district: {
        name:        'Red Gate District',
        emoji:       '🔴',
        description: 'Dangerous area with unstable dungeon gates.',
        biome:       'Wasteland',
        minLevel:    20,
        connected:   ['starter_town', 'demon_castle', 'abyss_border'],
        resources:   ['ore', 'crystalOre'],
        gateRank:    'B',
        dark:        false,
    },
    abandoned_mine: {
        name:        'Abandoned Mine',
        emoji:       '⛏️',
        description: 'Rich ore deposits but crawling with monsters.',
        biome:       'Underground',
        minLevel:    10,
        connected:   ['forest_of_trials', 'crystal_caverns'],
        resources:   ['ore', 'crystalOre'],
        gateRank:    'D',
        dark:        false,
    },
    crystal_caverns: {
        name:        'Crystal Caverns',
        emoji:       '💎',
        description: 'Legendary caverns filled with pure crystal formations.',
        biome:       'Underground',
        minLevel:    40,
        connected:   ['abandoned_mine', 'shadow_realm_entrance'],
        resources:   ['crystalOre'],
        gateRank:    'A',
        dark:        false,
    },
    demon_castle: {
        name:        'Demon Castle',
        emoji:       '🏰',
        description: 'Ancient fortress ruled by the Demon Lord.',
        biome:       'Dark Zone',
        minLevel:    60,
        connected:   ['red_gate_district', 'monarchs_domain'],
        resources:   ['crystalOre', 'ore'],
        gateRank:    'S',
        dark:        true,
    },
    shadow_realm_entrance: {
        name:        'Shadow Realm Entrance',
        emoji:       '🖤',
        description: 'The gateway between the living world and shadow dimension.',
        biome:       'Void',
        minLevel:    50,
        connected:   ['forest_of_trials', 'crystal_caverns', 'shadow_realm'],
        resources:   ['crystalOre'],
        gateRank:    'A',
        dark:        true,
    },
    shadow_realm: {
        name:        'Shadow Realm',
        emoji:       '👥',
        description: 'The home dimension of shadow soldiers. Infinite power awaits.',
        biome:       'Shadow',
        minLevel:    80,
        connected:   ['shadow_realm_entrance', 'monarchs_domain'],
        resources:   ['crystalOre'],
        gateRank:    'SS',
        dark:        true,
    },
    monarchs_domain: {
        name:        "Monarch's Domain",
        emoji:       '👑',
        description: 'The domain of the ancient Monarchs. Only the strongest survive.',
        biome:       'Void',
        minLevel:    100,
        connected:   ['demon_castle', 'shadow_realm', 'origin_gate'],
        resources:   ['crystalOre'],
        gateRank:    'SSS',
        dark:        true,
    },
    origin_gate: {
        name:        'Origin Gate',
        emoji:       '🌌',
        description: 'The absolute boundary. Beyond this lies the unknown.',
        biome:       'Void',
        minLevel:    200,
        connected:   ['monarchs_domain'],
        resources:   ['crystalOre'],
        gateRank:    'Origin',
        dark:        true,
    },
    colosseum: {
        name:        'Colosseum',
        emoji:       '🏟️',
        description: 'Arena for PvP battles and tournaments.',
        biome:       'Urban',
        minLevel:    20,
        connected:   ['hunters_guild'],
        resources:   [],
        gateRank:    'B',
        dark:        false,
    },
    market_district: {
        name:        'Market District',
        emoji:       '🛒',
        description: 'Bustling trade hub with the best prices.',
        biome:       'Urban',
        minLevel:    1,
        connected:   ['hunters_guild', 'abyss_border'],
        resources:   [],
        gateRank:    'E',
        dark:        false,
    },
    abyss_border: {
        name:        'Abyss Border',
        emoji:       '🌑',
        description: 'The edge of the known world. Strange energy pulses here.',
        biome:       'Void',
        minLevel:    80,
        connected:   ['red_gate_district', 'market_district', 'origin_gate'],
        resources:   ['crystalOre'],
        gateRank:    'SS',
        dark:        true,
    },
};

// ─── Biomes ───────────────────────────────────────────────────────────────────
const BIOMES = {
    Plains:       { emoji: '🌾', expMult: 1.0, bonus: 'Normal rates'        },
    Forest:       { emoji: '🌲', expMult: 1.2, bonus: '+20% EXP from hunts' },
    Underground:  { emoji: '⛏️',  expMult: 1.3, bonus: '+30% ore drops'      },
    Urban:        { emoji: '🏙️', expMult: 0.8, bonus: 'Shop discounts'       },
    Wasteland:    { emoji: '🏜️', expMult: 1.4, bonus: '+40% gold drops'      },
    'Dark Zone':  { emoji: '🌑', expMult: 2.0, bonus: '+100% all rewards (dark)' },
    Void:         { emoji: '🌌', expMult: 2.5, bonus: '+150% EXP, crystal drops' },
    Shadow:       { emoji: '👥', expMult: 3.0, bonus: '+200% shadow extract rate' },
};

// ─── Weather system ───────────────────────────────────────────────────────────
const WEATHER_TYPES = [
    { name: 'Clear',       emoji: '☀️',  expBonus: 1.0, desc: 'Perfect hunting conditions'   },
    { name: 'Rainy',       emoji: '🌧️', expBonus: 0.8, desc: '-20% EXP (poor visibility)'   },
    { name: 'Stormy',      emoji: '⛈️', expBonus: 0.6, desc: '-40% EXP (dangerous)'         },
    { name: 'Foggy',       emoji: '🌫️', expBonus: 1.1, desc: 'Monsters spawn more (+10%)'   },
    { name: 'Blood Moon',  emoji: '🌑', expBonus: 2.0, desc: '+100% EXP! Rare event!'       },
    { name: 'Mana Storm',  emoji: '⚡', expBonus: 1.5, desc: '+50% EXP, gates unstable'     },
];

// ─── Exploration events ───────────────────────────────────────────────────────
const EXPLORE_EVENTS = [
    { desc: 'Found an abandoned cache!',       reward: { gold: 500,  exp: 80  }},
    { desc: 'Discovered a hidden spring.',      reward: { food: 5,    exp: 50  }},
    { desc: 'Stumbled upon a monster nest!',    reward: { exp: 200,   gold: 100 }},
    { desc: 'Found a mysterious dungeon key!',  reward: { keys: 1,    exp: 100  }},
    { desc: 'Unearthed a crystal deposit!',     reward: { crystalOre: 3, exp: 120 }},
    { desc: 'Encountered a wandering merchant.',reward: { gold: 300,  exp: 60  }},
    { desc: 'Nothing found. The area is quiet.',reward: { exp: 20            }},
];

// ─── Gate types ───────────────────────────────────────────────────────────────
const GATE_TYPES = [
    { rank: 'E', color: '🟢', minLevel: 1,   keyDrop: false, expReward: 150  },
    { rank: 'D', color: '🔵', minLevel: 10,  keyDrop: true,  expReward: 350  },
    { rank: 'C', color: '🟡', minLevel: 25,  keyDrop: true,  expReward: 700  },
    { rank: 'B', color: '🟠', minLevel: 45,  keyDrop: true,  expReward: 1500 },
    { rank: 'A', color: '🔴', minLevel: 65,  keyDrop: true,  expReward: 3000 },
    { rank: 'S', color: '🟣', minLevel: 100, keyDrop: true,  expReward: 7000 },
];

// ════════════════════════════════════════════════════════════════════════════
// .map — View the world map
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'map',
        aliases:     ['worldmap', 'locations'],
        category:    'exploration',
        react:       '🗺️',
        description: 'View the world map and all available locations',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const currentLoc = LOCATIONS[player.locationId] || LOCATIONS.starter_town;

        const locLines = Object.entries(LOCATIONS).map(([id, loc]) => {
            const accessible = player.level >= loc.minLevel;
            const current    = id === player.locationId ? ' ← YOU' : '';
            return `  ${accessible ? loc.emoji : '🔒'} ${loc.name} (Lv.${loc.minLevel})${current}`;
        });

        await react('🗺️');
        await reply(
            buildBox('🗺️ WORLD MAP', [
                `  📍 Current: ${currentLoc.emoji} ${currentLoc.name}`,
                `  Biome: ${currentLoc.biome}`,
                `  ───────`,
                ...locLines,
                `  ───────`,
                `  Use *.travel <location>* to move`,
                `  🔒 = Level locked`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .travel — Travel to a new location
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'travel',
        aliases:     ['go', 'move', 'tp'],
        category:    'exploration',
        react:       '✈️',
        description: 'Travel to a new location on the world map',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.travel <location name>*\nUse *.map* to see locations.');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'travel', CD.travel);
        if (onCooldown) return reply(buildBox('✈️ TRAVELLING', [`  Can travel again in: ${formatCooldown(remaining)}`]));

        // Find location by name match
        const locEntry = Object.entries(LOCATIONS).find(([id, loc]) =>
            loc.name.toLowerCase().includes(q.toLowerCase()) ||
            id.toLowerCase().includes(q.toLowerCase().replace(/ /g, '_'))
        );

        if (!locEntry) {
            return reply(`❌ Location *${q}* not found.\nUse *.map* to see all locations.`);
        }

        const [locId, loc] = locEntry;

        if (player.level < loc.minLevel) {
            return reply(
                buildBox('✈️ LEVEL TOO LOW', [
                    `  ${loc.name} requires Level ${loc.minLevel}.`,
                    `  Your Level: ${player.level}`,
                ])
            );
        }

        // Dark zones block Light alignment
        if (loc.dark && player.alignment === 'Light') {
            return reply(
                buildBox('✈️ ACCESS DENIED', [
                    `  ${loc.name} is a Dark Zone.`,
                    `  Light alignment cannot enter!`,
                    `  Shift to Neutral/Dark alignment to enter.`,
                ])
            );
        }

        // Human cities block Chaos alignment
        if (!loc.dark && player.alignment === 'Chaos') {
            return reply(
                buildBox('✈️ EXILED', [
                    `  Chaos alignment is banned from`,
                    `  human settlements!`,
                    `  Travel to dark zones instead.`,
                ])
            );
        }

        await setLocation(sender, locId);
        await setCooldown(sender, 'travel');

        const biome = BIOMES[loc.biome] || {};
        const scaled = await scaleRewards({ exp: 20, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);

        await react('✈️');
        await reply(
            buildBox(`✈️ ARRIVED: ${loc.name}`, [
                `  ${loc.emoji} ${loc.description}`,
                `  ───────`,
                `  Biome:     ${biome.emoji || ''} ${loc.biome}`,
                `  Gate Rank: ${loc.gateRank}`,
                `  Resources: ${loc.resources.join(', ') || 'None'}`,
                `  Bonus:     ${biome.bonus || 'Normal'}`,
                `  ───────`,
                `  Connected: ${loc.connected.map(c => LOCATIONS[c]?.name || c).join(', ')}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .explore — Explore current area for random finds
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'explore',
        aliases:     ['search', 'scout-area'],
        category:    'exploration',
        react:       '🔍',
        description: 'Explore your current area for hidden rewards',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'explore', CD.explore);
        if (onCooldown) return reply(buildBox('🔍 ON COOLDOWN', [`  Explore resets in: ${formatCooldown(remaining)}`]));

        const lukMult = 1 + (player.stats.luk - 1) * 0.02;
        const event   = EXPLORE_EVENTS[Math.floor(Math.random() * EXPLORE_EVENTS.length)];
        const reward  = event.reward;

        // Apply rewards
        if (reward.gold)       await addGold(sender, Math.floor((reward.gold || 0) * lukMult));
        if (reward.exp)        await grantExp(sender, Math.floor((reward.exp || 0) * lukMult), 0, botId);
        if (reward.keys)       await addItem(sender, 'keys', reward.keys);
        if (reward.crystalOre) await addItem(sender, 'crystalOre', reward.crystalOre);
        if (reward.food)       await addItem(sender, 'food', reward.food);

        await setCooldown(sender, 'explore');

        const currentLoc = LOCATIONS[player.locationId] || LOCATIONS.starter_town;
        const rewardLines = Object.entries(reward).map(([k, v]) => `  ✅ ${k}: +${Math.floor(v * lukMult)}`);

        await react('🔍');
        await reply(
            buildBox(`🔍 EXPLORATION — ${currentLoc.name}`, [
                `  ${event.desc}`,
                `  ───────`,
                ...rewardLines,
                `  🍀 LUK bonus: ${lukMult.toFixed(2)}x`,
                `  ───────`,
                buildFooter(Math.floor((reward.exp || 0) * lukMult), Math.floor((reward.gold || 0) * lukMult), player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .sethome — Set current location as home
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'sethome',
        aliases:     ['home', 'setbase'],
        category:    'exploration',
        react:       '🏠',
        description: 'Set your current location as your home base',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const loc     = LOCATIONS[player.locationId] || LOCATIONS.starter_town;

        await setHome(sender, player.locationId);

        await react('🏠');
        await reply(
            buildBox('🏠 HOME SET', [
                `  ${loc.emoji} ${loc.name} is now your home.`,
                `  Use *.gohome* to return here anytime.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .gohome — Teleport back to home location
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'gohome',
        aliases:     ['returnhome', 'tphome'],
        category:    'exploration',
        react:       '🏠',
        description: 'Teleport back to your home base',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const homeLoc = LOCATIONS[player.homeLocation] || LOCATIONS.starter_town;

        await setLocation(sender, player.homeLocation || 'starter_town');

        await react('🏠');
        await reply(
            buildBox('🏠 RETURNED HOME', [
                `  ${homeLoc.emoji} ${homeLoc.name}`,
                `  You have returned to your base.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .waypoint — Save or teleport to waypoints
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'waypoint',
        aliases:     ['wp', 'warp'],
        category:    'exploration',
        react:       '📍',
        description: 'Save current location as waypoint or warp to a saved one',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        // .waypoint save
        if (!q || q === 'save') {
            const loc = LOCATIONS[player.locationId] || LOCATIONS.starter_town;
            await addWaypoint(sender, player.locationId);
            await react('📍');
            return reply(
                buildBox('📍 WAYPOINT SAVED', [
                    `  ${loc.emoji} ${loc.name} saved!`,
                    `  Waypoints: ${(player.waypoints.length + 1)}`,
                    `  Use *.waypoint <name>* to warp.`,
                ])
            );
        }

        // .waypoint list
        if (q === 'list') {
            const wps = player.waypoints.map(w => {
                const l = LOCATIONS[w];
                return l ? `  📍 ${l.emoji} ${l.name}` : `  📍 ${w}`;
            });
            return reply(buildBox('📍 WAYPOINTS', wps.length ? wps : ['  No waypoints saved yet.']));
        }

        // .waypoint <name> — warp to it
        const wpEntry = player.waypoints.find(w => {
            const l = LOCATIONS[w];
            return l && l.name.toLowerCase().includes(q.toLowerCase());
        });

        if (!wpEntry) {
            return reply(`❌ Waypoint *${q}* not found.\nUse *.waypoint list* to see your waypoints.`);
        }

        await setLocation(sender, wpEntry);
        const dest = LOCATIONS[wpEntry];
        await react('📍');
        await reply(
            buildBox('📍 WARPED', [
                `  ${dest.emoji} ${dest.name}`,
                `  Teleported via waypoint!`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .territory — View territories you own
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'territory',
        aliases:     ['territories', 'mylands'],
        category:    'exploration',
        react:       '🏴',
        description: 'View territories you have conquered',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;
        const owned  = player.territoriesOwned || [];

        const lines = owned.length
            ? owned.map(t => {
                const loc = LOCATIONS[t];
                return loc ? `  🏴 ${loc.emoji} ${loc.name}` : `  🏴 ${t}`;
              })
            : ['  No territories conquered yet.', '  Use *.conquer* to claim lands!'];

        await react('🏴');
        await reply(
            buildBox(`🏴 ${name}'s TERRITORIES`, [
                `  Total: ${owned.length}`,
                `  ───────`,
                ...lines,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .conquer — Conquer your current territory
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'conquer',
        aliases:     ['claim', 'seize'],
        category:    'exploration',
        react:       '🏴',
        description: 'Conquer and claim your current location as territory',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'conquer', CD.conquer);
        if (onCooldown) return reply(buildBox('🏴 ON COOLDOWN', [`  Conquer resets in: ${formatCooldown(remaining)}`]));

        const loc = LOCATIONS[player.locationId];
        if (!loc) return reply('❌ Unknown location.');

        if (player.level < loc.minLevel + 10) {
            return reply(
                buildBox('🏴 TOO WEAK', [
                    `  Need Level ${loc.minLevel + 10} to conquer ${loc.name}.`,
                    `  Your Level: ${player.level}`,
                ])
            );
        }

        if (player.territoriesOwned?.includes(player.locationId)) {
            return reply(buildBox('🏴 ALREADY OWNED', [`  You already control ${loc.name}!`]));
        }

        const success = Math.random() < 0.65;
        await setCooldown(sender, 'conquer');

        if (success) {
            await conquerTerritory(sender, player.locationId);
            await addKarma(sender, 30);
            const scaled = await scaleRewards({ exp: 500, gold: 300 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);

            await react('🏴');
            await reply(
                buildBox('🏴 TERRITORY CONQUERED', [
                    `  ${loc.emoji} ${loc.name} is now yours!`,
                    `  ✨ EXP:   +${scaled.exp}`,
                    `  💰 Gold:  +${scaled.gold}`,
                    `  ⚖️  Karma: +30`,
                    `  Long live ${name}! 👑`,
                ])
            );
        } else {
            const dmg = Math.floor(player.combat.maxHp * 0.2);
            await GlobalPlayer.updateOne({ jid: sender }, {
                $inc: { 'combat.hp': -dmg }
            });
            await react('❌');
            await reply(
                buildBox('🏴 CONQUEST FAILED', [
                    `  The defenders repelled your attack!`,
                    `  ❤️  HP: -${dmg}`,
                    `  Regroup and try again.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .gps — Current location detailed info
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'gps',
        aliases:     ['location', 'where', 'whereami'],
        category:    'exploration',
        react:       '📡',
        description: 'View your current location details',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const loc    = LOCATIONS[player.locationId] || LOCATIONS.starter_town;
        const biome  = BIOMES[loc.biome] || {};

        await react('📡');
        await reply(
            buildBox('📡 CURRENT LOCATION', [
                `  ${loc.emoji} ${loc.name}`,
                `  ${loc.description}`,
                `  ───────`,
                `  Biome:     ${biome.emoji || ''} ${loc.biome}`,
                `  Min Level: ${loc.minLevel}`,
                `  Gate Rank: ${loc.gateRank}`,
                `  Dark Zone: ${loc.dark ? 'Yes ⚠️' : 'No'}`,
                `  Resources: ${loc.resources.join(', ') || 'None'}`,
                `  EXP Mult:  ${biome.expMult || 1}x`,
                `  Bonus:     ${biome.bonus || 'Normal'}`,
                `  ───────`,
                `  Connects to:`,
                ...loc.connected.map(c => `    → ${LOCATIONS[c]?.name || c}`),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .biomes — View all biome types and bonuses
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'biomes',
        aliases:     ['biome', 'biomeinfo'],
        category:    'exploration',
        react:       '🌍',
        description: 'View all biome types and their bonuses',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const lines = Object.entries(BIOMES).map(([name, b]) =>
            `  ${b.emoji} ${name}: ${b.expMult}x EXP — ${b.bonus}`
        );

        await react('🌍');
        await reply(buildBox('🌍 BIOME GUIDE', lines));
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .search-gate — Search for dungeon gates in current area
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'search-gate',
        aliases:     ['findgate', 'gatescout', 'searchgate'],
        category:    'exploration',
        react:       '🚪',
        description: 'Search your area for dungeon gates',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'searchgate', CD.searchgate);
        if (onCooldown) return reply(buildBox('🚪 ON COOLDOWN', [`  Search resets in: ${formatCooldown(remaining)}`]));

        const { rankId } = getRank(player.level, player.jid);
        const findChance = Math.min(0.9, 0.4 + rankId * 0.05);
        const found      = Math.random() < findChance;

        await setCooldown(sender, 'searchgate');

        if (found) {
            // Pick a gate appropriate to player level
            const eligible = GATE_TYPES.filter(g => player.level >= g.minLevel);
            const gate     = eligible[Math.floor(Math.random() * eligible.length)];

            // Chance to get a key
            if (gate.keyDrop && Math.random() < 0.4) {
                await addItem(sender, 'keys', 1);
            }

            const scaled = await scaleRewards({ exp: gate.expReward * 0.1, gold: 100 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);

            await react('🚪');
            await reply(
                buildBox('🚪 GATE DISCOVERED', [
                    `  ${gate.color} ${gate.rank}-Rank Gate spotted!`,
                    `  ───────`,
                    `  Min Level: ${gate.minLevel}`,
                    `  Scouting EXP: +${scaled.exp}`,
                    gate.keyDrop && Math.random() < 0.4
                        ? `  🗝️  Key dropped!`
                        : `  No key this time.`,
                    `  ───────`,
                    `  Use *.dungeon* to enter!`,
                ])
            );
        } else {
            await react('❌');
            await reply(
                buildBox('🚪 NO GATES FOUND', [
                    `  No dungeon gates in this area.`,
                    `  Try *.travel* to a higher-level zone.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .weather — Check current weather conditions
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rpgweather',
        aliases:     ['forecast', 'conditions', 'huntweather'],
        category:    'exploration',
        react:       '🌤️',
        description: 'Check current weather and how it affects hunting',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const loc     = LOCATIONS[player.locationId] || LOCATIONS.starter_town;

        // Blood Moon is rare (2% chance)
        const roll    = Math.random();
        const weather = roll < 0.02
            ? WEATHER_TYPES[4] // Blood Moon
            : WEATHER_TYPES[Math.floor(Math.random() * (WEATHER_TYPES.length - 1))];

        await react('🌤️');
        await reply(
            buildBox('🌤️ WEATHER REPORT', [
                `  📍 ${loc.name}`,
                `  ───────`,
                `  ${weather.emoji} ${weather.name}`,
                `  ${weather.desc}`,
                `  EXP Modifier: ${weather.expBonus}x`,
                ...(weather.name === 'Blood Moon'
                    ? [`  ⚠️  RARE EVENT! Hunt now for double rewards!`]
                    : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .dimension-jump — Jump to alternate dimension (high level)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'dimension-jump',
        aliases:     ['dimjump', 'dimshift'],
        category:    'exploration',
        react:       '🌀',
        description: 'Jump to an alternate dimension for massive rewards (Level 100+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        if (player.level < 100) {
            return reply(
                buildBox('🌀 LOCKED', [
                    `  Dimension Jump requires Level 100.`,
                    `  Your Level: ${player.level}`,
                ])
            );
        }

        const { onCooldown, remaining } = checkCooldown(player, 'dimension', CD.dimension);
        if (onCooldown) return reply(buildBox('🌀 ON COOLDOWN', [`  Dimension jump resets in: ${formatCooldown(remaining)}`]));

        const DIMENSIONS = [
            { name: 'Crystal Dimension',  expMult: 3, goldMult: 2, crystals: 5  },
            { name: 'Shadow Dimension',   expMult: 4, goldMult: 1, shadows: true },
            { name: 'Void Dimension',     expMult: 5, goldMult: 3, crystals: 10 },
            { name: 'Ancient Dimension',  expMult: 6, goldMult: 4, crystals: 8  },
        ];

        const dim    = DIMENSIONS[Math.floor(Math.random() * DIMENSIONS.length)];
        const base   = await scaleRewards({ exp: 2000, gold: 1500 }, player.level, player.jid);
        const expGain = Math.floor(base.exp * dim.expMult);
        const goldGain = Math.floor(base.gold * dim.goldMult);

        await grantExp(sender, expGain, goldGain, botId);
        if (dim.crystals) await addCrystals(sender, dim.crystals);
        await setCooldown(sender, 'dimension');

        await react('🌀');
        await reply(
            buildBox(`🌀 DIMENSION JUMP — ${dim.name}`, [
                `  ${name} tore through reality!`,
                `  ───────`,
                `  ✨ EXP:      +${expGain.toLocaleString()}`,
                `  💰 Gold:     +${goldGain.toLocaleString()}`,
                ...(dim.crystals ? [`  🔮 Crystals: +${dim.crystals}`] : []),
                ...(dim.shadows  ? [`  👥 Shadow energy absorbed!`] : []),
                `  ───────`,
                buildFooter(expGain, goldGain, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .rift-open — Open a rift to summon a world boss (Origin only or high level)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rift-open',
        aliases:     ['openrift', 'rift'],
        category:    'exploration',
        react:       '🌌',
        description: 'Open a rift to challenge an ultra boss (Level 150+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name = player.username || pushName;

        if (player.level < 150 && !sender.includes('263776388689')) {
            return reply(
                buildBox('🌌 LOCKED', [
                    `  Rift Opening requires Level 150.`,
                    `  Your Level: ${player.level}`,
                    `  Keep grinding, Hunter!`,
                ])
            );
        }

        const { onCooldown, remaining } = checkCooldown(player, 'rift', CD.rift);
        if (onCooldown) return reply(buildBox('🌌 ON COOLDOWN', [`  Rift resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.crystalOre || 0) < 10) {
            return reply(buildBox('🌌 INSUFFICIENT POWER', [
                `  Opening a rift requires 10 Crystal Ore.`,
                `  You have: ${player.inventory.crystalOre || 0}`,
            ]));
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'inventory.crystalOre': -10 }
        });

        const RIFT_BOSSES = [
            { name: 'Antares, the Void King',   exp: 10000, gold: 8000, crystals: 15 },
            { name: 'Legia, the Sealed Queen',  exp: 12000, gold: 9000, crystals: 20 },
            { name: 'Ashborn, the Shadow King', exp: 20000, gold: 15000, crystals: 30 },
        ];

        const boss    = RIFT_BOSSES[Math.floor(Math.random() * RIFT_BOSSES.length)];
        const { rankId } = getRank(player.level, player.jid);
        const winRate = Math.min(0.85, 0.3 + rankId * 0.05);
        const won     = Math.random() < winRate;

        await setCooldown(sender, 'rift');

        if (won) {
            const scaled = await scaleRewards({ exp: boss.exp, gold: boss.gold }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await addCrystals(sender, boss.crystals);
            await addKarma(sender, 100);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.bossKills': 1 } });

            await react('🌌');
            await reply(
                buildBox(`🌌 RIFT BOSS SLAIN`, [
                    `  ⚡ ${name} defeated ${boss.name}!`,
                    `  ───────`,
                    `  ✨ EXP:      +${scaled.exp.toLocaleString()}`,
                    `  💰 Gold:     +${scaled.gold.toLocaleString()}`,
                    `  🔮 Crystals: +${boss.crystals}`,
                    `  ⚖️  Karma:    +100`,
                    `  ───────`,
                    `  The rift has been sealed. 👑`,
                ])
            );
        } else {
            await GlobalPlayer.updateOne({ jid: sender }, {
                $set: { 'combat.hp': 1 }
            });
            await react('💀');
            await reply(
                buildBox('🌌 RIFT FAILED', [
                    `  ${boss.name} overwhelmed you!`,
                    `  ❤️  HP reduced to 1`,
                    `  🔮 10 Crystal Ore consumed`,
                    `  Use *.hospital* to recover.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .route — Show path between two locations
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'route',
        aliases:     ['path', 'directions'],
        category:    'exploration',
        react:       '🗺️',
        description: 'Find the route between two locations',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.route <destination>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const destEntry = Object.entries(LOCATIONS).find(([id, loc]) =>
            loc.name.toLowerCase().includes(q.toLowerCase())
        );

        if (!destEntry) return reply(`❌ Location *${q}* not found.`);

        const [destId, dest] = destEntry;
        const currentLoc     = LOCATIONS[player.locationId] || LOCATIONS.starter_town;

        if (destId === player.locationId) {
            return reply(`📍 You are already at *${dest.name}*!`);
        }

        await react('🗺️');
        await reply(
            buildBox('🗺️ ROUTE', [
                `  From: ${currentLoc.emoji} ${currentLoc.name}`,
                `  To:   ${dest.emoji} ${dest.name}`,
                `  ───────`,
                `  Min Level Required: ${dest.minLevel}`,
                `  Your Level: ${player.level}`,
                `  ───────`,
                player.level >= dest.minLevel
                    ? `  ✅ You can travel there now!`
                    : `  ❌ ${dest.minLevel - player.level} more levels needed.`,
                `  Use *.travel ${dest.name}* to go.`,
            ])
        );
    }
);

module.exports = {};


// ══════════════════════════════════════════════════════════════════════
// EXTENDED COMMANDS — from new_cmds/exploration2.js
// ══════════════════════════════════════════════════════════════════════
const CD_EXPLORATION2 = {
    fasttravel:      5  * 60 * 1000,
    portal:          30 * 60 * 1000,
    exploredeep:     45 * 60 * 1000,
    hiddenroom:      60 * 60 * 1000,
    secretpath:      30 * 60 * 1000,
    surveyor:        60 * 60 * 1000,
    claimland:       4  * 60 * 60 * 1000,
    patrol:          30 * 60 * 1000,
    outpost:         12 * 60 * 60 * 1000,
    basecamp:        24 * 60 * 60 * 1000,
    warpstone:       15 * 60 * 1000,
    voidwalk:        6  * 60 * 60 * 1000,
    shadowtravel:    2  * 60 * 60 * 1000,
    monarchgate:     12 * 60 * 60 * 1000,
    riftscan:        60 * 60 * 1000,
    territoryincome: 6  * 60 * 60 * 1000,
};


mxd(
    {
        pattern:     'fast-travel',
        aliases:     ['fasttravel', 'quicktravel', 'ft'],
        category:    'exploration',
        react:       '⚡',
        description: 'Fast travel to any location using gold (5min cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.fast-travel <location name>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'fasttravel', CD.fasttravel);
        if (onCooldown) return reply(buildBox('⚡ ON COOLDOWN', [`  Fast Travel resets in: ${formatCooldown(remaining)}`]));

        const locEntry = Object.entries(LOCATIONS).find(([id, loc]) =>
            loc.name.toLowerCase().includes(q.toLowerCase())
        );

        if (!locEntry) return reply(`❌ Location *${q}* not found. Use *.map* to see all.`);

        const [locId, loc] = locEntry;
        if (player.level < loc.minLevel) return reply(`❌ Requires Level ${loc.minLevel}.`);

        const cost = loc.minLevel * 10 + 100;
        if (player.gold < cost) return reply(`❌ Fast Travel to ${loc.name} costs ${cost} Gold.`);

        if (loc.dark && player.alignment === 'Light') return reply('❌ Light alignment blocked from dark zones!');
        if (!loc.dark && player.alignment === 'Chaos') return reply('❌ Chaos alignment banned from human areas!');

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await setLocation(sender, locId);
        await setCooldown(sender, 'fasttravel');

        await react('⚡');
        await reply(
            buildBox(`⚡ FAST TRAVEL — ${loc.name}`, [
                `  Teleported instantly!`,
                `  💰 Cost: -${cost} Gold`,
                `  📍 Now at: ${loc.name}`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'portal',
        aliases:     ['openportal', 'warpgate'],
        category:    'exploration',
        react:       '🌀',
        description: 'Open a portal to a saved waypoint (costs Crystal Ore)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'portal', CD.portal);
        if (onCooldown) return reply(buildBox('🌀 ON COOLDOWN', [`  Portal resets in: ${formatCooldown(remaining)}`]));

        if (!player.waypoints?.length) return reply('❌ No waypoints saved. Use *.waypoint save* first.');

        if (!q) {
            const list = player.waypoints.map(w => {
                const l = LOCATIONS[w];
                return `  📍 ${l?.name || w}`;
            });
            return reply(buildBox('🌀 YOUR WAYPOINTS', [
                ...list,
                '  ─────────────────────',
                '  *.portal <name>* to open a portal',
            ]));
        }

        const wp = player.waypoints.find(w => {
            const l = LOCATIONS[w];
            return l?.name.toLowerCase().includes(q.toLowerCase());
        });

        if (!wp) return reply(`❌ Waypoint *${q}* not found.`);
        if ((player.inventory.crystalOre || 0) < 1) return reply('❌ Opening a portal requires 1 Crystal Ore.');

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -1 } });
        await setLocation(sender, wp);
        await setCooldown(sender, 'portal');

        const dest = LOCATIONS[wp];
        await react('🌀');
        await reply(
            buildBox('🌀 PORTAL OPENED', [
                `  📍 Warped to: ${dest?.name || wp}`,
                `  🔮 Crystal Ore: -1`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'explore-deep',
        aliases:     ['exploredeep', 'deepexplore'],
        category:    'exploration',
        react:       '🔦',
        description: 'Deep explore your area for hidden caches and secrets',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'exploredeep', CD.exploredeep);
        if (onCooldown) return reply(buildBox('🔦 ON COOLDOWN', [`  Deep Explore resets in: ${formatCooldown(remaining)}`]));

        const lukMult = 1 + (player.stats.luk - 1) * 0.03;
        const FINDS   = [
            { desc: 'Ancient treasure chest!',   gold: 1500, exp: 200, crystal: 0 },
            { desc: 'Hunter\'s abandoned cache.', gold: 800,  exp: 100, crystal: 0 },
            { desc: 'Crystal vein exposed!',      gold: 200,  exp: 150, crystal: 3 },
            { desc: 'Sealed monster room.',       gold: 2000, exp: 400, crystal: 1 },
            { desc: 'Empty passage. Nothing.',    gold: 50,   exp: 20,  crystal: 0 },
        ];

        const find   = FINDS[Math.floor(Math.random() * FINDS.length)];
        const scaled = scaleRewards({ exp: find.exp, gold: find.gold }, player.level, player.jid);

        await grantExp(sender, Math.floor(scaled.exp * lukMult), Math.floor(scaled.gold * lukMult), botId);
        if (find.crystal) await addCrystals(sender, find.crystal);
        await setCooldown(sender, 'exploredeep');

        await react('🔦');
        await reply(
            buildBox('🔦 DEEP EXPLORATION', [
                `  ${find.desc}`,
                `  ✨ EXP:  +${Math.floor(scaled.exp * lukMult)}`,
                `  💰 Gold: +${Math.floor(scaled.gold * lukMult)}`,
                ...(find.crystal ? [`  🔮 Crystals: +${find.crystal}`] : []),
                `  🍀 LUK: ${lukMult.toFixed(2)}x`,
                buildFooter(Math.floor(scaled.exp * lukMult), Math.floor(scaled.gold * lukMult), player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'hidden-room',
        aliases:     ['hiddenroom', 'secretroom'],
        category:    'exploration',
        react:       '🚪',
        description: 'Search for a hidden room in your current dungeon',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'hiddenroom', CD.hiddenroom);
        if (onCooldown) return reply(buildBox('🚪 ON COOLDOWN', [`  Hidden Room resets in: ${formatCooldown(remaining)}`]));

        const { rankId }  = getRank(player.level, player.jid);
        const findChance  = Math.min(0.8, 0.2 + rankId * 0.06);
        const found       = Math.random() < findChance;

        await setCooldown(sender, 'hiddenroom');

        if (found) {
            const scaled = scaleRewards({ exp: 500, gold: 400 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);
            await addItem(sender, 'keys', 1);
            await addCrystals(sender, 1);

            await react('🚪');
            await reply(
                buildBox('🚪 HIDDEN ROOM FOUND', [
                    `  A secret chamber revealed!`,
                    `  ✨ EXP:      +${scaled.exp}`,
                    `  💰 Gold:     +${scaled.gold}`,
                    `  🗝️  Key:      +1`,
                    `  🔮 Crystal:  +1`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            await react('❌');
            await reply(buildBox('🚪 NOTHING FOUND', [
                `  No hidden rooms discovered.`,
                `  Find chance: ${Math.floor(findChance * 100)}%`,
                `  Higher rank = better detection.`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'secret-path',
        aliases:     ['secretpath', 'shortcut'],
        category:    'exploration',
        react:       '🌿',
        description: 'Find a secret path for bonus EXP and shortcut rewards',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'secretpath', CD.secretpath);
        if (onCooldown) return reply(buildBox('🌿 ON COOLDOWN', [`  Secret Path resets in: ${formatCooldown(remaining)}`]));

        const agiBonus = 1 + (player.stats.agi - 1) * 0.03;
        const found    = Math.random() < Math.min(0.75, 0.35 * agiBonus);

        await setCooldown(sender, 'secretpath');

        if (found) {
            const scaled = scaleRewards({ exp: 300, gold: 200 }, player.level, player.jid);
            await grantExp(sender, Math.floor(scaled.exp * agiBonus), Math.floor(scaled.gold * agiBonus), botId);

            await react('🌿');
            await reply(
                buildBox('🌿 SECRET PATH FOUND', [
                    `  Hidden route discovered!`,
                    `  ✨ EXP:  +${Math.floor(scaled.exp * agiBonus)}`,
                    `  💰 Gold: +${Math.floor(scaled.gold * agiBonus)}`,
                    `  🏃 AGI bonus: ${agiBonus.toFixed(2)}x`,
                    buildFooter(Math.floor(scaled.exp * agiBonus), Math.floor(scaled.gold * agiBonus), player),
                ])
            );
        } else {
            await reply(buildBox('🌿 NO PATH FOUND', [
                `  No secret paths in this area.`,
                `  Upgrade AGI to improve detection.`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'gate-rank',
        aliases:     ['gaterank', 'mygate'],
        category:    'exploration',
        react:       '🚪',
        description: 'Check which dungeon gate ranks you can access',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;
        const { rankName, rankId } = getRank(player.level, player.jid);

        const GATE_ACCESS = [
            { rank: 'E', minLevel: 1,   accessible: player.level >= 1   },
            { rank: 'D', minLevel: 10,  accessible: player.level >= 10  },
            { rank: 'C', minLevel: 25,  accessible: player.level >= 25  },
            { rank: 'B', minLevel: 45,  accessible: player.level >= 45  },
            { rank: 'A', minLevel: 65,  accessible: player.level >= 65  },
            { rank: 'S', minLevel: 100, accessible: player.level >= 100 },
        ];

        await react('🚪');
        await reply(
            buildBox('🚪 GATE ACCESS', [
                `  Hunter: ${name}  |  ${rankName}`,
                `  Level: ${player.level}`,
                `  ───────`,
                ...GATE_ACCESS.map(g =>
                    `  ${g.accessible ? '✅' : '🔒'} ${g.rank}-Rank Gate (Lv.${g.minLevel})`
                ),
                `  ───────`,
                `  Use *.dungeon* to enter a gate`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'gate-list',
        aliases:     ['gatelist', 'nearbygates'],
        category:    'exploration',
        react:       '📋',
        description: 'List all known dungeon gates in your current area',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const loc    = LOCATIONS[player.locationId] || LOCATIONS.starter_town;

        const AREA_GATES = {
            starter_town:          ['E-Rank', 'D-Rank'],
            forest_of_trials:      ['D-Rank', 'C-Rank'],
            red_gate_district:     ['B-Rank', 'A-Rank'],
            abandoned_mine:        ['D-Rank', 'C-Rank'],
            crystal_caverns:       ['A-Rank', 'S-Rank'],
            demon_castle:          ['S-Rank'],
            shadow_realm_entrance: ['A-Rank', 'S-Rank'],
            shadow_realm:          ['S-Rank', 'SS-Rank'],
            monarchs_domain:       ['SSS-Rank'],
        };

        const gates = AREA_GATES[player.locationId] || ['E-Rank'];

        await react('📋');
        await reply(
            buildBox('📋 GATES IN AREA', [
                `  Location: ${loc.name}`,
                `  ───────`,
                ...gates.map(g => `  🚪 ${g} Gate available`),
                `  ───────`,
                `  Use *.dungeon* to enter | *.search-gate* to find keys`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'dungeon-map',
        aliases:     ['dungeonmap', 'dungeonlayout'],
        category:    'exploration',
        react:       '🗺️',
        description: 'View a map of the current dungeon layout',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        await react('🗺️');
        await reply(
            buildBox('🗺️ DUNGEON MAP', [
                `  Location: ${LOCATIONS[player.locationId]?.name || 'Unknown'}`,
                `  ───────`,
                `  [F1] ██░░████████`,
                `  [F2] ████░░██████`,
                `  [F3] ██████░░████`,
                `  [F4] ████████░░██ ← YOU`,
                `  [F5] ██████████░░`,
                `  ───────`,
                `  ░ = Unexplored  ██ = Cleared`,
                `  Use *.dungeon* to clear floors`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'boss-location',
        aliases:     ['bosslocation', 'findboss'],
        category:    'exploration',
        react:       '👹',
        description: 'Find the location of a specific boss',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        await react('👹');
        await reply(
            buildBox('👹 BOSS LOCATIONS', [
                `  Iron Fang       → Abandoned Mine`,
                `  The Architect   → Red Gate District`,
                `  Shadow Monarch  → Shadow Realm`,
                `  Antares         → Abyss Border`,
                `  Legia           → Monarch's Domain`,
                `  Ashborn         → Origin Gate`,
                `  ───────`,
                `  Use *.travel <location>* then *.boss*`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'compass',
        aliases:     ['directions', 'navigate'],
        category:    'exploration',
        react:       '🧭',
        description: 'Use your compass to find nearby key locations',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const curLoc = LOCATIONS[player.locationId] || LOCATIONS.starter_town;

        const nearby = Object.entries(LOCATIONS)
            .filter(([id]) => id !== player.locationId)
            .slice(0, 6)
            .map(([id, loc]) => {
                const accessible = player.level >= loc.minLevel;
                const dist       = Math.floor(Math.random() * 10 + 1);
                return `  ${accessible ? '✅' : '🔒'} ${loc.name} — ${dist}km`;
            });

        await react('🧭');
        await reply(
            buildBox('🧭 COMPASS', [
                `  You are at: ${curLoc.name}`,
                `  ───────`,
                `  NEARBY LOCATIONS:`,
                ...nearby,
                `  ───────`,
                `  Use *.travel <name>* to move`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'surveyor',
        aliases:     ['survey-land', 'landvalue'],
        category:    'exploration',
        react:       '📏',
        description: 'Survey your current location for its territory value',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'surveyor', CD.surveyor);
        if (onCooldown) return reply(buildBox('📏 ON COOLDOWN', [`  Surveyor resets in: ${formatCooldown(remaining)}`]));

        const loc         = LOCATIONS[player.locationId] || LOCATIONS.starter_town;
        const landValue   = loc.minLevel * 50 + Math.floor(Math.random() * 500);
        const incomeEst   = Math.floor(landValue * 0.05);
        const already     = player.territoriesOwned?.includes(player.locationId);

        await setCooldown(sender, 'surveyor');

        await react('📏');
        await reply(
            buildBox('📏 SURVEY RESULTS', [
                `  Location: ${loc.name}`,
                `  Land Value: ${landValue.toLocaleString()} Gold`,
                `  Est. Income: ${incomeEst} Gold/hr`,
                `  Dark Zone: ${loc.dark ? 'Yes' : 'No'}`,
                `  Status: ${already ? '✅ You own this' : '⚔️ Unclaimed'}`,
                `  ───────`,
                already ? `  Use *.territory-income* to collect` : `  Use *.conquer* to claim this territory`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'claim-land',
        aliases:     ['claimland', 'stake'],
        category:    'exploration',
        react:       '🏴',
        description: 'Claim a land plot in your current location for passive income',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'claimland', CD.claimland);
        if (onCooldown) return reply(buildBox('🏴 ON COOLDOWN', [`  Claim Land resets in: ${formatCooldown(remaining)}`]));

        const loc  = LOCATIONS[player.locationId] || LOCATIONS.starter_town;
        const cost = loc.minLevel * 100 + 500;

        if (player.territoriesOwned?.includes(player.locationId)) {
            return reply(buildBox('🏴 ALREADY CLAIMED', [`  You already own ${loc.name}!`]));
        }

        if (player.gold < cost) {
            return reply(buildBox('🏴 INSUFFICIENT GOLD', [
                `  Claiming ${loc.name} costs ${cost.toLocaleString()} Gold.`,
                `  Your Gold: ${player.gold.toLocaleString()}`,
            ]));
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await conquerTerritory(sender, player.locationId);
        await setCooldown(sender, 'claimland');

        await react('🏴');
        await reply(
            buildBox('🏴 LAND CLAIMED', [
                `  ${loc.name} is now yours!`,
                `  💰 Cost: -${cost.toLocaleString()} Gold`,
                `  Use *.territory-income* to collect passive gold`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'patrol',
        aliases:     ['guardpatrol', 'defend-land'],
        category:    'exploration',
        react:       '🛡️',
        description: 'Patrol your territory to boost its income and security',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'patrol', CD.patrol);
        if (onCooldown) return reply(buildBox('🛡️ ON COOLDOWN', [`  Patrol resets in: ${formatCooldown(remaining)}`]));

        const owned = player.territoriesOwned?.length || 0;
        if (!owned) return reply('❌ No territories to patrol. Use *.conquer* or *.claim-land* first.');

        const scaled = scaleRewards({ exp: 100, gold: 150 * owned }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'patrol');

        await react('🛡️');
        await reply(
            buildBox('🛡️ PATROL COMPLETE', [
                `  Patrolled ${owned} territory/territories`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'outpost',
        aliases:     ['establish-outpost', 'setupoutpost'],
        category:    'exploration',
        react:       '🏕️',
        description: 'Establish an outpost in current area for better yield (12hr)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'outpost', CD.outpost);
        if (onCooldown) return reply(buildBox('🏕️ ON COOLDOWN', [`  Outpost resets in: ${formatCooldown(remaining)}`]));

        const cost = 500;
        if ((player.inventory.wood || 0) < 10 || player.gold < cost) {
            return reply(buildBox('🏕️ OUTPOST REQUIREMENTS', [
                `  10 Wood + ${cost} Gold`,
                `  Have: ${player.inventory.wood || 0} wood, ${player.gold.toLocaleString()} gold`,
            ]));
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { gold: -cost, 'inventory.wood': -10 }
        });

        const loc    = LOCATIONS[player.locationId] || LOCATIONS.starter_town;
        const scaled = scaleRewards({ exp: 200, gold: 300 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'outpost');

        await react('🏕️');
        await reply(
            buildBox('🏕️ OUTPOST ESTABLISHED', [
                `  Outpost built at ${loc.name}!`,
                `  🪵 Wood: -10  💰 Gold: -${cost}`,
                `  ✨ EXP: +${scaled.exp}`,
                `  Gathering yield in area: +20%`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'base-camp',
        aliases:     ['basecamp', 'camp'],
        category:    'exploration',
        react:       '⛺',
        description: 'Set up a base camp to restore all stats (24hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'basecamp', CD.basecamp);
        if (onCooldown) return reply(buildBox('⛺ ON COOLDOWN', [`  Base Camp resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.food || 0) < 3 || (player.inventory.wood || 0) < 5) {
            return reply('❌ Base camp requires 3 Food + 5 Wood.');
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'inventory.food': -3, 'inventory.water': -2, 'inventory.wood': -5 },
            $set: {
                'combat.hp': player.combat.maxHp,
                'combat.mp': player.combat.maxMp,
                hunger:      100,
                thirst:      100,
            }
        });

        await grantExp(sender, 50, 0, botId);
        await setCooldown(sender, 'basecamp');

        await react('⛺');
        await reply(
            buildBox('⛺ BASE CAMP SET UP', [
                `  Camp established! All stats restored.`,
                `  ❤️  HP: Full  💧 MP: Full`,
                `  🍖 Hunger: 100%  💧 Thirst: 100%`,
                `  🍖 Food: -3  🪵 Wood: -5`,
                buildFooter(50, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'landmark',
        aliases:     ['landmarks', 'discover'],
        category:    'exploration',
        react:       '🗿',
        description: 'Discover a landmark in your area for fast travel discount',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const loc    = LOCATIONS[player.locationId] || LOCATIONS.starter_town;

        const LANDMARKS = [
            'Ancient Obelisk', 'Fallen Gate', 'Crystal Spire',
            'Hunters Monument', 'Shadow Pillar', 'Origin Marker',
        ];

        const landmark = LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
        const scaled   = scaleRewards({ exp: 150, gold: 100 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);

        await react('🗿');
        await reply(
            buildBox('🗿 LANDMARK DISCOVERED', [
                `  ${landmark} found at ${loc.name}!`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                `  Fast Travel cost to this area: -10%`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'warp-stone',
        aliases:     ['warpstone', 'hearthstone'],
        category:    'exploration',
        react:       '💠',
        description: 'Use a warp stone to instantly return home (free, 15min cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'warpstone', CD.warpstone);
        if (onCooldown) return reply(buildBox('💠 ON COOLDOWN', [`  Warp Stone resets in: ${formatCooldown(remaining)}`]));

        const homeLoc = LOCATIONS[player.homeLocation] || LOCATIONS.starter_town;
        await setLocation(sender, player.homeLocation || 'starter_town');
        await setCooldown(sender, 'warpstone');

        await react('💠');
        await reply(
            buildBox('💠 WARP STONE ACTIVATED', [
                `  Teleported home — FREE!`,
                `  📍 Now at: ${homeLoc.name}`,
                `  Resets in: 15 minutes`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'void-walk',
        aliases:     ['voidwalk', 'dimensionwalk'],
        category:    'exploration',
        react:       '🌌',
        description: 'Walk through the void to any location instantly (Level 80+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.level < 80) return reply('❌ Void Walk requires Level 80+.');

        const { onCooldown, remaining } = checkCooldown(player, 'voidwalk', CD.voidwalk);
        if (onCooldown) return reply(buildBox('🌌 ON COOLDOWN', [`  Void Walk resets in: ${formatCooldown(remaining)}`]));

        if (!q) return reply('❌ Usage: *.void-walk <location name>*');
        if ((player.inventory.crystalOre || 0) < 2) return reply('❌ Void Walk costs 2 Crystal Ore.');

        const locEntry = Object.entries(LOCATIONS).find(([, loc]) =>
            loc.name.toLowerCase().includes(q.toLowerCase())
        );

        if (!locEntry) return reply(`❌ Location *${q}* not found.`);
        const [locId, loc] = locEntry;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -2 } });
        await setLocation(sender, locId);
        await setCooldown(sender, 'voidwalk');

        await react('🌌');
        await reply(
            buildBox('🌌 VOID WALK', [
                `  Stepped through the void!`,
                `  📍 Now at: ${loc.name}`,
                `  🔮 Crystal Ore: -2`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'shadow-travel',
        aliases:     ['shadowtravel', 'darktravel'],
        category:    'exploration',
        react:       '🖤',
        description: 'Travel instantly through shadows (Dark/Chaos alignment only)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!['Dark', 'Chaos'].includes(player.alignment)) {
            return reply('❌ Shadow Travel requires Dark or Chaos alignment.');
        }

        const { onCooldown, remaining } = checkCooldown(player, 'shadowtravel', CD.shadowtravel);
        if (onCooldown) return reply(buildBox('🖤 ON COOLDOWN', [`  Shadow Travel resets in: ${formatCooldown(remaining)}`]));

        if (!q) return reply('❌ Usage: *.shadow-travel <location name>*');

        const locEntry = Object.entries(LOCATIONS).find(([, loc]) =>
            loc.name.toLowerCase().includes(q.toLowerCase())
        );

        if (!locEntry) return reply(`❌ Location not found.`);
        const [locId, loc] = locEntry;

        if (!loc.dark) return reply('❌ Shadow Travel only works to dark zones!');

        await setLocation(sender, locId);
        await setCooldown(sender, 'shadowtravel');

        await react('🖤');
        await reply(
            buildBox('🖤 SHADOW TRAVEL', [
                `  Melted into the shadows...`,
                `  📍 Emerged at: ${loc.name}`,
                `  Free for Dark/Chaos alignment!`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'monarch-gate',
        aliases:     ['monarchgate', 'kinggate'],
        category:    'exploration',
        react:       '👑',
        description: 'Open a Monarch-class gate for ultimate rewards (Level 250+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const { rankId } = getRank(player.level, player.jid);
        if (rankId < 10) return reply('❌ Monarch Gate requires Monarch rank (Level 250+).');

        const { onCooldown, remaining } = checkCooldown(player, 'monarchgate', CD.monarchgate);
        if (onCooldown) return reply(buildBox('👑 ON COOLDOWN', [`  Monarch Gate resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.crystalOre || 0) < 15) {
            return reply(`❌ Monarch Gate requires 15 Crystal Ore. You have ${player.inventory.crystalOre || 0}.`);
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -15 } });

        const scaled = scaleRewards({ exp: 8000, gold: 6000 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await addCrystals(sender, 8);
        await addItem(sender, 'keys', 3);
        await setCooldown(sender, 'monarchgate');

        await react('👑');
        await reply(
            buildBox('👑 MONARCH GATE OPENED', [
                `  👑 *${name}* tears open a Monarch Gate!`,
                `  ───────`,
                `  🔮 Crystal Ore: -15`,
                `  ✨ EXP:      +${scaled.exp.toLocaleString()}`,
                `  💰 Gold:     +${scaled.gold.toLocaleString()}`,
                `  🔮 Crystals: +8`,
                `  🗝️  Keys:     +3`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'rift-scan',
        aliases:     ['riftscan', 'scanrift'],
        category:    'exploration',
        react:       '📡',
        description: 'Scan for active rifts across all locations',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'riftscan', CD.riftscan);
        if (onCooldown) return reply(buildBox('📡 ON COOLDOWN', [`  Rift Scan resets in: ${formatCooldown(remaining)}`]));

        const RIFT_LOCATIONS = [
            'Red Gate District', 'Crystal Caverns',
            'Shadow Realm', "Monarch's Domain", 'Abyss Border',
        ];

        const active  = RIFT_LOCATIONS.filter(() => Math.random() < 0.4);
        const scaled  = scaleRewards({ exp: 80, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'riftscan');

        await react('📡');
        await reply(
            buildBox('📡 RIFT SCAN RESULTS', [
                `  Scanning all known zones...`,
                `  ───────`,
                ...(active.length
                    ? active.map(loc => `  🌌 Rift detected: ${loc}`)
                    : ['  No active rifts detected.']),
                `  ───────`,
                `  ✨ Scan EXP: +${scaled.exp}`,
                `  Use *.rift-open* to enter detected rifts`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'dimension-list',
        aliases:     ['dimensionlist', 'alldimensions'],
        category:    'exploration',
        react:       '🌀',
        description: 'View all known dimensions and their requirements',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        await react('🌀');
        await reply(
            buildBox('🌀 KNOWN DIMENSIONS', [
                `  🌀 Crystal Dimension  — Lv.100+ | 3x EXP`,
                `  🖤 Shadow Dimension   — Lv.100+ | 4x EXP`,
                `  🌌 Void Dimension     — Lv.100+ | 5x EXP`,
                `  ⚱️  Ancient Dimension  — Lv.100+ | 6x EXP`,
                `  ───────`,
                `  🔮 Monarch Dimension  — Lv.250+ | 10x EXP`,
                `  👑 Origin Dimension   — Lv.400+ | 20x EXP`,
                `  ───────`,
                `  Use *.dimension-jump* to enter`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'location-info',
        aliases:     ['locationinfo', 'areainfo'],
        category:    'exploration',
        react:       '📍',
        description: 'Get detailed info about any location by name',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;

        if (!q) return reply('❌ Usage: *.location-info <location name>*');

        const locEntry = Object.entries(LOCATIONS).find(([, loc]) =>
            loc.name.toLowerCase().includes(q.toLowerCase())
        );

        if (!locEntry) return reply(`❌ Location *${q}* not found. Use *.map* to see all.`);

        const [locId, loc] = locEntry;

        await react('📍');
        await reply(
            buildBox(`📍 ${loc.name.toUpperCase()}`, [
                `  Min Level: ${loc.minLevel}`,
                `  Dark Zone: ${loc.dark ? '⚠️ Yes' : 'No'}`,
                `  Zone ID:   ${locId}`,
                `  ───────`,
                `  Travel: *.travel ${loc.name}*`,
                `  Fast:   *.fast-travel ${loc.name}*`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'territory-income',
        aliases:     ['territoryincome', 'collectland'],
        category:    'exploration',
        react:       '💰',
        description: 'Collect passive income from all your territories (6hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'territoryincome', CD.territoryincome);
        if (onCooldown) return reply(buildBox('💰 ON COOLDOWN', [`  Territory Income resets in: ${formatCooldown(remaining)}`]));

        const owned = player.territoriesOwned || [];
        if (!owned.length) return reply('❌ No territories owned. Use *.conquer* or *.claim-land* first.');

        const mult        = getRankMultiplier(player.level, player.jid);
        const perTerritory = 200;
        const total        = Math.floor(owned.length * perTerritory * mult);

        await addGold(sender, total);
        await setCooldown(sender, 'territoryincome');

        await react('💰');
        await reply(
            buildBox('💰 TERRITORY INCOME', [
                `  Territories: ${owned.length}`,
                `  Per territory: ${perTerritory} Gold`,
                `  Rank mult: ${mult}x`,
                `  ───────`,
                `  💰 Total: +${total.toLocaleString()} Gold`,
                buildFooter(0, total, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'map-rank',
        aliases:     ['maprank', 'territorylb'],
        category:    'exploration',
        react:       '🗺️',
        description: 'View the global territory leaderboard',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const top    = await GlobalPlayer.find({ registered: true, 'territoriesOwned.0': { $exists: true } })
            .sort({ territoriesOwned: -1 })
            .limit(10)
            .lean();

        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

        await react('🗺️');
        await reply(
            buildBox('🗺️ TERRITORY LEADERBOARD', [
                ...(top.length
                    ? top.map((p, i) => {
                        const name = p.username || p.jid.split('@')[0];
                        return `  ${medals[i]} *${name}* — 🏴 ${p.territoriesOwned.length} territories`;
                      })
                    : ['  No territory holders yet!']),
                `  ───────`,
                `  Use *.conquer* to claim lands`,
            ])
        );
    }
);
