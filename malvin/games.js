const { mxd } = require("../king");
const { grantExp } = require("../king/rpg/db");
const BOT_JID_GAMES = require("../king/GAI").BOT_JID;
const {
    createGame,
    joinGame,
    getActiveGame,
    getWaitingGame,
    makeMove,
    endGame,
    initGamesDB,
} = require("../king/database/gameStore");

const {
    createWcgGame,
    joinWcgGame,
    startWcgGame,
    getActiveWcgGame,
    getWaitingWcgGame,
    submitWord,
    eliminatePlayer,
    endWcgGame,
    initWcgDB,
} = require("../king/database/wcgGame");

const {
    createDiceGame,
    joinDiceGame,
    getActiveDiceGame,
    getWaitingDiceGame,
    playerRoll,
    endDiceGame,
    initDiceDB,
} = require("../king/database/diceEngine");

const { 
    clearGameTimeout, 
    setMoveTimeout, 
    setWcgTurnTimeout,
    setDiceTurnTimeout,
    clearDiceTimeout,
    renderBoard, 
    getPlayerName,
    handleAiTttMove,
    handleAiWcgMove,
    handleAiDiceRoll,
    gameTimeouts,
    diceTimeouts,
} = require("../king/gameManager");

const {
    wcgTimeouts,
    clearWcgTimeout,
    clearWcgJoinTimeout,
    setWcgJoinTimeout,
    formatScores,
    getDiceEmoji,
} = require("../king/wordChain");


const {
    findWcgWord,
    rollDice: aiRollDice,
    findBestTttMove,
    BOT_JID,
} = require("../king/GAI");
const { fancy } = require("../king/fancyFont");

initGamesDB();
initWcgDB();
initDiceDB();

mxd({
    pattern: "games",
    aliases: ["game", "playgame", "playgames", "gamelist"],
    react: "🎮",
    category: "game",
    description: "Show all available games and commands",
}, async (from, Malvin, conText) => {
    const helpText = `┌─⊷ 🎮 *GAMES MENU*
▢ ❌⭕ *TIC TAC TOE*
▢ .ttt - Start game (vs player)
▢ .tttai - Play vs AI 🤖
▢ .tttend - End current game
▢ _Type *join* to join · *1-9* to move_
└───────────
┌─⊷ 🔤 *WORD CHAIN GAME*
▢ .wcg - Start game (multiplayer)
▢ .wcgai - Play vs AI 🤖
▢ .wcgbegin - Start the game (host)
▢ .wcgend - End current game
▢ .wcgscores - View scores
▢ _Type *join* to join · just type your word!_
└───────────
┌─⊷ 🎲 *DICE GAME*
▢ .dice [rounds] - Start game
▢ .diceai [rounds] - Play vs AI 🤖
▢ .diceend - End current game
▢ _Type *join* to join · *roll* to roll_
└───────────
> _${fancy("malvin xd rpg", "smallcaps")}_ 💎`;
    
    return await Malvin.sendMessage(from, {
        text: helpText,
    });
});

const setJoinTimeout = (chatJid, Malvin, player1) => {
    clearGameTimeout(chatJid);
    const timeout = setTimeout(async () => {
        const waiting = await getWaitingGame(chatJid);
        if (waiting) {
            await endGame(chatJid);
            await Malvin.sendMessage(chatJid, {
                text: `⏰ *TIC TAC TOE - TIMEOUT*\n\nNo one joined within 30 seconds.\nGame cancelled!\n\n@${await getPlayerName(player1)} can start a new game with *.ttt*`,
    
                mentions: [player1],
            });
        }
        gameTimeouts.delete(chatJid);
    }, 30000);
    gameTimeouts.set(chatJid, timeout);
};

