const { DATABASE } = require('./db');
const { DataTypes } = require('sequelize');

const DiceDB = DATABASE.define('DiceGame', {
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
    player1: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    player2: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    player1Roll: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    player2Roll: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    currentTurn: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    rounds: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
    },
    currentRound: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
    },
    player1Score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    player2Score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    status: {
        type: DataTypes.ENUM('waiting', 'active', 'rolling', 'finished'),
        defaultValue: 'waiting',
    },
    isAiGame: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'dice_games',
    timestamps: true,
});

let diceDbInitialized = false;
async function initDiceDB() {
    if (diceDbInitialized) return;
    try {
        await DiceDB.sync();
        diceDbInitialized = true;
    } catch (error) {
        console.error('DiceDB sync error:', error.message);
    }
}

async function createDiceGame(chatJid, player1, rounds = 3) {
    await initDiceDB();
    await DiceDB.destroy({ where: { chatJid } });
    
    const game = await DiceDB.create({
        chatJid,
        player1,
        player2: null,
        player1Roll: null,
        player2Roll: null,
        currentTurn: null,
        rounds: Math.min(Math.max(rounds, 1), 10),
        currentRound: 1,
        player1Score: 0,
        player2Score: 0,
        status: 'waiting',
    });
    return game;
}

async function joinDiceGame(chatJid, player2) {
    await initDiceDB();
    const game = await DiceDB.findOne({
        where: { chatJid, status: 'waiting' }
    });
    
    if (!game) return { error: 'no_game' };
    if (game.player1 === player2) return { error: 'same_player' };
    
    game.player2 = player2;
    game.status = 'active';
    game.currentTurn = game.player1;
    await game.save();
    
    return {
        player1: game.player1,
        player2: game.player2,
        rounds: game.rounds,
        game
    };
}

async function getDiceGame(chatJid) {
    await initDiceDB();
    return await DiceDB.findOne({ where: { chatJid } });
}

async function getActiveDiceGame(chatJid) {
    await initDiceDB();
    return await DiceDB.findOne({
        where: { chatJid, status: 'active' }
    });
}

async function getWaitingDiceGame(chatJid) {
    await initDiceDB();
    return await DiceDB.findOne({
        where: { chatJid, status: 'waiting' }
    });
}

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

async function playerRoll(chatJid, player) {
    await initDiceDB();
    const game = await DiceDB.findOne({
        where: { chatJid, status: 'active' }
    });
    
    if (!game) return { error: 'no_game' };
    if (game.currentTurn !== player) return { error: 'not_your_turn' };
    
    const roll = rollDice();
    const isPlayer1 = player === game.player1;
    
    if (isPlayer1) {
        game.player1Roll = roll;
        game.currentTurn = game.player2;
    } else {
        game.player2Roll = roll;
    }
    
    await game.save();
    
    if (game.player1Roll !== null && game.player2Roll !== null) {
        let roundWinner = null;
        if (game.player1Roll > game.player2Roll) {
            game.player1Score += 1;
            roundWinner = game.player1;
        } else if (game.player2Roll > game.player1Roll) {
            game.player2Score += 1;
            roundWinner = game.player2;
        }
        
        const roundResult = {
            roll,
            player1Roll: game.player1Roll,
            player2Roll: game.player2Roll,
            roundWinner,
            player1Score: game.player1Score,
            player2Score: game.player2Score,
            currentRound: game.currentRound,
            player1: game.player1,
            player2: game.player2,
        };
        
        if (game.currentRound >= game.rounds) {
            game.status = 'finished';
            await game.save();
            
            let gameWinner = null;
            if (game.player1Score > game.player2Score) {
                gameWinner = game.player1;
            } else if (game.player2Score > game.player1Score) {
                gameWinner = game.player2;
            }
            
            return {
                ...roundResult,
                gameFinished: true,
                gameWinner,
                finalScore: {
                    [game.player1]: game.player1Score,
                    [game.player2]: game.player2Score,
                }
            };
        }
        
        game.currentRound += 1;
        game.player1Roll = null;
        game.player2Roll = null;
        game.currentTurn = game.player1;
        await game.save();
        
        return {
            ...roundResult,
            nextRound: game.currentRound,
            roundComplete: true,
        };
    }
    
    return {
        roll,
        waitingFor: game.currentTurn,
        player1: game.player1,
        player2: game.player2,
    };
}

async function endDiceGame(chatJid) {
    await initDiceDB();
    await DiceDB.destroy({ where: { chatJid } });
}

module.exports = {
    initDiceDB,
    createDiceGame,
    joinDiceGame,
    getDiceGame,
    getActiveDiceGame,
    getWaitingDiceGame,
    playerRoll,
    endDiceGame,
    rollDice,
    DiceDB,
};
