/**
 * malvin/quests.js
 * Quest Commands — Malvin-XD Sovereign RPG
 *
 * .quests     — View active quests + progress
 * .questclaim — Claim a completed quest reward
 * .questlog   — View completed quests history
 */

const { mxd } = require('../king');
const { buildBox, fetchPlayer, getPlayer, addGold, addDiamonds, grantExp, unlockTitle } = require('../king/rpg/db');
const {
    DAILY_POOL, STORY_QUESTS, CHALLENGE_QUESTS,
    assignDailyQuests, getQuestDef, checkStoryQuests, formatReward,
} = require('../king/rpg/quests');
const { GlobalPlayer } = require('../king/rpg/model');

// ════════════════════════════════════════════════════════════════════════════
// HELPER — sync daily quests to DB if reset
// ════════════════════════════════════════════════════════════════════════════
async function syncDailyQuests(sender, player) {
    const now     = Date.now();
    const last    = player.quests?.dailyReset ? new Date(player.quests.dailyReset).getTime() : 0;
    const DAY_MS  = 24 * 60 * 60 * 1000;
    const needReset = (now - last) >= DAY_MS || !player.quests?.daily?.length;

    if (needReset) {
        const newDaily = assignDailyQuests(player);
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            {
                $set: {
                    'quests.daily':       newDaily,
                    'quests.dailyReset':  new Date(),
                    'quests.stats.goldEarned':    0,
                    'quests.stats.gathered':      0,
                    'quests.stats.explored':      0,
                    'quests.stats.levelsGained':  0,
                    'quests.stats.huntsWon':      0,
                    'quests.stats.duelsWon':      0,
                }
            }
        );
        return await fetchPlayer(sender);
    }
    return player;
}

