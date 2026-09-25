/**
 * king/rpg/pets.js
 * Aevoria Pet System — Malvin-XD Sovereign RPG
 */

// ════════════════════════════════════════════════════════════════════════════
// PET SPECIES — grouped by rarity
// ════════════════════════════════════════════════════════════════════════════
const PET_SPECIES = {
    // ── Common — found anywhere ───────────────────────────────────────────
    wolfpup: {
        name: 'Wolf Pup', emoji: '🐺', rarity: 'Common',
        foundIn: ['hunt', 'explore'],
        condition: null,
        passives: { huntWinBonus: 0.05, expBonus: 0.05 },
        description: 'A loyal wolf pup. Fights by your side in hunts.',
    },
    forestcat: {
        name: 'Forest Cat', emoji: '🐱', rarity: 'Common',
        foundIn: ['gather', 'explore'],
        condition: null,
        passives: { gatherBonus: 0.10, goldBonus: 0.05 },
        description: 'Sneaky and quick. Sniffs out extra loot.',
    },
    stonecrab: {
        name: 'Stone Crab', emoji: '🦀', rarity: 'Common',
        foundIn: ['gather'],
        condition: null,
        passives: { gatherBonus: 0.08, defBonus: 0.05 },
        description: 'Hard shell, hidden gold. Great for mining trips.',
    },
    sparrowling: {
        name: 'Sparrowling', emoji: '🐦', rarity: 'Common',
        foundIn: ['explore', 'gather'],
        condition: null,
        passives: { expBonus: 0.08, cooldownReduce: 0.05 },
        description: 'A tiny scout bird. Helps you find shortcuts.',
    },

    // ── Uncommon — specific activities ───────────────────────────────────
    shadowfox: {
        name: 'Shadow Fox', emoji: '🦊', rarity: 'Uncommon',
        foundIn: ['hunt'],
        condition: { timeOfDay: 'Night' },
        passives: { dropRateBonus: 0.15, duelWinBonus: 0.05 },
        description: 'Only appears at night. Masters of deception.',
    },
    ironbear: {
        name: 'Iron Bear', emoji: '🐻', rarity: 'Uncommon',
        foundIn: ['hunt', 'explore'],
        condition: { season: 'Winter' },
        passives: { bossDefBonus: 0.15, huntWinBonus: 0.08 },
        description: 'Thrives in winter. Tanky and ferocious.',
    },
    goldenfish: {
        name: 'Golden Fish', emoji: '🐟', rarity: 'Uncommon',
        foundIn: ['gather'],
        condition: { activity: 'fish' },
        passives: { goldBonus: 0.15, gatherBonus: 0.10 },
        description: 'A legendary catch. Brings incredible fortune.',
    },
    thornwolf: {
        name: 'Thorn Wolf', emoji: '🐉', rarity: 'Uncommon',
        foundIn: ['explore'],
        condition: { season: 'Autumn' },
        passives: { huntWinBonus: 0.12, expBonus: 0.10 },
        description: 'Born in the dying forest. Fierce and loyal.',
    },

    // ── Rare — special conditions ─────────────────────────────────────────
    moonwolf: {
        name: 'Moon Wolf', emoji: '🌕', rarity: 'Rare',
        foundIn: ['hunt'],
        condition: { event: 'bloodmoon' },
        passives: { huntWinBonus: 0.20, expBonus: 0.20, dropRateBonus: 0.15 },
        description: 'Born under the blood moon. Extraordinarily powerful.',
    },
    voidsprite: {
        name: 'Void Sprite', emoji: '✨', rarity: 'Rare',
        foundIn: ['explore'],
        condition: { minLevel: 50 },
        passives: { expBonus: 0.25, cooldownReduce: 0.15 },
        description: 'A fragment of the void. Accelerates your growth.',
    },
    frostdrake: {
        name: 'Frost Drake', emoji: '🧊', rarity: 'Rare',
        foundIn: ['hunt', 'explore'],
        condition: { season: 'Winter', timeOfDay: 'Night' },
        passives: { bossDefBonus: 0.25, gatherBonus: 0.15 },
        description: 'A miniature ice dragon. Found only in winter nights.',
    },
    ashphoenix: {
        name: 'Ash Phoenix', emoji: '🔥', rarity: 'Rare',
        foundIn: ['explore'],
        condition: { season: 'Summer', minLevel: 30 },
        passives: { expBonus: 0.25, goldBonus: 0.20, huntWinBonus: 0.10 },
        description: 'Reborn from summer flames. Symbol of power.',
    },

    // ── Legendary — near impossible ───────────────────────────────────────
    celestialdragon: {
        name: 'Celestial Dragon', emoji: '🐲', rarity: 'Legendary',
        foundIn: ['explore'],
        condition: { event: 'bloodmoon', minLevel: 100 },
        passives: {
            expBonus: 0.50, goldBonus: 0.40,
            huntWinBonus: 0.25, dropRateBonus: 0.30,
            allStatBonus: 5,
        },
        description: 'The rarest creature in Aevoria. A true legend.',
    },
    shadowleviathan: {
        name: 'Shadow Leviathan', emoji: '🌑', rarity: 'Legendary',
        foundIn: ['hunt'],
        condition: { event: 'bloodmoon', minLevel: 150 },
        passives: {
            expBonus: 0.40, duelWinBonus: 0.35,
            huntWinBonus: 0.30, bossDefBonus: 0.40,
        },
        description: 'A beast born of pure shadow. Feared across all realms.',
    },
};

