/**
 * malvin/gambling.js
 * Chaos & Gambling — Malvin-XD Sovereign RPG
 * 40 Commands: .rob .assassinate .bribe-enforcer .slot .bj .roulette
 *              .coinflip .dice .cock-fight .lotto .scratch .bet
 *              .double-or-nothing + more
 */

const { mxd } = require('../king');
const {
    getPlayer, fetchPlayer,
    addGold, removeGold, addKarma, grantExp,
    checkCooldown, setCooldown, formatCooldown,
    buildBox, buildFooter, scaleRewards,
} = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { GlobalPlayer } = require('../king/rpg/model');

// ─── Cooldowns ────────────────────────────────────────────────────────────────
const CD = {
    rob:         60  * 60 * 1000, // 1 hr
    assassinate: 4   * 60 * 60 * 1000, // 4 hrs
    bribeenf:    2   * 60 * 60 * 1000, // 2 hrs
    slot:        5   * 60 * 1000, // 5 min
    bj:          3   * 60 * 1000, // 3 min
    roulette:    5   * 60 * 1000, // 5 min
    coinflip:    1   * 60 * 1000, // 1 min
    dice:        2   * 60 * 1000, // 2 min
    cockfight:   30  * 60 * 1000, // 30 min
    lotto:       24  * 60 * 60 * 1000, // 24 hrs
    scratch:     60  * 60 * 1000, // 1 hr
    bet:         5   * 60 * 1000, // 5 min
    doubleornothing: 10 * 60 * 1000, // 10 min
};

// ─── Slot symbols ─────────────────────────────────────────────────────────────
const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '⭐', '💎', '7️⃣', '👑'];
const SLOT_PAYOUTS = {
    '🍒🍒🍒': 2,
    '🍋🍋🍋': 3,
    '🍊🍊🍊': 4,
    '⭐⭐⭐': 6,
    '💎💎💎': 10,
    '7️⃣7️⃣7️⃣': 15,
    '👑👑👑': 25,
};

