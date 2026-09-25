// ════════════════════════════════════════════════════════════════════════════
// ECONOMY GATE — Group command cost system
// ════════════════════════════════════════════════════════════════════════════

const { getGroupSetting, setGroupSetting } = require('../database/groupConfig');
const { fetchPlayer, getPlayer } = require('./db');

// ─── Command cost tiers ───────────────────────────────────────────────────────
const TIER_COSTS = {
    free:      0,
    cheap:     10,
    mid:       35,
    expensive: 100,
};

// ─── Category → tier mapping ──────────────────────────────────────────────────
const CATEGORY_TIERS = {
    // ── ALL RPG categories — always free ────────────────────────────────────
    rpg:         'free',
    survival:    'free',
    gathering:   'free',
    combat:      'free',
    exploration: 'free',
    progression: 'free',
    gambling:    'free',
    economy:     'free',
    origin:      'free',
    register:    'free',
    social:      'free',
    // ── Bot management — always free ─────────────────────────────────────────
    group:       'free',
    owner:       'free',
    general:     'free',
    // ── Bot cmds — PAID ──────────────────────────────────────────────────────
    // Cheap (10g) — basic info & utilities
    info:        'cheap',
    search:      'cheap',
    notes:       'cheap',
    tools:       'cheap',
    converter:   'cheap',
    game:        'cheap',
    // Mid (35g) — media, AI, downloaders
    ai:          'mid',
    downloader:  'mid',
    dl:          'mid',
    dl2:         'mid',
    play:        'mid',
    fun:         'mid',
    anime:       'mid',
    manga:       'mid',
    faker:       'mid',
    tourl:       'mid',
    stalk:       'mid',
    // Expensive (100g) — heavy image/canvas generation
    canvas:      'expensive',
    reaction:    'expensive',
    sticker:     'expensive',
    ephoto:      'expensive',
    ephoto360:   'expensive',
};

// ─── Individual command overrides ─────────────────────────────────────────────
// Any command here bypasses category tier
const CMD_OVERRIDES = {
    // Always free regardless of category
    'menu':       'free',
    'help':       'free',
    'ping':       'free',
    'start':      'free',
    'register':   'free',
    'balance':    'free',
    'bal':        'free',
    'daily':      'free',
    'work':       'free',
    'hunt':       'free',
    'farm':       'free',
    'mine':       'free',
    'fish':       'free',
    'gather':     'free',
    'chop':       'free',
    'profile':    'free',
    'stats':      'free',
    'level':      'free',
    'economy':    'free',  // the toggle cmd itself is free
    'econset':    'free',
};

// ─── Get cost for a command ───────────────────────────────────────────────────
function getCommandCost(command, category) {
    const cmd = command?.toLowerCase();
    const cat = category?.toLowerCase();

    // Check individual override first
    if (CMD_OVERRIDES[cmd] !== undefined) {
        return TIER_COSTS[CMD_OVERRIDES[cmd]];
    }

    // Fall back to category tier
    const tier = CATEGORY_TIERS[cat] || 'cheap';
    return TIER_COSTS[tier];
}

// ─── Check if economy mode is on for a group ─────────────────────────────────
async function isEconomyEnabled(groupJid) {
    const val = await getGroupSetting(groupJid, 'ECONOMY_MODE');
    return val === 'true';
}

// ─── Toggle economy mode ──────────────────────────────────────────────────────
async function toggleEconomy(groupJid, enable) {
    await setGroupSetting(groupJid, 'ECONOMY_MODE', enable ? 'true' : 'false');
}

// ─── Main gate check ──────────────────────────────────────────────────────────
// Returns { allowed: bool, cost: number, balance: number, reason: string }
async function checkEconomyGate(groupJid, senderJid, command, category, botId) {
    // Not a group — always allow
    if (!groupJid?.endsWith('@g.us')) return { allowed: true, cost: 0 };

    // Economy not enabled for this group — allow
    const enabled = await isEconomyEnabled(groupJid);
    if (!enabled) return { allowed: true, cost: 0 };

    const cost = getCommandCost(command, category);

    // Free command — always allow
    if (cost === 0) return { allowed: true, cost: 0 };

    // Fetch player
    await getPlayer(senderJid, botId);
    const player = await fetchPlayer(senderJid);
    const balance = player?.gold || 0;

    if (balance < cost) {
        return { allowed: false, cost, balance, reason: 'broke' };
    }

    return { allowed: true, cost, balance, player };
}

// ─── Deduct gold after command runs ──────────────────────────────────────────
async function deductCommandCost(senderJid, cost) {
    if (!cost || cost <= 0) return;
    const { removeGold } = require('./db');
    await removeGold(senderJid, cost);
}

module.exports = {
    checkEconomyGate,
    deductCommandCost,
    isEconomyEnabled,
    toggleEconomy,
    getCommandCost,
    TIER_COSTS,
    CATEGORY_TIERS,
    CMD_OVERRIDES,
};
