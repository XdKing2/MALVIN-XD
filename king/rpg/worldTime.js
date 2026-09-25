/**
 * king/rpg/worldTime.js
 * Aevoria World Time Engine — Malvin-XD Sovereign RPG
 *
 * Real time  →  In-game time ratio:
 *   1 real hour   = 1 in-game day
 *   30 real days  = 1 in-game year
 *   (so 1 real day = ~12 in-game days)
 *
 * Zero per-user DB reads — world time is pure math from epoch.
 * Admin overrides stored in one shared WorldConfig document.
 */

const mongoose = require('mongoose');

// ════════════════════════════════════════════════════════════════════════════
// WORLD CONFIG SCHEMA — single document, admin controlled
// ════════════════════════════════════════════════════════════════════════════
const WorldConfigSchema = new mongoose.Schema({
    _id:            { type: String, default: 'aevoria' },
    timeMultiplier: { type: Number, default: 1      }, // 1=normal 2=fast 0=frozen
    epochOffset:    { type: Number, default: 0      }, // ms offset from admin skips
    forcedEvent:    { type: String, default: null   }, // 'bloodmoon','eclipse',null
    forcedEventEnd: { type: Date,   default: null   }, // when forced event expires
    worldName:      { type: String, default: 'Aevoria' },
    updatedAt:      { type: Date,   default: Date.now },
}, { _id: false });

const WorldConfig = mongoose.models.WorldConfig
    || mongoose.model('WorldConfig', WorldConfigSchema);

// ════════════════════════════════════════════════════════════════════════════
// CACHE — refresh every 5 minutes
// ════════════════════════════════════════════════════════════════════════════
let _configCache   = null;
let _cacheExpiry   = 0;
const CACHE_TTL    = 5 * 60 * 1000;

async function getWorldConfig() {
    if (_configCache && Date.now() < _cacheExpiry) return _configCache;
    let cfg = await WorldConfig.findById('aevoria');
    if (!cfg) {
        cfg = await WorldConfig.create({ _id: 'aevoria' });
    }
    _configCache  = cfg;
    _cacheExpiry  = Date.now() + CACHE_TTL;
    return cfg;
}

function invalidateCache() {
    _configCache = null;
    _cacheExpiry = 0;
}

// ════════════════════════════════════════════════════════════════════════════
// WORLD CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

// Fixed world epoch — when Aevoria time began (Jan 1 2024 00:00:00 UTC)
const WORLD_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();

// Time ratios
const REAL_MS_PER_INGAME_DAY  = 60 * 60 * 1000;          // 1 real hour = 1 in-game day
const INGAME_DAYS_PER_YEAR    = 360;                       // 12 months × 30 days
const REAL_MS_PER_INGAME_YEAR = REAL_MS_PER_INGAME_DAY * INGAME_DAYS_PER_YEAR; // 15 real days

// Aevoria calendar
const MONTHS = [
    { name: 'Frostmend',   emoji: '❄️',  season: 'Winter' },
    { name: 'Ashbloom',    emoji: '🌸',  season: 'Spring' },
    { name: 'Verdance',    emoji: '🌿',  season: 'Spring' },
    { name: 'Goldrise',    emoji: '☀️',  season: 'Summer' },
    { name: 'Blazemoon',   emoji: '🔥',  season: 'Summer' },
    { name: 'Embertide',   emoji: '🌾',  season: 'Summer' },
    { name: 'Harvestfall', emoji: '🍂',  season: 'Autumn' },
    { name: 'Duskmantle',  emoji: '🌫️', season: 'Autumn' },
    { name: 'Crimsontide', emoji: '🩸',  season: 'Autumn' },
    { name: 'Shadowveil',  emoji: '🌑',  season: 'Winter' },
    { name: 'Glaciorn',    emoji: '🌨️', season: 'Winter' },
    { name: 'Bloodmend',   emoji: '❄️',  season: 'Winter' },
];

