const axios = require('axios');

const wordCache = new Map();

async function findWcgWord(lastWord, usedWords) {
    const startLetter = lastWord ? lastWord.slice(-1).toLowerCase() : null;
    
    try {
        let words;
        
        if (wordCache.has(startLetter || 'all')) {
            words = wordCache.get(startLetter || 'all');
        } else {
            const query = startLetter ? `sp=${startLetter}*&max=200` : 'max=200';
            const response = await axios.get(
                `https://api.datamuse.com/words?${query}`,
                { timeout: 5000 }
            );
            
            words = response.data
                .map(w => w.word.toLowerCase())
                .filter(w => w.length >= 3 && /^[a-z]+$/.test(w));
            
            wordCache.set(startLetter || 'all', words);
        }
        
        const available = words.filter(w => !usedWords.includes(w));
        
        if (available.length > 0) {
            return available[Math.floor(Math.random() * Math.min(available.length, 50))];
        }
        
        return null;
    } catch (error) {
        console.log('AI word fetch error:', error.message);
        return getFallbackWord(startLetter, usedWords);
    }
}

const FALLBACK_WORDS = [
    'apple', 'elephant', 'tiger', 'rabbit', 'table', 'eagle', 'earth', 'house',
    'snake', 'engine', 'error', 'river', 'rocket', 'train', 'night', 'tower',
    'radio', 'orange', 'energy', 'yellow', 'window', 'water', 'room', 'mother',
    'turtle', 'escape', 'tree', 'east', 'tennis', 'storm', 'music', 'castle'
];

function getFallbackWord(startLetter, usedWords) {
    const candidates = startLetter 
        ? FALLBACK_WORDS.filter(w => w[0] === startLetter && !usedWords.includes(w))
        : FALLBACK_WORDS.filter(w => !usedWords.includes(w));
    
    return candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function findBestTttMove(board) {
    const checkWin = (b, player) => {
        const patterns = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        return patterns.some(([a,b1,c]) => b[a] === player && b[b1] === player && b[c] === player);
    };
    
    const emptyCells = board.map((cell, i) => typeof cell === 'number' ? i : -1).filter(i => i !== -1);
    
    if (emptyCells.length === 0) return -1;
    
    for (const i of emptyCells) {
        const testBoard = [...board];
        testBoard[i] = 'O';
        if (checkWin(testBoard, 'O')) return i;
    }
    
    for (const i of emptyCells) {
        const testBoard = [...board];
        testBoard[i] = 'X';
        if (checkWin(testBoard, 'X')) return i;
    }
    
    if (emptyCells.includes(4)) return 4;
    
    const corners = [0, 2, 6, 8].filter(c => emptyCells.includes(c));
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
    
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

const BOT_JID = 'AI_BOT@s.whatsapp.net';

module.exports = {
    findWcgWord,
    rollDice,
    findBestTttMove,
    BOT_JID
};
