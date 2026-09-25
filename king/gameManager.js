const {
    joinGame,
    getActiveGame,
    getWaitingGame,
    makeMove,
    endGame,
} = require("./database/gameStore");

const {
    getActiveWcgGame,
    getWaitingWcgGame,
    joinWcgGame,
    submitWord,
    eliminatePlayer,
    endWcgGame,
} = require("./database/wcgGame");

const {
    getActiveDiceGame,
    getWaitingDiceGame,
    joinDiceGame,
    playerRoll,
    endDiceGame,
} = require("./database/diceEngine");

const { findBestTttMove, findWcgWord, BOT_JID } = require("./GAI");
const { wcgTimeouts, clearWcgTimeout, formatScores, getDiceEmoji } = require("./wordChain");
const { grantExp, addGold, fetchPlayer } = require("./rpg/db");

// ─── Game reward tables ───────────────────────────────────────────────────────
const GAME_REWARDS = {
    ttt:  { win: { exp: 80,  gold: 150 }, draw: { exp: 20, gold: 30  } },
    wcg:  { win: { exp: 120, gold: 200 }                                },
    dice: { win: { exp: 100, gold: 175 }, draw: { exp: 25, gold: 50  } },
};

async function grantGameReward(winnerJid, game, outcome = 'win') {
    if (!winnerJid || winnerJid === BOT_JID) return null;
    const r = GAME_REWARDS[game]?.[outcome];
    if (!r) return null;
    await grantExp(winnerJid, r.exp, r.gold);
    return r;
}

const gameTimeouts = new Map();
const diceTimeouts = new Map();

// Username-aware name resolver — returns RPG username if set, else JID number
const _nameCache = new Map();
async function getPlayerName(jid) {
    if (!jid) return 'Unknown';
    if (jid === BOT_JID) return 'AI';
    if (_nameCache.has(jid)) return _nameCache.get(jid);
    try {
        const player = await fetchPlayer(jid);
        const name = player?.username || jid.split('@')[0];
        _nameCache.set(jid, name);
        // Cache busts after 5 min so setname changes propagate
        setTimeout(() => _nameCache.delete(jid), 5 * 60 * 1000);
        return name;
    } catch {
        return jid.split('@')[0];
    }
}

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

const clearGameTimeout = (chatJid) => {
    const timeout = gameTimeouts.get(chatJid);
    if (timeout) {
        clearTimeout(timeout);
        gameTimeouts.delete(chatJid);
    }
};

const clearDiceTimeout = (chatJid) => {
    if (diceTimeouts.has(chatJid)) {
        clearTimeout(diceTimeouts.get(chatJid));
        diceTimeouts.delete(chatJid);
    }
};

const setMoveTimeout = (chatJid, Malvin, currentPlayer, otherPlayer, player1) => {
    clearGameTimeout(chatJid);
    const timeout = setTimeout(async () => {
        const active = await getActiveGame(chatJid);
        if (active && active.currentTurn === currentPlayer) {
            await endGame(chatJid);
            const currentSymbol = currentPlayer === active.player1 ? "❌" : "⭕";
            const reward = await grantGameReward(otherPlayer, 'ttt', 'win');
            const rewardText = reward ? `\n\n🎁 *RPG REWARD:* +${reward.exp} EXP | +${reward.gold} Gold 💰` : '';
            const [nCurrent, nOther] = await Promise.all([getPlayerName(currentPlayer), getPlayerName(otherPlayer)]);
            await Malvin.sendMessage(chatJid, {
                text: `⏰ *TIC TAC TOE - TIMEOUT*\n\n@${nCurrent} (${currentSymbol}) took too long to move!\n\n🏆 *WINNER: @${nOther}* by timeout!\n\nStart a new game with *.ttt*${rewardText}`,
                mentions: [currentPlayer, otherPlayer],
            });
        }
        gameTimeouts.delete(chatJid);
    }, 30000);
    gameTimeouts.set(chatJid, timeout);
};