const DAYS_OF_WEEK = [
    'Sundering', 'Moonwatch', 'Ironforge', 'Voidtide',
    'Ashmark', 'Dawnbreak', 'Starfall',
];

const SEASON_EMOJIS = {
    Winter: '❄️',
    Spring: '🌸',
    Summer: '☀️',
    Autumn: '🍂',
};

const TIME_OF_DAY = [
    { name: 'Deep Night', emoji: '🌑', hours: [0, 1, 2, 3]          },
    { name: 'Dawn',       emoji: '🌅', hours: [4, 5, 6]             },
    { name: 'Morning',    emoji: '🌤️', hours: [7, 8, 9, 10]        },
    { name: 'Midday',     emoji: '☀️', hours: [11, 12, 13]          },
    { name: 'Afternoon',  emoji: '🌞', hours: [14, 15, 16]          },
    { name: 'Dusk',       emoji: '🌆', hours: [17, 18, 19]          },
    { name: 'Night',      emoji: '🌙', hours: [20, 21, 22, 23]      },
];

// Bloodmoon: every 45 in-game days, lasts 3 in-game days
const BLOODMOON_CYCLE = 45;
const BLOODMOON_DURATION = 3;

// ════════════════════════════════════════════════════════════════════════════
// CORE ENGINE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get current Aevoria world time.
 * Returns a rich object with all time components.
 */
async function getWorldTime() {
    const cfg = await getWorldConfig();

    // Frozen world — return last calculated time
    if (cfg.timeMultiplier === 0) {
        return _buildTimeObject(cfg.epochOffset, cfg);
    }

    const realElapsed = (Date.now() - WORLD_EPOCH) * cfg.timeMultiplier + cfg.epochOffset;
    return _buildTimeObject(realElapsed, cfg);
}

/**
 * Build world time object from elapsed in-game milliseconds.
 */
function _buildTimeObject(realElapsedMs, cfg) {
    // Total in-game days elapsed
    const totalIngameDays = Math.floor(realElapsedMs / REAL_MS_PER_INGAME_DAY);

    // In-game time of day (0-23 based on partial day)
    const partialDay       = (realElapsedMs % REAL_MS_PER_INGAME_DAY) / REAL_MS_PER_INGAME_DAY;
    const ingameHour       = Math.floor(partialDay * 24);
    const ingameMinute     = Math.floor((partialDay * 24 * 60) % 60);

    // Calendar
    const dayOfYear        = totalIngameDays % INGAME_DAYS_PER_YEAR;
    const monthIndex       = Math.floor(dayOfYear / 30);
    const dayOfMonth       = (dayOfYear % 30) + 1;
    const dayOfWeek        = totalIngameDays % 7;
    const year             = Math.floor(totalIngameDays / INGAME_DAYS_PER_YEAR) + 1;

    const month            = MONTHS[Math.min(monthIndex, 11)];
    const season           = month.season;
    const weekday          = DAYS_OF_WEEK[dayOfWeek];

    // Time of day
    const timeOfDay = TIME_OF_DAY.find(t => t.hours.includes(ingameHour)) || TIME_OF_DAY[0];

    // Bloodmoon check
    const dayInCycle       = totalIngameDays % BLOODMOON_CYCLE;
    const isBloodmoon      = (cfg.forcedEvent === 'bloodmoon') ||
                             (dayInCycle >= BLOODMOON_CYCLE - BLOODMOON_DURATION);
    const isEclipse        = cfg.forcedEvent === 'eclipse';

    // Active event
    let activeEvent = null;
    if (isBloodmoon)  activeEvent = { name: 'Blood Moon',  emoji: '🌕', type: 'bloodmoon' };
    if (isEclipse)    activeEvent = { name: 'Solar Eclipse', emoji: '🌑', type: 'eclipse'  };

    return {
        // World identity
        worldName:    cfg.worldName || 'Aevoria',

        // Year / date
        year,
        month:        month.name,
        monthEmoji:   month.emoji,
        monthIndex:   monthIndex + 1,
        dayOfMonth,
        weekday,
        season,
        seasonEmoji:  SEASON_EMOJIS[season],

        // Time of day
        hour:         ingameHour,
        minute:       ingameMinute,
        timeOfDay:    timeOfDay.name,
        timeEmoji:    timeOfDay.emoji,

        // Events
        isBloodmoon,
        isEclipse,
        activeEvent,
        isNight:      ['Night', 'Deep Night'].includes(timeOfDay.name),
        isDawn:       timeOfDay.name === 'Dawn',

        // Admin config
        timeMultiplier: cfg.timeMultiplier,
        forcedEvent:    cfg.forcedEvent,

        // Raw
        totalIngameDays,
        ingameHour,
    };
}

