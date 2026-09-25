/**
 * king/rpg/questHooks.js
 * Quest progress hooks — called from existing commands
 * Silently updates quest stats and checks for completions
 */

const { GlobalPlayer } = require('./model');
const { checkStoryQuests, getQuestDef } = require('./quests');

/**
 * Increment a quest stat and check for completions.
 * @param {string} jid - player JID
 * @param {string} stat - stat key to increment
 * @param {number} amount - amount to increment
 * @param {Function} notifyFn - optional async fn to notify player of quest completion
 */
async function trackQuestStat(jid, stat, amount = 1, notifyFn = null) {
    try {
        const inc = {};

        // Daily reset stats
        const dailyStats = ['gathered', 'explored', 'levelsGained', 'huntsWon', 'duelsWon', 'goldEarned'];
        if (dailyStats.includes(stat)) {
            inc[`quests.stats.${stat}`] = amount;
        }

        // Cumulative stats
        if (stat === 'goldEarned') {
            inc['quests.stats.totalGoldEarned'] = amount;
        }

        const updated = await GlobalPlayer.findOneAndUpdate(
            { jid },
            { $inc: inc },
            { new: true }
        );

        if (!updated) return;

        // Check daily quests progress
        const daily = updated.quests?.daily || [];
        let dailyChanged = false;

        for (let i = 0; i < daily.length; i++) {
            const entry = daily[i];
            if (entry.completed || entry.claimed) continue;

            const def = getQuestDef(entry.id);
            if (!def) continue;

            // Map stat to quest track
            if (def.track !== stat) continue;

            const newProg = Math.min(def.target, entry.progress + amount);
            daily[i].progress = newProg;
            if (newProg >= def.target) {
                daily[i].completed = true;
                dailyChanged = true;
                // Notify player
                if (notifyFn) {
                    await notifyFn(
                        `📋 *Daily Quest Complete!*\n${def.emoji} *${def.title}*\nUse *.questclaim ${def.id}* to claim your reward!`
                    );
                }
            }
        }

        if (dailyChanged) {
            await GlobalPlayer.findOneAndUpdate(
                { jid },
                { $set: { 'quests.daily': daily } }
            );
        }

        // Check story/challenge quests
        const player = await GlobalPlayer.findOne({ jid });
        if (!player) return;

        const newlyDone = checkStoryQuests(player);
        if (newlyDone.length > 0) {
            await GlobalPlayer.findOneAndUpdate(
                { jid },
                { $addToSet: { 'quests.claimable': { $each: newlyDone.map(q => q.id) } } }
            );
            if (notifyFn) {
                for (const q of newlyDone) {
                    await notifyFn(
                        `📜 *Quest Unlocked!*\n${q.emoji} *${q.title}*\n${q.desc}\nUse *.questclaim ${q.id}* to claim your reward!`
                    );
                }
            }
        }
    } catch (e) {
        console.error('Quest hook error:', e.message);
    }
}

module.exports = { trackQuestStat };