mxd({
    pattern: "tictactoe",
    aliases: ["ttt", "tttstart"],
    react: "🎮",
    category: "game",
    description: "Start a TicTacToe game. Another player must type 'join' within 30 seconds.",
}, async (from, Malvin, conText) => {
    const { mek, sender, botName } = conText;
    
    const existingActive = await getActiveGame(from);
    if (existingActive) {
        return await Malvin.sendMessage(from, {
            text: "❌ There's already an active game in this chat!\nUse *.tttend* to end it first.",

        });
    }
    
    const existingWaiting = await getWaitingGame(from);
    if (existingWaiting) {
        return await Malvin.sendMessage(from, {
            text: "❌ There's already a game waiting for a player!\nType *join* to join, or use *.tttend* to cancel.",

        });
    }
    
    const sentMsg = await Malvin.sendMessage(from, {
        text: `🎮 *TIC TAC TOE*\n\n@${await getPlayerName(sender)} wants to play!\n\n*Type "join" within 30 seconds to play!*\n\nPlayer 1: @${await getPlayerName(sender)} (❌)\nPlayer 2: Waiting...\n\n${renderBoard([1, 2, 3, 4, 5, 6, 7, 8, 9])}\n\n⏰ _Auto-cancels in 30 seconds if no one joins_`,
        mentions: [sender],
    });
    
    await createGame(from, sender, sentMsg.key);
    setJoinTimeout(from, Malvin, sender);
});

mxd({
    pattern: "tttend",
    aliases: ["endttt", "tttcancel", "ttstop", "tictactoestop", "tictactoeend", "stopttt", "cancelttt"],
    react: "🛑",
    category: "game",
    description: "End the current TicTacToe game",
}, async (from, Malvin, conText) => {
    const { sender, isSuperUser } = conText;
    
    const activeGame = await getActiveGame(from);
    const waitingGame = await getWaitingGame(from);
    const game = activeGame || waitingGame;
    
    if (!game) {
        return await Malvin.sendMessage(from, {
            text: "❌ No active TicTacToe game to end!",
        });
    }
    
    const isPlayer = game.player1 === sender || game.player2 === sender;
    if (!isPlayer && !isSuperUser) {
        return await Malvin.sendMessage(from, {
            text: "❌ Only players or admins can end the game!",
        });
    }
    
    clearGameTimeout(from);
    await endGame(from);
    await Malvin.sendMessage(from, {
        text: `🛑 TicTacToe game ended by @${await getPlayerName(sender)}!`,
        mentions: [sender],
    });
});

mxd({
    pattern: "tttjoin",
    aliases: ["jointtt"],
    react: "✅",
    category: "game",
    description: "Join a waiting TicTacToe game",
}, async (from, Malvin, conText) => {
    const { sender } = conText;
    
    const result = await joinGame(from, sender);
    
    if (!result) {
        return await Malvin.sendMessage(from, {
            text: "❌ No game waiting for players! Start one with *.ttt*",

        });
    }
    
    if (result.error === "same_player") {
        return await Malvin.sendMessage(from, {
            text: "❌ You can't play against yourself!",

        });
    }
    
    clearGameTimeout(from);
    
    const board = JSON.parse(result.board);
    await Malvin.sendMessage(from, {
        text: `🎮 *TIC TAC TOE - GAME STARTED!*\n\nPlayer 1: @${await getPlayerName(result.player1)} (❌)\nPlayer 2: @${await getPlayerName(result.player2)} (⭕)\n\n${renderBoard(board)}\n\n@${await getPlayerName(result.currentTurn)}'s turn (❌)\n\n*Reply with a number (1-9) to move!*\n⏰ _30 seconds per move_`,
        mentions: [result.player1, result.player2, result.currentTurn],
    });
    
    setMoveTimeout(from, Malvin, result.currentTurn, result.player2, result.player1);
});

mxd({
    pattern: "tttboard",
    aliases: ["board", "tttshow"],
    react: "📋",
    category: "game",
    description: "Show the current TicTacToe board",
}, async (from, Malvin, conText) => {
    const game = await getActiveGame(from);
    
    if (!game) {
        return await Malvin.sendMessage(from, {
            text: "❌ No active game! Start one with *.ttt*",

        });
    }
    
    const board = JSON.parse(game.board);
    const currentSymbol = game.currentTurn === game.player1 ? "❌" : "⭕";
    
    await Malvin.sendMessage(from, {
        text: `🎮 *TIC TAC TOE*\n\nPlayer 1: @${await getPlayerName(game.player1)} (❌)\nPlayer 2: @${await getPlayerName(game.player2)} (⭕)\n\n${renderBoard(board)}\n\n@${await getPlayerName(game.currentTurn)}'s turn (${currentSymbol})`,
        mentions: [game.player1, game.player2, game.currentTurn],
    });
});