// ════════════════════════════════════════════════════════════════════════════
// PLAYER AGE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calculate player's in-game age from their birth year.
 * Immortal players stop aging after year 1000.
 */
async function getPlayerAge(player) {
    if (!player.birthYear) return null;
    const wt = await getWorldTime();
    if (player.immortal) {
        // Immortals age normally until year 1000 then stop
        return Math.min(wt.year - player.birthYear, 1000);
    }
    return Math.max(0, wt.year - player.birthYear);
}

// ════════════════════════════════════════════════════════════════════════════
// GAMEPLAY EFFECT MODIFIERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get gameplay modifiers based on current world time.
 * Used by hunt, gather, survival etc.
 */
async function getWorldModifiers() {
    const wt = await getWorldTime();
    const mods = {
        expMultiplier:    1.0,
        goldMultiplier:   1.0,
        dropRateBonus:    0,
        hungerDrainBoost: 0,
        enemyPowerBoost:  0,
        harvestBonus:     0,
        description:      [],
    };

    // Night — harder enemies, better drops
    if (wt.isNight) {
        mods.expMultiplier    += 0.2;
        mods.dropRateBonus    += 15;
        mods.enemyPowerBoost  += 10;
        mods.description.push('🌙 Night: +20% EXP, +15% drop rate, stronger enemies');
    }

    // Dawn — small bonus
    if (wt.isDawn) {
        mods.expMultiplier  += 0.1;
        mods.goldMultiplier += 0.1;
        mods.description.push('🌅 Dawn: +10% EXP & Gold');
    }

    // Season effects
    if (wt.season === 'Winter') {
        mods.hungerDrainBoost += 25;
        mods.enemyPowerBoost  += 5;
        mods.description.push('❄️ Winter: hunger drains 25% faster, enemies tougher');
    }
    if (wt.season === 'Summer') {
        mods.harvestBonus     += 20;
        mods.goldMultiplier   += 0.1;
        mods.description.push('☀️ Summer: +20% harvest yield, +10% Gold');
    }
    if (wt.season === 'Spring') {
        mods.expMultiplier    += 0.1;
        mods.harvestBonus     += 10;
        mods.description.push('🌸 Spring: +10% EXP & harvest');
    }

    // Bloodmoon — massive boost but dangerous
    if (wt.isBloodmoon) {
        mods.expMultiplier    += 0.5;
        mods.dropRateBonus    += 30;
        mods.enemyPowerBoost  += 30;
        mods.goldMultiplier   += 0.3;
        mods.description.push('🌕 Blood Moon: +50% EXP, +30% drops, +30% Gold — enemies are LETHAL');
    }

    // Eclipse
    if (wt.isEclipse) {
        mods.expMultiplier    += 0.3;
        mods.dropRateBonus    += 20;
        mods.description.push('🌑 Eclipse: +30% EXP, +20% drops');
    }

    return { ...mods, worldTime: wt };
}

// ════════════════════════════════════════════════════════════════════════════
// FORMATTED OUTPUT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Format world time for display in commands.
 */
