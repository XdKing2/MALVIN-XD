const { DATABASE } = require('./db');
const { DataTypes } = require('sequelize');

const GamesDB = DATABASE.define('TicTacToeGame', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    chatJid: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    player1: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    player2: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    board: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    },
    currentTurn: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('waiting', 'active', 'finished'),
        defaultValue: 'waiting',
    },
    messageKey: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isAiGame: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'tictactoe_games',
    timestamps: true,
});

let gamesDbInitialized = false;
async function initGamesDB() {
    if (gamesDbInitialized) return;
    try {
        await GamesDB.sync();
        gamesDbInitialized = true;
    } catch (error) {
        console.error('GamesDB sync error:', error.message);
    }
}

async function createGame(chatJid, player1, messageKey = null, isAiGame = false) {
    await initGamesDB();
    await GamesDB.destroy({ where: { chatJid } });
    
    const game = await GamesDB.create({
        chatJid,
        player1,
        player2: isAiGame ? 'AI_BOT@s.whatsapp.net' : null,
        board: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]),
        currentTurn: player1,
        status: isAiGame ? 'active' : 'waiting',
        messageKey: messageKey ? JSON.stringify(messageKey) : null,
        isAiGame,
    });
    
    return game;
}

async function joinGame(chatJid, player2) {
    await initGamesDB();
    const game = await GamesDB.findOne({
        where: { chatJid, status: 'waiting' }
    });
    
    if (!game) return null;
    
    if (game.player1 === player2) {
        return { error: 'same_player' };
    }
    
    game.player2 = player2;
    game.status = 'active';
    game.currentTurn = game.player1;
    await game.save();
    
    return {
        player1: game.player1,
        player2: game.player2,
        board: game.board,
        currentTurn: game.currentTurn,
    };
}

async function getActiveGame(chatJid) {
    await initGamesDB();
    return await GamesDB.findOne({
        where: { chatJid, status: 'active' }
    });
}

async function getWaitingGame(chatJid) {
    await initGamesDB();
    return await GamesDB.findOne({
        where: { chatJid, status: 'waiting' }
    });
}

function checkWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] === board[b] && board[b] === board[c]) {
            return board[a];
        }
    }
    return null;
}

function checkDraw(board) {
    return board.every(cell => cell === 'X' || cell === 'O');
}

async function makeMove(chatJid, player, position) {
    await initGamesDB();
    const game = await GamesDB.findOne({
        where: { chatJid, status: 'active' }
    });
    
    if (!game) {
        return { error: 'no_game' };
    }
    
    if (game.currentTurn !== player) {
        return { error: 'not_your_turn' };
    }
    
    const board = JSON.parse(game.board);
    const index = position - 1;
    
    if (board[index] === 'X' || board[index] === 'O') {
        return { error: 'cell_taken' };
    }
    
    const symbol = player === game.player1 ? 'X' : 'O';
    board[index] = symbol;
    game.board = JSON.stringify(board);
    
    const winner = checkWinner(board);
    if (winner) {
        game.status = 'finished';
        await game.save();
        return {
            winner: player,
            symbol,
            game: {
                player1: game.player1,
                player2: game.player2,
                board: game.board,
                currentTurn: game.currentTurn,
            }
        };
    }
    
    if (checkDraw(board)) {
        game.status = 'finished';
        await game.save();
        return {
            draw: true,
            game: {
                player1: game.player1,
                player2: game.player2,
                board: game.board,
                currentTurn: game.currentTurn,
            }
        };
    }
    
    game.currentTurn = player === game.player1 ? game.player2 : game.player1;
    await game.save();
    
    return {
        game: {
            player1: game.player1,
            player2: game.player2,
            board: game.board,
            currentTurn: game.currentTurn,
        }
    };
}

async function endGame(chatJid) {
    await initGamesDB();
    await GamesDB.destroy({ where: { chatJid } });
}

module.exports = {
    initGamesDB,
    createGame,
    joinGame,
    getActiveGame,
    getWaitingGame,
    makeMove,
    endGame,
    GamesDB,
};
