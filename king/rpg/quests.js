/**
 * king/rpg/quests.js
 * Quest System Engine — Malvin-XD Sovereign RPG
 *
 * Three types:
 *   daily     — 3 per day, auto-assigned, reset every 24h
 *   story     — one-time milestones, auto-tracked
 *   challenge — hard long-term goals, big rewards
 */

// ════════════════════════════════════════════════════════════════════════════
// DAILY QUEST POOL — randomly assigned 3 per day
// ════════════════════════════════════════════════════════════════════════════
const DAILY_POOL = [
    {
        id: 'daily_hunt_3',
        title: 'Hunter\'s Call',
        desc: 'Win 3 hunts',
        emoji: '⚔️',
        type: 'daily',
        track: 'huntsWon',
        target: 3,
        reward: { gold: 500, exp: 300 },
    },
    {
        id: 'daily_hunt_5',
        title: 'Beast Slayer',
        desc: 'Win 5 hunts',
        emoji: '🗡️',
        type: 'daily',
        track: 'huntsWon',
        target: 5,
        reward: { gold: 1000, exp: 600 },
    },
    {
        id: 'daily_gather_3',
        title: 'Gatherer\'s Path',
        desc: 'Gather resources 3 times',
        emoji: '🌾',
        type: 'daily',
        track: 'gathered',
        target: 3,
        reward: { gold: 400, exp: 200 },
    },
    {
        id: 'daily_gather_5',
        title: 'Nature\'s Friend',
        desc: 'Gather resources 5 times',
        emoji: '🌿',
        type: 'daily',
        track: 'gathered',
        target: 5,
        reward: { gold: 800, exp: 400 },
    },
    {
        id: 'daily_earn_1000',
        title: 'Gold Rush',
        desc: 'Earn 1,000 Gold today',
        emoji: '💰',
        type: 'daily',
        track: 'goldEarned',
        target: 1000,
        reward: { gold: 500, exp: 200 },
    },
    {
        id: 'daily_earn_3000',
        title: 'Treasure Hunter',
        desc: 'Earn 3,000 Gold today',
        emoji: '💎',
        type: 'daily',
        track: 'goldEarned',
        target: 3000,
        reward: { gold: 1500, exp: 500 },
    },
    {
        id: 'daily_explore',
        title: 'Wanderer',
        desc: 'Explore 2 locations',
        emoji: '🗺️',
        type: 'daily',
        track: 'explored',
        target: 2,
        reward: { gold: 600, exp: 350 },
    },
    {
        id: 'daily_duel_1',
        title: 'Challenger',
        desc: 'Win a duel',
        emoji: '⚔️',
        type: 'daily',
        track: 'duelsWon',
        target: 1,
        reward: { gold: 800, exp: 500 },
    },
    {
        id: 'daily_level_up',
        title: 'Growing Stronger',
        desc: 'Gain a level',
        emoji: '⭐',
        type: 'daily',
        track: 'levelsGained',
        target: 1,
        reward: { gold: 1000, exp: 0, diamonds: 1 },
    },
    {
        id: 'daily_boss',
        title: 'Boss Hunter',
        desc: 'Defeat a boss',
        emoji: '👹',
        type: 'daily',
        track: 'bossKills',
        target: 1,
        reward: { gold: 2000, exp: 1000 },
    },
    {
        id: 'daily_dungeon',
        title: 'Dungeon Crawler',
        desc: 'Clear a dungeon',
        emoji: '🏰',
        type: 'daily',
        track: 'dungeonClears',
        target: 1,
        reward: { gold: 1500, exp: 800, diamonds: 1 },
    },
    {
        id: 'daily_survive',
        title: 'Survivor',
        desc: 'Keep hunger above 50% all day',
        emoji: '🍖',
        type: 'daily',
        track: 'fedToday',
        target: 1,
        reward: { gold: 300, exp: 150 },
    },
];