// ── Rarity drop chances (base, boosted by LUK) ───────────────────────────────
const RARITY_CHANCES = {
    Common:    0.08,   // 8%
    Uncommon:  0.03,   // 3%
    Rare:      0.008,  // 0.8%
    Legendary: 0.001,  // 0.1%
};

const RARITY_EMOJIS = {
    Common:    '⬜',
    Uncommon:  '🟩',
    Rare:      '🟦',
    Legendary: '🟨',
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Try to find a pet during an activity.
 * Returns pet species key or null.
 */
async function tryFindPet(player, activity, worldTime) {
    const lukBonus = (player.stats?.luk || 1) * 0.002; // LUK boosts find chance

    // Get eligible species for this activity/condition
    const eligible = Object.entries(PET_SPECIES).filter(([key, pet]) => {
        if (!pet.foundIn.includes(activity)) return false;

        const cond = pet.condition;
        if (!cond) return true;
        if (cond.event && worldTime.activeEvent?.type !== cond.event) return false;
        if (cond.season && worldTime.season !== cond.season) return false;
        if (cond.timeOfDay && worldTime.timeOfDay !== cond.timeOfDay) return false;
        if (cond.minLevel && player.level < cond.minLevel) return false;
        if (cond.activity && activity !== cond.activity) return false;
        return true;
    });

    if (eligible.length === 0) return null;

    // Roll for each eligible pet by rarity
    for (const [key, pet] of eligible) {
        const chance = RARITY_CHANCES[pet.rarity] + lukBonus;
        if (Math.random() < chance) return key;
    }
    return null;
}

/**
 * Get combined pet passives for a player's active pets.
 */
function getPetPassives(pets = []) {
    const passives = {
        expBonus: 0, goldBonus: 0, gatherBonus: 0,
        dropRateBonus: 0, huntWinBonus: 0, bossDefBonus: 0,
        duelWinBonus: 0, cooldownReduce: 0, defBonus: 0,
        allStatBonus: 0,
    };

    for (const pet of pets) {
        if (!pet.active) continue;
        const species = PET_SPECIES[pet.species];
        if (!species) continue;

        // Scale passives by pet level
        const lvlMult = 1 + (pet.level - 1) * 0.05; // +5% per level
        for (const [k, v] of Object.entries(species.passives)) {
            if (k in passives) passives[k] += v * lvlMult;
        }
    }
    return passives;
}

/**
 * Format pet list for display.
 */
function formatPets(pets = []) {
    if (!pets.length) return [`  No pets yet — find them during hunts & exploration!`];
    return pets.map((p, i) => {
        const species = PET_SPECIES[p.species];
        const emoji   = species?.emoji || '🐾';
        const rEmoji  = RARITY_EMOJIS[species?.rarity] || '⬜';
        const status  = p.active ? '✅' : '💤';
        return `  ${status} ${emoji} *${p.name}* ${rEmoji} Lv.${p.level}`;
    });
}

module.exports = {
    PET_SPECIES,
    RARITY_CHANCES,
    RARITY_EMOJIS,
    tryFindPet,
    getPetPassives,
    formatPets,
};