mxd({
    pattern: "wcg",
    aliases: ["wordchain", "wcgstart", "wordgame"],
    react: "🔤",
    category: "game",
    description: "Start a Word Chain Game",
}, async (from, Malvin, conText) => {
    const { sender } = conText;
    
    const existingActive = await getActiveWcgGame(from);
    if (existingActive) {
        return await Malvin.sendMessage(from, {
            text: "❌ There's already an active Word Chain game!\nUse *.wcgend* to end it first.",

        });
    }
    
    const existingWaiting = await getWaitingWcgGame(from);
    if (existingWaiting) {
        return await Malvin.sendMessage(from, {
            text: "❌ A game is waiting for players!\nUse *.wcgjoin* to join or *.wcgend* to cancel.",

        });
    }
    
    await createWcgGame(from, sender);
    
    await Malvin.sendMessage(from, {
        text: `🔤 *WORD CHAIN GAME*\n\n@${await getPlayerName(sender)} wants to play!\n\n📜 *Rules:*\n• Each word must start with the last letter of the previous word\n• No repeating words\n• Minimum 2 letters per word\n• 30 seconds per turn\n\n👥 *Players:*\n1. @${await getPlayerName(sender)}\n\n⏰ *30 seconds to join!*\n*Type .wcgjoin to join!*\n*Host types .wcgbegin to start early*`,
        mentions: [sender],
    });
    
    setWcgJoinTimeout(from, async () => {
        const waitingGame = await getWaitingWcgGame(from);
        if (!waitingGame) return;
        
        const players = JSON.parse(waitingGame.players);
        if (players.length < 2) {
            await endWcgGame(from);
            await Malvin.sendMessage(from, {
                text: "⏰ *Time's up!*\n\nNo one joined the game. Game cancelled.",
            });
            return;
        }
        
        const result = await startWcgGame(from);
        if (result.error) return;
        
        const playerList = result.players.map((p, i) => `${i + 1}. @${getPlayerName(p)}`).join('\n');
        
        await Malvin.sendMessage(from, {
            text: `⏰ *Time's up! Game starting!*\n\n🚀 *WORD CHAIN STARTED!*\n\n👥 *Players:*\n${playerList}\n\n🔄 @${await getPlayerName(result.currentTurn)}'s turn!\n*Say any word to begin!*\n\n⏰ _30 seconds per turn_`,
            mentions: [...result.players, result.currentTurn],
        });
        
        setWcgTurnTimeout(from, Malvin, result.currentTurn, result.game);
    });
});

mxd({
    pattern: "wcgjoin",
    aliases: ["joinwcg", "joinwordchain"],
    react: "✅",
    category: "game",
    description: "Join a Word Chain Game",
}, async (from, Malvin, conText) => {
    const { sender } = conText;
    
    const result = await joinWcgGame(from, sender);
    
    if (result.error === 'no_game') {
        return await Malvin.sendMessage(from, {
            text: "❌ No game waiting! Start one with *.wcg*",
        });
    }
    
    if (result.error === 'cant_join_own_game') {
        return await Malvin.sendMessage(from, {
            text: "❌ You can't play against yourself! Wait for someone else to join.",
        });
    }
    
    if (result.error === 'already_joined') {
        return await Malvin.sendMessage(from, {
            text: "❌ You've already joined this game!",
        });
    }
    
    const playerList = result.players.map((p, i) => `${i + 1}. @${getPlayerName(p)}`).join('\n');
    const mentions = result.players;
    
    await Malvin.sendMessage(from, {
        text: `✅ @${await getPlayerName(sender)} joined!\n\n👥 *Players (${result.players.length}):*\n${playerList}\n\n*More can join with .wcgjoin*\n*Host types .wcgbegin when ready*`,
        mentions,
    });
});

