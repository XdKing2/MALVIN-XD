/**
 * king/rpg/deathSystem.js
 * Death System — Malvin-XD Sovereign RPG
 *
 * Death penalties vary by world:
 *   Aevoria   — 5% gold loss, respawn at starter town
 *   Voidmere  — 10% gold + 20% session EXP loss, forced return
 *   Infernum  — 15% gold loss, forced return
 *   Glacivorn — 10% gold loss + hunger drops to 0, forced return
 *
 * Special protections:
 *   Death's Hand role — cannot be one-shot in PvP
 *   Knight role       — reduced boss damage
 *   Immortal role     — only loses 2% gold on death
 */

const { GlobalPlayer } = require('./model');
const { getWorld } = require('./worlds');

// ── Death penalty per world ───────────────────────────────────────────────────
const DEATH_PENALTIES = {
    aevoria: {
        goldLoss:      0.05,
        expLoss:       0,
        hungerDrop:    false,
        forcedReturn:  false,
        respawnMsg:    'You respawn at the starter town.',
    },
    voidmere: {
        goldLoss:      0.10,
        expLoss:       0.10, // lose 10% current EXP
        hungerDrop:    false,
        forcedReturn:  true,
        respawnMsg:    'The void spits you back to Aevoria!',
    },
    infernum: {
        goldLoss:      0.15,
        expLoss:       0,
        hungerDrop:    false,
        forcedReturn:  true,
        respawnMsg:    'The flames consume you. You wake up in Aevoria.',
    },
    glacivorn: {
        goldLoss:      0.10,
        expLoss:       0,
        hungerDrop:    true, // hunger drops to 0
        forcedReturn:  true,
        respawnMsg:    'Frozen solid. You barely escape back to Aevoria.',
    },
};

// ── Death streak tracking ─────────────────────────────────────────────────────
const STREAK_MESSAGES = [
    null,
    null,
    '💀 2 deaths in a row... Be careful.',
    '💀💀 3 deaths! Consider healing or upgrading stats.',
    '💀💀💀 4 deaths! You\'re on a losing streak!',
    '☠️ 5 deaths in a row! Take a break and recover!',
];

/**
 * Apply death penalty to a player.
 * Returns penalty details for display.
 */
async function applyDeath(jid, cause = 'hunt') {
    const player = await GlobalPlayer.findOne({ jid });
    if (!player) return null;

    const worldKey = player.currentWorld || 'aevoria';
    const penalty  = DEATH_PENALTIES[worldKey] || DEATH_PENALTIES.aevoria;

    // Get role passives for protections
    let passives = {};
    try {
        const { getPlayerPassives } = require('./roles');
        passives = getPlayerPassives(player);
    } catch (e) {}

    // Immortal role — only 2% gold loss
    const goldLossPct = passives.immortal ? 0.02 : penalty.goldLoss;
    const goldLoss    = Math.max(0, Math.floor(player.gold * goldLossPct));
    const expLoss     = Math.max(0, Math.floor(player.exp  * penalty.expLoss));

    // Track death streak
    const lastDeath   = player.lastDeathTime ? new Date(player.lastDeathTime).getTime() : 0;
    const now         = Date.now();
    const streak      = (now - lastDeath < 30 * 60 * 1000) // within 30 min
        ? (player.deathStreak || 0) + 1
        : 1;

    // Build update
    const update = {
        $inc: {
            gold:             -goldLoss,
            exp:              -expLoss,
            'combat.deaths':  1,
        },
        $set: {
            deathStreak:   streak,
            lastDeathTime: new Date(),
        },
    };

    // World-specific effects
    if (penalty.forcedReturn) {
        update.$set.currentWorld = 'aevoria';
    }
    if (penalty.hungerDrop) {
        update.$set.hunger = 0;
    }

    // HP to 1 on death (not 0 — avoid full death loop)
    update.$set.hp = 1;

    await GlobalPlayer.findOneAndUpdate({ jid }, update);

    // Track quest stat
    try {
        const { trackQuestStat } = require('./questHooks');
        await trackQuestStat(jid, 'deaths', 1, null);
    } catch (e) {}

    return {
        goldLoss,
        expLoss,
        forcedReturn:  penalty.forcedReturn,
        hungerDrop:    penalty.hungerDrop,
        respawnMsg:    penalty.respawnMsg,
        worldKey,
        streak,
        streakMsg:     STREAK_MESSAGES[Math.min(streak, STREAK_MESSAGES.length - 1)] || null,
        immortalProt:  passives.immortal,
    };
}

/**
 * Build death penalty display lines for buildBox.
 */
function buildDeathLines(penalty, cause = 'hunt') {
    const world  = getWorld(penalty.worldKey);
    const lines  = [
        `  ❌ Defeated in *${world.name}*`,
        `  ───────`,
        `  💰 Gold lost:  *-${penalty.goldLoss.toLocaleString()}*`,
    ];

    if (penalty.expLoss > 0) {
        lines.push(`  ✨ EXP lost:   *-${penalty.expLoss.toLocaleString()}*`);
    }
    if (penalty.hungerDrop) {
        lines.push(`  🍖 Hunger dropped to *0%*`);
    }
    if (penalty.forcedReturn) {
        lines.push(`  🌍 Returned to *Aevoria*`);
    }
    if (penalty.immortalProt) {
        lines.push(`  ♾️ Immortal protection: reduced gold loss`);
    }

    lines.push(`  ───────`);
    lines.push(`  ${penalty.respawnMsg}`);

    if (penalty.streakMsg) {
        lines.push(`  ───────`);
        lines.push(`  ${penalty.streakMsg}`);
    }

    lines.push(`  ───────`);
    lines.push(`  Use *.heal* to recover HP`);

    return lines;
}

module.exports = {
    applyDeath,
    buildDeathLines,
    DEATH_PENALTIES,
};
