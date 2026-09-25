const { DATABASE } = require('./db');
const { DataTypes } = require('sequelize');
const { isValidEnglishWord } = require('../dictionary');

const WcgDB = DATABASE.define('WordChainGame', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    chatJid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    players: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
    },
    currentTurn: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    lastWord: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    usedWords: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
    },
    scores: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '{}',
    },
    status: {
        type: DataTypes.ENUM('waiting', 'active', 'finished'),
        defaultValue: 'waiting',
    },
    minPlayers: {
        type: DataTypes.INTEGER,
        defaultValue: 2,
    },
    turnTimeLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
    },
    isAiGame: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'wcg_games',
    timestamps: true,
});

let wcgDbInitialized = false;
async function initWcgDB() {
    if (wcgDbInitialized) return;
    try {
        await WcgDB.sync();
        wcgDbInitialized = true;
    } catch (error) {
        console.error('WcgDB sync error:', error.message);
    }
}

async function createWcgGame(chatJid, hostPlayer) {
    await initWcgDB();
    await WcgDB.destroy({ where: { chatJid } });
    
    const scores = {};
    scores[hostPlayer] = 0;
    
    const game = await WcgDB.create({
        chatJid,
        players: JSON.stringify([hostPlayer]),
        currentTurn: null,
        lastWord: null,
        usedWords: '[]',
        scores: JSON.stringify(scores),
        status: 'waiting',
    });
    return game;
}

async function joinWcgGame(chatJid, player) {
    await initWcgDB();
    const game = await WcgDB.findOne({
        where: { chatJid, status: 'waiting' }
    });
    
    if (!game) return { error: 'no_game' };
    
    const players = JSON.parse(game.players);
    
    if (players[0] === player) {
        return { error: 'cant_join_own_game' };
    }
    
    if (players.includes(player)) {
        return { error: 'already_joined' };
    }
    
    players.push(player);
    const scores = JSON.parse(game.scores);
    scores[player] = 0;
    
    game.players = JSON.stringify(players);
    game.scores = JSON.stringify(scores);
    await game.save();
    
    return { players, game };
}

async function startWcgGame(chatJid) {
    await initWcgDB();
    const game = await WcgDB.findOne({
        where: { chatJid, status: 'waiting' }
    });
    
    if (!game) return { error: 'no_game' };
    
    const players = JSON.parse(game.players);
    if (players.length < 2) {
        return { error: 'not_enough_players' };
    }
    
    game.status = 'active';
    game.currentTurn = players[0];
    await game.save();
    
    return {
        players,
        currentTurn: game.currentTurn,
        game
    };
}

async function getWcgGame(chatJid) {
    await initWcgDB();
    return await WcgDB.findOne({ where: { chatJid } });
}

async function getActiveWcgGame(chatJid) {
    await initWcgDB();
    return await WcgDB.findOne({
        where: { chatJid, status: 'active' }
    });
}

async function getWaitingWcgGame(chatJid) {
    await initWcgDB();
    return await WcgDB.findOne({
        where: { chatJid, status: 'waiting' }
    });
}

async function submitWord(chatJid, player, word) {
    await initWcgDB();
    const game = await WcgDB.findOne({
        where: { chatJid, status: 'active' }
    });
    
    if (!game) return { error: 'no_game' };
    if (game.currentTurn !== player) return { error: 'not_your_turn' };
    
    const cleanWord = word.toLowerCase().trim();
    const usedWords = JSON.parse(game.usedWords);
    
    if (usedWords.includes(cleanWord)) {
        return { error: 'word_used' };
    }
    
    if (game.lastWord) {
        const lastChar = game.lastWord.slice(-1).toLowerCase();
        if (cleanWord[0] !== lastChar) {
            return { error: 'wrong_letter', expected: lastChar };
        }
    }
    
    if (cleanWord.length < 2) {
        return { error: 'too_short' };
    }
    
    const isValid = await isValidEnglishWord(cleanWord);
    if (!isValid) {
        return { error: 'invalid_word' };
    }
    
    usedWords.push(cleanWord);
    const scores = JSON.parse(game.scores);
    scores[player] = (scores[player] || 0) + cleanWord.length;
    
    const players = JSON.parse(game.players);
    const currentIndex = players.indexOf(player);
    const nextIndex = (currentIndex + 1) % players.length;
    const nextPlayer = players[nextIndex];
    
    game.lastWord = cleanWord;
    game.usedWords = JSON.stringify(usedWords);
    game.scores = JSON.stringify(scores);
    game.currentTurn = nextPlayer;
    await game.save();
    
    return {
        word: cleanWord,
        scores,
        nextPlayer,
        wordCount: usedWords.length,
        game
    };
}

async function eliminatePlayer(chatJid, player) {
    await initWcgDB();
    const game = await WcgDB.findOne({
        where: { chatJid, status: 'active' }
    });
    
    if (!game) return { error: 'no_game' };
    
    const players = JSON.parse(game.players);
    const playerIndex = players.indexOf(player);
    if (playerIndex === -1) return { error: 'player_not_found' };
    
    players.splice(playerIndex, 1);
    const scores = JSON.parse(game.scores);
    
    if (players.length === 0) {
        game.status = 'finished';
        await game.save();
        return { 
            winner: null,
            scores,
            finished: true,
            noWinner: true
        };
    }
    
    if (players.length === 1) {
        game.status = 'finished';
        await game.save();
        return { 
            winner: players[0],
            scores,
            finished: true
        };
    }
    
    const currentIndex = players.indexOf(game.currentTurn);
    const nextPlayer = currentIndex === -1 ? players[0] : game.currentTurn;
    
    game.players = JSON.stringify(players);
    game.currentTurn = nextPlayer;
    await game.save();
    
    return {
        eliminated: player,
        remainingPlayers: players,
        nextPlayer,
        scores
    };
}

async function endWcgGame(chatJid) {
    await initWcgDB();
    const game = await WcgDB.findOne({ where: { chatJid } });
    if (game) {
        const scores = JSON.parse(game.scores);
        await WcgDB.destroy({ where: { chatJid } });
        return scores;
    }
    return null;
}

module.exports = {
    initWcgDB,
    createWcgGame,
    joinWcgGame,
    startWcgGame,
    getWcgGame,
    getActiveWcgGame,
    getWaitingWcgGame,
    submitWord,
    eliminatePlayer,
    endWcgGame,
    WcgDB,
};