mxd({
    pattern: "wcgbegin",
    aliases: ["startwcg", "wcggo"],
    react: "🚀",
    category: "game",
    description: "Start the Word Chain Game (host only)",
}, async (from, Malvin, conText) => {
    const { sender } = conText;
    
    const waitingGame = await getWaitingWcgGame(from);
    if (!waitingGame) {
        return await Malvin.sendMessage(from, {
            text: "❌ No game waiting to start!",

        });
    }
    
    const players = JSON.parse(waitingGame.players);
    if (players[0] !== sender) {
        return await Malvin.sendMessage(from, {
            text: "❌ Only the host can start the game!",

        });
    }
    
    clearWcgJoinTimeout(from);
    
    const result = await startWcgGame(from);
    
    if (result.error === 'not_enough_players') {
        return await Malvin.sendMessage(from, {
            text: "❌ Need at least 2 players to start!",

        });
    }
    
    const playerList = result.players.map((p, i) => `${i + 1}. @${getPlayerName(p)}`).join('\n');
    
    await Malvin.sendMessage(from, {
        text: `🚀 *WORD CHAIN STARTED!*\n\n👥 *Players:*\n${playerList}\n\n🔄 @${await getPlayerName(result.currentTurn)}'s turn!\n*Say any word to begin!*\n\n⏰ _30 seconds per turn_`,
        mentions: [...result.players, result.currentTurn],
    });
    
    setWcgTurnTimeout(from, Malvin, result.currentTurn, result.game);
});

mxd({
    pattern: "wcgend",
    aliases: ["endwcg", "wcgstop", "stopwcg", "wcgcancel"],
    react: "🛑",
    category: "game",
    description: "End the Word Chain Game",
}, async (from, Malvin, conText) => {
    const { sender, isSuperUser } = conText;
    
    const game = await getActiveWcgGame(from) || await getWaitingWcgGame(from);
    
    if (!game) {
        return await Malvin.sendMessage(from, {
            text: "❌ No Word Chain game to end!",
        });
    }
    
    const players = JSON.parse(game.players);
    const isPlayer = players.includes(sender);
    if (!isPlayer && !isSuperUser) {
        return await Malvin.sendMessage(from, {
            text: "❌ Only players or admins can end the game!",
        });
    }
    
    clearWcgTimeout(from);
    clearWcgJoinTimeout(from);
    const scores = await endWcgGame(from);
    
    let text = `🛑 Word Chain ended by @${await getPlayerName(sender)}!`;
    if (scores && Object.keys(scores).length > 0) {
        text += `\n\n📊 *Final Scores:*\n${formatScores(scores)}`;
    }
    
    await Malvin.sendMessage(from, {
        text,
        mentions: [sender],
    });
});

mxd({
    pattern: "wcgscores",
    aliases: ["wcgscore", "wordchainscore"],
    react: "📊",
    category: "game",
    description: "Show Word Chain scores",
}, async (from, Malvin, conText) => {
    const game = await getActiveWcgGame(from);
    
    if (!game) {
        return await Malvin.sendMessage(from, {
            text: "❌ No active Word Chain game!",

        });
    }
    
    const scores = JSON.parse(game.scores);
    const players = JSON.parse(game.players);
    const usedWords = JSON.parse(game.usedWords);
    
    await Malvin.sendMessage(from, {
        text: `📊 *WORD CHAIN SCORES*\n\n${formatScores(scores)}\n\n📝 Words used: ${usedWords.length}\n🔄 Current turn: @${await getPlayerName(game.currentTurn)}\n${game.lastWord ? `Last word: *${game.lastWord}*` : ''}`,
        mentions: [...players, game.currentTurn],
    });
});

mxd({
    pattern: "w",
    aliases: ["word", "wcgword", "say"],
    react: "🔤",
    category: "game",
    description: "Submit a word in Word Chain Game",
}, async (from, Malvin, conText) => {
    const { sender, q, botPrefix } = conText;
    
    const game = await getActiveWcgGame(from);
    if (!game) {
        return;
    }
    
    if (!q || q.trim() === '') {
        return await Malvin.sendMessage(from, {
            text: `❌ Provide a word!\n\nUsage: ${botPrefix}w <word>`,

        });
    }
    
    const word = q.trim().split(/\s+/)[0];
    const result = await submitWord(from, sender, word);
    
    if (result.error === 'not_your_turn') {
        return await Malvin.sendMessage(from, {
            text: "❌ It's not your turn!",

        });
    }
    
    if (result.error === 'word_used') {
        return await Malvin.sendMessage(from, {
            text: `❌ "${word}" has already been used!`,

        });
    }
    
    if (result.error === 'wrong_letter') {
        return await Malvin.sendMessage(from, {
            text: `❌ Word must start with *${result.expected.toUpperCase()}*!`,

        });
    }
    
    if (result.error === 'too_short') {
        return await Malvin.sendMessage(from, {
            text: "❌ Word must be at least 2 letters!",

        });
    }
    
    clearWcgTimeout(from);
    
    const nextLetter = result.word.slice(-1).toUpperCase();
    
    const updatedGame = await getActiveWcgGame(from);
    if (updatedGame && updatedGame.isAiGame && result.nextPlayer === BOT_JID) {
        await Malvin.sendMessage(from, {
            text: `✅ *${result.word}* (+${result.word.length} pts)\n\n🤖 AI is thinking...`,

        });
        await handleAiWcgMoveInternal(from, Malvin, updatedGame);
        return;
    }
    
    await Malvin.sendMessage(from, {
        text: `✅ *${result.word}* (+${result.word.length} pts)\n\n🔄 @${await getPlayerName(result.nextPlayer)}'s turn\nNext word starts with: *${nextLetter}*\n\n📊 Words: ${result.wordCount} | ⏰ 30s`,
        mentions: [result.nextPlayer],
    });
    
    setWcgTurnTimeout(from, Malvin, result.nextPlayer, result.game);
});