// ════════════════════════════════════════════════════════════════════════════
// STORY QUESTS — one-time milestones, auto-triggered
// ════════════════════════════════════════════════════════════════════════════
const STORY_QUESTS = [
    {
        id: 'story_first_hunt',
        title: 'First Blood',
        desc: 'Win your first hunt',
        emoji: '🩸',
        type: 'story',
        track: 'huntsWon',
        target: 1,
        reward: { gold: 500, exp: 200, title: 'Hunter' },
    },
    {
        id: 'story_first_pet',
        title: 'Pet Tamer',
        desc: 'Find your first pet',
        emoji: '🐾',
        type: 'story',
        track: 'petsFound',
        target: 1,
        reward: { gold: 1000, exp: 500 },
    },
    {
        id: 'story_level_10',
        title: 'Rising Hunter',
        desc: 'Reach Level 10',
        emoji: '⭐',
        type: 'story',
        track: 'level',
        target: 10,
        reward: { gold: 2000, exp: 0, diamonds: 3 },
    },
    {
        id: 'story_level_25',
        title: 'Veteran Hunter',
        desc: 'Reach Level 25',
        emoji: '🌟',
        type: 'story',
        track: 'level',
        target: 25,
        reward: { gold: 5000, exp: 0, diamonds: 5, title: 'Veteran' },
    },
    {
        id: 'story_level_50',
        title: 'Elite Hunter',
        desc: 'Reach Level 50',
        emoji: '💫',
        type: 'story',
        track: 'level',
        target: 50,
        reward: { gold: 10000, exp: 0, diamonds: 10, title: 'Elite' },
    },
    {
        id: 'story_level_100',
        title: 'Legendary Hunter',
        desc: 'Reach Level 100',
        emoji: '👑',
        type: 'story',
        track: 'level',
        target: 100,
        reward: { gold: 25000, exp: 0, diamonds: 25, title: 'Legend' },
    },
    {
        id: 'story_first_boss',
        title: 'Boss Slayer',
        desc: 'Defeat your first boss',
        emoji: '👹',
        type: 'story',
        track: 'bossKills',
        target: 1,
        reward: { gold: 3000, exp: 1500, diamonds: 2 },
    },
    {
        id: 'story_first_dungeon',
        title: 'Dungeon Explorer',
        desc: 'Clear your first dungeon',
        emoji: '🏰',
        type: 'story',
        track: 'dungeonClears',
        target: 1,
        reward: { gold: 2500, exp: 1200, diamonds: 2 },
    },
    {
        id: 'story_first_duel_win',
        title: 'Duelist',
        desc: 'Win your first duel',
        emoji: '⚔️',
        type: 'story',
        track: 'duelsWon',
        target: 1,
        reward: { gold: 1500, exp: 800, title: 'Duelist' },
    },
    {
        id: 'story_first_rebirth',
        title: 'Reborn',
        desc: 'Complete your first rebirth',
        emoji: '🔄',
        type: 'story',
        track: 'rebirths',
        target: 1,
        reward: { gold: 10000, exp: 0, diamonds: 10, title: 'Reborn' },
    },
    {
        id: 'story_kills_100',
        title: 'Century Slayer',
        desc: 'Defeat 100 enemies',
        emoji: '💀',
        type: 'story',
        track: 'totalKills',
        target: 100,
        reward: { gold: 5000, exp: 2000, title: 'Slayer' },
    },
    {
        id: 'story_bloodmoon',
        title: 'Child of the Moon',
        desc: 'Hunt during a Blood Moon',
        emoji: '🌕',
        type: 'story',
        track: 'bloodmoonsSeen',
        target: 1,
        reward: { gold: 3000, exp: 1500 },
    },
    {
        id: 'story_choose_role',
        title: 'Finding My Path',
        desc: 'Choose your job role',
        emoji: '🎭',
        type: 'story',
        track: 'hasJobRole',
        target: 1,
        reward: { gold: 1000, exp: 500 },
    },
    {
        id: 'story_guild_join',
        title: 'Brotherhood',
        desc: 'Join or create a guild',
        emoji: '🏰',
        type: 'story',
        track: 'hasGuild',
        target: 1,
        reward: { gold: 2000, exp: 800 },
    },
];

