/**
 * king/rpg/roles.js
 * Aevoria Role System — Malvin-XD Sovereign RPG
 *
 * Two role tiers:
 *   jobRole    — chosen class (warrior, mage etc)
 *   specialRole — earned through gameplay milestones
 */

// ════════════════════════════════════════════════════════════════════════════
// JOB ROLES — chosen at registration or via .setrole
// ════════════════════════════════════════════════════════════════════════════
const JOB_ROLES = {
    warrior: {
        name:        'Warrior',
        emoji:       '⚔️',
        description: 'Tank and brawler. High damage, survives longer in combat.',
        primaryStats: ['str', 'def'],
        passives: {
            huntWinBonus:     0.15,   // +15% win chance on hunt
            bossDefBonus:     0.20,   // +20% defense vs bosses
            hungerDrainReduce: 0.10,  // -10% hunger drain
            expBonus:         0,
            goldBonus:        0,
            gatherBonus:      0,
            duelWinBonus:     0.10,
        },
        unlockReq: null,
        changeCost: 5000,
    },
    mage: {
        name:        'Mage',
        emoji:       '🔮',
        description: 'Magic wielder. Better drop rates and EXP gain.',
        primaryStats: ['int', 'luk'],
        passives: {
            expBonus:         0.20,   // +20% EXP
            dropRateBonus:    0.15,   // +15% item drops
            huntWinBonus:     0,
            bossDefBonus:     0,
            hungerDrainReduce: 0,
            goldBonus:        0,
            gatherBonus:      0,
            duelWinBonus:     0,
        },
        unlockReq: null,
        changeCost: 5000,
    },
    ranger: {
        name:        'Ranger',
        emoji:       '🏹',
        description: 'Swift hunter. Faster cooldowns and better hunt drops.',
        primaryStats: ['agi', 'luk'],
        passives: {
            cooldownReduce:   0.20,   // -20% cooldowns
            dropRateBonus:    0.10,   // +10% drops
            gatherBonus:      0.15,   // +15% gather yield
            huntWinBonus:     0.05,
            expBonus:         0,
            goldBonus:        0,
            bossDefBonus:     0,
            duelWinBonus:     0,
        },
        unlockReq: null,
        changeCost: 5000,
    },
    assassin: {
        name:        'Assassin',
        emoji:       '🗡️',
        description: 'Shadow striker. High crit, dominates PvP and duels.',
        primaryStats: ['agi', 'str'],
        passives: {
            duelWinBonus:     0.25,   // +25% duel win chance
            critChance:       0.15,   // +15% crit in hunt/duel
            goldBonus:        0.10,   // +10% gold from kills
            huntWinBonus:     0.05,
            expBonus:         0,
            bossDefBonus:     0,
            gatherBonus:      0,
            dropRateBonus:    0,
            hungerDrainReduce: 0,
        },
        unlockReq: null,
        changeCost: 5000,
    },
    knight: {
        name:        'Knight',
        emoji:       '🛡️',
        description: 'Fortress of steel. Near unkillable, best at raids and bosses.',
        primaryStats: ['vit', 'def'],
        passives: {
            bossDefBonus:     0.35,   // +35% defense vs bosses
            raidExpBonus:     0.20,   // +20% EXP from raids
            huntWinBonus:     0.10,
            hungerDrainReduce: 0.15,  // -15% hunger drain
            expBonus:         0,
            goldBonus:        0,
            gatherBonus:      0,
            duelWinBonus:     0,
            dropRateBonus:    0,
        },
        unlockReq: null,
        changeCost: 5000,
    },
    alchemist: {
        name:        'Alchemist',
        emoji:       '⚗️',
        description: 'Master gatherer. Best yields, crafting bonuses, gold generation.',
        primaryStats: ['int', 'vit'],
        passives: {
            gatherBonus:      0.30,   // +30% gather yield
            goldBonus:        0.15,   // +15% gold everywhere
            craftBonus:       0.20,   // +20% craft success rate
            expBonus:         0.05,
            huntWinBonus:     0,
            bossDefBonus:     0,
            duelWinBonus:     0,
            dropRateBonus:    0,
            hungerDrainReduce: 0,
        },
        unlockReq: null,
        changeCost: 5000,
    },
};

