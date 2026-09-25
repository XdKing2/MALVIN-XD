/**
 * king/rpg/notifications.js
 * Notification System — Malvin-XD Sovereign RPG
 *
 * Handles:
 *   - Passive gold income (Monarch role)
 *   - World event announcements (bloodmoon, eclipse)
 *   - Pet hunger warnings
 *   - Daily reminder
 *   - Guild vault milestone alerts
 */

const { GlobalPlayer, Guild } = require('./model');
const { getWorldTime } = require('./worldTime');
const { buildBox } = require('./db');

// Track last world event to avoid spam
let _lastEventAnnounced = null;
let _lastEventTime      = 0;

/**
 * Main notification runner — called every 30 minutes by index.js
 */
async function runNotifications(Malvin, botId) {
    try {
        await Promise.all([
            processPassiveIncome(Malvin, botId),
            checkWorldEvents(Malvin),
            drainPetHunger(),
            checkPetHunger(Malvin),
        ]);
    } catch (e) {
        console.error('[Notifications] Error:', e.message);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// PASSIVE INCOME — Monarch role gets 500 gold/hr
// ════════════════════════════════════════════════════════════════════════════
async function processPassiveIncome(Malvin, botId) {
    try {
        // Find all players with Monarch special role
        const monarchs = await GlobalPlayer.find({ specialRole: 'monarch' });
        if (!monarchs.length) return;

        const PASSIVE_GOLD = 500; // per 30 min tick = 1000/hr

        for (const player of monarchs) {
            await GlobalPlayer.findOneAndUpdate(
                { jid: player.jid },
                { $inc: { gold: PASSIVE_GOLD } }
            );

            // Notify player in their last active chat
            if (player.lastActiveChat) {
                try {
                    await Malvin.sendMessage(player.lastActiveChat, {
                        text: buildBox('🔱 PASSIVE INCOME', [
                            `  👑 *Monarch* passive income`,
                            `  💰 +${PASSIVE_GOLD.toLocaleString()} Gold`,
                            `  ───────`,
                            `  Your kingdom generates wealth.`,
                        ]),
                    });
                } catch (e) {}
            }
        }
    } catch (e) {
        console.error('[PassiveIncome] Error:', e.message);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// WORLD EVENT NOTIFICATIONS — bloodmoon, eclipse
// ════════════════════════════════════════════════════════════════════════════
async function checkWorldEvents(Malvin) {
    try {
        const wt = await getWorldTime();
        const event = wt.activeEvent;
        if (!event) {
            _lastEventAnnounced = null;
            return;
        }

        // Only announce once per event (not every 30 min)
        const eventKey = `${event.type}_${Math.floor(wt.totalIngameDays / 3)}`;
        if (_lastEventAnnounced === eventKey) return;
        _lastEventAnnounced = eventKey;

        // Get all active players (logged in within last 24h)
        const activePlayers = await GlobalPlayer.find({
            lastActiveChat: { $exists: true, $ne: null },
            registered: true,
        }).limit(500);

        const msg = buildBox(`${event.emoji} ${event.name.toUpperCase()}!`, [
            `  ⚠️ *${event.name}* has risen over Aevoria!`,
            `  ───────`,
            event.type === 'bloodmoon' ? [
                `  🌕 +50% EXP`,
                `  💰 +30% Gold`,
                `  🎁 +30% Drop Rate`,
                `  ⚔️ Enemies are LETHAL`,
            ].join('\n') : `  🌑 +30% EXP · +20% Drops`,
            `  ───────`,
            `  Hunt now for massive rewards!`,
            `  📅 ${wt.dayOfMonth}th ${wt.month}, Year ${wt.year} AE`,
        ]);

        // Broadcast to all active players
        let sent = 0;
        for (const player of activePlayers) {
            if (sent >= 100) break; // rate limit
            try {
                await Malvin.sendMessage(player.lastActiveChat, { text: msg });
                sent++;
                await new Promise(r => setTimeout(r, 200)); // 200ms delay between sends
            } catch (e) {}
        }
    } catch (e) {
        console.error('[WorldEvents] Error:', e.message);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// PET HUNGER WARNINGS
// ════════════════════════════════════════════════════════════════════════════
async function checkPetHunger(Malvin) {
    try {
        // Find players with hungry active pets (hunger < 20%)
        const playersWithPets = await GlobalPlayer.find({
            'pets.0': { $exists: true },
            lastActiveChat: { $exists: true, $ne: null },
            registered: true,
        }).limit(200);

        for (const player of playersWithPets) {
            const hungryPets = (player.pets || []).filter(p => p.active && p.hunger < 20);
            if (!hungryPets.length) continue;

            const petLines = hungryPets.map(p => `  • *${p.name}* — 🍖 ${p.hunger}% hunger`);

            try {
                await Malvin.sendMessage(player.lastActiveChat, {
                    text: buildBox('🐾 PET ALERT', [
                        `  Your pets are hungry!`,
                        `  ───────`,
                        ...petLines,
                        `  ───────`,
                        `  Use *.petfeed <name>* or *.use petfood <name>*`,
                    ]),
                });
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {}
        }
    } catch (e) {
        console.error('[PetHunger] Error:', e.message);
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TRACK LAST ACTIVE CHAT — call this from index.js on every message
// ════════════════════════════════════════════════════════════════════════════
async function trackLastActiveChat(jid, chatJid) {
    try {
        await GlobalPlayer.findOneAndUpdate(
            { jid },
            { $set: { lastActiveChat: chatJid } }
        );
    } catch (e) {}
}

// ════════════════════════════════════════════════════════════════════════════
// PET HUNGER DRAIN — pets lose 5 hunger every 30 min when active
// ════════════════════════════════════════════════════════════════════════════
async function drainPetHunger() {
    try {
        const players = await GlobalPlayer.find({
            'pets.0': { $exists: true },
        }).select('jid pets').limit(500);

        for (const player of players) {
            const pets = player.pets || [];
            let changed = false;
            for (let i = 0; i < pets.length; i++) {
                if (!pets[i].active) continue;
                pets[i].hunger    = Math.max(0, pets[i].hunger - 5);
                pets[i].happiness = pets[i].hunger < 20
                    ? Math.max(0, pets[i].happiness - 3)
                    : pets[i].happiness;
                changed = true;
            }
            if (changed) {
                await GlobalPlayer.findOneAndUpdate(
                    { jid: player.jid },
                    { $set: { pets } }
                );
            }
        }
    } catch (e) {
        console.error('[PetDrain] Error:', e.message);
    }
}

module.exports = {
    runNotifications,
    trackLastActiveChat,
    processPassiveIncome,
    checkWorldEvents,
    checkPetHunger,
};