// ════════════════════════════════════════════════════════════════════════════
// CHALLENGE QUESTS — hard long-term goals
// ════════════════════════════════════════════════════════════════════════════
const CHALLENGE_QUESTS = [
    {
        id: 'chal_kills_500',
        title: 'Mass Destroyer',
        desc: 'Defeat 500 enemies total',
        emoji: '⚔️',
        type: 'challenge',
        track: 'totalKills',
        target: 500,
        reward: { gold: 20000, exp: 10000, diamonds: 15, title: 'Destroyer' },
    },
    {
        id: 'chal_kills_1000',
        title: 'Warlord',
        desc: 'Defeat 1,000 enemies total',
        emoji: '🗡️',
        type: 'challenge',
        track: 'totalKills',
        target: 1000,
        reward: { gold: 50000, exp: 25000, diamonds: 30, title: 'Warlord' },
    },
    {
        id: 'chal_boss_10',
        title: 'Boss Crusher',
        desc: 'Defeat 10 bosses',
        emoji: '👹',
        type: 'challenge',
        track: 'bossKills',
        target: 10,
        reward: { gold: 15000, exp: 8000, diamonds: 10 },
    },
    {
        id: 'chal_boss_50',
        title: 'Boss Hunter Supreme',
        desc: 'Defeat 50 bosses',
        emoji: '💀',
        type: 'challenge',
        track: 'bossKills',
        target: 50,
        reward: { gold: 75000, exp: 30000, diamonds: 50, title: 'Boss Hunter' },
    },
    {
        id: 'chal_dungeon_10',
        title: 'Dungeon Master',
        desc: 'Clear 10 dungeons',
        emoji: '🏰',
        type: 'challenge',
        track: 'dungeonClears',
        target: 10,
        reward: { gold: 20000, exp: 10000, diamonds: 15 },
    },
    {
        id: 'chal_dungeon_50',
        title: 'Void Walker Aspirant',
        desc: 'Clear 50 dungeons',
        emoji: '🌀',
        type: 'challenge',
        track: 'dungeonClears',
        target: 50,
        reward: { gold: 50000, exp: 20000, diamonds: 30, title: 'Void Seeker' },
    },
    {
        id: 'chal_duels_25',
        title: 'Arena Champion',
        desc: 'Win 25 duels',
        emoji: '🏆',
        type: 'challenge',
        track: 'duelsWon',
        target: 25,
        reward: { gold: 25000, exp: 12000, diamonds: 20, title: 'Champion' },
    },
    {
        id: 'chal_bloodmoon_5',
        title: 'Moonborn Aspirant',
        desc: 'Hunt during 5 Blood Moons',
        emoji: '🌕',
        type: 'challenge',
        track: 'bloodmoonsSeen',
        target: 5,
        reward: { gold: 30000, exp: 15000, diamonds: 25 },
    },
    {
        id: 'chal_rebirth_3',
        title: 'Immortal Aspirant',
        desc: 'Rebirth 3 times',
        emoji: '🔄',
        type: 'challenge',
        track: 'rebirths',
        target: 3,
        reward: { gold: 50000, exp: 0, diamonds: 40, title: 'Undying' },
    },
    {
        id: 'chal_gold_million',
        title: 'Millionaire',
        desc: 'Accumulate 1,000,000 Gold total earned',
        emoji: '💰',
        type: 'challenge',
        track: 'totalGoldEarned',
        target: 1000000,
        reward: { gold: 100000, exp: 50000, diamonds: 100, title: 'Millionaire' },
    },
];

// All quests combined
const ALL_QUESTS = [...STORY_QUESTS, ...CHALLENGE_QUESTS];

