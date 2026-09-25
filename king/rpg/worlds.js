/**
 * king/rpg/worlds.js
 * Multiple Worlds System — Malvin-XD Sovereign RPG
 *
 * Worlds:
 *   🌍 Aevoria    — starter realm (default)
 *   🌑 Voidmere   — dark dimension (Lv50+)
 *   🔥 Infernum   — fire realm (Lv100+)
 *   ❄️ Glacivorn  — ice world (Lv150+)
 */

// ════════════════════════════════════════════════════════════════════════════
// WORLD DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════
const WORLDS = {
    aevoria: {
        name:         'Aevoria',
        emoji:        '🌍',
        description:  'The birthplace of all hunters. Balanced and familiar.',
        minLevel:     1,
        travelCost:   0,
        travelCooldown: 0,
        deathPenalty: { goldLoss: 0.05, expLoss: 0, hungerDrop: 0, forcedReturn: false },
        multipliers:  { exp: 1.0, gold: 1.0, drop: 1.0, gather: 1.0 },
        theme:        'neutral',
        weather:      ['Clear', 'Rainy', 'Foggy', 'Stormy', 'Blood Moon'],
        enemies: [
            { name: 'Goblin',       emoji: '👺', rank: 'F', exp: 80,   gold: 60,   minLevel: 1  },
            { name: 'Wolf',         emoji: '🐺', rank: 'F', exp: 100,  gold: 80,   minLevel: 3  },
            { name: 'Orc Warrior',  emoji: '👹', rank: 'E', exp: 180,  gold: 150,  minLevel: 8  },
            { name: 'Dark Knight',  emoji: '⚔️', rank: 'D', exp: 350,  gold: 280,  minLevel: 20 },
            { name: 'Dragon Hound', emoji: '🐉', rank: 'C', exp: 700,  gold: 550,  minLevel: 40 },
            { name: 'Shadow Beast', emoji: '🖤', rank: 'B', exp: 1500, gold: 1200, minLevel: 60 },
        ],
        resources:    ['herbs', 'wood', 'ore', 'fish', 'food'],
        uniqueDrops:  ['ancient_rune', 'beast_core'],
        locations:    ['starter_town', 'forest_of_trials', 'hunters_guild', 'abandoned_mine'],
        worldQuests:  ['wq_aevoria_1', 'wq_aevoria_2', 'wq_aevoria_3'],
    },

    voidmere: {
        name:         'Voidmere',
        emoji:        '🌑',
        description:  'The dark dimension between worlds. High risk, high reward.',
        minLevel:     50,
        travelCost:   5000,
        travelCooldown: 6 * 60 * 60 * 1000, // 6 hours
        emergencyEscapeCost: 5000,
        deathPenalty: { goldLoss: 0.10, expLoss: 0.20, hungerDrop: 0, forcedReturn: true },
        multipliers:  { exp: 2.5, gold: 2.0, drop: 1.8, gather: 1.5 },
        theme:        'dark',
        weather:      ['Void Mist', 'Shadow Storm', 'Null Tide', 'Phantom Rain', 'Void Eclipse'],
        enemies: [
            { name: 'Void Wraith',    emoji: '👻', rank: 'C', exp: 800,  gold: 700,  minLevel: 50 },
            { name: 'Shadow Stalker', emoji: '🌑', rank: 'B', exp: 1800, gold: 1500, minLevel: 60 },
            { name: 'Void Devourer',  emoji: '🕳️', rank: 'A', exp: 4000, gold: 3500, minLevel: 75 },
            { name: 'Dark Sovereign', emoji: '👑', rank: 'S', exp: 9000, gold: 8000, minLevel: 90 },
        ],
        resources:    ['crystalOre', 'void_essence', 'shadow_fragment'],
        uniqueDrops:  ['void_crystal', 'dark_sigil', 'phantom_core'],
        locations:    ['void_gate', 'shadow_citadel', 'null_plains', 'phantom_depths'],
        worldQuests:  ['wq_void_1', 'wq_void_2', 'wq_void_3'],
    },

    infernum: {
        name:         'Infernum',
        emoji:        '🔥',
        description:  'The fire realm. Extreme heat, extreme power, extreme danger.',
        minLevel:     100,
        travelCost:   15000,
        travelCooldown: 6 * 60 * 60 * 1000,
        emergencyEscapeCost: 5000,
        deathPenalty: { goldLoss: 0.15, expLoss: 0, hungerDrop: 0, forcedReturn: true },
        multipliers:  { exp: 4.0, gold: 3.5, drop: 2.5, gather: 2.0 },
        theme:        'fire',
        weather:      ['Ash Storm', 'Magma Rain', 'Inferno Wind', 'Fire Surge', 'Solar Flare'],
        enemies: [
            { name: 'Flame Imp',       emoji: '🔥', rank: 'B', exp: 2000,  gold: 1800,  minLevel: 100 },
            { name: 'Lava Golem',      emoji: '🌋', rank: 'A', exp: 5000,  gold: 4500,  minLevel: 115 },
            { name: 'Infernal Drake',  emoji: '🐲', rank: 'S', exp: 12000, gold: 10000, minLevel: 130 },
            { name: 'Arch Demon',      emoji: '😈', rank: 'SS', exp: 25000, gold: 20000, minLevel: 145 },
        ],
        resources:    ['fire_ore', 'magma_crystal', 'ash_herb'],
        uniqueDrops:  ['infernal_core', 'demon_sigil', 'flame_rune'],
        locations:    ['infernal_gate', 'demon_forge', 'magma_plains', 'arch_citadel'],
        worldQuests:  ['wq_inf_1', 'wq_inf_2', 'wq_inf_3'],
    },

    glacivorn: {
        name:         'Glacivorn',
        emoji:        '❄️',
        description:  'The eternal ice world. Survival is the ultimate test.',
        minLevel:     150,
        travelCost:   25000,
        travelCooldown: 6 * 60 * 60 * 1000,
        emergencyEscapeCost: 5000,
        deathPenalty: { goldLoss: 0.10, expLoss: 0, hungerDrop: 100, forcedReturn: true },
        multipliers:  { exp: 5.0, gold: 4.5, drop: 3.0, gather: 2.5 },
        theme:        'ice',
        weather:      ['Blizzard', 'Ice Storm', 'Frost Surge', 'Arctic Wind', 'Glacial Freeze'],
        enemies: [
            { name: 'Frost Wraith',   emoji: '❄️', rank: 'A', exp: 4000,  gold: 3500,  minLevel: 150 },
            { name: 'Ice Colossus',   emoji: '🧊', rank: 'S', exp: 10000, gold: 9000,  minLevel: 165 },
            { name: 'Arctic Wyrm',    emoji: '🐉', rank: 'SS', exp: 22000, gold: 18000, minLevel: 180 },
            { name: 'Glacial Monarch',emoji: '👑', rank: 'SSS', exp: 50000, gold: 40000, minLevel: 195 },
        ],
        resources:    ['ice_ore', 'frost_crystal', 'arctic_herb'],
        uniqueDrops:  ['glacial_core', 'frost_sigil', 'eternal_ice'],
        locations:    ['frost_gate', 'ice_citadel', 'frozen_tundra', 'glacial_abyss'],
        worldQuests:  ['wq_glac_1', 'wq_glac_2', 'wq_glac_3'],
    },
};