// ════════════════════════════════════════════════════════════════════════════
// SPECIAL ROLES — earned through gameplay, cannot be chosen
// ════════════════════════════════════════════════════════════════════════════
const SPECIAL_ROLES = {
    sovereign: {
        name:        'Sovereign',
        emoji:       '👁️',
        description: 'Commands all shadow armies. The apex of power.',
        condition:   'Reach Origin rank',
        check:       (player) => player.level >= 200,
        passives: {
            shadowSlotBonus:  10,     // +10 shadow slots
            expBonus:         0.25,
            goldBonus:        0.25,
            allStatBonus:     5,
        },
    },
    voidwalker: {
        name:        'Void Walker',
        emoji:       '🌀',
        description: 'Exists between dimensions. Dimension jump costs nothing.',
        condition:   'Complete 100 dungeons',
        check:       (player) => (player.combat?.dungeonClears || 0) >= 100,
        passives: {
            dimensionJumpFree: true,
            expBonus:          0.20,
            dropRateBonus:     0.20,
        },
    },
    deathshand: {
        name:        "Death's Hand",
        emoji:       '☠️',
        description: 'Risen from death. Cannot be one-shot in PvP.',
        condition:   'Die 50 times and rebirth at least once',
        check:       (player) => (player.combat?.deaths || 0) >= 50 && (player.rebirths || 0) >= 1,
        passives: {
            pvpImmunity:      true,   // cannot be one-shot
            expBonus:         0.15,
            chaosAlignBonus:  0.30,
        },
    },
    moonborn: {
        name:        'Moonborn',
        emoji:       '🌕',
        description: 'Child of the bloodmoon. Double bloodmoon bonuses.',
        condition:   'Be active during 10 bloodmoons',
        check:       (player) => (player.bloodmoonsSeen || 0) >= 10,
        passives: {
            bloodmoonMultiplier: 2.0, // doubles bloodmoon EXP/gold
            expBonus:            0.10,
        },
    },
    immortal_one: {
        name:        'Immortal',
        emoji:       '♾️',
        description: 'Transcends mortality. Never ages, never hungers.',
        condition:   'Prestige 5 times',
        check:       (player) => (player.rebirths || 0) >= 5,
        passives: {
            immortal:         true,   // sets immortal flag
            hungerImmune:     true,   // hunger never drains
            expBonus:         0.30,
            goldBonus:        0.20,
        },
    },
    cursedone: {
        name:        'Cursed One',
        emoji:       '💀',
        description: 'Cursed by defeat. Chaos alignment abilities doubled.',
        condition:   'Lose 100 duels',
        check:       (player) => (player.combat?.deaths || 0) >= 100,
        passives: {
            chaosAlignBonus:  0.50,
            darkRitualBonus:  0.30,
            expBonus:         0.10,
        },
    },
    monarch: {
        name:        'Monarch',
        emoji:       '🔱',
        description: 'True ruler of Aevoria. Passive gold generation each hour.',
        condition:   'Reach level 200',
        check:       (player) => player.level >= 200,
        passives: {
            passiveGoldPerHour: 500,
            goldBonus:          0.30,
            expBonus:           0.20,
            allStatBonus:       10,
        },
    },
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getJobRole(roleKey) {
    return JOB_ROLES[roleKey?.toLowerCase()] || null;
}

function getSpecialRole(roleKey) {
    return SPECIAL_ROLES[roleKey?.toLowerCase()] || null;
}

/**
 * Check all special roles and return which ones the player has earned.
 */
function checkSpecialRoles(player) {
    const earned = [];
    for (const [key, role] of Object.entries(SPECIAL_ROLES)) {
        if (role.check(player)) earned.push({ key, ...role });
    }
    return earned;
}

/**
 * Get combined passives for a player (jobRole + specialRole).
 */
function getPlayerPassives(player) {
    const passives = {
        expBonus:            0,
        goldBonus:           0,
        gatherBonus:         0,
        dropRateBonus:       0,
        huntWinBonus:        0,
        bossDefBonus:        0,
        duelWinBonus:        0,
        cooldownReduce:      0,
        hungerDrainReduce:   0,
        critChance:          0,
        raidExpBonus:        0,
        craftBonus:          0,
        allStatBonus:        0,
        shadowSlotBonus:     0,
        bloodmoonMultiplier: 1,
        immortal:            false,
        hungerImmune:        false,
        pvpImmunity:         false,
        dimensionJumpFree:   false,
        passiveGoldPerHour:  0,
    };

    // Apply job role passives
    const job = getJobRole(player.jobRole);
    if (job) {
        for (const [k, v] of Object.entries(job.passives)) {
            if (k in passives && typeof v === 'number') {
                passives[k] += v;
            } else if (k in passives) {
                passives[k] = v;
            }
        }
    }

    // Apply special role passives
    const special = getSpecialRole(player.specialRole);
    if (special) {
        for (const [k, v] of Object.entries(special.passives)) {
            if (k in passives && typeof v === 'number') {
                passives[k] += v;
            } else if (k in passives) {
                passives[k] = v;
            }
        }
    }

    return passives;
}

/**
 * Format role display for profile/commands.
 */
function formatRoles(player) {
    const job     = getJobRole(player.jobRole);
    const special = getSpecialRole(player.specialRole);

    const jobLine     = job
        ? `${job.emoji} *${job.name}*`
        : '❓ *No Role Set* — use *.setrole*';
    const specialLine = special
        ? `${special.emoji} *${special.name}*`
        : null;

    return { jobLine, specialLine };
}

module.exports = {
    JOB_ROLES,
    SPECIAL_ROLES,
    getJobRole,
    getSpecialRole,
    checkSpecialRoles,
    getPlayerPassives,
    formatRoles,
};
