/**
 * king/rpg/achievements.js
 * Achievement System — Malvin-XD Sovereign RPG
 *
 * Tiers: Bronze 🥉 → Silver 🥈 → Gold 🥇 → Platinum 💎 → Legend 👑
 * Each achievement has points — total points = achievement rank
 */

const ACHIEVEMENTS = {
    // ── Combat ────────────────────────────────────────────────────────────
    first_blood: {
        id: 'first_blood', name: 'First Blood',
        desc: 'Win your first hunt', emoji: '🩸',
        tier: 'bronze', points: 10,
        reward: { gold: 500, title: 'Hunter' },
    },
    kill_10: {
        id: 'kill_10', name: 'Slayer',
        desc: 'Defeat 10 enemies', emoji: '⚔️',
        tier: 'bronze', points: 15,
        reward: { gold: 1000 },
    },
    kill_50: {
        id: 'kill_50', name: 'Veteran Slayer',
        desc: 'Defeat 50 enemies', emoji: '⚔️',
        tier: 'silver', points: 30,
        reward: { gold: 3000, title: 'Veteran' },
    },
    kill_100: {
        id: 'kill_100', name: 'Century Slayer',
        desc: 'Defeat 100 enemies', emoji: '💀',
        tier: 'silver', points: 50,
        reward: { gold: 5000, diamonds: 3 },
    },
    kill_500: {
        id: 'kill_500', name: 'Mass Destroyer',
        desc: 'Defeat 500 enemies', emoji: '⚔️',
        tier: 'gold', points: 100,
        reward: { gold: 20000, diamonds: 10, title: 'Destroyer' },
    },
    kill_1000: {
        id: 'kill_1000', name: 'Warlord',
        desc: 'Defeat 1,000 enemies', emoji: '🗡️',
        tier: 'platinum', points: 200,
        reward: { gold: 50000, diamonds: 25, title: 'Warlord' },
    },
    first_boss: {
        id: 'first_boss', name: 'Boss Slayer',
        desc: 'Defeat your first boss', emoji: '👹',
        tier: 'silver', points: 40,
        reward: { gold: 3000, diamonds: 2 },
    },
    boss_10: {
        id: 'boss_10', name: 'Boss Crusher',
        desc: 'Defeat 10 bosses', emoji: '👹',
        tier: 'gold', points: 80,
        reward: { gold: 15000, diamonds: 8 },
    },
    boss_50: {
        id: 'boss_50', name: 'Boss Hunter Supreme',
        desc: 'Defeat 50 bosses', emoji: '💀',
        tier: 'platinum', points: 150,
        reward: { gold: 75000, diamonds: 40, title: 'Boss Hunter' },
    },
    first_duel_win: {
        id: 'first_duel_win', name: 'Duelist',
        desc: 'Win your first duel', emoji: '⚔️',
        tier: 'bronze', points: 20,
        reward: { gold: 1500, title: 'Duelist' },
    },
    duel_25: {
        id: 'duel_25', name: 'Arena Champion',
        desc: 'Win 25 duels', emoji: '🏆',
        tier: 'gold', points: 100,
        reward: { gold: 25000, diamonds: 15, title: 'Champion' },
    },

    // ── Progression ───────────────────────────────────────────────────────
    level_10: {
        id: 'level_10', name: 'Rising Hunter',
        desc: 'Reach Level 10', emoji: '⭐',
        tier: 'bronze', points: 20,
        reward: { gold: 2000, diamonds: 2 },
    },
    level_25: {
        id: 'level_25', name: 'Veteran Hunter',
        desc: 'Reach Level 25', emoji: '🌟',
        tier: 'silver', points: 40,
        reward: { gold: 5000, diamonds: 5 },
    },
    level_50: {
        id: 'level_50', name: 'Elite Hunter',
        desc: 'Reach Level 50', emoji: '💫',
        tier: 'gold', points: 80,
        reward: { gold: 10000, diamonds: 10, title: 'Elite' },
    },
    level_100: {
        id: 'level_100', name: 'Legendary Hunter',
        desc: 'Reach Level 100', emoji: '👑',
        tier: 'platinum', points: 200,
        reward: { gold: 25000, diamonds: 25, title: 'Legend' },
    },
    level_200: {
        id: 'level_200', name: 'Sovereign',
        desc: 'Reach Level 200', emoji: '🔱',
        tier: 'legend', points: 500,
        reward: { gold: 100000, diamonds: 100, title: 'Sovereign' },
    },
    first_rebirth: {
        id: 'first_rebirth', name: 'Reborn',
        desc: 'Complete your first rebirth', emoji: '🔄',
        tier: 'gold', points: 100,
        reward: { gold: 10000, diamonds: 10, title: 'Reborn' },
    },
    rebirth_5: {
        id: 'rebirth_5', name: 'Immortal Aspirant',
        desc: 'Rebirth 5 times', emoji: '♾️',
        tier: 'legend', points: 500,
        reward: { gold: 50000, diamonds: 50, title: 'Undying' },
    },

    // ── Gathering ─────────────────────────────────────────────────────────
    gather_50: {
        id: 'gather_50', name: 'Gatherer',
        desc: 'Gather resources 50 times', emoji: '🌾',
        tier: 'bronze', points: 20,
        reward: { gold: 2000 },
    },
    gather_200: {
        id: 'gather_200', name: 'Master Gatherer',
        desc: 'Gather resources 200 times', emoji: '🌿',
        tier: 'silver', points: 50,
        reward: { gold: 8000, title: 'Forager' },
    },

    // ── Economy ───────────────────────────────────────────────────────────
    gold_10k: {
        id: 'gold_10k', name: 'Wealthy',
        desc: 'Accumulate 10,000 Gold', emoji: '💰',
        tier: 'bronze', points: 20,
        reward: { gold: 1000 },
    },
    gold_100k: {
        id: 'gold_100k', name: 'Rich Hunter',
        desc: 'Accumulate 100,000 Gold', emoji: '💎',
        tier: 'silver', points: 50,
        reward: { gold: 5000, title: 'Wealthy' },
    },
    gold_1m: {
        id: 'gold_1m', name: 'Millionaire',
        desc: 'Accumulate 1,000,000 Gold', emoji: '💰',
        tier: 'gold', points: 150,
        reward: { gold: 50000, diamonds: 20, title: 'Millionaire' },
    },

    // ── World ─────────────────────────────────────────────────────────────
    enter_voidmere: {
        id: 'enter_voidmere', name: 'Void Walker',
        desc: 'Enter Voidmere for the first time', emoji: '🌑',
        tier: 'silver', points: 40,
        reward: { gold: 10000, diamonds: 5 },
    },
    enter_infernum: {
        id: 'enter_infernum', name: 'Fire Born',
        desc: 'Enter Infernum for the first time', emoji: '🔥',
        tier: 'gold', points: 80,
        reward: { gold: 25000, diamonds: 10 },
    },
    enter_glacivorn: {
        id: 'enter_glacivorn', name: 'Frost Walker',
        desc: 'Enter Glacivorn for the first time', emoji: '❄️',
        tier: 'platinum', points: 150,
        reward: { gold: 50000, diamonds: 20 },
    },
    survive_bloodmoon: {
        id: 'survive_bloodmoon', name: 'Child of the Moon',
        desc: 'Hunt during a Blood Moon', emoji: '🌕',
        tier: 'silver', points: 50,
        reward: { gold: 5000 },
    },
    bloodmoon_10: {
        id: 'bloodmoon_10', name: 'Moonborn',
        desc: 'Hunt during 10 Blood Moons', emoji: '🌕',
        tier: 'gold', points: 100,
        reward: { gold: 30000, diamonds: 15 },
    },

    // ── Pets ──────────────────────────────────────────────────────────────
    first_pet: {
        id: 'first_pet', name: 'Pet Tamer',
        desc: 'Find your first pet', emoji: '🐾',
        tier: 'bronze', points: 20,
        reward: { gold: 1000 },
    },
    rare_pet: {
        id: 'rare_pet', name: 'Rare Tamer',
        desc: 'Find a Rare pet', emoji: '🟦',
        tier: 'silver', points: 50,
        reward: { gold: 10000, diamonds: 5 },
    },
    legendary_pet: {
        id: 'legendary_pet', name: 'Legend Tamer',
        desc: 'Find a Legendary pet', emoji: '🟨',
        tier: 'gold', points: 150,
        reward: { gold: 50000, diamonds: 20, title: 'Beast Master' },
    },

    // ── Social ────────────────────────────────────────────────────────────
    join_guild: {
        id: 'join_guild', name: 'Brotherhood',
        desc: 'Join or create a guild', emoji: '🏰',
        tier: 'bronze', points: 15,
        reward: { gold: 2000 },
    },
    guild_master: {
        id: 'guild_master', name: 'Guild Master',
        desc: 'Become a guild master', emoji: '👑',
        tier: 'silver', points: 50,
        reward: { gold: 10000, title: 'Guild Master' },
    },
    get_married: {
        id: 'get_married', name: 'Bonded',
        desc: 'Get married', emoji: '💒',
        tier: 'bronze', points: 15,
        reward: { gold: 1000 },
    },

    // ── Roleplay ──────────────────────────────────────────────────────────
    choose_role: {
        id: 'choose_role', name: 'Finding My Path',
        desc: 'Choose your job role', emoji: '🎭',
        tier: 'bronze', points: 15,
        reward: { gold: 1000 },
    },
    special_role: {
        id: 'special_role', name: 'Beyond Limits',
        desc: 'Unlock a special role', emoji: '👁️',
        tier: 'platinum', points: 200,
        reward: { gold: 30000, diamonds: 30 },
    },

    // ── Dungeons ──────────────────────────────────────────────────────────
    first_dungeon: {
        id: 'first_dungeon', name: 'Dungeon Explorer',
        desc: 'Clear your first dungeon', emoji: '🏰',
        tier: 'bronze', points: 20,
        reward: { gold: 2500, diamonds: 2 },
    },
    dungeon_10: {
        id: 'dungeon_10', name: 'Dungeon Master',
        desc: 'Clear 10 dungeons', emoji: '🏰',
        tier: 'silver', points: 60,
        reward: { gold: 15000, diamonds: 8 },
    },
    dungeon_50: {
        id: 'dungeon_50', name: 'Void Walker Aspirant',
        desc: 'Clear 50 dungeons', emoji: '🌀',
        tier: 'gold', points: 120,
        reward: { gold: 40000, diamonds: 20, title: 'Void Seeker' },
    },

    // ── Misc ──────────────────────────────────────────────────────────────
    first_steps: {
        id: 'first_steps', name: 'First Steps',
        desc: 'Register as a hunter', emoji: '👤',
        tier: 'bronze', points: 5,
        reward: { gold: 500 },
    },
    daily_7: {
        id: 'daily_7', name: 'Dedicated',
        desc: 'Claim daily reward 7 days in a row', emoji: '📅',
        tier: 'bronze', points: 20,
        reward: { gold: 3000, diamonds: 2 },
    },
    daily_30: {
        id: 'daily_30', name: 'Loyal Hunter',
        desc: 'Claim daily reward 30 days in a row', emoji: '📅',
        tier: 'silver', points: 60,
        reward: { gold: 15000, diamonds: 10, title: 'Loyal' },
    },
};