// ════════════════════════════════════════════════════════════════════════════
// WORLD QUESTS
// ════════════════════════════════════════════════════════════════════════════
const WORLD_QUESTS = {
    // ── Aevoria ───────────────────────────────────────────────────────────
    wq_aevoria_1: {
        id: 'wq_aevoria_1', world: 'aevoria',
        title: 'Aevoria\'s Guardian',
        desc: 'Win 10 hunts in Aevoria',
        emoji: '🌍', track: 'worldHunts', target: 10,
        reward: { gold: 3000, exp: 1500 },
    },
    wq_aevoria_2: {
        id: 'wq_aevoria_2', world: 'aevoria',
        title: 'Aevoria Explorer',
        desc: 'Explore 5 locations in Aevoria',
        emoji: '🗺️', track: 'worldExplores', target: 5,
        reward: { gold: 2000, exp: 1000, diamonds: 2 },
    },
    wq_aevoria_3: {
        id: 'wq_aevoria_3', world: 'aevoria',
        title: 'Nature\'s Bounty',
        desc: 'Gather 10 times in Aevoria',
        emoji: '🌿', track: 'worldGathers', target: 10,
        reward: { gold: 2500, exp: 1200 },
    },

    // ── Voidmere ──────────────────────────────────────────────────────────
    wq_void_1: {
        id: 'wq_void_1', world: 'voidmere',
        title: 'Void Hunter',
        desc: 'Win 5 hunts in Voidmere',
        emoji: '🌑', track: 'worldHunts', target: 5,
        reward: { gold: 15000, exp: 8000, diamonds: 5 },
    },
    wq_void_2: {
        id: 'wq_void_2', world: 'voidmere',
        title: 'Shadow Collector',
        desc: 'Gather void essence 3 times',
        emoji: '🕳️', track: 'worldGathers', target: 3,
        reward: { gold: 10000, exp: 5000, diamonds: 3 },
    },
    wq_void_3: {
        id: 'wq_void_3', world: 'voidmere',
        title: 'Void Survivor',
        desc: 'Survive 3 days in Voidmere without dying',
        emoji: '💀', track: 'worldDaysSurvived', target: 3,
        reward: { gold: 20000, exp: 10000, diamonds: 10 },
    },

    // ── Infernum ──────────────────────────────────────────────────────────
    wq_inf_1: {
        id: 'wq_inf_1', world: 'infernum',
        title: 'Flame Slayer',
        desc: 'Win 5 hunts in Infernum',
        emoji: '🔥', track: 'worldHunts', target: 5,
        reward: { gold: 30000, exp: 15000, diamonds: 10 },
    },
    wq_inf_2: {
        id: 'wq_inf_2', world: 'infernum',
        title: 'Fire Forger',
        desc: 'Gather fire ore 3 times',
        emoji: '🌋', track: 'worldGathers', target: 3,
        reward: { gold: 20000, exp: 10000, diamonds: 8 },
    },
    wq_inf_3: {
        id: 'wq_inf_3', world: 'infernum',
        title: 'Infernal Conqueror',
        desc: 'Defeat an Arch Demon',
        emoji: '😈', track: 'worldBossKills', target: 1,
        reward: { gold: 50000, exp: 25000, diamonds: 20 },
    },

    // ── Glacivorn ─────────────────────────────────────────────────────────
    wq_glac_1: {
        id: 'wq_glac_1', world: 'glacivorn',
        title: 'Frost Hunter',
        desc: 'Win 5 hunts in Glacivorn',
        emoji: '❄️', track: 'worldHunts', target: 5,
        reward: { gold: 50000, exp: 25000, diamonds: 15 },
    },
    wq_glac_2: {
        id: 'wq_glac_2', world: 'glacivorn',
        title: 'Ice Harvester',
        desc: 'Gather frost crystal 3 times',
        emoji: '🧊', track: 'worldGathers', target: 3,
        reward: { gold: 35000, exp: 18000, diamonds: 12 },
    },
    wq_glac_3: {
        id: 'wq_glac_3', world: 'glacivorn',
        title: 'Glacial Sovereign',
        desc: 'Defeat the Glacial Monarch',
        emoji: '👑', track: 'worldBossKills', target: 1,
        reward: { gold: 100000, exp: 50000, diamonds: 50 },
    },
};

