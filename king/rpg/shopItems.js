/**
 * king/rpg/shopItems.js
 * Shop Items — Malvin-XD Sovereign RPG
 *
 * Categories:
 *   general    — available everywhere
 *   role       — role-specific gear bonuses
 *   pet        — pet food and care items
 *   world      — world-specific items (Voidmere, Infernum, Glacivorn)
 */

const SHOP_ITEMS = {

    // ════════════════════════════════════════════════════════════════════
    // GENERAL — available in all worlds
    // ════════════════════════════════════════════════════════════════════
    potion: {
        name:     'Health Potion',
        emoji:    '🧪',
        price:    500,
        item:     'potions',
        count:    1,
        desc:     'Restore 40% HP',
        category: 'general',
        world:    null,
        minLevel: 1,
        effect:   { type: 'heal', amount: 0.40 },
    },
    food: {
        name:     'Rations',
        emoji:    '🍖',
        price:    200,
        item:     'food',
        count:    5,
        desc:     'Restore 20% hunger',
        category: 'general',
        world:    null,
        minLevel: 1,
        effect:   { type: 'hunger', amount: 20 },
    },
    water: {
        name:     'Water Flask',
        emoji:    '💧',
        price:    150,
        item:     'water',
        count:    5,
        desc:     'Restore 20% thirst',
        category: 'general',
        world:    null,
        minLevel: 1,
        effect:   { type: 'thirst', amount: 20 },
    },
    key: {
        name:     'Dungeon Key',
        emoji:    '🗝️',
        price:    2000,
        item:     'keys',
        count:    1,
        desc:     'Enter dungeons',
        category: 'general',
        world:    null,
        minLevel: 1,
        effect:   { type: 'key' },
    },
    antidote: {
        name:     'Antidote',
        emoji:    '💊',
        price:    800,
        item:     'antidotes',
        count:    1,
        desc:     'Cure poison/debuffs',
        category: 'general',
        world:    null,
        minLevel: 5,
        effect:   { type: 'cure' },
    },
    elixir: {
        name:     'EXP Elixir',
        emoji:    '✨',
        price:    5000,
        item:     'elixirs',
        count:    1,
        desc:     '+50% EXP for 1 hour',
        category: 'general',
        world:    null,
        minLevel: 10,
        effect:   { type: 'expBoost', amount: 0.50, duration: 3600000 },
    },
    golddraft: {
        name:     'Gold Draft',
        emoji:    '💰',
        price:    8000,
        item:     'goldDrafts',
        count:    1,
        desc:     '+50% Gold for 1 hour',
        category: 'general',
        world:    null,
        minLevel: 10,
        effect:   { type: 'goldBoost', amount: 0.50, duration: 3600000 },
    },
    revive: {
        name:     'Revive Stone',
        emoji:    '💎',
        price:    10000,
        item:     'reviveStones',
        count:    1,
        desc:     'Survive one killing blow',
        category: 'general',
        world:    null,
        minLevel: 20,
        effect:   { type: 'revive' },
    },

    // ════════════════════════════════════════════════════════════════════
    // PET ITEMS
    // ════════════════════════════════════════════════════════════════════
    petfood: {
        name:     'Pet Rations',
        emoji:    '🐾',
        price:    100,
        item:     'petFood',
        count:    5,
        desc:     'Feed your pets (+30% hunger)',
        category: 'pet',
        world:    null,
        minLevel: 1,
        effect:   { type: 'petHunger', amount: 30 },
    },
    pettoy: {
        name:     'Pet Toy',
        emoji:    '🎾',
        price:    300,
        item:     'petToys',
        count:    1,
        desc:     'Boost pet happiness (+40%)',
        category: 'pet',
        world:    null,
        minLevel: 1,
        effect:   { type: 'petHappiness', amount: 40 },
    },
    pettreat: {
        name:     'Pet Treat',
        emoji:    '🦴',
        price:    2000,
        item:     'petTreats',
        count:    1,
        desc:     'Give pet +1 level (max 10)',
        category: 'pet',
        world:    null,
        minLevel: 5,
        effect:   { type: 'petLevel', max: 10 },
    },
    petelixir: {
        name:     'Pet Elixir',
        emoji:    '🌟',
        price:    15000,
        item:     'petElixirs',
        count:    1,
        desc:     'Give pet +5 levels (max 50)',
        category: 'pet',
        world:    null,
        minLevel: 30,
        effect:   { type: 'petLevel', amount: 5, max: 50 },
    },

    // ════════════════════════════════════════════════════════════════════
    // ROLE GEAR — bonuses for specific roles
    // ════════════════════════════════════════════════════════════════════
    warriorshield: {
        name:     'Warrior\'s Aegis',
        emoji:    '🛡️',
        price:    8000,
        item:     'warriorAegis',
        count:    1,
        desc:     'Warriors: +10% boss defense for 2 hours',
        category: 'role',
        world:    null,
        minLevel: 15,
        requiredRole: 'warrior',
        effect:   { type: 'roleGear', bonus: 'bossDefBonus', amount: 0.10, duration: 7200000 },
    },
    magestome: {
        name:     'Mage\'s Grimoire',
        emoji:    '📚',
        price:    8000,
        item:     'mageGrimoire',
        count:    1,
        desc:     'Mages: +15% EXP for 2 hours',
        category: 'role',
        world:    null,
        minLevel: 15,
        requiredRole: 'mage',
        effect:   { type: 'roleGear', bonus: 'expBonus', amount: 0.15, duration: 7200000 },
    },
    rangerquiver: {
        name:     'Ranger\'s Quiver',
        emoji:    '🏹',
        price:    8000,
        item:     'rangerQuiver',
        count:    1,
        desc:     'Rangers: +15% gather yield for 2 hours',
        category: 'role',
        world:    null,
        minLevel: 15,
        requiredRole: 'ranger',
        effect:   { type: 'roleGear', bonus: 'gatherBonus', amount: 0.15, duration: 7200000 },
    },
    assassindagger: {
        name:     'Shadow Dagger',
        emoji:    '🗡️',
        price:    8000,
        item:     'shadowDagger',
        count:    1,
        desc:     'Assassins: +20% duel win for 2 hours',
        category: 'role',
        world:    null,
        minLevel: 15,
        requiredRole: 'assassin',
        effect:   { type: 'roleGear', bonus: 'duelWinBonus', amount: 0.20, duration: 7200000 },
    },
    knightarmor: {
        name:     'Knight\'s Plate',
        emoji:    '⚔️',
        price:    8000,
        item:     'knightPlate',
        count:    1,
        desc:     'Knights: +20% raid EXP for 2 hours',
        category: 'role',
        world:    null,
        minLevel: 15,
        requiredRole: 'knight',
        effect:   { type: 'roleGear', bonus: 'raidExpBonus', amount: 0.20, duration: 7200000 },
    },
    alchemistkit: {
        name:     'Alchemist Kit',
        emoji:    '⚗️',
        price:    8000,
        item:     'alchemistKit',
        count:    1,
        desc:     'Alchemists: +25% gold for 2 hours',
        category: 'role',
        world:    null,
        minLevel: 15,
        requiredRole: 'alchemist',
        effect:   { type: 'roleGear', bonus: 'goldBonus', amount: 0.25, duration: 7200000 },
    },

    // ════════════════════════════════════════════════════════════════════
    // WORLD ITEMS — only available in specific worlds
    // ════════════════════════════════════════════════════════════════════
    voidessence: {
        name:     'Void Essence',
        emoji:    '🌑',
        price:    15000,
        item:     'voidEssence',
        count:    1,
        desc:     '+100% EXP for 30 min (Voidmere only)',
        category: 'world',
        world:    'voidmere',
        minLevel: 50,
        effect:   { type: 'expBoost', amount: 1.0, duration: 1800000 },
    },
    shadowtalisman: {
        name:     'Shadow Talisman',
        emoji:    '🕳️',
        price:    20000,
        item:     'shadowTalisman',
        count:    1,
        desc:     'Survive one death in Voidmere without penalty',
        category: 'world',
        world:    'voidmere',
        minLevel: 60,
        effect:   { type: 'deathShield', world: 'voidmere' },
    },
    infernalorb: {
        name:     'Infernal Orb',
        emoji:    '🔥',
        price:    30000,
        item:     'infernalOrb',
        count:    1,
        desc:     '+150% Gold for 30 min (Infernum only)',
        category: 'world',
        world:    'infernum',
        minLevel: 100,
        effect:   { type: 'goldBoost', amount: 1.5, duration: 1800000 },
    },
    demonblood: {
        name:     'Demon\'s Blood',
        emoji:    '😈',
        price:    40000,
        item:     'demonBlood',
        count:    1,
        desc:     '+200% hunt win chance for 3 hunts (Infernum only)',
        category: 'world',
        world:    'infernum',
        minLevel: 115,
        effect:   { type: 'huntBoost', amount: 2.0, uses: 3 },
    },
    frostcore: {
        name:     'Frost Core',
        emoji:    '🧊',
        price:    50000,
        item:     'frostCore',
        count:    1,
        desc:     'Immune to hunger drain for 2 hours (Glacivorn only)',
        category: 'world',
        world:    'glacivorn',
        minLevel: 150,
        effect:   { type: 'hungerImmune', duration: 7200000 },
    },
    glacialshard: {
        name:     'Glacial Shard',
        emoji:    '❄️',
        price:    60000,
        item:     'glacialShard',
        count:    1,
        desc:     '+200% EXP for 30 min (Glacivorn only)',
        category: 'world',
        world:    'glacivorn',
        minLevel: 165,
        effect:   { type: 'expBoost', amount: 2.0, duration: 1800000 },
    },
};

// Category emoji map
const CATEGORY_EMOJIS = {
    general: '🛒',
    pet:     '🐾',
    role:    '⚔️',
    world:   '🌍',
};

/**
 * Get items available to a player in their current world.
 */
function getAvailableItems(player) {
    const worldKey = player.currentWorld || 'aevoria';
    return Object.entries(SHOP_ITEMS).filter(([key, item]) => {
        if (player.level < item.minLevel) return false;
        if (item.world && item.world !== worldKey) return false;
        if (item.requiredRole && player.jobRole !== item.requiredRole) return false;
        return true;
    });
}

/**
 * Get items by category for a player.
 */
function getItemsByCategory(player) {
    const available = getAvailableItems(player);
    const byCategory = {};
    for (const [key, item] of available) {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push({ key, ...item });
    }
    return byCategory;
}

module.exports = {
    SHOP_ITEMS,
    CATEGORY_EMOJIS,
    getAvailableItems,
    getItemsByCategory,
};
