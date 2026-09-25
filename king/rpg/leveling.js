/**
 * king/rpg/leveling.js
 * The RPG Brain — Malvin-XD GUD RPG
 *
 * Balanced Quadratic Growth Formula:
 *   xpForLevel(n) = floor(100 × (n-1)²)
 *
 * Total cumulative XP to reach level N:
 *   cumulativeXp(n) = sum of xpForLevel(2..n)
 */

const GROWTH = 1; // Kept for backward compatibility

/**
 * XP needed to level up INTO level n (i.e. the step cost).
 * Level 1 → 2 costs xpForLevel(2), etc.
 * @param {number} n - target level (≥ 2)
 * @returns {number}
 */
function xpForLevel(n) {
    return Math.floor(100 * Math.pow(n - 1, 2));
}

/**
 * Total cumulative XP required to reach a given level from level 1.
 * @param {number} level
 * @returns {number}
 */
function cumulativeXpForLevel(level) {
    if (level <= 1) return 0;
    let total = 0;
    for (let n = 2; n <= level; n++) {
        total += xpForLevel(n);
    }
    return total;
}

/**
 * Returns the XP bracket for a given level.
 * { min: cumulative XP at start of this level,
 *   max: cumulative XP needed to reach next level,
 *   needed: XP cost of this specific step }
 * @param {number} level
 * @returns {{ min: number, max: number, needed: number }}
 */
function xpRange(level) {
    const min    = cumulativeXpForLevel(level);
    const needed = xpForLevel(level + 1);
    const max    = min + needed;
    return { min, max, needed };
}

/**
 * Derive a player's current level from their total accumulated EXP.
 * Walks up levels until cumulative threshold exceeds totalExp.
 * @param {number} totalExp
 * @returns {number} level (≥ 1)
 */
function findLevel(totalExp) {
    if (totalExp <= 0) return 1;
    let level = 1;
    while (true) {
        const next = cumulativeXpForLevel(level + 1);
        if (totalExp < next) break;
        level++;
        // Safety cap — no one is grinding past level 1000
        if (level >= 1000) break;
    }
    return level;
}

/**
 * Check whether a player object has enough EXP to advance a level.
 * @param {{ exp: number, level: number }} player
 * @returns {boolean}
 */
function canLevelUp(player) {
    const { exp, level } = player;
    const neededTotal = cumulativeXpForLevel(level + 1);
    return exp >= neededTotal;
}

/**
 * Calculate INT-scaled EXP reward for a message.
 * Formula: floor(messageLength × 0.5 × intMultiplier)
 * INT multiplier: 1.0 + (int - 1) × 0.05  (INT 1 = 1.0×, INT 10 = 1.45×)
 * @param {number} messageLength
 * @param {number} intStat
 * @returns {number}
 */
function calcMessageExp(messageLength, intStat = 1) {
    const intMult = 1.0 + (intStat - 1) * 0.05;
    return Math.max(1, Math.floor(messageLength * 0.5 * intMult));
}

/**
 * XP progress within the current level, as a percentage (0–100).
 * Useful for the rank card progress bar.
 * @param {{ exp: number, level: number }} player
 * @returns {number} 0–100
 */
function xpProgress(player) {
    const { exp, level } = player;
    const { min, needed } = xpRange(level);
    const progress = exp - min;
    return Math.min(100, Math.floor((progress / needed) * 100));
}

module.exports = {
    GROWTH,
    xpForLevel,
    cumulativeXpForLevel,
    xpRange,
    findLevel,
    canLevelUp,
    calcMessageExp,
    xpProgress,
};