// ════════════════════════════════════════════════════════════════════════════
// WEATHER PER WORLD
// ════════════════════════════════════════════════════════════════════════════
const WORLD_WEATHER = {
    aevoria: [
        { name: 'Clear',      emoji: '☀️',  expMult: 1.0, desc: 'Perfect conditions'        },
        { name: 'Rainy',      emoji: '🌧️', expMult: 0.8, desc: '-20% EXP'                  },
        { name: 'Foggy',      emoji: '🌫️', expMult: 1.1, desc: '+10% enemy spawns'          },
        { name: 'Stormy',     emoji: '⛈️', expMult: 0.6, desc: '-40% EXP, dangerous'        },
        { name: 'Blood Moon', emoji: '🌕', expMult: 2.0, desc: '+100% EXP! Rare!'           },
    ],
    voidmere: [
        { name: 'Void Mist',    emoji: '🌑', expMult: 1.0, desc: 'Standard void conditions'  },
        { name: 'Shadow Storm', emoji: '⚫', expMult: 1.3, desc: '+30% EXP, harder enemies'  },
        { name: 'Null Tide',    emoji: '🕳️', expMult: 0.7, desc: 'Void energy unstable'      },
        { name: 'Phantom Rain', emoji: '👻', expMult: 1.5, desc: '+50% drop rates'           },
        { name: 'Void Eclipse', emoji: '🌑', expMult: 3.0, desc: '+200% EXP! Rare!'          },
    ],
    infernum: [
        { name: 'Ash Storm',   emoji: '🌋', expMult: 1.0, desc: 'Standard fire conditions'   },
        { name: 'Magma Rain',  emoji: '🔥', expMult: 1.4, desc: '+40% gold drops'            },
        { name: 'Inferno Wind',emoji: '💨', expMult: 0.8, desc: 'Dangerous gusts, -20% EXP'  },
        { name: 'Fire Surge',  emoji: '⚡', expMult: 1.6, desc: '+60% EXP, enemies enraged'  },
        { name: 'Solar Flare', emoji: '☀️', expMult: 2.5, desc: '+150% EXP! Rare!'           },
    ],
    glacivorn: [
        { name: 'Blizzard',       emoji: '❄️', expMult: 0.8, desc: 'Reduced visibility'       },
        { name: 'Ice Storm',      emoji: '🌨️', expMult: 1.2, desc: '+20% drop rates'          },
        { name: 'Frost Surge',    emoji: '💎', expMult: 1.5, desc: '+50% crystal drops'       },
        { name: 'Arctic Wind',    emoji: '🌬️', expMult: 0.6, desc: 'Severe cold, -40% EXP'   },
        { name: 'Glacial Freeze', emoji: '🧊', expMult: 3.0, desc: '+200% EXP! Rare!'         },
    ],
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getWorld(worldKey) {
    return WORLDS[worldKey?.toLowerCase()] || WORLDS.aevoria;
}

function getWorldWeather(worldKey) {
    const weather = WORLD_WEATHER[worldKey?.toLowerCase()] || WORLD_WEATHER.aevoria;
    // Weighted random — rare weather less likely
    const roll = Math.random();
    if (roll < 0.02)  return weather[weather.length - 1]; // rare event 2%
    if (roll < 0.15)  return weather[Math.floor(Math.random() * (weather.length - 1)) + 1];
    return weather[0]; // common weather 85%
}

function getWorldEnemies(worldKey, playerLevel) {
    const world   = getWorld(worldKey);
    const eligible = world.enemies.filter(e => playerLevel >= e.minLevel);
    if (!eligible.length) return world.enemies[0];
    return eligible[Math.floor(Math.random() * eligible.length)];
}

function getWorldQuests(worldKey) {
    return Object.values(WORLD_QUESTS).filter(q => q.world === worldKey);
}

function getWorldQuestDef(id) {
    return WORLD_QUESTS[id] || null;
}

/**
 * Check if player can travel to a world.
 */
function canTravelTo(player, worldKey) {
    const world = WORLDS[worldKey];
    if (!world) return { can: false, reason: 'Unknown world' };
    if (player.level < world.minLevel) {
        return { can: false, reason: `Requires Level *${world.minLevel}*. You are Level *${player.level}*.` };
    }
    if (player.gold < world.travelCost) {
        return { can: false, reason: `Travel costs *${world.travelCost.toLocaleString()} Gold*. You have *${player.gold.toLocaleString()}*.` };
    }
    return { can: true };
}

/**
 * Apply death penalty for a world.
 */
async function applyDeathPenalty(jid, worldKey, botId) {
    const world   = getWorld(worldKey);
    const penalty = world.deathPenalty;
    const { GlobalPlayer } = require('./model');

    const player  = await GlobalPlayer.findOne({ jid });
    if (!player) return null;

    const goldLoss    = Math.floor(player.gold * penalty.goldLoss);
    const expLoss     = Math.floor(player.exp  * penalty.expLoss);

    await GlobalPlayer.findOneAndUpdate(
        { jid },
        {
            $inc: {
                gold:              -goldLoss,
                exp:               -expLoss,
                'combat.deaths':   1,
            },
            ...(penalty.forcedReturn ? { $set: { currentWorld: 'aevoria' } } : {}),
            ...(penalty.hungerDrop   ? { $set: { hunger: 0 } } : {}),
        }
    );

    return { goldLoss, expLoss, forcedReturn: penalty.forcedReturn };
}

module.exports = {
    WORLDS,
    WORLD_QUESTS,
    WORLD_WEATHER,
    getWorld,
    getWorldWeather,
    getWorldEnemies,
    getWorldQuests,
    getWorldQuestDef,
    canTravelTo,
    applyDeathPenalty,
};