// ════════════════════════════════════════════════════════════════════════════
// DAILY QUEST ASSIGNMENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get or assign today's daily quests for a player.
 * Resets every 24 real hours.
 */
function assignDailyQuests(player) {
    const now       = Date.now();
    const last      = player.quests?.dailyReset ? new Date(player.quests.dailyReset).getTime() : 0;
    const elapsed   = now - last;
    const DAY_MS    = 24 * 60 * 60 * 1000;

    // Still on same day — return existing
    if (elapsed < DAY_MS && player.quests?.daily?.length > 0) {
        return player.quests.daily;
    }

    // Assign 3 random daily quests
    const shuffled = [...DAILY_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    return selected.map(q => ({
        id:        q.id,
        progress:  0,
        completed: false,
        claimed:   false,
    }));
}

// ════════════════════════════════════════════════════════════════════════════
// QUEST PROGRESS TRACKING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get quest definition by ID.
 */
function getQuestDef(id) {
    return [...DAILY_POOL, ...ALL_QUESTS].find(q => q.id === id) || null;
}

/**
 * Get player's current value for a tracked stat.
 */
function getTrackValue(player, track) {
    switch (track) {
        case 'huntsWon':       return player.quests?.daily?.find(q => q.id.includes('hunt'))?.progress ?? player.combat?.kills ?? 0;
        case 'totalKills':     return player.combat?.kills ?? 0;
        case 'bossKills':      return player.combat?.bossKills ?? 0;
        case 'dungeonClears':  return player.combat?.dungeonClears ?? 0;
        case 'level':          return player.level ?? 1;
        case 'rebirths':       return player.rebirths ?? 0;
        case 'bloodmoonsSeen': return player.bloodmoonsSeen ?? 0;
        case 'petsFound':      return (player.pets || []).length;
        case 'hasJobRole':     return player.jobRole ? 1 : 0;
        case 'hasGuild':       return player.guild?.guildId ? 1 : 0;
        case 'duelsWon':       return player.quests?.stats?.duelsWon ?? 0;
        case 'gathered':       return player.quests?.stats?.gathered ?? 0;
        case 'goldEarned':     return player.quests?.stats?.goldEarned ?? 0;
        case 'totalGoldEarned':return player.quests?.stats?.totalGoldEarned ?? 0;
        case 'explored':       return player.quests?.stats?.explored ?? 0;
        case 'levelsGained':   return player.quests?.stats?.levelsGained ?? 0;
        case 'fedToday':       return player.hunger >= 50 ? 1 : 0;
        default:               return 0;
    }
}

/**
 * Check story/challenge quests and return newly completed ones.
 */
function checkStoryQuests(player) {
    const completed    = player.quests?.completed || [];
    const claimable    = player.quests?.claimable || [];
    const newlyDone    = [];

    for (const quest of ALL_QUESTS) {
        if (completed.includes(quest.id)) continue;
        if (claimable.includes(quest.id)) continue;

        const value = getTrackValue(player, quest.track);
        if (value >= quest.target) {
            newlyDone.push(quest);
        }
    }
    return newlyDone;
}

// ════════════════════════════════════════════════════════════════════════════
// REWARD FORMATTER
// ════════════════════════════════════════════════════════════════════════════
function formatReward(reward) {
    const parts = [];
    if (reward.gold)     parts.push(`💰 ${reward.gold.toLocaleString()} Gold`);
    if (reward.exp)      parts.push(`✨ ${reward.exp.toLocaleString()} EXP`);
    if (reward.diamonds) parts.push(`💎 ${reward.diamonds} Diamonds`);
    if (reward.title)    parts.push(`🎯 Title: *${reward.title}*`);
    return parts.join('  ');
}

module.exports = {
    DAILY_POOL,
    STORY_QUESTS,
    CHALLENGE_QUESTS,
    ALL_QUESTS,
    assignDailyQuests,
    getQuestDef,
    getTrackValue,
    checkStoryQuests,
    formatReward,
};