const setWcgTurnTimeout = (chatJid, Malvin, currentPlayer, game) => {
    clearWcgTimeout(chatJid);
    const timeout = setTimeout(async () => {
        const activeGame = await getActiveWcgGame(chatJid);
        if (activeGame && activeGame.currentTurn === currentPlayer) {
            const result = await eliminatePlayer(chatJid, currentPlayer);
            if (result.finished) {
                await endWcgGame(chatJid);
                if (result.noWinner || !result.winner) {
                    const nCurrent0 = await getPlayerName(currentPlayer);
                    await Malvin.sendMessage(chatJid, {
                        text: `⏰ *WORD CHAIN - GAME OVER*\n\n@${nCurrent0} ran out of time!\n\n📊 *Final Scores:*\n${formatScores(result.scores)}`,
                        mentions: [currentPlayer],
                    });
                } else {
                    const reward = await grantGameReward(result.winner, 'wcg', 'win');
                    const rewardText = reward ? `\n\n🎁 *RPG REWARD:* +${reward.exp} EXP | +${reward.gold} Gold 💰` : '';
                    const [nCurWcg, nWinner] = await Promise.all([getPlayerName(currentPlayer), getPlayerName(result.winner)]);
                    await Malvin.sendMessage(chatJid, {
                        text: `⏰ *WORD CHAIN - TIMEOUT*\n\n@${nCurWcg} ran out of time!\n\n🏆 *WINNER:* @${nWinner}\n\n📊 *Final Scores:*\n${formatScores(result.scores)}${rewardText}`,
                        mentions: [currentPlayer, result.winner],
                    });
                }
            } else {
                const [nElim, nNext] = await Promise.all([getPlayerName(currentPlayer), getPlayerName(result.nextPlayer)]);
                await Malvin.sendMessage(chatJid, {
                    text: `⏰ @${nElim} ran out of time and is eliminated!\n\n🔄 @${nNext}'s turn\nLast word: *${activeGame.lastWord || 'None'}*\n${activeGame.lastWord ? `Start with: *${activeGame.lastWord.slice(-1).toUpperCase()}*` : 'Any word to start!'}\n\n⏰ _30 seconds to respond_`,
                    mentions: [currentPlayer, result.nextPlayer],
                });
                setWcgTurnTimeout(chatJid, Malvin, result.nextPlayer, activeGame);
            }
        }
        wcgTimeouts.delete(chatJid);
    }, 30000);
    wcgTimeouts.set(chatJid, timeout);
};

const setDiceTurnTimeout = (chatJid, Malvin, currentPlayer, game) => {
    clearDiceTimeout(chatJid);
    const timeout = setTimeout(async () => {
        const activeGame = await getActiveDiceGame(chatJid);
        if (activeGame && activeGame.currentTurn === currentPlayer) {
            await endDiceGame(chatJid);
            const otherPlayer = currentPlayer === activeGame.player1 ? activeGame.player2 : activeGame.player1;
            const reward = await grantGameReward(otherPlayer, 'dice', 'win');
            const rewardText = reward ? `\n🎁 *RPG REWARD:* +${reward.exp} EXP | +${reward.gold} Gold 💰` : '';
            const [nDiceCur, nDiceOther] = await Promise.all([getPlayerName(currentPlayer), getPlayerName(otherPlayer)]);
            await Malvin.sendMessage(chatJid, {
                text: `⏰ *DICE GAME - TIMEOUT*\n\n@${nDiceCur} took too long!\n🏆 @${nDiceOther} wins by default!${rewardText}`,
                mentions: [currentPlayer, otherPlayer],
            });
        }
        diceTimeouts.delete(chatJid);
    }, 30000);
    diceTimeouts.set(chatJid, timeout);
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
    const nAiTtt = await getPlayerName(result.game.currentTurn);
    await Malvin.sendMessage(from, {
        text: `🤖 AI played position ${aiMove + 1}\n\n${renderBoard(newBoard)}\n\n@${nAiTtt}'s turn (❌)\n\n⏰ _30 seconds_`,
        mentions: [result.game.currentTurn],
    });
    
    setMoveTimeout(from, Malvin, result.game.currentTurn, BOT_JID, result.game.player1);
}

async function handleAiWcgMove(from, Malvin, gameRef) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const freshGame = await getActiveWcgGame(from);
    if (!freshGame) return;
    
    const usedWords = JSON.parse(freshGame.usedWords || '[]');
    const aiWord = await findWcgWord(freshGame.lastWord, usedWords);
    
    const lastLetter = freshGame.lastWord ? freshGame.lastWord.slice(-1).toUpperCase() : 'any letter';
    
    if (!aiWord) {
        const humanPlayer = freshGame.player1 === BOT_JID ? freshGame.player2 : freshGame.player1;
        const scores = JSON.parse(freshGame.scores || '{}');
        await Malvin.sendMessage(from, {
            text: `🤖 AI couldn't find a word starting with *${lastLetter}*!\n\n🏆 *WINNER:* @${await getPlayerName(humanPlayer)}\n\n📊 *Final Scores:*\n${formatScores(scores)}`,
            mentions: [humanPlayer],
        });
        await endWcgGame(from);
        return;
    }
    
    const result = await submitWord(from, BOT_JID, aiWord);
    if (result.error) return;
    
    clearWcgTimeout(from);
    const nextLetter = result.word.slice(-1).toUpperCase();
    
    const nWcgNext = await getPlayerName(result.nextPlayer);
    await Malvin.sendMessage(from, {
        text: `🤖 AI: *${result.word}* (+${result.word.length} pts)\n\n🔄 @${nWcgNext}'s turn\nNext word starts with: *${nextLetter}*\n\n📊 Words: ${result.wordCount} | ⏰ 30s`,
        mentions: [result.nextPlayer],
    });
    
    setWcgTurnTimeout(from, Malvin, result.nextPlayer, result.game);
}

