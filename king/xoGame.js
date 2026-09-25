const {
    joinGame,
    getActiveGame,
    getWaitingGame,
    makeMove,
    endGame,
} = require("./database/gameStore");

const { findBestTttMove, BOT_JID } = require("./GAI");

const gameTimeouts = new Map();

const clearGameTimeout = (chatJid) => {
    const timeout = gameTimeouts.get(chatJid);
    if (timeout) {
        clearTimeout(timeout);
        gameTimeouts.delete(chatJid);
    }
};

const getPlayerName = (jid) => {
    return jid.split("@")[0];
};

const renderBoard = (board) => {
    const cell = (val) => {
        if (val === "X") return "❌";
        if (val === "O") return "⭕";
        return `${val}️⃣`;
    };
    
    return `${cell(board[0])} | ${cell(board[1])} | ${cell(board[2])}
——+——+——
${cell(board[3])} | ${cell(board[4])} | ${cell(board[5])}
——+——+——
${cell(board[6])} | ${cell(board[7])} | ${cell(board[8])}`;
};

const setMoveTimeout = (chatJid, Malvin, currentPlayer, otherPlayer, player1) => {
    clearGameTimeout(chatJid);
    const timeout = setTimeout(async () => {
        const active = await getActiveGame(chatJid);
        if (active && active.currentTurn === currentPlayer) {
            await endGame(chatJid);
            const currentSymbol = currentPlayer === active.player1 ? "❌" : "⭕";
            await Malvin.sendMessage(chatJid, {
                text: `⏰ *TIC TAC TOE - TIMEOUT*\n\n@${getPlayerName(currentPlayer)} (${currentSymbol}) took too long to move!\n\n🏆 *WINNER: @${getPlayerName(otherPlayer)}* by timeout!\n\nStart a new game with *.ttt*`,

                mentions: [currentPlayer, otherPlayer],
            });
        }
        gameTimeouts.delete(chatJid);
    }, 30000);
    gameTimeouts.set(chatJid, timeout);
};

const handleTicTacToeMessage = async (Malvin, message) => {
    try {
        if (!message?.message || message.key.fromMe) return;
        
        const from = message.key.remoteJid;
        const sender = message.key.participantPn || message.key.participant || message.participant || message.key.remoteJid;
        
        if (!sender || sender.endsWith('@g.us')) return;
        
        const messageType = Object.keys(message.message)[0];
        const body = (messageType === 'conversation'
            ? message.message.conversation
            : message.message[messageType]?.text || message.message[messageType]?.caption || '').trim();
        
        if (!body) return;
        
        const lowerBody = body.toLowerCase();
        if (lowerBody === 'join') {
            const waiting = await getWaitingGame(from);
            if (!waiting) return;
            
            const result = await joinGame(from, sender);
            if (!result || result.error) return;
            
            clearGameTimeout(from);
            const board = JSON.parse(result.board);
            await Malvin.sendMessage(from, {
                text: `🎮 *TIC TAC TOE - GAME STARTED!*\n\nPlayer 1: @${getPlayerName(result.player1)} (❌)\nPlayer 2: @${getPlayerName(result.player2)} (⭕)\n\n${renderBoard(board)}\n\n@${getPlayerName(result.currentTurn)}'s turn (❌)\n\n*Reply with a number (1-9) to move!*\n⏰ _30 seconds per move_`,

                mentions: [result.player1, result.player2, result.currentTurn],
            });
            setMoveTimeout(from, Malvin, result.currentTurn, result.player2, result.player1);
            return;
        }
        
        const num = parseInt(body);
        if (isNaN(num) || num < 1 || num > 9) return;
        
        const game = await getActiveGame(from);
        if (!game) return;
        
        if (game.player1 !== sender && game.player2 !== sender) return;
        
        const result = await makeMove(from, sender, num);
        if (result.error) return;
        
        const board = JSON.parse(result.game.board);
        
        if (result.winner) {
            clearGameTimeout(from);
            const winnerSymbol = result.symbol === "X" ? "❌" : "⭕";
            await Malvin.sendMessage(from, {
                text: `🎮 *TIC TAC TOE - GAME OVER!*\n\n${renderBoard(board)}\n\n🏆 *WINNER: @${getPlayerName(result.winner)}* ${winnerSymbol}\n\nCongratulations! 🎉`,

                mentions: [result.winner],
            });
            return;
        }
        
        if (result.draw) {
            clearGameTimeout(from);
            await Malvin.sendMessage(from, {
                text: `🎮 *TIC TAC TOE - GAME OVER!*\n\n${renderBoard(board)}\n\n🤝 *IT'S A DRAW!*\n\nGood game! Start a new one with *.ttt*`,

            });
            return;
        }
        
        const currentSymbol = result.game.currentTurn === result.game.player1 ? "❌" : "⭕";
        const otherPlayer = result.game.currentTurn === result.game.player1 ? result.game.player2 : result.game.player1;
        
        if (game.isAiGame && result.game.currentTurn === BOT_JID) {
            await Malvin.sendMessage(from, {
                text: `🎮 *TIC TAC TOE vs AI*\n\n${renderBoard(board)}\n\n🤖 AI is thinking...`,

            });
            
            await handleAiTttMove(from, Malvin, result.game);
            return;
        }
        
        await Malvin.sendMessage(from, {
            text: `🎮 *TIC TAC TOE*\n\nPlayer 1: @${getPlayerName(result.game.player1)} (❌)\nPlayer 2: @${getPlayerName(result.game.player2)} (⭕)\n\n${renderBoard(board)}\n\n@${getPlayerName(result.game.currentTurn)}'s turn (${currentSymbol})\n\n*Reply 1-9 to move*\n⏰ _30 seconds_`,
            mentions: [result.game.player1, result.game.player2, result.game.currentTurn],
        });
        
        setMoveTimeout(from, Malvin, result.game.currentTurn, otherPlayer, result.game.player1);
    } catch (err) {
        console.error('TicTacToe handler error:', err);
    }
};

async function handleAiTttMove(from, Malvin, game) {
    const board = JSON.parse(game.board);
    const aiMove = findBestTttMove(board);
    
    if (aiMove === -1) return;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await makeMove(from, BOT_JID, aiMove + 1);
    
    if (result.winner) {
        clearGameTimeout(from);
        await Malvin.sendMessage(from, {
            text: `🎮 *TIC TAC TOE - AI WINS!*\n\n${renderBoard(JSON.parse(result.game.board))}\n\n🤖 AI wins! Better luck next time!`,
        });
        return;
    }
    
    if (result.draw) {
        clearGameTimeout(from);
        await Malvin.sendMessage(from, {
            text: `🎮 *TIC TAC TOE - DRAW!*\n\n${renderBoard(JSON.parse(result.game.board))}\n\n🤝 It's a tie! Good game!`,
        });
        return;
    }
    
    const newBoard = JSON.parse(result.game.board);
    await Malvin.sendMessage(from, {
        text: `🤖 AI played position ${aiMove + 1}\n\n${renderBoard(newBoard)}\n\n@${getPlayerName(result.game.currentTurn)}'s turn (❌)\n\n⏰ _30 seconds_`,
        mentions: [result.game.currentTurn],
    });
    
    setMoveTimeout(from, Malvin, result.game.currentTurn, BOT_JID, result.game.player1);
}

module.exports = { 
    handleTicTacToeMessage, 
    clearGameTimeout, 
    setMoveTimeout,
    renderBoard,
    getPlayerName,
    gameTimeouts
};