function spinSlots() {
    return [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
}

// ─── Cock-fight roster ────────────────────────────────────────────────────────
const ROOSTERS = [
    { name: 'Red Storm',    str: 80,  luk: 60 },
    { name: 'Black Thunder',str: 70,  luk: 75 },
    { name: 'Golden Fang',  str: 90,  luk: 50 },
    { name: 'Shadow Beak',  str: 65,  luk: 90 },
    { name: 'Iron Claw',    str: 85,  luk: 55 },
];

// ─── Lotto pool ───────────────────────────────────────────────────────────────
const LOTTO_JACKPOT = 50000;

// ════════════════════════════════════════════════════════════════════════════
// .rob — Attempt to rob another player
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'rob',
        aliases:     ['steal', 'mug'],
        category:    'gambling',
        react:       '🦹',
        description: 'Attempt to rob another player for gold',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to rob.\nExample: *.rob @player*');
        if (targetJid === sender) return reply('❌ Cannot rob yourself!');

        await getPlayer(sender, botId);
        const robber = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(robber, 'rob', CD.rob);
        if (onCooldown) return reply(buildBox('🦹 ON COOLDOWN', [`  Rob resets in: ${formatCooldown(remaining)}`]));

        const target = await fetchPlayer(targetJid);
        if (!target) return reply('❌ Target not found.');
        if (target.gold < 100) return reply('❌ Target is too broke to rob!');

        // LUK affects rob success rate
        const lukBonus  = 1 + (robber.stats.luk - 1) * 0.02;
        const darkBonus = ['Dark', 'Chaos'].includes(robber.alignment) ? 1.2 : 1;
        const successRate = Math.min(0.75, 0.35 * lukBonus * darkBonus);
        const success     = Math.random() < successRate;

        await setCooldown(sender, 'rob');

        if (success) {
            const stolen = Math.floor(target.gold * (0.1 + Math.random() * 0.15));
            await GlobalPlayer.updateOne({ jid: targetJid }, { $inc: { gold: -stolen } });
            await GlobalPlayer.updateOne({ jid: sender    }, { $inc: { gold:  stolen } });
            await addKarma(sender, -15);

            await react('🦹');
            await reply(
                buildBox('🦹 ROB SUCCESS', [
                    `  Target: @${targetJid.split('@')[0]}`,
                    `  💰 Stolen: ${stolen.toLocaleString()} Gold`,
                    `  ⚖️  Karma: -15`,
                    ...(darkBonus > 1 ? [`  🌑 Dark bonus applied!`] : []),
                    `  ───────`,
                    buildFooter(0, stolen, robber),
                ])
            );
        } else {
            const fine = Math.floor(robber.gold * 0.05);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -fine } });
            await addKarma(sender, -5);

            await react('🚔');
            await reply(
                buildBox('🦹 ROB FAILED', [
                    `  You got caught red-handed!`,
                    `  💰 Fine: -${fine.toLocaleString()} Gold`,
                    `  ⚖️  Karma: -5`,
                    `  Success rate was: ${Math.floor(successRate * 100)}%`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .assassinate — Attempt to assassinate a player for bounty
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'assassinate',
        aliases:     ['assassin', 'hitjob'],
        category:    'gambling',
        react:       '🗡️',
        description: 'Attempt to assassinate a player and claim their bounty',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to assassinate.');
        if (targetJid === sender) return reply('❌ Cannot assassinate yourself!');

        await getPlayer(sender, botId);
        const assassin = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(assassin, 'assassinate', CD.assassinate);
        if (onCooldown) return reply(buildBox('🗡️ ON COOLDOWN', [`  Assassinate resets in: ${formatCooldown(remaining)}`]));

        const target = await fetchPlayer(targetJid);
        if (!target) return reply('❌ Target not found.');

        const { rankId: aRank } = getRank(assassin.level, sender);
        const { rankId: tRank } = getRank(target.level,   targetJid);
        const successRate = Math.min(0.8, 0.3 + (aRank - tRank) * 0.05 + (assassin.stats.agi - 1) * 0.02);
        const success     = Math.random() < successRate;

        await setCooldown(sender, 'assassinate');

        if (success) {
            const bountyGold = target.bounty || 0;
            const stolenGold = Math.floor(target.gold * 0.15);
            const totalGain  = bountyGold + stolenGold;

            await GlobalPlayer.updateOne({ jid: targetJid }, {
                $inc: { gold: -stolenGold },
                $set: { bounty: 0, 'combat.hp': 1 }
            });
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: totalGain } });
            await addKarma(sender, -40);

            await react('🗡️');
            await reply(
                buildBox('🗡️ ASSASSINATION SUCCESS', [
                    `  Target eliminated: @${targetJid.split('@')[0]}`,
                    `  ───────`,
                    `  💰 Gold stolen:  ${stolenGold.toLocaleString()}`,
                    ...(bountyGold > 0 ? [`  🎯 Bounty claimed: ${bountyGold.toLocaleString()}`] : []),
                    `  💰 Total gained: ${totalGain.toLocaleString()}`,
                    `  ⚖️  Karma: -40`,
                ])
            );
        } else {
            const counterDmg = Math.floor(assassin.combat.maxHp * 0.25);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.hp': -counterDmg } });
            await addKarma(sender, -10);

            await react('❌');
            await reply(
                buildBox('🗡️ ASSASSINATION FAILED', [
                    `  @${targetJid.split('@')[0]} fought back!`,
                    `  ❤️  HP: -${counterDmg}`,
                    `  ⚖️  Karma: -10`,
                    `  Upgrade AGI to improve hit rate.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .bribe-enforcer — Bribe law enforcement to clear your record
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'bribe-enforcer',
        aliases:     ['bribeenforcer', 'clearrecord'],
        category:    'gambling',
        react:       '👮',
        description: 'Bribe an enforcer to clear bounty and restore karma',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'bribeenf', CD.bribeenf);
        if (onCooldown) return reply(buildBox('👮 ON COOLDOWN', [`  Bribe resets in: ${formatCooldown(remaining)}`]));

        const cost = 3000 + Math.abs(player.karma) * 2;
        if (player.gold < cost) {
            return reply(
                buildBox('👮 BRIBE COST', [
                    `  Cost: ${cost.toLocaleString()} Gold`,
                    `  (Based on your karma: ${player.karma})`,
                    `  Your Gold: ${player.gold.toLocaleString()}`,
                    `  Not enough!`,
                ])
            );
        }

        const success = Math.random() < 0.7;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await setCooldown(sender, 'bribeenf');

        if (success) {
            await GlobalPlayer.updateOne({ jid: sender }, {
                $set:  { bounty: 0 },
                $inc:  { karma: 50 },
            });
            await react('👮');
            await reply(
                buildBox('👮 BRIBE ACCEPTED', [
                    `  The enforcer looks away...`,
                    `  💰 Cost: -${cost.toLocaleString()} Gold`,
                    `  🎯 Bounty cleared!`,
                    `  ⚖️  Karma: +50`,
                ])
            );
        } else {
            await addKarma(sender, -20);
            await react('🚔');
            await reply(
                buildBox('👮 BRIBE REJECTED', [
                    `  The enforcer refused and reported you!`,
                    `  💰 Cost: -${cost.toLocaleString()} Gold (lost)`,
                    `  ⚖️  Karma: -20`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .slot — Spin the slot machine
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'slot',
        aliases:     ['slots', 'slotmachine'],
        category:    'gambling',
        react:       '🎰',
        description: 'Spin the slot machine — LUK affects payouts',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        const bet = parseInt(q) || 100;
        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'slot', CD.slot);
        if (onCooldown) return reply(buildBox('🎰 ON COOLDOWN', [`  Slot resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold_have', { amount: player.gold.toLocaleString() }));

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bet } });
        await setCooldown(sender, 'slot');

        const reels    = spinSlots();
        const combo    = reels.join('');
        const payout   = SLOT_PAYOUTS[combo] || 0;

        // LUK gives slight reroll chance on loss
        const lukReroll = !payout && Math.random() < (player.stats.luk - 1) * 0.01;
        const finalReels = lukReroll ? spinSlots() : reels;
        const finalCombo = finalReels.join('');
        const finalPayout = SLOT_PAYOUTS[finalCombo] || 0;

        if (finalPayout > 0) {
            const won = Math.floor(bet * finalPayout);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🎰');
            await reply(
                buildBox('🎰 SLOT MACHINE', [
                    `  [ ${finalReels.join(' | ')} ]`,
                    `  ───────`,
                    `  🏆 WINNER! ${finalPayout}x payout!`,
                    `  💰 Won: +${won.toLocaleString()} Gold`,
                    ...(lukReroll ? [`  🍀 LUK reroll saved you!`] : []),
                ])
            );
        } else {
            await react('🎰');
            await reply(
                buildBox('🎰 SLOT MACHINE', [
                    `  [ ${finalReels.join(' | ')} ]`,
                    `  ───────`,
                    `  No match. Better luck next time!`,
                    `  💰 Lost: -${bet.toLocaleString()} Gold`,
                    `  🍀 LUK ${player.stats.luk} — upgrade for reroll chance`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .bj — Blackjack
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'bj',
        aliases:     ['blackjack', '21'],
        category:    'gambling',
        react:       '🃏',
        description: 'Play a hand of blackjack against the dealer',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        const bet = parseInt(q) || 200;
        if (bet < 100) return reply(t('gambling.minimum_bet', { amount: 100 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'bj', CD.bj);
        if (onCooldown) return reply(buildBox('🃏 ON COOLDOWN', [`  Blackjack resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const cardVal = c => c === 'A' ? 11 : ['J', 'Q', 'K'].includes(c) ? 10 : parseInt(c);

        const draw = () => CARDS[Math.floor(Math.random() * CARDS.length)];

        const playerHand  = [draw(), draw()];
        const dealerHand  = [draw(), draw()];

        let playerTotal = playerHand.reduce((s, c) => s + cardVal(c), 0);
        let dealerTotal = dealerHand.reduce((s, c) => s + cardVal(c), 0);

        // Dealer hits until 17+
        while (dealerTotal < 17) {
            const card   = draw();
            dealerTotal += cardVal(card);
            dealerHand.push(card);
        }

        // LUK gives small bonus draw chance
        if (playerTotal < 17 && Math.random() < (player.stats.luk - 1) * 0.02) {
            const bonus   = draw();
            playerTotal  += cardVal(bonus);
            playerHand.push(`${bonus}*`); // * = LUK bonus card
        }

        // Adjust for bust with Ace
        if (playerTotal > 21 && playerHand.includes('A')) playerTotal -= 10;
        if (dealerTotal > 21 && dealerHand.includes('A')) dealerTotal -= 10;

        const playerBust = playerTotal > 21;
        const dealerBust = dealerTotal > 21;
        const playerWins = !playerBust && (dealerBust || playerTotal >= dealerTotal);
        const tie        = !playerBust && !dealerBust && playerTotal === dealerTotal;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bet } });
        await setCooldown(sender, 'bj');

        if (tie) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: bet } });
            return reply(buildBox('🃏 BLACKJACK — TIE', [
                `  Your hand:   ${playerHand.join(', ')} = ${playerTotal}`,
                `  Dealer hand: ${dealerHand.join(', ')} = ${dealerTotal}`,
                `  Push! Bet returned.`,
            ]));
        }

        if (playerWins) {
            const won = playerTotal === 21 ? Math.floor(bet * 1.5) : bet;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: bet + won } });
            await react('🃏');
            await reply(
                buildBox('🃏 BLACKJACK — WIN', [
                    `  Your hand:   ${playerHand.join(', ')} = ${playerTotal}`,
                    `  Dealer hand: ${dealerHand.join(', ')} = ${dealerTotal}`,
                    `  ───────`,
                    dealerBust ? `  Dealer bust! You win!` : `  You beat the dealer!`,
                    `  💰 Won: +${won.toLocaleString()} Gold`,
                ])
            );
        } else {
            await react('🃏');
            await reply(
                buildBox('🃏 BLACKJACK — LOSS', [
                    `  Your hand:   ${playerHand.join(', ')} = ${playerTotal}`,
                    `  Dealer hand: ${dealerHand.join(', ')} = ${dealerTotal}`,
                    `  ───────`,
                    playerBust ? `  You bust!` : `  Dealer wins!`,
                    `  💰 Lost: -${bet.toLocaleString()} Gold`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .roulette — Spin the roulette wheel
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'roulette',
        aliases:     ['wheel', 'spin'],
        category:    'gambling',
        react:       '🎡',
        description: 'Bet on roulette — red/black/number',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const betType   = args[0]?.toLowerCase(); // red, black, or a number 0-36
        const betAmount = parseInt(args[1]) || parseInt(args[0]) || 100;

        if (!betType) {
            return reply(
                buildBox('🎡 ROULETTE', [
                    `  Usage: *.roulette <bet> <amount>*`,
                    `  ───────`,
                    `  🔴 red    — 2x payout`,
                    `  ⚫ black  — 2x payout`,
                    `  🟢 0      — 35x payout`,
                    `  🔢 1-36   — 35x payout`,
                    `  ───────`,
                    `  Example: *.roulette red 500*`,
                ])
            );
        }

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'roulette', CD.roulette);
        if (onCooldown) return reply(buildBox('🎡 ON COOLDOWN', [`  Roulette resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < betAmount) return reply(t('economy.not_enough_gold'));

        const result   = Math.floor(Math.random() * 37); // 0-36
        const isRed    = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(result);
        const isBlack  = result !== 0 && !isRed;
        const color    = result === 0 ? '🟢' : isRed ? '🔴' : '⚫';

        let payout = 0;
        if (betType === 'red'   && isRed)               payout = 2;
        if (betType === 'black' && isBlack)             payout = 2;
        if (betType === '0'     && result === 0)        payout = 35;
        if (!isNaN(parseInt(betType)) && parseInt(betType) === result) payout = 35;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -betAmount } });
        await setCooldown(sender, 'roulette');

        if (payout > 0) {
            const won = betAmount * payout;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🎡');
            await reply(
                buildBox('🎡 ROULETTE', [
                    `  ${color} Result: ${result}`,
                    `  ───────`,
                    `  🏆 WIN! ${payout}x payout!`,
                    `  💰 Won: +${won.toLocaleString()} Gold`,
                ])
            );
        } else {
            await react('🎡');
            await reply(
                buildBox('🎡 ROULETTE', [
                    `  ${color} Result: ${result}`,
                    `  ───────`,
                    `  You bet: ${betType}`,
                    `  💰 Lost: -${betAmount.toLocaleString()} Gold`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .coinflip — Flip a coin
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'coinflip',
        aliases:     ['cf', 'flip'],
        category:    'gambling',
        react:       '🪙',
        description: 'Flip a coin — STR stat influences outcome',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const choice = args[0]?.toLowerCase();
        const bet    = parseInt(args[1]) || parseInt(args[0]) || 100;

        if (!choice || !['heads', 'tails', 'h', 't'].includes(choice)) {
            return reply('❌ Usage: *.coinflip <heads/tails> <amount>*\nExample: *.coinflip heads 500*');
        }

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'coinflip', CD.coinflip);
        if (onCooldown) return reply(buildBox('🪙 ON COOLDOWN', [`  Flip resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        // STR slightly biases the flip
        const strBias   = Math.min(0.1, (player.stats.str - 1) * 0.005);
        const headsProb = 0.5 + strBias;
        const result    = Math.random() < headsProb ? 'heads' : 'tails';
        const playerPick = choice.startsWith('h') ? 'heads' : 'tails';
        const won        = result === playerPick;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? bet : -bet } });
        await setCooldown(sender, 'coinflip');

        await react('🪙');
        await reply(
            buildBox('🪙 COIN FLIP', [
                `  You picked: ${playerPick.toUpperCase()}`,
                `  Result:     ${result.toUpperCase()} ${result === 'heads' ? '🪙' : '⚫'}`,
                `  ───────`,
                won
                    ? `  🏆 WIN! +${bet.toLocaleString()} Gold`
                    : `  💀 LOSS! -${bet.toLocaleString()} Gold`,
                `  ⚔️  STR bias: +${(strBias * 100).toFixed(1)}% heads`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .dice — Roll dice
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'betdice',
        aliases:     ['roll', 'rolldice'],
        category:    'gambling',
        react:       '🎲',
        description: 'Roll dice and bet on the outcome',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const guess  = parseInt(args[0]);
        const bet    = parseInt(args[1]) || 100;

        if (!guess || guess < 1 || guess > 6) {
            return reply('❌ Guess a number 1-6.\nExample: *.dice 4 500*');
        }

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'dice', CD.dice);
        if (onCooldown) return reply(buildBox('🎲 ON COOLDOWN', [`  Dice resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const roll    = Math.floor(Math.random() * 6) + 1;
        const DICE    = ['⚀','⚁','⚂','⚃','⚄','⚅'];
        const exact   = roll === guess;
        const close   = Math.abs(roll - guess) === 1;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bet } });
        await setCooldown(sender, 'dice');

        if (exact) {
            const won = bet * 5;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🎲');
            await reply(
                buildBox('🎲 EXACT ROLL!', [
                    `  ${DICE[roll - 1]} Rolled: ${roll}`,
                    `  Your guess: ${guess}`,
                    `  🏆 EXACT HIT! 5x payout!`,
                    `  💰 Won: +${won.toLocaleString()} Gold`,
                ])
            );
        } else if (close) {
            const won = Math.floor(bet * 0.5);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🎲');
            await reply(
                buildBox('🎲 CLOSE ROLL', [
                    `  ${DICE[roll - 1]} Rolled: ${roll}`,
                    `  Your guess: ${guess}`,
                    `  Close! Half bet returned.`,
                    `  💰 Returned: +${won.toLocaleString()} Gold`,
                ])
            );
        } else {
            await react('🎲');
            await reply(
                buildBox('🎲 MISS', [
                    `  ${DICE[roll - 1]} Rolled: ${roll}`,
                    `  Your guess: ${guess}`,
                    `  💰 Lost: -${bet.toLocaleString()} Gold`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .cock-fight — Bet on a rooster fight (STR influenced)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'cock-fight',
        aliases:     ['cockfight', 'rooster', 'cf2'],
        category:    'gambling',
        react:       '🐓',
        description: 'Bet on a rooster fight — STR influences outcome',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const pick = parseInt(args[0]);
        const bet  = parseInt(args[1]) || 200;

        if (!pick || pick < 1 || pick > ROOSTERS.length) {
            const list = ROOSTERS.map((r, i) =>
                `  ${i + 1}. ${r.name} — STR:${r.str} LUK:${r.luk}`
            );
            return reply(buildBox('🐓 COCK-FIGHT ROSTER', [
                ...list,
                `  ───────`,
                `  Usage: *.cock-fight <number> <bet>*`,
                `  Example: *.cock-fight 1 500*`,
            ]));
        }

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'cockfight', CD.cockfight);
        if (onCooldown) return reply(buildBox('🐓 ON COOLDOWN', [`  Cock-fight resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const chosen   = ROOSTERS[pick - 1];
        const opponent = ROOSTERS[Math.floor(Math.random() * ROOSTERS.length)];

        // STR and LUK affect win chance
        const strBonus = 1 + (player.stats.str - 1) * 0.02;
        const chosenPower   = (chosen.str + chosen.luk) * strBonus + Math.random() * 30;
        const opponentPower = (opponent.str + opponent.luk) + Math.random() * 30;
        const won           = chosenPower > opponentPower;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? bet : -bet } });
        await setCooldown(sender, 'cockfight');

        await react('🐓');
        await reply(
            buildBox('🐓 COCK-FIGHT RESULT', [
                `  Your pick:  ${chosen.name}`,
                `  Opponent:   ${opponent.name}`,
                `  ───────`,
                `  ${chosen.name}: ${Math.floor(chosenPower)} power`,
                `  ${opponent.name}: ${Math.floor(opponentPower)} power`,
                `  ───────`,
                won
                    ? `  🏆 ${chosen.name} WINS! +${bet.toLocaleString()} Gold`
                    : `  💀 ${opponent.name} WINS! -${bet.toLocaleString()} Gold`,
                `  ⚔️  Your STR bonus: ${strBonus.toFixed(2)}x`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .lotto — Buy a lottery ticket
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'lotto',
        aliases:     ['lottery', 'ticket'],
        category:    'gambling',
        react:       '🎟️',
        description: 'Buy a lottery ticket for a chance at the jackpot',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const name = player.username || pushName;
        const { onCooldown, remaining } = checkCooldown(player, 'lotto', CD.lotto);
        if (onCooldown) return reply(buildBox('🎟️ ALREADY ENTERED', [`  Next draw in: ${formatCooldown(remaining)}`]));

        const ticketCost = 500;
        if (player.gold < ticketCost) return reply(`❌ A ticket costs ${ticketCost} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -ticketCost } });
        await setCooldown(sender, 'lotto');

        // LUK improves jackpot odds
        const lukBonus  = (player.stats.luk - 1) * 0.001;
        const jackpotChance = 0.01 + lukBonus;  // base 1%
        const bigWinChance  = 0.1  + lukBonus;  // base 10%

        const roll = Math.random();
        let prize  = 0;
        let msg    = '';

        if (roll < jackpotChance) {
            prize = LOTTO_JACKPOT;
            msg   = `🎉 JACKPOT! You won the grand prize!`;
        } else if (roll < bigWinChance) {
            prize = Math.floor(ticketCost * 10);
            msg   = `🏆 Big win! 10x your ticket!`;
        } else if (roll < 0.4) {
            prize = Math.floor(ticketCost * 2);
            msg   = `✅ Small win! 2x return.`;
        } else {
            msg   = `❌ No luck this draw.`;
        }

        if (prize > 0) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: prize } });
        }

        await react('🎟️');
        await reply(
            buildBox('🎟️ LOTTERY DRAW', [
                `  Ticket holder: ${name}`,
                `  Jackpot: ${LOTTO_JACKPOT.toLocaleString()} Gold`,
                `  ───────`,
                `  ${msg}`,
                prize > 0 ? `  💰 Won: +${prize.toLocaleString()} Gold` : `  💰 Ticket cost: -${ticketCost}`,
                `  🍀 LUK bonus: +${(lukBonus * 100).toFixed(2)}% odds`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .scratch — Scratch card
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'scratch',
        aliases:     ['scratchcard', 'card'],
        category:    'gambling',
        react:       '🎫',
        description: 'Buy a scratch card for instant prizes',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'scratch', CD.scratch);
        if (onCooldown) return reply(buildBox('🎫 ON COOLDOWN', [`  Scratch resets in: ${formatCooldown(remaining)}`]));

        const cost = 300;
        if (player.gold < cost) return reply(`❌ Scratch card costs ${cost} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await setCooldown(sender, 'scratch');

        const SCRATCH_PRIZES = [
            { symbol: '💰', label: 'GOLD',    prize: 600,  weight: 30 },
            { symbol: '💎', label: 'DIAMOND', prize: 0, diamonds: 1, weight: 10 },
            { symbol: '⭐', label: 'STAR',    prize: 1500, weight: 8  },
            { symbol: '👑', label: 'CROWN',   prize: 5000, weight: 2  },
            { symbol: '❌', label: 'EMPTY',   prize: 0,    weight: 50 },
        ];

        const totalWeight = SCRATCH_PRIZES.reduce((s, p) => s + p.weight, 0);
        const roll        = Math.random() * totalWeight;
        let cum           = 0;
        let prize         = SCRATCH_PRIZES[SCRATCH_PRIZES.length - 1];
        for (const p of SCRATCH_PRIZES) {
            cum += p.weight;
            if (roll < cum) { prize = p; break; }
        }

        if (prize.prize > 0) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: prize.prize } });
        }
        if (prize.diamonds) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { diamonds: prize.diamonds } });
        }

        const GRID = [prize.symbol, ...Array(8).fill('❌').map(() =>
            Math.random() < 0.2 ? SCRATCH_PRIZES[Math.floor(Math.random() * 3)].symbol : '❌'
        )];

        await react('🎫');
        await reply(
            buildBox('🎫 SCRATCH CARD', [
                `  ${GRID.slice(0,3).join(' ')}`,
                `  ${GRID.slice(3,6).join(' ')}`,
                `  ${GRID.slice(6,9).join(' ')}`,
                `  ───────`,
                prize.prize > 0
                    ? `  ${prize.symbol} ${prize.label}! +${prize.prize.toLocaleString()} Gold`
                    : prize.diamonds
                        ? `  💎 DIAMOND! +${prize.diamonds} Diamond`
                        : `  No prize this time.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .bet — Bet on a random event
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'bet',
        aliases:     ['wager', 'gamble'],
        category:    'gambling',
        react:       '🎯',
        description: 'Bet gold on a random outcome',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        const bet = parseInt(q) || 100;
        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'bet', CD.bet);
        if (onCooldown) return reply(buildBox('🎯 ON COOLDOWN', [`  Bet resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const EVENTS = [
            { name: 'Hunter Tournament',  win: 0.45, multiplier: 2.0 },
            { name: 'Monster Race',        win: 0.40, multiplier: 2.5 },
            { name: 'Shadow Duel',         win: 0.35, multiplier: 3.0 },
            { name: 'Crystal Auction',     win: 0.50, multiplier: 1.8 },
            { name: 'Gate Clear Challenge',win: 0.38, multiplier: 2.8 },
        ];

        const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        const lukMod = 1 + (player.stats.luk - 1) * 0.01;
        const won    = Math.random() < event.win * lukMod;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? Math.floor(bet * event.multiplier) - bet : -bet } });
        await setCooldown(sender, 'bet');

        await react('🎯');
        await reply(
            buildBox('🎯 BET RESULT', [
                `  Event: ${event.name}`,
                `  Bet:   ${bet.toLocaleString()} Gold`,
                `  Odds:  ${Math.floor(event.win * lukMod * 100)}% win chance`,
                `  ───────`,
                won
                    ? `  🏆 WIN! ${event.multiplier}x — +${Math.floor(bet * (event.multiplier - 1)).toLocaleString()} Gold`
                    : `  💀 LOSS! -${bet.toLocaleString()} Gold`,
                `  🍀 LUK modifier: ${lukMod.toFixed(2)}x`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .double-or-nothing — High risk double up
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'double-or-nothing',
        aliases:     ['don', 'doubleup', 'allin'],
        category:    'gambling',
        react:       '⚡',
        description: 'Double your gold or lose it all — pure 50/50',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId, t } = conText;

        const amount = parseInt(q);
        if (!amount || amount < 100) return reply('❌ Minimum is 100 Gold.\nUsage: *.double-or-nothing <amount>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'doubleornothing', CD.doubleornothing);
        if (onCooldown) return reply(buildBox('⚡ ON COOLDOWN', [`  Double-or-nothing resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < amount) return reply(t('economy.not_enough_gold_have', { amount: player.gold.toLocaleString() }));

        const won = Math.random() < 0.5;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? amount : -amount } });
        await setCooldown(sender, 'doubleornothing');

        await react('⚡');
        await reply(
            buildBox('⚡ DOUBLE OR NOTHING', [
                `  ${name} goes all in!`,
                `  Amount: ${amount.toLocaleString()} Gold`,
                `  ───────`,
                won
                    ? `  🏆 DOUBLED! +${amount.toLocaleString()} Gold`
                    : `  💀 NOTHING! -${amount.toLocaleString()} Gold`,
                `  Pure 50/50. No stats, no mercy.`,
            ])
        );
    }
);

module.exports = {};


// ══════════════════════════════════════════════════════════════════════
// EXTENDED COMMANDS — from new_cmds/gambling2.js
// ══════════════════════════════════════════════════════════════════════
const CD_GAMBLING2 = {
    jackpot:        24 * 60 * 60 * 1000,
    poker:          5  * 60 * 1000,
    crash:          3  * 60 * 1000,
    mines:          5  * 60 * 1000,
    tower:          10 * 60 * 1000,
    wheeloffate:    30 * 60 * 1000,
    numberguess:    2  * 60 * 1000,
    higherlower:    2  * 60 * 1000,
    treasurehunt:   60 * 60 * 1000,
    luckyspin:      12 * 60 * 60 * 1000,
    dailyspin:      24 * 60 * 60 * 1000,
    fortune:        6  * 60 * 60 * 1000,
    riskit:         5  * 60 * 1000,
    allin:          60 * 60 * 1000,
    bankrob:        4  * 60 * 60 * 1000,
    pickpocket:     30 * 60 * 1000,
    conartist:      2  * 60 * 60 * 1000,
    shellgame:      10 * 60 * 1000,
    tripleornothing:30 * 60 * 1000,
    luckydraw:      6  * 60 * 60 * 1000,
    cursedbet:      3  * 60 * 60 * 1000,
    shadowbet:      4  * 60 * 60 * 1000,
    origingamble:   24 * 60 * 60 * 1000,
    chaosroulette:  10 * 60 * 1000,
    voidjackpot:    24 * 60 * 60 * 1000,
};


mxd(
    {
        pattern:     'jackpot',
        aliases:     ['globaljackpot', 'megawin'],
        category:    'gambling',
        react:       '💰',
        description: 'Try to win the global jackpot pool (24hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const name    = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'jackpot', CD.jackpot);
        if (onCooldown) return reply(buildBox('💰 ON COOLDOWN', [`  Jackpot resets in: ${formatCooldown(remaining)}`]));

        const entry = parseInt(q) || 500;
        if (entry < 100) return reply('❌ Minimum jackpot entry is 100 Gold.');
        if (player.gold < entry) return reply(t('economy.not_enough_gold'));

        JACKPOT_POOL += entry;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -entry } });

        const lukBonus   = 1 + (player.stats.luk - 1) * 0.005;
        const winChance  = Math.min(0.05, 0.01 * lukBonus);
        const won        = Math.random() < winChance;

        await setCooldown(sender, 'jackpot');

        if (won) {
            const prize   = JACKPOT_POOL;
            JACKPOT_POOL  = 10000; // reset
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: prize } });
            await react('💰');
            await reply(
                buildBox('💰 JACKPOT WINNER!', [
                    `  🎉 *${name}* HIT THE JACKPOT!`,
                    `  💰 Prize: +${prize.toLocaleString()} Gold`,
                    `  Entry:  -${entry.toLocaleString()} Gold`,
                    `  Pool resets to 10,000 Gold`,
                    buildFooter(0, prize, player),
                ])
            );
        } else {
            await react('💰');
            await reply(
                buildBox('💰 JACKPOT ENTRY', [
                    `  Entry: -${entry.toLocaleString()} Gold`,
                    `  Pool:  ${JACKPOT_POOL.toLocaleString()} Gold`,
                    `  Win chance: ${(winChance * 100).toFixed(2)}%`,
                    `  Try again tomorrow!`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'poker',
        aliases:     ['videopoker', 'handpoker'],
        category:    'gambling',
        react:       '🃏',
        description: 'Play a hand of video poker against the house',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        const bet = parseInt(q) || 200;
        if (bet < 100) return reply(t('gambling.minimum_bet', { amount: 100 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'poker', CD.poker);
        if (onCooldown) return reply(buildBox('🃏 ON COOLDOWN', [`  Poker resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const SUITS = ['♠','♥','♦','♣'];
        const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        const deck  = SUITS.flatMap(s => RANKS.map(r => `${r}${s}`));
        const hand  = Array.from({ length: 5 }, () => deck[Math.floor(Math.random() * deck.length)]);

        // Simple hand evaluation
        const rankVals = hand.map(c => RANKS.indexOf(c.slice(0, -1)));
        const counts   = rankVals.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc; }, {});
        const vals     = Object.values(counts).sort((a, b) => b - a);

        let handName = 'High Card';
        let mult     = 0;
        if (vals[0] === 4)                       { handName = 'Four of a Kind'; mult = 25; }
        else if (vals[0] === 3 && vals[1] === 2) { handName = 'Full House';     mult = 9;  }
        else if (vals[0] === 3)                  { handName = 'Three of a Kind'; mult = 3; }
        else if (vals[0] === 2 && vals[1] === 2) { handName = 'Two Pair';       mult = 2;  }
        else if (vals[0] === 2)                  { handName = 'One Pair';       mult = 1;  }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bet } });
        await setCooldown(sender, 'poker');

        if (mult > 0) {
            const won = bet * mult;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🃏');
            await reply(
                buildBox('🃏 POKER — WIN', [
                    `  Hand: ${hand.join(' ')}`,
                    `  ───────`,
                    `  🏆 ${handName}! ${mult}x payout!`,
                    `  💰 Won: +${won.toLocaleString()} Gold`,
                    buildFooter(0, won, player),
                ])
            );
        } else {
            await react('🃏');
            await reply(
                buildBox('🃏 POKER — LOSS', [
                    `  Hand: ${hand.join(' ')}`,
                    `  ───────`,
                    `  ${handName} — No payout.`,
                    `  💰 Lost: -${bet.toLocaleString()} Gold`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'crash',
        aliases:     ['crashgame', 'rocketcrash'],
        category:    'gambling',
        react:       '🚀',
        description: 'Play the crash game — cash out before it crashes!',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const bet      = parseInt(args[0]) || 200;
        const cashout  = parseFloat(args[1]) || 1.5; // target multiplier

        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));
        if (cashout < 1.1) return reply('❌ Cashout must be at least 1.1x.');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'crash', CD.crash);
        if (onCooldown) return reply(buildBox('🚀 ON COOLDOWN', [`  Crash resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        // Crash point — exponential distribution
        const crashAt = Math.max(1.0, 1 / (1 - Math.random()) * 0.97);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bet } });
        await setCooldown(sender, 'crash');

        if (cashout <= crashAt) {
            const won = Math.floor(bet * cashout);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🚀');
            await reply(
                buildBox('🚀 CASHED OUT IN TIME!', [
                    `  Crashed at: ${crashAt.toFixed(2)}x`,
                    `  You cashed: ${cashout.toFixed(2)}x`,
                    `  💰 Won: +${won.toLocaleString()} Gold`,
                    buildFooter(0, won, player),
                ])
            );
        } else {
            await react('💥');
            await reply(
                buildBox('💥 CRASHED!', [
                    `  Crashed at: ${crashAt.toFixed(2)}x`,
                    `  Target was: ${cashout.toFixed(2)}x`,
                    `  You were too late!`,
                    `  💰 Lost: -${bet.toLocaleString()} Gold`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'mines',
        aliases:     ['minesweeper', 'minegame'],
        category:    'gambling',
        react:       '💣',
        description: 'Play mines — pick safe tiles to multiply your bet',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const bet   = parseInt(args[0]) || 200;
        const picks = Math.min(parseInt(args[1]) || 3, 8);

        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'mines', CD.mines);
        if (onCooldown) return reply(buildBox('💣 ON COOLDOWN', [`  Mines resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        // 5 mines in 25 tiles
        const mines     = 5;
        const totalTiles = 25;
        const lukBonus  = 1 + (player.stats.luk - 1) * 0.01;
        let   survived  = true;
        let   mult      = 1;

        for (let i = 0; i < picks; i++) {
            const hitMine = Math.random() < (mines / (totalTiles - i)) / lukBonus;
            if (hitMine) { survived = false; break; }
            mult *= 1 + (1 / (totalTiles - mines - i));
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bet } });
        await setCooldown(sender, 'mines');

        if (survived) {
            const won = Math.floor(bet * mult);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('💎');
            await reply(
                buildBox('💎 MINES — SURVIVED', [
                    `  Picked ${picks} safe tiles!`,
                    `  Multiplier: ${mult.toFixed(2)}x`,
                    `  💰 Won: +${won.toLocaleString()} Gold`,
                    `  🍀 LUK bonus applied`,
                    buildFooter(0, won, player),
                ])
            );
        } else {
            await react('💣');
            await reply(
                buildBox('💣 MINES — BOOM!', [
                    `  Hit a mine!`,
                    `  💰 Lost: -${bet.toLocaleString()} Gold`,
                    `  Try fewer picks next time.`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'tower',
        aliases:     ['towergame', 'climbtower'],
        category:    'gambling',
        react:       '🗼',
        description: 'Climb the tower — each floor multiplies your bet but increases risk',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const bet    = parseInt(args[0]) || 200;
        const floors = Math.min(parseInt(args[1]) || 3, 10);

        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'tower', CD.tower);
        if (onCooldown) return reply(buildBox('🗼 ON COOLDOWN', [`  Tower resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const lukBonus = 1 + (player.stats.luk - 1) * 0.01;
        let   survived = true;
        let   reached  = 0;

        for (let i = 0; i < floors; i++) {
            const failChance = (0.2 + i * 0.05) / lukBonus;
            if (Math.random() < failChance) { survived = false; break; }
            reached++;
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bet } });
        await setCooldown(sender, 'tower');

        const mult = 1 + reached * 0.5;
        if (survived) {
            const won = Math.floor(bet * mult);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🗼');
            await reply(
                buildBox('🗼 TOWER CLEARED', [
                    `  Reached floor ${reached}/${floors}!`,
                    `  Multiplier: ${mult.toFixed(1)}x`,
                    `  💰 Won: +${won.toLocaleString()} Gold`,
                    buildFooter(0, won, player),
                ])
            );
        } else {
            const partialMult = 1 + reached * 0.5;
            const partial     = reached > 0 ? Math.floor(bet * partialMult * 0.3) : 0;
            if (partial > 0) await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: partial } });
            await react('💀');
            await reply(
                buildBox('🗼 TOWER FAILED', [
                    `  Fell at floor ${reached + 1}/${floors}`,
                    `  💰 Lost: -${(bet - partial).toLocaleString()} Gold`,
                    ...(partial > 0 ? [`  Partial refund: +${partial} Gold`] : []),
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'wheel-of-fate',
        aliases:     ['wheeloffate', 'fatewheel'],
        category:    'gambling',
        react:       '🎡',
        description: 'Spin the Wheel of Fate for random rewards or punishments',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'wheeloffate', CD.wheeloffate);
        if (onCooldown) return reply(buildBox('🎡 ON COOLDOWN', [`  Wheel of Fate resets in: ${formatCooldown(remaining)}`]));

        const cost = 300;
        if (player.gold < cost) return reply(`❌ Spinning costs ${cost} Gold.`);

        const SEGMENTS = [
            { label: '💰 +2000 Gold',         action: async () => await addGold(sender, 2000),        weight: 15 },
            { label: '💎 +3 Diamonds',         action: async () => await addDiamonds(sender, 3),       weight: 10 },
            { label: '✨ +500 EXP',            action: async () => await grantExp(sender, 500, 0, botId), weight: 20 },
            { label: '⚖️  +50 Karma',          action: async () => await addKarma(sender, 50),         weight: 15 },
            { label: '💸 -500 Gold',           action: async () => await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -500 } }), weight: 15 },
            { label: '⚖️  -30 Karma',          action: async () => await addKarma(sender, -30),        weight: 10 },
            { label: '🔮 +1 Crystal',          action: async () => await addCrystals(sender, 1),       weight: 8  },
            { label: '💀 -20% HP',             action: async () => await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.hp': -Math.floor(player.combat.maxHp * 0.2) } }), weight: 7 },
        ];

        const total  = SEGMENTS.reduce((s, sg) => s + sg.weight, 0);
        let   roll   = Math.random() * total;
        let   chosen = SEGMENTS[0];
        for (const sg of SEGMENTS) {
            roll -= sg.weight;
            if (roll <= 0) { chosen = sg; break; }
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await chosen.action();
        await setCooldown(sender, 'wheeloffate');

        await react('🎡');
        await reply(
            buildBox('🎡 WHEEL OF FATE', [
                `  The wheel spins...`,
                `  ───────`,
                `  Result: ${chosen.label}`,
                `  💰 Entry cost: -${cost} Gold`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'number-guess',
        aliases:     ['numberguess', 'guessnumber'],
        category:    'gambling',
        react:       '🔢',
        description: 'Guess a number 1-10 for up to 8x payout',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const guess = parseInt(args[0]);
        const bet   = parseInt(args[1]) || 200;

        if (!guess || guess < 1 || guess > 10) return reply('❌ Guess a number 1-10.\nExample: *.number-guess 7 500*');
        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'numberguess', CD.numberguess);
        if (onCooldown) return reply(buildBox('🔢 ON COOLDOWN', [`  Number Guess resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const answer = Math.floor(Math.random() * 10) + 1;
        const exact  = answer === guess;
        const close  = Math.abs(answer - guess) === 1;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bet } });
        await setCooldown(sender, 'numberguess');

        if (exact) {
            const won = bet * 8;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🔢');
            await reply(buildBox('🔢 EXACT MATCH!', [
                `  Answer: ${answer}  Your guess: ${guess}`,
                `  🏆 8x PAYOUT!`,
                `  💰 Won: +${won.toLocaleString()} Gold`,
                buildFooter(0, won, player),
            ]));
        } else if (close) {
            const won = Math.floor(bet * 1.5);
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won } });
            await react('🔢');
            await reply(buildBox('🔢 CLOSE!', [
                `  Answer: ${answer}  Your guess: ${guess}`,
                `  Almost! 1.5x return.`,
                `  💰 Won: +${won.toLocaleString()} Gold`,
            ]));
        } else {
            await react('❌');
            await reply(buildBox('🔢 WRONG', [
                `  Answer: ${answer}  Your guess: ${guess}`,
                `  💰 Lost: -${bet.toLocaleString()} Gold`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'higher-lower',
        aliases:     ['higherlower', 'hl'],
        category:    'gambling',
        react:       '🃏',
        description: 'Guess if the next card is higher or lower',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const choice = args[0]?.toLowerCase();
        const bet    = parseInt(args[1]) || 200;

        if (!choice || !['higher', 'lower', 'h', 'l'].includes(choice)) {
            return reply('❌ Usage: *.higher-lower <higher/lower> <bet>*');
        }
        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'higherlower', CD.higherlower);
        if (onCooldown) return reply(buildBox('🃏 ON COOLDOWN', [`  Higher-Lower resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const card1 = Math.floor(Math.random() * 13) + 1;
        const card2 = Math.floor(Math.random() * 13) + 1;
        const NAMES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

        const guessHigh = choice.startsWith('h');
        const won       = guessHigh ? card2 > card1 : card2 < card1;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? bet : -bet } });
        await setCooldown(sender, 'higherlower');

        await react('🃏');
        await reply(
            buildBox('🃏 HIGHER OR LOWER', [
                `  Card 1: ${NAMES[card1 - 1]}`,
                `  Card 2: ${NAMES[card2 - 1]}`,
                `  Your guess: ${guessHigh ? 'Higher' : 'Lower'}`,
                `  ───────`,
                won
                    ? `  ✅ Correct! +${bet.toLocaleString()} Gold`
                    : `  ❌ Wrong! -${bet.toLocaleString()} Gold`,
                buildFooter(0, won ? bet : 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'treasure-hunt',
        aliases:     ['treasurehunt', 'findit'],
        category:    'gambling',
        react:       '🗺️',
        description: 'Go on a treasure hunt for random prizes (1hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'treasurehunt', CD.treasurehunt);
        if (onCooldown) return reply(buildBox('🗺️ ON COOLDOWN', [`  Treasure Hunt resets in: ${formatCooldown(remaining)}`]));

        const cost = 200;
        if (player.gold < cost) return reply(`❌ Treasure map costs ${cost} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });

        const lukMult = 1 + (player.stats.luk - 1) * 0.02;
        const FINDS   = [
            { desc: 'Ancient gold chest!',   gold: 3000, diamonds: 0, crystal: 0, weight: 10 },
            { desc: 'Diamond cache!',         gold: 500,  diamonds: 5, crystal: 0, weight: 8  },
            { desc: 'Crystal formation!',     gold: 200,  diamonds: 0, crystal: 3, weight: 12 },
            { desc: 'Hunter\'s old stash.',   gold: 1000, diamonds: 0, crystal: 0, weight: 30 },
            { desc: 'Empty hole. Nothing.',   gold: 0,    diamonds: 0, crystal: 0, weight: 40 },
        ];

        const total  = FINDS.reduce((s, f) => s + f.weight, 0);
        let   roll   = Math.random() * total / lukMult;
        let   find   = FINDS[FINDS.length - 1];
        for (const f of FINDS) {
            roll -= f.weight;
            if (roll <= 0) { find = f; break; }
        }

        if (find.gold)     await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: find.gold } });
        if (find.diamonds) await addDiamonds(sender, find.diamonds);
        if (find.crystal)  await addCrystals(sender, find.crystal);

        await setCooldown(sender, 'treasurehunt');

        await react('🗺️');
        await reply(
            buildBox('🗺️ TREASURE HUNT', [
                `  ${find.desc}`,
                ...(find.gold ? [`  💰 Gold: +${find.gold.toLocaleString()}`] : []),
                ...(find.diamonds ? [`  💎 Diamonds: +${find.diamonds}`] : []),
                ...(find.crystal ? [`  🔮 Crystals: +${find.crystal}`] : []),
                `  Map cost: -${cost} Gold`,
                buildFooter(0, find.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'gamble-stats',
        aliases:     ['gamblestats', 'gamblelb'],
        category:    'gambling',
        react:       '📊',
        description: 'View global gambling leaderboard by wealth',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;
        const { rankName } = getRank(player.level, player.jid);

        await react('📊');
        await reply(
            buildBox('📊 GAMBLER PROFILE', [
                `  Hunter: ${name}  |  ${rankName}`,
                `  ───────`,
                `  💰 Gold:     ${player.gold.toLocaleString()}`,
                `  💎 Diamonds: ${player.diamonds}`,
                `  🔮 Crystals: ${player.crystals}`,
                `  ───────`,
                `  🍀 LUK stat: ${player.stats.luk}`,
                `  LUK bonus:  +${((player.stats.luk - 1) * 2).toFixed(0)}% odds`,
                `  ───────`,
                `  Use *.wealth-rank* for global standings`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'lucky-spin',
        aliases:     ['luckyspin', 'fortunespin'],
        category:    'gambling',
        react:       '🍀',
        description: 'Lucky spin for rare item rewards (12hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'luckyspin', CD.luckyspin);
        if (onCooldown) return reply(buildBox('🍀 ON COOLDOWN', [`  Lucky Spin resets in: ${formatCooldown(remaining)}`]));

        const cost = 500;
        if (player.gold < cost) return reply(`❌ Lucky Spin costs ${cost} Gold.`);

        const lukMult = 1 + (player.stats.luk - 1) * 0.02;
        const PRIZES  = [
            { label: '💰 3,000 Gold',   action: async () => await addGold(sender, 3000),        weight: 25 },
            { label: '💎 5 Diamonds',   action: async () => await addDiamonds(sender, 5),        weight: 15 },
            { label: '🔮 2 Crystals',   action: async () => await addCrystals(sender, 2),        weight: 10 },
            { label: '✨ 800 EXP',      action: async () => await grantExp(sender, 800, 0, botId), weight: 20 },
            { label: '💊 5 Potions',    action: async () => await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.potions': 5 } }), weight: 20 },
            { label: '👑 10 Diamonds',  action: async () => await addDiamonds(sender, 10),       weight: Math.floor(3 * lukMult) },
            { label: '💸 Nothing',      action: async () => {},                                   weight: 7 },
        ];

        const total  = PRIZES.reduce((s, p) => s + p.weight, 0);
        let   roll   = Math.random() * total;
        let   prize  = PRIZES[PRIZES.length - 1];
        for (const p of PRIZES) { roll -= p.weight; if (roll <= 0) { prize = p; break; } }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await prize.action();
        await setCooldown(sender, 'luckyspin');

        await react('🍀');
        await reply(
            buildBox('🍀 LUCKY SPIN', [
                `  🎰 Spinning...`,
                `  ───────`,
                `  Prize: ${prize.label}`,
                `  Entry: -${cost} Gold`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'daily-spin',
        aliases:     ['dailyspin', 'freespin'],
        category:    'gambling',
        react:       '🎰',
        description: 'Free daily spin for small rewards (24hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'dailyspin', CD.dailyspin);
        if (onCooldown) return reply(buildBox('🎰 ON COOLDOWN', [`  Daily Spin resets in: ${formatCooldown(remaining)}`]));

        const PRIZES = [
            { label: '💰 500 Gold',    gold: 500,  exp: 0   },
            { label: '💰 200 Gold',    gold: 200,  exp: 0   },
            { label: '✨ 200 EXP',     gold: 0,    exp: 200 },
            { label: '💎 1 Diamond',   gold: 0,    exp: 0,  diamond: 1 },
            { label: '🍖 +20 Hunger',  gold: 0,    exp: 0,  hunger: 20 },
            { label: '💰 50 Gold',     gold: 50,   exp: 0   },
        ];

        const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];

        if (prize.gold)    await addGold(sender, prize.gold);
        if (prize.exp)     await grantExp(sender, prize.exp, 0, botId);
        if (prize.diamond) await addDiamonds(sender, prize.diamond);

        await setCooldown(sender, 'dailyspin');

        await react('🎰');
        await reply(
            buildBox('🎰 DAILY SPIN', [
                `  FREE spin!`,
                `  Prize: ${prize.label}`,
                `  Come back tomorrow!`,
                buildFooter(prize.exp || 0, prize.gold || 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'risk-it',
        aliases:     ['riskit', 'riskgame'],
        category:    'gambling',
        react:       '⚡',
        description: 'Risk it — each round doubles or wipes your bet',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const bet    = parseInt(args[0]) || 200;
        const rounds = Math.min(parseInt(args[1]) || 2, 5);

        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'riskit', CD.riskit);
        if (onCooldown) return reply(buildBox('⚡ ON COOLDOWN', [`  Risk-It resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        let current   = bet;
        let survived  = true;
        let roundsWon = 0;

        for (let i = 0; i < rounds; i++) {
            if (Math.random() < 0.45) { survived = false; break; }
            current  *= 2;
            roundsWon++;
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: survived ? current - bet : -bet } });
        await setCooldown(sender, 'riskit');

        await react('⚡');
        await reply(
            buildBox('⚡ RISK-IT', [
                `  Rounds survived: ${roundsWon}/${rounds}`,
                survived
                    ? `  🏆 Win! +${(current - bet).toLocaleString()} Gold (${rounds}x doubled!)`
                    : `  💀 Wiped! -${bet.toLocaleString()} Gold`,
                buildFooter(0, survived ? current - bet : 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'all-in',
        aliases:     ['allin', 'yolo'],
        category:    'gambling',
        react:       '💸',
        description: 'Go all-in — bet your entire wallet on a coin flip (1hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'allin', CD.allin);
        if (onCooldown) return reply(buildBox('💸 ON COOLDOWN', [`  All-In resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < 100) return reply('❌ Need at least 100 Gold to go all-in.');

        if (q?.toLowerCase() !== 'confirm') {
            return reply(buildBox('💸 ALL-IN WARNING', [
                `  You are about to bet ALL ${player.gold.toLocaleString()} Gold!`,
                `  Win: double your gold.`,
                `  Lose: lose everything.`,
                `  Type *.all-in confirm* to proceed.`,
            ]));
        }

        const totalBet = player.gold;
        const won      = Math.random() < 0.5;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? totalBet : -totalBet } });
        await setCooldown(sender, 'allin');

        await react(won ? '💸' : '💀');
        await reply(
            buildBox('💸 ALL-IN', [
                `  *${name}* goes ALL IN with ${totalBet.toLocaleString()} Gold!`,
                `  ───────`,
                won
                    ? `  🏆 DOUBLED! +${totalBet.toLocaleString()} Gold`
                    : `  💀 LOST IT ALL! -${totalBet.toLocaleString()} Gold`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'pickpocket',
        aliases:     ['liftstuff', 'dip'],
        category:    'gambling',
        react:       '🤏',
        description: 'Pickpocket a random registered player for small gold',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'pickpocket', CD.pickpocket);
        if (onCooldown) return reply(buildBox('🤏 ON COOLDOWN', [`  Pickpocket resets in: ${formatCooldown(remaining)}`]));

        const target  = await GlobalPlayer.findOne({
            registered: true,
            jid: { $ne: sender },
            gold: { $gte: 50 }
        }).skip(Math.floor(Math.random() * 10)).lean();

        if (!target) return reply('❌ No targets found!');

        const agiBonus   = 1 + (player.stats.agi - 1) * 0.02;
        const successRate = Math.min(0.7, 0.35 * agiBonus);
        const success     = Math.random() < successRate;

        await setCooldown(sender, 'pickpocket');

        if (success) {
            const stolen = Math.floor(target.gold * 0.05);
            await GlobalPlayer.updateOne({ jid: target.jid }, { $inc: { gold: -stolen } });
            await GlobalPlayer.updateOne({ jid: sender },     { $inc: { gold:  stolen } });
            await addKarma(sender, -5);

            const tName = target.username || target.jid.split('@')[0];
            await react('🤏');
            await reply(buildBox('🤏 PICKPOCKET SUCCESS', [
                `  Lifted from: ${tName}`,
                `  💰 Stolen: +${stolen.toLocaleString()} Gold`,
                `  ⚖️  Karma: -5`,
                buildFooter(0, stolen, player),
            ]));
        } else {
            await addKarma(sender, -2);
            await react('🚔');
            await reply(buildBox('🤏 CAUGHT!', [
                `  You were spotted!`,
                `  ⚖️  Karma: -2`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'shell-game',
        aliases:     ['shellgame', 'thimblerig'],
        category:    'gambling',
        react:       '🐚',
        description: 'Pick the right shell to win 3x your bet',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const pick = parseInt(args[0]);
        const bet  = parseInt(args[1]) || 200;

        if (!pick || pick < 1 || pick > 3) return reply('❌ Pick shell 1, 2 or 3.\nExample: *.shell-game 2 500*');
        if (bet < 50) return reply(t('gambling.minimum_bet', { amount: 50 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'shellgame', CD.shellgame);
        if (onCooldown) return reply(buildBox('🐚 ON COOLDOWN', [`  Shell Game resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const lukBonus = 1 + (player.stats.luk - 1) * 0.02;
        const winning  = Math.random() < lukBonus / 3 ? pick : Math.floor(Math.random() * 3) + 1;
        const won      = winning === pick;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? bet * 2 : -bet } });
        await setCooldown(sender, 'shellgame');

        await react('🐚');
        await reply(
            buildBox('🐚 SHELL GAME', [
                `  Shell 1: ${winning === 1 ? '🔴' : '⚪'}`,
                `  Shell 2: ${winning === 2 ? '🔴' : '⚪'}`,
                `  Shell 3: ${winning === 3 ? '🔴' : '⚪'}`,
                `  ───────`,
                `  Your pick: Shell ${pick}`,
                won
                    ? `  ✅ Correct! +${(bet * 2).toLocaleString()} Gold`
                    : `  ❌ Wrong shell! -${bet.toLocaleString()} Gold`,
                buildFooter(0, won ? bet * 2 : 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'triple-or-nothing',
        aliases:     ['tripleornothing', 'ton'],
        category:    'gambling',
        react:       '🎲',
        description: 'Triple your bet or lose it all — 33% chance',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        const bet = parseInt(q) || 300;
        if (bet < 100) return reply(t('gambling.minimum_bet', { amount: 100 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'tripleornothing', CD.tripleornothing);
        if (onCooldown) return reply(buildBox('🎲 ON COOLDOWN', [`  Triple-or-Nothing resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const won = Math.random() < 0.33;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? bet * 2 : -bet } });
        await setCooldown(sender, 'tripleornothing');

        await react('🎲');
        await reply(
            buildBox('🎲 TRIPLE OR NOTHING', [
                `  Bet: ${bet.toLocaleString()} Gold`,
                `  Chance: 33%`,
                `  ───────`,
                won
                    ? `  🏆 TRIPLED! +${(bet * 2).toLocaleString()} Gold`
                    : `  💀 NOTHING! -${bet.toLocaleString()} Gold`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'shadow-bet',
        aliases:     ['shadowbet', 'armybet'],
        category:    'gambling',
        react:       '👥',
        description: 'Bet your shadow army power for gold rewards',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'shadowbet', CD.shadowbet);
        if (onCooldown) return reply(buildBox('👥 ON COOLDOWN', [`  Shadow Bet resets in: ${formatCooldown(remaining)}`]));

        if (!player.shadows?.length) return reply('❌ Shadow Bet requires at least 1 shadow soldier.');

        const totalPower = player.shadows.reduce((s, sh) => s + sh.power, 0);
        const won        = Math.random() < 0.5;
        const goldPrize  = Math.floor(totalPower * 0.1);

        if (won) await addGold(sender, goldPrize);
        await setCooldown(sender, 'shadowbet');

        await react('👥');
        await reply(
            buildBox('👥 SHADOW BET', [
                `  Army Power: ${totalPower.toLocaleString()}`,
                `  ───────`,
                won
                    ? `  🏆 Shadows prevailed! +${goldPrize.toLocaleString()} Gold`
                    : `  💀 Shadows defeated! No reward.`,
                buildFooter(0, won ? goldPrize : 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'chaos-roulette',
        aliases:     ['chaosroulette', 'darkroulette'],
        category:    'gambling',
        react:       '☠️',
        description: 'Chaos Roulette — bigger wins AND bigger losses',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        const bet  = parseInt(args[0]) || 300;
        const pick = args[1]?.toLowerCase();

        if (!pick || !['red', 'black', 'chaos'].includes(pick)) {
            return reply(buildBox('☠️ CHAOS ROULETTE', [
                `  Usage: *.chaos-roulette <bet> <pick>*`,
                `  🔴 red   — 2x payout`,
                `  ⚫ black — 2x payout`,
                `  ☠️  chaos — 10x payout (8% chance)`,
            ]));
        }
        if (bet < 100) return reply(t('gambling.minimum_bet', { amount: 100 }));

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'chaosroulette', CD.chaosroulette);
        if (onCooldown) return reply(buildBox('☠️ ON COOLDOWN', [`  Chaos Roulette resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < bet) return reply(t('economy.not_enough_gold'));

        const roll   = Math.random();
        const result = roll < 0.08 ? 'chaos' : roll < 0.54 ? 'red' : 'black';
        const won    = result === pick;
        const mult   = pick === 'chaos' ? 10 : 2;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: won ? bet * mult : -bet } });
        await setCooldown(sender, 'chaosroulette');

        await react('☠️');
        await reply(
            buildBox('☠️ CHAOS ROULETTE', [
                `  Result: ${result === 'chaos' ? '☠️ CHAOS' : result === 'red' ? '🔴 RED' : '⚫ BLACK'}`,
                `  Your pick: ${pick}`,
                `  ───────`,
                won
                    ? `  🏆 WIN! ${mult}x — +${(bet * mult).toLocaleString()} Gold`
                    : `  💀 LOSS! -${bet.toLocaleString()} Gold`,
                buildFooter(0, won ? bet * mult : 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'void-jackpot',
        aliases:     ['voidjackpot', 'ultimatejackpot'],
        category:    'gambling',
        react:       '🌌',
        description: 'The Void Jackpot — Level 100+ only, crystals as entry fee',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        if (player.level < 100) return reply('❌ Void Jackpot requires Level 100+.');

        const { onCooldown, remaining } = checkCooldown(player, 'voidjackpot', CD.voidjackpot);
        if (onCooldown) return reply(buildBox('🌌 ON COOLDOWN', [`  Void Jackpot resets in: ${formatCooldown(remaining)}`]));

        if (player.crystals < 2) return reply(`❌ Void Jackpot costs 2 Crystals. You have ${player.crystals}.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { crystals: -2 } });

        const lukMult  = 1 + (player.stats.luk - 1) * 0.01;
        const winChance = Math.min(0.15, 0.05 * lukMult);
        const won       = Math.random() < winChance;

        await setCooldown(sender, 'voidjackpot');

        if (won) {
            const goldPrize = 50000;
            const diamPrize = 20;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: goldPrize, diamonds: diamPrize } });

            await react('🌌');
            await reply(
                buildBox('🌌 VOID JACKPOT — WINNER!', [
                    `  🎉 *${name}* won the VOID JACKPOT!`,
                    `  ───────`,
                    `  💰 Gold:     +${goldPrize.toLocaleString()}`,
                    `  💎 Diamonds: +${diamPrize}`,
                    `  🔮 Crystals: -2`,
                    buildFooter(0, goldPrize, player),
                ])
            );
        } else {
            await react('🌌');
            await reply(
                buildBox('🌌 VOID JACKPOT', [
                    `  The void swallows your crystals...`,
                    `  🔮 Crystals: -2`,
                    `  Win chance: ${(winChance * 100).toFixed(1)}%`,
                    `  Try again tomorrow.`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'origin-gamble',
        aliases:     ['origingamble', 'sovereigngamble'],
        category:    'gambling',
        react:       '👑',
        description: 'The Origin Gamble — for Origin rank only, infinite rewards',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const { rankId } = getRank(player.level, player.jid);
        const isOrigin   = sender.includes('263776388689') || rankId >= 11;

        if (!isOrigin) return reply('❌ The Origin Gamble is reserved for Origin rank.');

        const { onCooldown, remaining } = checkCooldown(player, 'origingamble', CD.origingamble);
        if (onCooldown) return reply(buildBox('👑 ON COOLDOWN', [`  Origin Gamble resets in: ${formatCooldown(remaining)}`]));

        // Origin always wins — but the amount varies
        const outcomes = [
            { label: '💰 100,000 Gold',  gold: 100000, diamonds: 0,  crystals: 0  },
            { label: '💎 50 Diamonds',   gold: 10000,  diamonds: 50, crystals: 0  },
            { label: '🔮 20 Crystals',   gold: 20000,  diamonds: 0,  crystals: 20 },
            { label: '👑 All Three!',    gold: 50000,  diamonds: 25, crystals: 10 },
        ];

        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { gold: outcome.gold, diamonds: outcome.diamonds, crystals: outcome.crystals }
        });
        await setCooldown(sender, 'origingamble');

        await react('👑');
        await reply(
            buildBox('👑 ORIGIN GAMBLE', [
                `  👑 *${name}* — The Origin always wins!`,
                `  ───────`,
                `  Prize: ${outcome.label}`,
                `  💰 Gold: +${outcome.gold.toLocaleString()}`,
                ...(outcome.diamonds ? [`  💎 Diamonds: +${outcome.diamonds}`] : []),
                ...(outcome.crystals ? [`  🔮 Crystals: +${outcome.crystals}`] : []),
                buildFooter(0, outcome.gold, player),
            ])
        );
    }
);