async function handleAiWcgMoveInternal(from, Malvin, game) {
    const lastWord = game.lastWord;
    const usedWords = JSON.parse(game.usedWords);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const aiWord = findWcgWord(lastWord, usedWords);
    
    if (!aiWord) {
        const scores = JSON.parse(game.scores);
        const humanPlayer = JSON.parse(game.players).find(p => p !== BOT_JID);
        await endWcgGame(from);
        if (humanPlayer) await grantExp(humanPlayer, 120, 200);
        await Malvin.sendMessage(from, {
            text: `🎉 *YOU WIN!*\n\n🤖 AI couldn't find a word starting with *${lastWord.slice(-1).toUpperCase()}*!\n\n📊 *Final Scores:*\n${formatScores(scores)}\n\n🎁 *RPG REWARD:* +120 EXP | +200 Gold 💰`,
        });
        return;
    }
    
    const result = await submitWord(from, BOT_JID, aiWord);
    
    if (result.error) {
        const scores = JSON.parse(game.scores);
        const humanPlayer = JSON.parse(game.players).find(p => p !== BOT_JID);
        await endWcgGame(from);
        if (humanPlayer) await grantExp(humanPlayer, 120, 200);
        await Malvin.sendMessage(from, {
            text: `🎉 *YOU WIN!*\n\n🤖 AI made an error!\n\n📊 *Final Scores:*\n${formatScores(scores)}\n\n🎁 *RPG REWARD:* +120 EXP | +200 Gold 💰`,
        });
        return;
    }
    
    const nextLetter = result.word.slice(-1).toUpperCase();
    await Malvin.sendMessage(from, {
        text: `🤖 AI says: *${result.word}* (+${result.word.length} pts)\n\n🔄 @${await getPlayerName(result.nextPlayer)}'s turn\nNext word starts with: *${nextLetter}*\n\n📊 Words: ${result.wordCount} | ⏰ 30s`,
        mentions: [result.nextPlayer],
    });
    
    setWcgTurnTimeout(from, Malvin, result.nextPlayer, result.game);
}

mxd({
    pattern: "dice",
    aliases: ["dicestart", "dicegame", "rolldice"],
    react: "🎲",
    category: "game",
    description: "Start a Dice Game",
}, async (from, Malvin, conText) => {
    const { sender, q } = conText;
    
    const existingActive = await getActiveDiceGame(from);
    if (existingActive) {
        return await Malvin.sendMessage(from, {
            text: "❌ There's already an active Dice game!\nUse *.diceend* to end it first.",

        });
    }
    
    const existingWaiting = await getWaitingDiceGame(from);
    if (existingWaiting) {
        return await Malvin.sendMessage(from, {
            text: "❌ A game is waiting for an opponent!\nUse *.dicejoin* to join or *.diceend* to cancel.",

        });
    }
    
    const rounds = parseInt(q) || 3;
    await createDiceGame(from, sender, rounds);
    
    await Malvin.sendMessage(from, {
        text: `🎲 *DICE GAME*\n\n@${await getPlayerName(sender)} wants to play!\n\n📜 *Rules:*\n• ${rounds} rounds\n• Each player rolls once per round\n• Highest roll wins the round\n• Most rounds won = winner!\n\n*Type .dicejoin to play!*\n⏰ _30 seconds to join_`,
        mentions: [sender],
    });
    
    const timeout = setTimeout(async () => {
        const waiting = await getWaitingDiceGame(from);
        if (waiting) {
            await endDiceGame(from);
            await Malvin.sendMessage(from, {
                text: `⏰ *DICE GAME - TIMEOUT*\n\nNo one joined within 30 seconds.\nGame cancelled!`,
    
            });
        }
    }, 30000);
    diceTimeouts.set(from + '_join', timeout);
});