async function handleAiDiceRoll(from, Malvin, gameRef) {
    clearDiceTimeout(from);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = await playerRoll(from, BOT_JID);
    
    if (result.error) {
        await Malvin.sendMessage(from, {
            text: `❌ AI roll error. Game ended.`,
        });
        await endDiceGame(from);
        return;
    }
    
    const nDiceP1 = await getPlayerName(result.player1);
    let text = `🎲 *Round ${result.currentRound} Results*\n\n`;
    text += `${getDiceEmoji(result.player1Roll)} @${nDiceP1}: ${result.player1Roll}\n`;
    text += `${getDiceEmoji(result.player2Roll)} 🤖 AI: ${result.player2Roll}\n\n`;
    
    if (result.roundWinner) {
        const winnerName = result.roundWinner === BOT_JID ? '🤖 AI' : `@${await getPlayerName(result.roundWinner)}`;
        text += `🏆 ${winnerName} wins this round!\n`;
    } else {
        text += `🤝 It's a tie!\n`;
    }
    
    text += `\n📊 *Score:* ${result.player1Score} - ${result.player2Score}`;
    
    if (result.gameFinished) {
        text += `\n\n🎮 *GAME OVER!*\n`;
        if (result.gameWinner) {
            const winnerName = result.gameWinner === BOT_JID ? '🤖 AI wins!' : `🏆 @${await getPlayerName(result.gameWinner)} wins!`;
            text += winnerName;
            const reward = await grantGameReward(result.gameWinner, 'dice', 'win');
            if (reward) text += `\n\n🎁 *RPG REWARD:* +${reward.exp} EXP | +${reward.gold} Gold 💰`;
        } else {
            text += `🤝 *It's a tie!*`;
            // Grant draw reward to the human player
            const humanPlayer = result.player1 !== BOT_JID ? result.player1 : result.player2;
            const reward = await grantGameReward(humanPlayer, 'dice', 'draw');
            if (reward) text += `\n\n🎁 *RPG REWARD:* +${reward.exp} EXP | +${reward.gold} Gold 💰 (both)`;
        }
        await endDiceGame(from);
    } else {
        text += `\n\n*Round ${result.nextRound}*\n@${nDiceP1}, type *roll*!`;
        const freshGame = await getActiveDiceGame(from);
        setDiceTurnTimeout(from, Malvin, result.player1, freshGame);
    }
    
    await Malvin.sendMessage(from, {
        text,
        mentions: [result.player1],
    });
}

