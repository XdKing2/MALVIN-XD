const wcgTimeouts = new Map();
const wcgJoinTimeouts = new Map();

function clearWcgTimeout(chatJid) {
    if (wcgTimeouts.has(chatJid)) {
        clearTimeout(wcgTimeouts.get(chatJid));
        wcgTimeouts.delete(chatJid);
    }
}

function clearWcgJoinTimeout(chatJid) {
    if (wcgJoinTimeouts.has(chatJid)) {
        clearTimeout(wcgJoinTimeouts.get(chatJid));
        wcgJoinTimeouts.delete(chatJid);
    }
}

function setWcgJoinTimeout(chatJid, callback) {
    clearWcgJoinTimeout(chatJid);
    const timeout = setTimeout(callback, 30000);
    wcgJoinTimeouts.set(chatJid, timeout);
}

function getPlayerName(jid) {
    return jid.split('@')[0];
}

function formatScores(scores) {
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([jid, score], i) => `${i + 1}. @${getPlayerName(jid)}: ${score} pts`)
        .join('\n');
}

function getDiceEmoji(value) {
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    return diceEmojis[value - 1] || '🎲';
}

module.exports = {
    wcgTimeouts,
    wcgJoinTimeouts,
    clearWcgTimeout,
    clearWcgJoinTimeout,
    setWcgJoinTimeout,
    getPlayerName,
    formatScores,
    getDiceEmoji,
};