mxd({
    pattern: "dicejoin",
    aliases: ["joindice"],
    react: "✅",
    category: "game",
    description: "Join a Dice Game",
}, async (from, Malvin, conText) => {
    const { sender } = conText;
    
    if (diceTimeouts.has(from + '_join')) {
        clearTimeout(diceTimeouts.get(from + '_join'));
        diceTimeouts.delete(from + '_join');
    }
    
    const result = await joinDiceGame(from, sender);
    
    if (result.error === 'no_game') {
        return await Malvin.sendMessage(from, {
            text: "❌ No game waiting! Start one with *.dice*",

        });
    }
    
    if (result.error === 'same_player') {
        return await Malvin.sendMessage(from, {
            text: "❌ You can't play against yourself!",

        });
    }
    
    await Malvin.sendMessage(from, {
        text: `🎲 *DICE GAME STARTED!*\n\n👤 @${await getPlayerName(result.player1)} vs @${await getPlayerName(result.player2)}\n🎯 Best of ${result.rounds} rounds\n\n*Round 1*\n@${await getPlayerName(result.player1)}, type *.roll* to roll!\n\n⏰ _30 seconds per turn_`,
        mentions: [result.player1, result.player2],
    });
    
    setDiceTurnTimeout(from, Malvin, result.player1, result.game);
});