const handleGameMessage = async (Malvin, message) => {
    try {
        if (!message?.message) return;
        
        const from = message.key.remoteJid;
        const isPrivateChat = !from.endsWith('@g.us');
        
        if (message.key.fromMe && !isPrivateChat) return;
        
        const sender = message.key.participantPn || message.key.senderPn || message.key.participant || message.key.participantAlt || message.key.remoteJidAlt || message.key.remoteJid;
        
        if (!sender || sender.endsWith('@g.us')) return;
        
        const messageType = Object.keys(message.message)[0];
        const body = (messageType === 'conversation'
            ? message.message.conversation
            : message.message[messageType]?.text || message.message[messageType]?.caption || '').trim();
        
        if (!body) return;
        
        const lowerBody = body.toLowerCase();
        
        if (lowerBody === 'join') {
            const tttWaiting = await getWaitingGame(from);
            if (tttWaiting) {
                const result = await joinGame(from, sender);
                if (result && !result.error) {
                    clearGameTimeout(from);
                    const board = JSON.parse(result.board);
                    const [nP1Start, nP2Start, nTurnStart] = await Promise.all([getPlayerName(result.player1), getPlayerName(result.player2), getPlayerName(result.currentTurn)]);
                    await Malvin.sendMessage(from, {
                        text: `🎮 *TIC TAC TOE - GAME STARTED!*\n\nPlayer 1: @${nP1Start} (❌)\nPlayer 2: @${nP2Start} (⭕)\n\n${renderBoard(board)}\n\n@${nTurnStart}'s turn (❌)\n\n*Reply with a number (1-9) to move!*\n⏰ _30 seconds per move_`,
                        mentions: [result.player1, result.player2, result.currentTurn],
                    });
                    setMoveTimeout(from, Malvin, result.currentTurn, result.player2, result.player1);
                    return;
                }
            }
            
            const wcgWaiting = await getWaitingWcgGame(from);
            if (wcgWaiting) {
                const result = await joinWcgGame(from, sender);
                if (result && !result.error) {
                    const nJoinWcg = await getPlayerName(sender);
                    await Malvin.sendMessage(from, {
                        text: `✅ @${nJoinWcg} joined the Word Chain game!\n\n👥 Players: ${result.players?.length || 0}\nHost can type *.wcgbegin* to start!`,
                        mentions: [sender],
                    });
                    return;
                }
            }
            
            const diceWaiting = await getWaitingDiceGame(from);
            if (diceWaiting) {
                const result = await joinDiceGame(from, sender);
                if (result && !result.error) {
                    clearDiceTimeout(from);
                    const [nDStart1, nDStart2] = await Promise.all([getPlayerName(result.player1), getPlayerName(result.player2)]);
                    await Malvin.sendMessage(from, {
                        text: `🎲 *DICE GAME STARTED!*\n\n@${nDStart1} vs @${nDStart2}\nRounds: ${result.totalRounds}\n\n@${nDStart1}, type *roll* to start!`,
                        mentions: [result.player1, result.player2],
                    });
                    setDiceTurnTimeout(from, Malvin, result.player1, result.game);
                    return;
                }
            }
            return;
        }
        
        const num = parseInt(body);
        if (!isNaN(num) && num >= 1 && num <= 9) {
            const game = await getActiveGame(from);
            if (!game) return;
            if (game.player1 !== sender && game.player2 !== sender) return;
            
            const result = await makeMove(from, sender, num);
            if (result.error) return;
            
            const board = JSON.parse(result.game.board);
            
            if (result.winner) {
                clearGameTimeout(from);
                const winnerSymbol = result.symbol === "X" ? "❌" : "⭕";
                const reward = await grantGameReward(result.winner, 'ttt', 'win');
                const rewardText = reward ? `\n\n🎁 *RPG REWARD:* +${reward.exp} EXP | +${reward.gold} Gold 💰` : '';
                const nTttWin = await getPlayerName(result.winner);
                await Malvin.sendMessage(from, {
                    text: `🎮 *TIC TAC TOE - GAME OVER!*\n\n${renderBoard(board)}\n\n🏆 *WINNER: @${nTttWin}* ${winnerSymbol}\n\nCongratulations! 🎉${rewardText}`,
                    mentions: [result.winner],
                });
                return;
            }
            
            if (result.draw) {
                clearGameTimeout(from);
                const loser = result.game?.player1 === sender ? result.game?.player2 : result.game?.player1;
                await grantGameReward(sender, 'ttt', 'draw');
                if (loser) await grantGameReward(loser, 'ttt', 'draw');
                await Malvin.sendMessage(from, {
                    text: `🎮 *TIC TAC TOE - GAME OVER!*\n\n${renderBoard(board)}\n\n🤝 *IT'S A DRAW!*\n\nGood game! Start a new one with *.ttt*\n\n🎁 *RPG REWARD:* +20 EXP | +30 Gold 💰 (both players)`,
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
            
            const [nTttP1, nTttP2, nTttTurn] = await Promise.all([getPlayerName(result.game.player1), getPlayerName(result.game.player2), getPlayerName(result.game.currentTurn)]);
            await Malvin.sendMessage(from, {
                text: `🎮 *TIC TAC TOE*\n\nPlayer 1: @${nTttP1} (❌)\nPlayer 2: @${nTttP2} (⭕)\n\n${renderBoard(board)}\n\n@${nTttTurn}'s turn (${currentSymbol})\n\n*Reply 1-9 to move*\n⏰ _30 seconds_`,
                mentions: [result.game.player1, result.game.player2, result.game.currentTurn],
            });
            
            setMoveTimeout(from, Malvin, result.game.currentTurn, otherPlayer, result.game.player1);
            return;
        }
        
        if (lowerBody === 'roll') {
            const game = await getActiveDiceGame(from);
            if (!game) return;
            if (game.player1 !== sender && game.player2 !== sender) return;
            
            clearDiceTimeout(from);
            const result = await playerRoll(from, sender);
            
            if (result.error === 'not_your_turn') return;
            if (result.error) return;
            
            if (result.roundComplete || result.gameFinished) {
                const [nRollP1, nRollP2] = await Promise.all([getPlayerName(result.player1), getPlayerName(result.player2)]);
                let text = `🎲 *Round ${result.currentRound} Results*\n\n`;
                text += `${getDiceEmoji(result.player1Roll)} @${nRollP1}: ${result.player1Roll}\n`;
                text += `${getDiceEmoji(result.player2Roll)} @${nRollP2}: ${result.player2Roll}\n\n`;
                
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
                    } else {
                        text += `🤝 *It's a tie!*`;
                    }
                    await endDiceGame(from);
                } else {
                    text += `\n\n*Round ${result.nextRound}*\n@${nRollP1}, type *roll*!`;
                    setDiceTurnTimeout(from, Malvin, result.player1, game);
                }
                
                await Malvin.sendMessage(from, {
                    text,
                    mentions: [result.player1, result.player2, result.roundWinner, result.gameWinner].filter(Boolean),
                });
            } else {
                if (game.isAiGame && result.waitingFor === BOT_JID) {
                    const nDiceAiSender = await getPlayerName(sender);
                    await Malvin.sendMessage(from, {
                        text: `🎲 @${nDiceAiSender} rolled: ${getDiceEmoji(result.roll)} *${result.roll}*\n\n🤖 AI is rolling...`,
                        mentions: [sender],
                    });
                    await handleAiDiceRoll(from, Malvin, game);
                    return;
                }
                
                const [nRollSender, nRollWait] = await Promise.all([getPlayerName(sender), getPlayerName(result.waitingFor)]);
                await Malvin.sendMessage(from, {
                    text: `🎲 @${nRollSender} rolled: ${getDiceEmoji(result.roll)} *${result.roll}*\n\n@${nRollWait}, type *roll*!`,
                    mentions: [sender, result.waitingFor],
                });
                setDiceTurnTimeout(from, Malvin, result.waitingFor, game);
            }
            return;
        }
        
        const wcgGame = await getActiveWcgGame(from);
        if (wcgGame) {
            const players = JSON.parse(wcgGame.players || '[]');
            if (!players.includes(sender)) return;
            
            const word = body.split(/\s+/)[0].toLowerCase();
            if (!word || word.length < 2 || !/^[a-z]+$/.test(word)) return;
            
            const result = await submitWord(from, sender, word);
            
            if (result.error === 'not_your_turn') return;
            if (result.error === 'word_used') {
                await Malvin.sendMessage(from, {
                    text: `❌ "${word}" has already been used!`,
                });
                return;
            }
            if (result.error === 'wrong_letter') {
                await Malvin.sendMessage(from, {
                    text: `❌ Word must start with *${result.expected.toUpperCase()}*!`,
                });
                return;
            }
            if (result.error === 'too_short') {
                await Malvin.sendMessage(from, {
                    text: "❌ Word must be at least 2 letters!",
                });
                return;
            }
            if (result.error === 'invalid_word') {
                await Malvin.sendMessage(from, {
                    text: `❌ "${word}" is not a valid English word!`,
                });
                return;
            }
            if (result.error) return;
            
            clearWcgTimeout(from);
            const nextLetter = result.word.slice(-1).toUpperCase();
            
            const updatedGame = await getActiveWcgGame(from);
            if (updatedGame && updatedGame.isAiGame && result.nextPlayer === BOT_JID) {
                await Malvin.sendMessage(from, {
                    text: `✅ *${result.word}* (+${result.word.length} pts)\n\n🤖 AI is thinking...`,
                });
                await handleAiWcgMove(from, Malvin, updatedGame);
                return;
            }
            
            const nWcgSubmitNext = await getPlayerName(result.nextPlayer);
            await Malvin.sendMessage(from, {
                text: `✅ *${result.word}* (+${result.word.length} pts)\n\n🔄 @${nWcgSubmitNext}'s turn\nNext word starts with: *${nextLetter}*\n\n📊 Words: ${result.wordCount} | ⏰ 30s`,
                mentions: [result.nextPlayer],
            });
            
            setWcgTurnTimeout(from, Malvin, result.nextPlayer, result.game);
            return;
        }
    } catch (err) {
        console.error('Game handler error:', err);
    }
};

module.exports = { 
    handleGameMessage,
    clearGameTimeout,
    clearDiceTimeout,
    setMoveTimeout,
    setWcgTurnTimeout,
    setDiceTurnTimeout,
    renderBoard,
    getPlayerName,
    handleAiTttMove,
    handleAiWcgMove,
    handleAiDiceRoll,
    gameTimeouts,
    diceTimeouts,
};