// ── Tier definitions ──────────────────────────────────────────────────────────
const TIERS = {
    bronze:   { emoji: '🥉', label: 'Bronze',   minPoints: 0    },
    silver:   { emoji: '🥈', label: 'Silver',   minPoints: 100  },
    gold:     { emoji: '🥇', label: 'Gold',     minPoints: 300  },
    platinum: { emoji: '💎', label: 'Platinum', minPoints: 700  },
    legend:   { emoji: '👑', label: 'Legend',   minPoints: 1500 },
};

// ── Achievement rank based on total points ─────────────────────────────────────
function getAchievementRank(totalPoints) {
    const tiers = Object.entries(TIERS).reverse();
    for (const [key, tier] of tiers) {
        if (totalPoints >= tier.minPoints) return { key, ...tier };
    }
    return { key: 'bronze', ...TIERS.bronze };
}

// ── Get achievement def ───────────────────────────────────────────────────────
function getAchievement(id) {
    return ACHIEVEMENTS[id] || null;
}

// ── Check which new achievements a player has earned ─────────────────────────
function checkNewAchievements(player, earnedIds = []) {
    const newlyEarned = [];

    for (const [id, achv] of Object.entries(ACHIEVEMENTS)) {
        if (earnedIds.includes(id)) continue;

        let earned = false;
        const kills  = player.combat?.kills || 0;
        const boss   = player.combat?.bossKills || 0;
        const dungeon= player.combat?.dungeonClears || 0;

        switch (id) {
            case 'first_blood':      earned = kills >= 1; break;
            case 'kill_10':          earned = kills >= 10; break;
            case 'kill_50':          earned = kills >= 50; break;
            case 'kill_100':         earned = kills >= 100; break;
            case 'kill_500':         earned = kills >= 500; break;
            case 'kill_1000':        earned = kills >= 1000; break;
            case 'first_boss':       earned = boss >= 1; break;
            case 'boss_10':          earned = boss >= 10; break;
            case 'boss_50':          earned = boss >= 50; break;
            case 'first_duel_win':   earned = (player.quests?.stats?.duelsWon || 0) >= 1; break;
            case 'duel_25':          earned = (player.quests?.stats?.duelsWon || 0) >= 25; break;
            case 'level_10':         earned = player.level >= 10; break;
            case 'level_25':         earned = player.level >= 25; break;
            case 'level_50':         earned = player.level >= 50; break;
            case 'level_100':        earned = player.level >= 100; break;
            case 'level_200':        earned = player.level >= 200; break;
            case 'first_rebirth':    earned = (player.rebirths || 0) >= 1; break;
            case 'rebirth_5':        earned = (player.rebirths || 0) >= 5; break;
            case 'gather_50':        earned = (player.quests?.stats?.gathered || 0) >= 50; break;
            case 'gather_200':       earned = (player.quests?.stats?.gathered || 0) >= 200; break;
            case 'gold_10k':         earned = player.gold >= 10000; break;
            case 'gold_100k':        earned = player.gold >= 100000; break;
            case 'gold_1m':          earned = player.gold >= 1000000; break;
            case 'enter_voidmere':   earned = (player.currentWorld === 'voidmere') || (player.worldQuestsComplete || []).some(q => q.startsWith('wq_void')); break;
            case 'enter_infernum':   earned = (player.currentWorld === 'infernum') || (player.worldQuestsComplete || []).some(q => q.startsWith('wq_inf')); break;
            case 'enter_glacivorn':  earned = (player.currentWorld === 'glacivorn') || (player.worldQuestsComplete || []).some(q => q.startsWith('wq_glac')); break;
            case 'survive_bloodmoon':earned = (player.bloodmoonsSeen || 0) >= 1; break;
            case 'bloodmoon_10':     earned = (player.bloodmoonsSeen || 0) >= 10; break;
            case 'first_pet':        earned = (player.pets || []).length >= 1; break;
            case 'rare_pet':         earned = (player.pets || []).some(p => { try { return require('./pets').PET_SPECIES[p.species]?.rarity === 'Rare'; } catch(e) { return false; }}); break;
            case 'legendary_pet':    earned = (player.pets || []).some(p => { try { return require('./pets').PET_SPECIES[p.species]?.rarity === 'Legendary'; } catch(e) { return false; }}); break;
            case 'join_guild':       earned = !!player.guild?.guildId; break;
            case 'guild_master':     earned = player.guild?.role === 'master'; break;
            case 'get_married':      earned = !!player.marriage?.partnerId; break;
            case 'choose_role':      earned = !!player.jobRole; break;
            case 'special_role':     earned = !!player.specialRole; break;
            case 'first_dungeon':    earned = dungeon >= 1; break;
            case 'dungeon_10':       earned = dungeon >= 10; break;
            case 'dungeon_50':       earned = dungeon >= 50; break;
            case 'first_steps':      earned = !!player.registered; break;
            case 'daily_7':          earned = (player.dailyStreak || 0) >= 7; break;
            case 'daily_30':         earned = (player.dailyStreak || 0) >= 30; break;
        }

        if (earned) newlyEarned.push(achv);
    }
    return newlyEarned;
}

// ── Calculate total achievement points ───────────────────────────────────────
function getTotalPoints(earnedIds = []) {
    return earnedIds.reduce((sum, id) => {
        const achv = ACHIEVEMENTS[id];
        return sum + (achv?.points || 0);
    }, 0);
}

module.exports = {
    ACHIEVEMENTS,
    TIERS,
    getAchievementRank,
    getAchievement,
    checkNewAchievements,
    getTotalPoints,
};