async function formatWorldTime() {
    const wt = await getWorldTime();
    const hourStr   = String(wt.hour).padStart(2, '0');
    const minStr    = String(wt.minute).padStart(2, '0');

    let lines = [
        `  🌍 World: *${wt.worldName}*`,
        `  ───────`,
        `  ${wt.timeEmoji} Time: *${wt.timeOfDay}*  ${hourStr}:${minStr}`,
        `  ${wt.seasonEmoji} Season: *${wt.season}*`,
        `  ${wt.monthEmoji} Month: *${wt.month}*`,
        `  📅 Day: *${wt.dayOfMonth}${ordinal(wt.dayOfMonth)} ${wt.weekday}*`,
        `  🗓️ Year: *${wt.year} AE*`,
    ];

    if (wt.activeEvent) {
        lines.push(`  ───────`);
        lines.push(`  ${wt.activeEvent.emoji} *${wt.activeEvent.name} is active!*`);
    }

    return lines;
}

function ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

// ════════════════════════════════════════════════════════════════════════════
// ADMIN CONTROLS
// ════════════════════════════════════════════════════════════════════════════

async function setTimeMultiplier(multiplier) {
    await WorldConfig.findByIdAndUpdate('aevoria',
        { timeMultiplier: multiplier, updatedAt: new Date() },
        { upsert: true }
    );
    invalidateCache();
}

async function addEpochOffset(realMs) {
    const cfg = await getWorldConfig();
    await WorldConfig.findByIdAndUpdate('aevoria',
        { epochOffset: (cfg.epochOffset || 0) + realMs, updatedAt: new Date() },
        { upsert: true }
    );
    invalidateCache();
}

async function forceEvent(eventName, durationHours = 3) {
    const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    await WorldConfig.findByIdAndUpdate('aevoria',
        { forcedEvent: eventName, forcedEventEnd: endTime, updatedAt: new Date() },
        { upsert: true }
    );
    invalidateCache();
    // Auto-clear after duration
    setTimeout(async () => {
        await WorldConfig.findByIdAndUpdate('aevoria',
            { forcedEvent: null, forcedEventEnd: null }
        );
        invalidateCache();
    }, durationHours * 60 * 60 * 1000);
}

async function clearForcedEvent() {
    await WorldConfig.findByIdAndUpdate('aevoria',
        { forcedEvent: null, forcedEventEnd: null, updatedAt: new Date() },
        { upsert: true }
    );
    invalidateCache();
}

async function skipToSeason(seasonName) {
    const cfg  = await getWorldConfig();
    const wt   = await getWorldTime();
    const targetMonthIndex = MONTHS.findIndex(m => m.season.toLowerCase() === seasonName.toLowerCase());
    if (targetMonthIndex === -1) throw new Error(`Unknown season: ${seasonName}`);
    const targetDayOfYear  = targetMonthIndex * 30;
    const currentDayOfYear = wt.totalIngameDays % INGAME_DAYS_PER_YEAR;
    const daysToSkip       = (targetDayOfYear - currentDayOfYear + INGAME_DAYS_PER_YEAR) % INGAME_DAYS_PER_YEAR;
    const realMsToSkip     = daysToSkip * REAL_MS_PER_INGAME_DAY;
    await addEpochOffset(realMsToSkip);
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════
module.exports = {
    getWorldTime,
    getPlayerAge,
    getWorldModifiers,
    formatWorldTime,
    setTimeMultiplier,
    addEpochOffset,
    forceEvent,
    clearForcedEvent,
    skipToSeason,
    getWorldConfig,
    WorldConfig,
    MONTHS,
    DAYS_OF_WEEK,
    SEASON_EMOJIS,
    TIME_OF_DAY,
};

/**
 * Call this when a player earns rewards during a bloodmoon.
 * Tracks progress toward Moonborn special role.
 */
async function trackBloodmoon(senderJid) {
    try {
        const wt = await getWorldTime();
        if (!wt.isBloodmoon) return;
        const { GlobalPlayer } = require('./model');
        await GlobalPlayer.findOneAndUpdate(
            { jid: senderJid },
            { $inc: { bloodmoonsSeen: 1 } }
        );
    } catch (e) {}
}

module.exports.trackBloodmoon = trackBloodmoon;