// ════════════════════════════════════════════════════════════════════════════
// .quests — View all active quests
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'quests',
        aliases:     ['quest', 'myquests', 'q'],
        category:    'rpg',
        react:       '📋',
        description: 'View your active quests and progress',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        let player = await fetchPlayer(sender);
        const name = player.username || pushName;

        // Sync daily quests
        player = await syncDailyQuests(sender, player);

        // Check for newly completed story/challenge quests
        const newlyDone = checkStoryQuests(player);
        if (newlyDone.length > 0) {
            await GlobalPlayer.findOneAndUpdate(
                { jid: sender },
                { $addToSet: { 'quests.claimable': { $each: newlyDone.map(q => q.id) } } }
            );
            player = await fetchPlayer(sender);
        }

        const daily      = player.quests?.daily || [];
        const claimable  = player.quests?.claimable || [];
        const stats      = player.quests?.stats || {};

        // Build daily quest lines
        const dailyLines = daily.map(entry => {
            const def   = DAILY_POOL.find(q => q.id === entry.id);
            if (!def) return null;
            const prog  = entry.claimed ? '✅' : entry.completed ? '🎁' : `${entry.progress}/${def.target}`;
            const bar   = buildProgressBar(entry.progress, def.target);
            return `  ${def.emoji} *${def.title}*\n     ${def.desc}\n     ${bar} ${prog}\n     ${formatReward(def.reward)}`;
        }).filter(Boolean);

        // Build claimable story/challenge lines
        const claimLines = claimable.map(id => {
            const def = getQuestDef(id);
            if (!def) return null;
            return `  🎁 *${def.title}* — *.questclaim ${id}*`;
        }).filter(Boolean);

        // Active challenge progress
        const challenges = CHALLENGE_QUESTS.filter(q => {
            const completed = player.quests?.completed || [];
            const claim     = player.quests?.claimable || [];
            return !completed.includes(q.id) && !claim.includes(q.id);
        }).slice(0, 3); // show top 3 in progress

        const chalLines = challenges.map(q => {
            const val = getTrackVal(player, q.track);
            const pct = Math.min(100, Math.floor((val / q.target) * 100));
            const bar = buildProgressBar(val, q.target);
            return `  ${q.emoji} *${q.title}*\n     ${q.desc}\n     ${bar} ${val}/${q.target} (${pct}%)`;
        });

        await react('📋');
        await reply(
            buildBox('📋 QUESTS', [
                `  ${t('quests.hunter_label', { name })}`,
                `  ───────`,
                `  ${t('quests.daily_header')}`,
                `  ───────`,
                ...dailyLines,
                ...(claimLines.length > 0 ? [
                    `  ───────`,
                    `  ${t('quests.ready_to_claim')}`,
                    ...claimLines,
                ] : []),
                `  ───────`,
                `  ${t('quests.challenges_header')}`,
                `  ───────`,
                ...chalLines,
                `  ───────`,
                `  ${t('quests.claim_hint')}`,
                `  ${t('quests.log_hint')}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .questclaim — Claim a completed quest reward
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'questclaim',
        aliases:     ['claimquest', 'qclaim'],
        category:    'rpg',
        react:       '🎁',
        description: 'Claim a completed quest reward — .questclaim <quest id>',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId, t } = conText;

        if (!q) return reply(t('quests.claim_usage'));

        await getPlayer(sender, botId);
        let player = await syncDailyQuests(sender, await fetchPlayer(sender));
        const name = player.username || pushName;
        const id   = q.trim();
        const def  = getQuestDef(id);

        if (!def) return reply(t('quests.not_found', { id }));

        // Check daily quest claim
        if (def.type === 'daily') {
            const daily  = player.quests?.daily || [];
            const entry  = daily.find(e => e.id === id);
            if (!entry)       return reply(t('quests.daily_not_assigned'));
            if (!entry.completed) return reply(t('quests.not_completed_progress', { progress: entry.progress, target: def.target }));
            if (entry.claimed)    return reply(t('quests.already_claimed_today'));

            // Claim it
            const idx = daily.findIndex(e => e.id === id);
            daily[idx].claimed = true;
            await GlobalPlayer.findOneAndUpdate(
                { jid: sender },
                { $set: { 'quests.daily': daily } }
            );
        } else {
            // Story/challenge
            const claimable = player.quests?.claimable || [];
            const completed = player.quests?.completed || [];

            if (completed.includes(id)) return reply(t('quests.already_claimed'));
            if (!claimable.includes(id)) {
                // Check if newly complete
                const val = getTrackVal(player, def.track);
                if (val < def.target) {
                    return reply(t('quests.not_completed_progress', { progress: val, target: def.target }));
                }
                // Add to claimable first
                await GlobalPlayer.findOneAndUpdate(
                    { jid: sender },
                    { $addToSet: { 'quests.claimable': id } }
                );
            }

            // Move from claimable to completed
            await GlobalPlayer.findOneAndUpdate(
                { jid: sender },
                {
                    $pull:    { 'quests.claimable': id },
                    $addToSet:{ 'quests.completed': id },
                }
            );
        }

        // Grant rewards
        const reward = def.reward;
        if (reward.gold)     await addGold(sender, reward.gold);
        if (reward.diamonds) await addDiamonds(sender, reward.diamonds);
        if (reward.exp)      await grantExp(sender, reward.exp, 0, botId);
        if (reward.title) {
            await unlockTitle(sender, reward.title);
        }

        await react('🎁');
        await reply(
            buildBox(t('quests.complete_title'), [
                `  ${def.emoji} *${def.title}*`,
                `  ${def.desc}`,
                `  ───────`,
                `  ${t('quests.rewards_label')}`,
                ...(reward.gold     ? [`  ${t('quests.reward_gold', { amount: reward.gold.toLocaleString() })}`]     : []),
                ...(reward.exp      ? [`  ${t('quests.reward_exp', { amount: reward.exp.toLocaleString() })}`]       : []),
                ...(reward.diamonds ? [`  ${t('quests.reward_diamonds', { amount: reward.diamonds })}`]              : []),
                ...(reward.title    ? [`  ${t('quests.reward_title', { title: reward.title })}`]                     : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .questlog — View completed quests
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'questlog',
        aliases:     ['qlog', 'completedquests'],
        category:    'rpg',
        react:       '📜',
        description: 'View your completed quest history',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player    = await fetchPlayer(sender);
        const name      = player.username || pushName;
        const completed = player.quests?.completed || [];
        const claimable = player.quests?.claimable || [];

        const compLines = completed.length > 0
            ? completed.slice(-10).map(id => {
                const def = getQuestDef(id);
                return def ? `  ✅ ${def.emoji} *${def.title}*` : null;
            }).filter(Boolean)
            : [`  ${t('quests.none_completed')}`];

        const claimLines = claimable.length > 0
            ? claimable.map(id => {
                const def = getQuestDef(id);
                return def ? `  🎁 ${def.emoji} *${def.title}* — *.questclaim ${id}*` : null;
            }).filter(Boolean)
            : [];

        await react('📜');
        await reply(
            buildBox(t('quests.log_title'), [
                `  ${t('quests.hunter_label', { name })}`,
                `  ${t('quests.completed_label', { count: completed.length })}`,
                `  ${t('quests.claimable_label', { count: claimable.length })}`,
                `  ───────`,
                ...(claimLines.length > 0 ? [
                    `  ${t('quests.ready_to_claim')}`,
                    ...claimLines,
                    `  ───────`,
                ] : []),
                `  ${t('quests.recently_completed')}`,
                `  ───────`,
                ...compLines,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
function buildProgressBar(current, target, length = 8) {
    const pct   = Math.min(1, current / target);
    const filled = Math.floor(pct * length);
    return `[${'▓'.repeat(filled)}${'░'.repeat(length - filled)}]`;
}

function getTrackVal(player, track) {
    const { getTrackValue } = require('../king/rpg/quests');
    return getTrackValue(player, track);
}