mxd({
    pattern: "roll",
    aliases: ["diceroll", "throwdice"],
    react: "🎲",
    category: "game",
    description: "Roll the dice in an active game",
}, async (from, Malvin, conText) => {
    const { sender } = conText;
    
    const game = await getActiveDiceGame(from);
    if (!game) {
        return await Malvin.sendMessage(from, {
            text: "❌ No active Dice game! Start one with *.dice*",

        });
    }
    
    clearDiceTimeout(from);
    const result = await playerRoll(from, sender);
    
    if (result.error === 'not_your_turn') {
        return await Malvin.sendMessage(from, {
            text: "❌ It's not your turn!",

        });
    }
    
    if (result.roundComplete || result.gameFinished) {
        let text = `🎲 *Round ${result.currentRound} Results*\n\n`;
        const [rollN1, rollN2] = await Promise.all([getPlayerName(result.player1), getPlayerName(result.player2)]);
        text += `${getDiceEmoji(result.player1Roll)} @${rollN1}: ${result.player1Roll}\n`;
        text += `${getDiceEmoji(result.player2Roll)} @${rollN2}: ${result.player2Roll}\n\n`;
        
        if (result.roundWinner) {
            text += `🏆 @${await getPlayerName(result.roundWinner)} wins this round!\n`;
        } else {
            text += `🤝 It's a tie!\n`;
        }
        
        text += `\n📊 *Score:* ${result.player1Score} - ${result.player2Score}`;
        
        if (result.gameFinished) {
            text += `\n\n🎮 *GAME OVER!*\n`;
            if (result.gameWinner) {
                text += `🏆 *WINNER:* @${await getPlayerName(result.gameWinner)}!`;
                const rew = await grantExp(result.gameWinner, 100, 175);
                text += `\n\n🎁 *RPG REWARD:* +100 EXP | +175 Gold 💰`;
            } else {
                text += `🤝 *It's a tie!*`;
                await grantExp(result.player1, 25, 50);
                await grantExp(result.player2, 25, 50);
                text += `\n\n🎁 *RPG REWARD:* +25 EXP | +50 Gold 💰 (both)`;
            }
            await endDiceGame(from);
        } else {
            text += `\n\n*Round ${result.nextRound}*\n@${rollN1}, type *.roll*!`;
            setDiceTurnTimeout(from, Malvin, result.player1, game);
        }
        
        await Malvin.sendMessage(from, {
            text,
            mentions: [result.player1, result.player2, result.roundWinner, result.gameWinner].filter(Boolean),
        });
    } else {
        if (game.isAiGame && result.waitingFor === BOT_JID) {
            clearDiceTimeout(from);
            await Malvin.sendMessage(from, {
                text: `🎲 @${await getPlayerName(sender)} rolled: ${getDiceEmoji(result.roll)} *${result.roll}*\n\n🤖 AI is rolling...`,
                mentions: [sender],
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const aiResult = await playerRoll(from, BOT_JID);
            
            if (aiResult.error) {
                await Malvin.sendMessage(from, {
                    text: `❌ AI roll error. Game ended.`,
                });
                await endDiceGame(from);
                return;
            }
            
            let text = `🎲 *Round ${aiResult.currentRound} Results*\n\n`;
            const aiRollN1 = await getPlayerName(aiResult.player1);
        text += `${getDiceEmoji(aiResult.player1Roll)} @${aiRollN1}: ${aiResult.player1Roll}\n`;
            text += `${getDiceEmoji(aiResult.player2Roll)} 🤖 AI: ${aiResult.player2Roll}\n\n`;
            
            if (aiResult.roundWinner) {
                const winnerName = aiResult.roundWinner === BOT_JID ? '🤖 AI' : `@${await getPlayerName(aiResult.roundWinner)}`;
                text += `🏆 ${winnerName} wins this round!\n`;
            } else {
                text += `🤝 It's a tie!\n`;
            }
            
            text += `\n📊 *Score:* ${aiResult.player1Score} - ${aiResult.player2Score}`;
            
            if (aiResult.gameFinished) {
                text += `\n\n🎮 *GAME OVER!*\n`;
                if (aiResult.gameWinner) {
                    const winnerName = aiResult.gameWinner === BOT_JID ? '🤖 AI wins!' : `🏆 @${await getPlayerName(aiResult.gameWinner)} wins!`;
                    text += winnerName;
                } else {
                    text += `🤝 *It's a tie!*`;
                }
                await endDiceGame(from);
            } else {
                text += `\n\n*Round ${aiResult.nextRound}*\n@${aiRollN1}, type *.roll*!`;
                const freshGame = await getActiveDiceGame(from);
                setDiceTurnTimeout(from, Malvin, aiResult.player1, freshGame);
            }
            
            await Malvin.sendMessage(from, {
                text,
                mentions: [aiResult.player1],
            });
            return;
        }
        
        await Malvin.sendMessage(from, {
            text: `🎲 @${await getPlayerName(sender)} rolled: ${getDiceEmoji(result.roll)} *${result.roll}*\n\n@${await getPlayerName(result.waitingFor)}, type *.roll*!`,
            mentions: [sender, result.waitingFor],
        });
        setDiceTurnTimeout(from, Malvin, result.waitingFor, game);
    }
});

mxd({
    pattern: "diceend",
    aliases: ["enddice", "dicestop", "stopdice", "dicecancel"],
    react: "🛑",
    category: "game",
    description: "End the Dice Game",
}, async (from, Malvin, conText) => {
    const { sender, isSuperUser } = conText;
    
    const game = await getActiveDiceGame(from) || await getWaitingDiceGame(from);
    
    if (!game) {
        return await Malvin.sendMessage(from, {
            text: "❌ No Dice game to end!",
        });
    }
    
    const isPlayer = game.player1 === sender || game.player2 === sender;
    if (!isPlayer && !isSuperUser) {
        return await Malvin.sendMessage(from, {
            text: "❌ Only players or admins can end the game!",
        });
    }
    
    clearDiceTimeout(from);
    if (diceTimeouts.has(from + '_join')) {
        clearTimeout(diceTimeouts.get(from + '_join'));
        diceTimeouts.delete(from + '_join');
    }
    await endDiceGame(from);
    
    await Malvin.sendMessage(from, {
        text: `🛑 Dice game ended by @${await getPlayerName(sender)}!`,
        mentions: [sender],
    });
});

mxd({
    pattern: "tttai",
    aliases: ["tttbot", "tictactoeai", "aitt"],
    react: "🤖",
    category: "game",
    description: "Play TicTacToe against AI",
}, async (from, Malvin, conText) => {
    const { sender } = conText;
    
    const existingActive = await getActiveGame(from);
    if (existingActive) {
        return await Malvin.sendMessage(from, {
            text: "❌ There's already an active game in this chat!\nUse *.tttend* to end it first.",

        });
    }
    
    const existingWaiting = await getWaitingGame(from);
    if (existingWaiting) {
        return await Malvin.sendMessage(from, {
            text: "❌ There's already a game waiting!\nUse *.tttend* to cancel.",

        });
    }
    
    const sentMsg = await Malvin.sendMessage(from, {
        text: `🤖 *TIC TAC TOE vs AI*\n\nPlayer: @${await getPlayerName(sender)} (❌)\nAI: 🤖 (⭕)\n\n${renderBoard([1, 2, 3, 4, 5, 6, 7, 8, 9])}\n\n@${await getPlayerName(sender)}'s turn (❌)\n*Reply with a number (1-9) to move!*`,
        mentions: [sender],
    });
    
    await createGame(from, sender, sentMsg.key, true);
});

mxd({
    pattern: "wcgai",
    aliases: ["wcgbot", "wordchainai", "aiwcg"],
    react: "🤖",
    category: "game",
    description: "Play Word Chain Game against AI",
}, async (from, Malvin, conText) => {
    const { sender } = conText;
    
    const existingActive = await getActiveWcgGame(from);
    if (existingActive) {
        return await Malvin.sendMessage(from, {
            text: "❌ There's already an active Word Chain game!\nUse *.wcgend* to end it first.",

        });
    }
    
    const existingWaiting = await getWaitingWcgGame(from);
    if (existingWaiting) {
        return await Malvin.sendMessage(from, {
            text: "❌ A game is waiting for players!\nUse *.wcgend* to cancel.",

        });
    }
    
    const { WcgDB } = require("../king/database/wcgGame");
    await WcgDB.destroy({ where: { chatJid: from } });
    
    const scores = {};
    scores[sender] = 0;
    scores[BOT_JID] = 0;
    
    await WcgDB.create({
        chatJid: from,
        players: JSON.stringify([sender, BOT_JID]),
        currentTurn: sender,
        lastWord: null,
        usedWords: '[]',
        scores: JSON.stringify(scores),
        status: 'active',
        isAiGame: true,
    });
    
    await Malvin.sendMessage(from, {
        text: `🤖 *WORD CHAIN vs AI*\n\n📜 *Rules:*\n• Each word must start with the last letter of the previous word\n• No repeating words\n• Minimum 2 letters per word\n• 30 seconds per turn\n\n👤 @${await getPlayerName(sender)} vs 🤖 AI\n\n@${await getPlayerName(sender)}'s turn - say any word to start!\n\n⏰ _30 seconds per turn_`,
        mentions: [sender],
    });
    
    setWcgTurnTimeout(from, Malvin, sender, null);
});

mxd({
    pattern: "diceai",
    aliases: ["dicebot", "aidice", "rolldiceai"],
    react: "🤖",
    category: "game",
    description: "Play Dice against AI",
}, async (from, Malvin, conText) => {
    const { sender, q } = conText;
    
    const existingActive = await getActiveDiceGame(from);
    if (existingActive) {
        return await Malvin.sendMessage(from, {
            text: "❌ There's already an active Dice game!\nUse *.diceend* to end it first.",

        });
    }
    
    const existingWaiting = await getWaitingDiceGame(from);
    if (existingWaiting) {
        return await Malvin.sendMessage(from, {
            text: "❌ A game is waiting!\nUse *.diceend* to cancel.",

        });
    }
    
    const rounds = parseInt(q) || 3;
    const { DiceDB } = require("../king/database/diceEngine");
    await DiceDB.destroy({ where: { chatJid: from } });
    
    await DiceDB.create({
        chatJid: from,
        player1: sender,
        player2: BOT_JID,
        player1Roll: null,
        player2Roll: null,
        currentTurn: sender,
        rounds: Math.min(Math.max(rounds, 1), 10),
        currentRound: 1,
        player1Score: 0,
        player2Score: 0,
        status: 'active',
        isAiGame: true,
    });
    
    await Malvin.sendMessage(from, {
        text: `🤖 *DICE GAME vs AI*\n\n👤 @${await getPlayerName(sender)} vs 🤖 AI\n🎯 Best of ${rounds} rounds\n\n*Round 1*\n@${await getPlayerName(sender)}, type *.roll* to roll!\n\n⏰ _30 seconds per turn_`,
        mentions: [sender],
    });
    
    setDiceTurnTimeout(from, Malvin, sender, null);
});

module.exports = {};
