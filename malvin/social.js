/**
 * malvin/social.js
 * Social & Politics — Malvin-XD Sovereign RPG
 * 45 Commands: .marry .divorce .soulmate .guild-create .guild-join
 *              .guild-vault .guild-war .vote .senate .tax-set .jail
 *              .arrest .release-bail .party + more
 */

const { mxd } = require('../king');
const {
    getPlayer, fetchPlayer,
    addGold, removeGold, addDiamonds,
    marry, divorce, setMentor,
    addKarma, grantExp,
    createGuild, joinGuild, depositToGuildVault,
    jailPlayer, releaseJail,
    checkCooldown, setCooldown, formatCooldown,
    buildBox, buildFooter, scaleRewards,
} = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { GlobalPlayer, Guild } = require('../king/rpg/model');

// ─── Cooldowns ────────────────────────────────────────────────────────────────
const CD = {
    marry:     24 * 60 * 60 * 1000, // 24 hrs
    vote:      24 * 60 * 60 * 1000, // 24 hrs
    guildwar:  12 * 60 * 60 * 1000, // 12 hrs
    party:     30 * 60 * 1000,      // 30 min
    arrest:    60 * 60 * 1000,      // 1 hr
    senate:    24 * 60 * 60 * 1000, // 24 hrs
    gifting:   6  * 60 * 60 * 1000, // 6 hrs
    mentor:    7  * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Senate proposals store (in-memory, resets on restart) ───────────────────
const SENATE_PROPOSALS = new Map();
const SENATE_VOTES     = new Map();

// ════════════════════════════════════════════════════════════════════════════
// .marry — Propose marriage to another player
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'marry',
        aliases:     ['propose', 'wed'],
        category:    'social',
        react:       '💍',
        description: 'Propose marriage to another player',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player you want to marry.\nExample: *.marry @player*');
        if (targetJid === sender) return reply('❌ You cannot marry yourself!');

        await getPlayer(sender, botId);
        await getPlayer(targetJid, botId);

        const player  = await fetchPlayer(sender);
        const partner = await fetchPlayer(targetJid);

        if (player.marriage?.partnerId) {
            return reply(buildBox('💍 ALREADY MARRIED', [
                `  You are already married to @${player.marriage.partnerId.split('@')[0]}!`,
                `  Use *.divorce* first.`,
            ]));
        }

        if (partner.marriage?.partnerId) {
            return reply(buildBox('💍 TAKEN', [
                `  @${targetJid.split('@')[0]} is already married!`,
            ]));
        }

        const ringCost = 1000;
        if (player.gold < ringCost) {
            return reply(`❌ A wedding ring costs ${ringCost} Gold. You have ${player.gold}.`);
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -ringCost } });
        await marry(sender, targetJid, 'Gold Ring');
        await addKarma(sender, 20);
        await addKarma(targetJid, 20);

        await react('💍');
        await reply(
            buildBox('💍 MARRIED!', [
                `  💒 ${name} & @${targetJid.split('@')[0]}`,
                `  are now married! 🎊`,
                `  ───────`,
                `  💰 Ring cost: -${ringCost} Gold`,
                `  ⚖️  Karma: +20 each`,
                `  ───────`,
                `  May your journey together be legendary! 👑`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .divorce — End your marriage
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'divorce',
        aliases:     ['separate', 'breakup'],
        category:    'social',
        react:       '💔',
        description: 'End your current marriage',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.marriage?.partnerId) {
            return reply(buildBox('💔 NOT MARRIED', [`  You are not currently married.`]));
        }

        if (q?.toLowerCase() !== 'confirm') {
            return reply(
                buildBox('💔 DIVORCE CONFIRMATION', [
                    `  Partner: @${player.marriage.partnerId.split('@')[0]}`,
                    `  ⚠️  This will end your marriage.`,
                    `  ⚖️  Karma: -30 penalty`,
                    `  ───────`,
                    `  Type *.divorce confirm* to proceed.`,
                ])
            );
        }

        const partnerId = player.marriage.partnerId;
        await divorce(sender);
        await addKarma(sender,   -30);
        await addKarma(partnerId, -15);

        await react('💔');
        await reply(
            buildBox('💔 DIVORCED', [
                `  ${name} and @${partnerId.split('@')[0]}`,
                `  are no longer married.`,
                `  ⚖️  Karma: -30`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .soulmate — View marriage info
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'soulmate',
        aliases:     ['partner', 'spouse', 'marriage'],
        category:    'social',
        react:       '💑',
        description: 'View your marriage info and partner stats',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.marriage?.partnerId) {
            return reply(buildBox('💑 SINGLE', [
                `  You are not married.`,
                `  Use *.marry @player* to propose!`,
            ]));
        }

        const partner = await fetchPlayer(player.marriage.partnerId);
        const { rankName } = getRank(partner?.level || 1, player.marriage.partnerId);
        const marriedDate = player.marriage.marriedAt
            ? new Date(player.marriage.marriedAt).toLocaleDateString()
            : 'Unknown';

        await react('💑');
        await reply(
            buildBox('💑 SOULMATE', [
                `  💒 ${name} & @${player.marriage.partnerId.split('@')[0]}`,
                `  Married: ${marriedDate}`,
                `  Ring: ${player.marriage.ring || 'None'}`,
                `  ───────`,
                `  Partner Stats:`,
                `  ⭐ Level: ${partner?.level || '?'}`,
                `  🏅 Rank:  ${rankName}`,
                `  💰 Gold:  ${partner?.gold?.toLocaleString() || '?'}`,
            ])
        );
    }
);

// ── Guild member cap by level ─────────────────────────────────────────────────
function getGuildMaxMembers(level) {
    const caps = [0, 20, 30, 45, 65, 90, 120, 160, 210, 270, 350];
    return caps[Math.min(level, caps.length - 1)] || 20;
}

// ════════════════════════════════════════════════════════════════════════════
// .guild-create — Create a new guild
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-create',
        aliases:     ['createguild', 'newguild'],
        category:    'social',
        react:       '⚔️',
        description: 'Create a new guild (costs 5000 gold)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        if (!q) return reply('❌ Usage: *.guild-create <guild name>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.guild?.guildId) {
            return reply(buildBox('⚔️ ALREADY IN GUILD', [
                `  You are in: ${player.guild.guildName}`,
                `  Leave first with *.guild-leave*`,
            ]));
        }

        const cost = 5000;
        if (player.gold < cost) return reply(`❌ Creating a guild costs ${cost} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        const result = await createGuild(sender, q);

        if (!result.success) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: cost } }); // refund
            return reply(`❌ ${result.reason}`);
        }

        await react('⚔️');
        await reply(
            buildBox('⚔️ GUILD CREATED', [
                `  Guild: *${q}*`,
                `  Master: You 👑`,
                `  💰 Cost: -${cost} Gold`,
                `  ───────`,
                `  Recruit with *.guild-invite @player*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-join — Join an existing guild
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-join',
        aliases:     ['joinguild'],
        category:    'social',
        react:       '🤝',
        description: 'Join an existing guild by name',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        if (!q) return reply('❌ Usage: *.guild-join <guild name>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.guild?.guildId) {
            return reply(`❌ Already in guild: *${player.guild.guildName}*. Leave first.`);
        }

        const guild = await Guild.findOne({ name: { $regex: new RegExp(q, 'i') } });
        if (!guild) return reply(`❌ Guild *${q}* not found.`);

        const result = await joinGuild(sender, guild.guildId);
        if (!result.success) return reply(`❌ ${result.reason}`);

        await react('🤝');
        await reply(
            buildBox('🤝 GUILD JOINED', [
                `  Welcome to *${guild.name}*!`,
                `  Members: ${guild.members.length + 1}`,
                `  Level: ${guild.level}`,
                `  Use *.guild-info* to see more.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-info — View guild information
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-info',
        aliases:     ['guildinfo', 'guild'],
        category:    'social',
        react:       '🏰',
        description: 'View your guild information',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) {
            return reply(buildBox('🏰 NO GUILD', [
                `  You are not in a guild.`,
                `  Use *.guild-create* or *.guild-join*`,
            ]));
        }

        const guild = await Guild.findOne({ guildId: player.guild.guildId });
        if (!guild) return reply('❌ Guild data not found.');

        await react('🏰');
        await reply(
            buildBox(`🏰 ${guild.name}`, [
                `  Level:    ${guild.level}`,
                `  EXP:      ${guild.exp.toLocaleString()}`,
                `  Master:   @${guild.masterId.split('@')[0]}`,
                `  Members:  ${guild.members.length}`,
                `  ───────`,
                `  🏦 Vault Gold:     ${guild.vault.gold.toLocaleString()}`,
                `  💎 Vault Diamonds: ${guild.vault.diamonds}`,
                `  ───────`,
                `  ⚔️  Wars:  ${guild.wars}  |  🏆 Wins: ${guild.wins}`,
                `  Territories: ${guild.territory.length}`,
                `  ───────`,
                `  Your Role: ${player.guild.role}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-vault — Deposit to guild vault
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-vault',
        aliases:     ['guildvault', 'guilddeposit'],
        category:    'social',
        react:       '🏦',
        description: 'Deposit gold into your guild vault',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        if (!q) return reply('❌ Usage: *.guild-vault <amount>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));

        const amount = parseInt(q);
        if (!amount || amount <= 0) return reply(t('economy.invalid_amount'));

        const result = await depositToGuildVault(sender, player.guild.guildId, amount);
        if (!result.success) return reply(`❌ ${result.reason}`);

        await addKarma(sender, 5);
        await react('🏦');
        await reply(
            buildBox('🏦 GUILD DEPOSIT', [
                `  Guild: ${player.guild.guildName}`,
                `  💰 Deposited: ${amount.toLocaleString()} Gold`,
                `  ⚖️  Karma: +5 (loyalty bonus)`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-war — Declare war on another guild
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-war',
        aliases:     ['guildwar', 'declarewar'],
        category:    'social',
        react:       '⚔️',
        description: 'Declare war on another guild',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        if (!q) return reply('❌ Usage: *.guild-war <enemy guild name>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply('❌ You must be in a guild to declare war.');
        if (player.guild.role !== 'master' && player.guild.role !== 'officer') {
            return reply('❌ Only guild master or officers can declare war.');
        }

        const { onCooldown, remaining } = checkCooldown(player, 'guildwar', CD.guildwar);
        if (onCooldown) return reply(buildBox('⚔️ ON COOLDOWN', [`  War resets in: ${formatCooldown(remaining)}`]));

        const enemyGuild = await Guild.findOne({ name: { $regex: new RegExp(q, 'i') } });
        if (!enemyGuild) return reply(`❌ Guild *${q}* not found.`);
        if (enemyGuild.guildId === player.guild.guildId) return reply('❌ Cannot war your own guild.');

        const ourGuild = await Guild.findOne({ guildId: player.guild.guildId });
        const won      = Math.random() < 0.5; // 50/50 base

        await Guild.updateOne({ guildId: ourGuild.guildId }, { $inc: { wars: 1, wins: won ? 1 : 0 } });
        await setCooldown(sender, 'guildwar');

        if (won) {
            const goldLoot = Math.floor(enemyGuild.vault.gold * 0.2);
            if (goldLoot > 0) {
                await Guild.updateOne({ guildId: enemyGuild.guildId },  { $inc: { 'vault.gold': -goldLoot } });
                await Guild.updateOne({ guildId: ourGuild.guildId },    { $inc: { 'vault.gold':  goldLoot } });
            }
            await grantExp(sender, 500, 0, botId);
            await addKarma(sender, 50);

            await react('⚔️');
            await reply(
                buildBox(`⚔️ WAR WON — vs ${enemyGuild.name}`, [
                    `  *${ourGuild.name}* defeated *${enemyGuild.name}*!`,
                    `  💰 Looted: ${goldLoot.toLocaleString()} Gold`,
                    `  ✨ EXP: +500`,
                    `  ⚖️  Karma: +50`,
                ])
            );
        } else {
            const goldLost = Math.floor(ourGuild.vault.gold * 0.1);
            if (goldLost > 0) {
                await Guild.updateOne({ guildId: ourGuild.guildId },  { $inc: { 'vault.gold': -goldLost } });
                await Guild.updateOne({ guildId: enemyGuild.guildId }, { $inc: { 'vault.gold':  goldLost } });
            }
            await react('💀');
            await reply(
                buildBox(`⚔️ WAR LOST — vs ${enemyGuild.name}`, [
                    `  *${ourGuild.name}* was defeated!`,
                    `  💰 Lost: ${goldLost.toLocaleString()} Gold from vault`,
                    `  Regroup and strike back!`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-leave — Leave your guild
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-leave',
        aliases:     ['leaveguild', 'quitguild'],
        category:    'social',
        react:       '🚶',
        description: 'Leave your current guild',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));
        if (q?.toLowerCase() !== 'confirm') {
            return reply(buildBox('🚶 LEAVE GUILD', [
                `  Guild: ${player.guild.guildName}`,
                `  ⚠️  Are you sure?`,
                `  Type *.guild-leave confirm* to proceed.`,
            ]));
        }

        await Guild.updateOne(
            { guildId: player.guild.guildId },
            { $pull: { members: sender } }
        );
        await GlobalPlayer.updateOne({ jid: sender }, {
            $set: { guild: { guildId: null, guildName: null, role: 'member', joinedAt: null } }
        });

        await react('🚶');
        await reply(buildBox('🚶 GUILD LEFT', [`  You left *${player.guild.guildName}*.`]));
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .party — Form a hunting party
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'party',
        aliases:     ['formparty', 'joinparty'],
        category:    'social',
        react:       '👥',
        description: 'Form or join a hunting party for bonus EXP',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'party', CD.party);
        if (onCooldown) return reply(buildBox('👥 ON COOLDOWN', [`  Party resets in: ${formatCooldown(remaining)}`]));

        if (!targetJid) {
            // Show current party
            return reply(
                buildBox('👥 PARTY STATUS', [
                    `  Leader: ${player.party ? '@' + player.party.split('@')[0] : 'None'}`,
                    `  Tag a player to invite them.`,
                    `  *.party @player*`,
                ])
            );
        }

        await getPlayer(targetJid, botId);
        await GlobalPlayer.updateOne({ jid: sender },    { $set: { party: sender   } });
        await GlobalPlayer.updateOne({ jid: targetJid }, { $set: { party: sender   } });
        await setCooldown(sender, 'party');

        // Party EXP bonus
        const bonusExp = 100;
        await grantExp(sender,    bonusExp, 0, botId);
        await grantExp(targetJid, bonusExp, 0, botId);

        await react('👥');
        await reply(
            buildBox('👥 PARTY FORMED', [
                `  Leader: ${name}`,
                `  Member: @${targetJid.split('@')[0]}`,
                `  ───────`,
                `  ✨ Party bonus: +${bonusExp} EXP each!`,
                `  All hunt rewards are shared!`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .vote — Vote for server events or proposals
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'vote',
        aliases:     ['upvote', 'poll'],
        category:    'social',
        react:       '🗳️',
        description: 'Vote on active senate proposals',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'vote', CD.vote);
        if (onCooldown) return reply(buildBox('🗳️ ALREADY VOTED', [`  Vote again in: ${formatCooldown(remaining)}`]));

        const proposalId = args[0];
        const vote       = args[1]?.toLowerCase(); // 'yes' or 'no'

        if (!SENATE_PROPOSALS.size) {
            return reply(buildBox('🗳️ NO PROPOSALS', [
                `  No active proposals to vote on.`,
                `  Use *.senate propose <text>* to create one.`,
            ]));
        }

        if (!proposalId || !vote || !['yes', 'no'].includes(vote)) {
            const proposals = [...SENATE_PROPOSALS.entries()].map(([id, p]) =>
                `  [${id}] ${p.text} — Yes:${p.yes} No:${p.no}`
            );
            return reply(buildBox('🗳️ ACTIVE PROPOSALS', [
                ...proposals,
                `  ───────`,
                `  Usage: *.vote <id> <yes/no>*`,
            ]));
        }

        const proposal = SENATE_PROPOSALS.get(proposalId);
        if (!proposal) return reply(`❌ Proposal #${proposalId} not found.`);

        if (SENATE_VOTES.get(sender + proposalId)) {
            return reply('❌ You already voted on this proposal!');
        }

        proposal[vote]++;
        SENATE_VOTES.set(sender + proposalId, true);

        await setCooldown(sender, 'vote');
        await addKarma(sender, 5);

        await react('🗳️');
        await reply(
            buildBox('🗳️ VOTE CAST', [
                `  Proposal: ${proposal.text}`,
                `  Your vote: ${vote.toUpperCase()}`,
                `  ✅ Yes: ${proposal.yes}  ❌ No: ${proposal.no}`,
                `  ⚖️  Karma: +5`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .senate — Create or view senate proposals
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'senate',
        aliases:     ['propose', 'senate-vote'],
        category:    'social',
        react:       '🏛️',
        description: 'Create senate proposals or view active ones',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, args, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (args[0]?.toLowerCase() === 'propose' || !SENATE_PROPOSALS.size) {
            const text = q?.replace('propose ', '') || q;
            if (!text) return reply('❌ Usage: *.senate propose <your proposal>*');

            const { onCooldown, remaining } = checkCooldown(player, 'senate', CD.senate);
            if (onCooldown) return reply(buildBox('🏛️ ON COOLDOWN', [`  Senate cooldown: ${formatCooldown(remaining)}`]));

            const id = String(SENATE_PROPOSALS.size + 1);
            const name = player.username || pushName;
            SENATE_PROPOSALS.set(id, { text, yes: 0, no: 0, author: name });
            await setCooldown(sender, 'senate');
            await addKarma(sender, 10);

            await react('🏛️');
            return reply(
                buildBox('🏛️ PROPOSAL SUBMITTED', [
                    `  ID: #${id}`,
                    `  Text: ${text}`,
                    `  ⚖️  Karma: +10`,
                    `  Use *.vote ${id} yes/no* to vote!`,
                ])
            );
        }

        const proposals = [...SENATE_PROPOSALS.entries()].map(([id, p]) =>
            `  [#${id}] ${p.text}\n  by ${p.author} — Yes:${p.yes} No:${p.no}`
        );

        await react('🏛️');
        await reply(
            buildBox('🏛️ SENATE CHAMBER', [
                ...(proposals.length ? proposals : ['  No active proposals.']),
                `  ───────`,
                `  Use *.senate propose <text>* to propose`,
                `  Use *.vote <id> yes/no* to vote`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .tax-set — Set your personal tax contribution rate (guild masters)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'tax-set',
        aliases:     ['settax', 'taxrate'],
        category:    'social',
        react:       '📋',
        description: 'Set your tax rate (guild masters only)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.guild?.role !== 'master') {
            return reply('❌ Only guild masters can set tax rates.');
        }

        const rate = parseFloat(q);
        if (isNaN(rate) || rate < 0 || rate > 0.3) {
            return reply('❌ Tax rate must be between 0 and 0.30 (0% - 30%).\nExample: *.tax-set 0.05* for 5%');
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $set: { taxRate: rate } });

        await react('📋');
        await reply(
            buildBox('📋 TAX RATE SET', [
                `  New Rate: ${(rate * 100).toFixed(1)}%`,
                `  Applied to all guild members.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .jail — View jail status
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'jail',
        aliases:     ['jailstatus', 'prison'],
        category:    'social',
        react:       '🔒',
        description: 'Check your jail status or view who is jailed',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        const targetJid = conText.user || sender;
        await getPlayer(targetJid, botId);
        const player = await fetchPlayer(targetJid);

        if (!player.isJailed) {
            return reply(
                buildBox('🔒 JAIL STATUS', [
                    `  @${targetJid.split('@')[0]} is FREE.`,
                    `  Not currently imprisoned.`,
                ])
            );
        }

        const timeLeft = player.jailUntil
            ? Math.max(0, new Date(player.jailUntil).getTime() - Date.now())
            : 0;

        await react('🔒');
        await reply(
            buildBox('🔒 JAILED', [
                `  Prisoner: @${targetJid.split('@')[0]}`,
                `  Time remaining: ${formatCooldown(timeLeft)}`,
                `  Use *.release-bail* to pay bail.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .arrest — Arrest another player (requires high karma + rank)
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'arrest',
        aliases:     ['detain', 'imprison'],
        category:    'social',
        react:       '🚔',
        description: 'Arrest another player (requires Light alignment + A-Rank)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, args, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to arrest.\nExample: *.arrest @player*');

        await getPlayer(sender, botId);
        const officer = await fetchPlayer(sender);

        if (officer.alignment !== 'Light' && officer.karma < 200) {
            return reply(buildBox('🚔 AUTHORITY REQUIRED', [
                `  Arresting requires Light alignment`,
                `  and 200+ Karma.`,
                `  Your Karma: ${officer.karma}`,
            ]));
        }

        const { rankId } = getRank(officer.level, sender);
        if (rankId < 5) {
            return reply(buildBox('🚔 RANK TOO LOW', [`  Arrest requires A-Rank (Level 85+).`]));
        }

        const { onCooldown, remaining } = checkCooldown(officer, 'arrest', CD.arrest);
        if (onCooldown) return reply(buildBox('🚔 ON COOLDOWN', [`  Arrest resets in: ${formatCooldown(remaining)}`]));

        const target = await fetchPlayer(targetJid);
        if (!target) return reply(t('social.player_not_found'));
        if (target.isJailed) return reply('❌ Already jailed!');

        const duration = 30 * 60 * 1000; // 30 min
        await jailPlayer(targetJid, duration);
        await addKarma(sender,   20);
        await addKarma(targetJid,-30);
        await setCooldown(sender, 'arrest');

        await react('🚔');
        await reply(
            buildBox('🚔 ARRESTED', [
                `  Officer: ${name}`,
                `  Prisoner: @${targetJid.split('@')[0]}`,
                `  Duration: 30 minutes`,
                `  ⚖️  Your Karma: +20`,
                `  ⚖️  Their Karma: -30`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .release-bail — Pay bail to get out of jail
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'release-bail',
        aliases:     ['bail', 'paybail'],
        category:    'social',
        react:       '🔓',
        description: 'Pay bail to get released from jail early',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.isJailed) {
            return reply(buildBox('🔓 NOT JAILED', [`  You are not in jail!`]));
        }

        const bailCost = 2000;
        if (player.gold < bailCost) {
            return reply(
                buildBox('🔓 BAIL REQUIRED', [
                    `  Bail cost: ${bailCost.toLocaleString()} Gold`,
                    `  Your Gold: ${player.gold.toLocaleString()}`,
                    `  Not enough gold!`,
                ])
            );
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -bailCost } });
        await releaseJail(sender);
        await addKarma(sender, -10);

        await react('🔓');
        await reply(
            buildBox('🔓 RELEASED ON BAIL', [
                `  💰 Bail paid: ${bailCost.toLocaleString()} Gold`,
                `  ⚖️  Karma: -10`,
                `  You are free! Stay out of trouble.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .mentor — Set a mentor for bonus EXP
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'mentor',
        aliases:     ['setmentor', 'teacher'],
        category:    'social',
        react:       '📚',
        description: 'Set a mentor for bonus EXP (mentor must be 20+ levels higher)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player you want as mentor.\nExample: *.mentor @player*');
        if (targetJid === sender) return reply('❌ Cannot mentor yourself!');

        await getPlayer(sender, botId);
        await getPlayer(targetJid, botId);

        const student = await fetchPlayer(sender);
        const mentor  = await fetchPlayer(targetJid);

        if (mentor.level < student.level + 20) {
            return reply(
                buildBox('📚 LEVEL GAP TOO SMALL', [
                    `  Mentor must be 20+ levels above you.`,
                    `  Their Level: ${mentor.level}`,
                    `  Your Level:  ${student.level}`,
                    `  Gap needed:  20`,
                ])
            );
        }

        if (student.mentor) {
            return reply(`❌ Already has mentor: @${student.mentor.split('@')[0]}`);
        }

        await setMentor(sender, targetJid);
        await addKarma(targetJid, 15);

        await react('📚');
        await reply(
            buildBox('📚 MENTOR SET', [
                `  Mentor:  @${targetJid.split('@')[0]} (Lv.${mentor.level})`,
                `  Student: You (Lv.${student.level})`,
                `  ───────`,
                `  ✨ EXP bonus: +10% from hunts`,
                `  Mentor receives: +15 Karma`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .apprentice — View your apprentices
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'apprentice',
        aliases:     ['apprentices', 'students'],
        category:    'social',
        react:       '📖',
        description: 'View your apprentices',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const apps   = player.apprentices || [];

        const lines = apps.length
            ? apps.map(a => `  📖 @${a.split('@')[0]}`)
            : ['  No apprentices yet.', '  Let others use *.mentor @you* to add them.'];

        await react('📖');
        await reply(
            buildBox(`📖 ${name}'s APPRENTICES`, [
                `  Total: ${apps.length}`,
                `  ───────`,
                ...lines,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .gift — Gift gold or items to another player
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'gift',
        aliases:     ['givegift', 'present'],
        category:    'social',
        react:       '🎁',
        description: 'Gift gold to another player',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, args, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to gift.\nExample: *.gift @player 500*');

        const amount = parseInt(args[0]) || parseInt(args[1]);
        if (!amount || amount < 1) return reply('❌ Specify a valid amount.');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'gifting', CD.gifting);
        if (onCooldown) return reply(buildBox('🎁 ON COOLDOWN', [`  Gift again in: ${formatCooldown(remaining)}`]));

        if (player.gold < amount) return reply(`❌ Not enough gold. You have ${player.gold.toLocaleString()}.`);

        await GlobalPlayer.updateOne({ jid: sender },    { $inc: { gold: -amount } });
        await GlobalPlayer.updateOne({ jid: targetJid }, { $inc: { gold:  amount } });
        await addKarma(sender, 10);
        await setCooldown(sender, 'gifting');
        const name = player.username || pushName;

        await react('🎁');
        await reply(
            buildBox('🎁 GIFT SENT', [
                `  From: ${name}`,
                `  To:   @${targetJid.split('@')[0]}`,
                `  💰 Amount: ${amount.toLocaleString()} Gold`,
                `  ⚖️  Karma: +10 (generosity)`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .friends — View your friends list
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'friends',
        aliases:     ['friendlist', 'fl'],
        category:    'social',
        react:       '👫',
        description: 'View your friends list',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const friends = player.friends || [];

        const lines = friends.length
            ? friends.map(f => `  👫 @${f.split('@')[0]}`)
            : ['  No friends yet.', '  Use *.add-friend @player* to add one!'];

        await react('👫');
        await reply(
            buildBox(`👫 ${name}'s FRIENDS`, [
                `  Total: ${friends.length}`,
                `  ───────`,
                ...lines,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .add-friend — Add a friend
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'add-friend',
        aliases:     ['addfriend', 'friend'],
        category:    'social',
        react:       '👫',
        description: 'Add another player as a friend',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to add.\nExample: *.add-friend @player*');
        if (targetJid === sender) return reply('❌ Cannot friend yourself!');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.friends?.includes(targetJid)) {
            return reply(`❌ @${targetJid.split('@')[0]} is already your friend!`);
        }

        await GlobalPlayer.updateOne({ jid: sender },    { $addToSet: { friends: targetJid } });
        await GlobalPlayer.updateOne({ jid: targetJid }, { $addToSet: { friends: sender    } });

        await react('👫');
        await reply(
            buildBox('👫 FRIEND ADDED', [
                `  @${targetJid.split('@')[0]} added to friends!`,
                `  You are now friends. 🤝`,
            ])
        );
    }
);

module.exports = {};

// ════════════════════════════════════════════════════════════════════════════
// .guild-kick — Kick a member from guild
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-kick',
        aliases:     ['guildkick', 'kickmember'],
        category:    'social',
        react:       '👢',
        description: 'Kick a member from your guild',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, mentionedJid, t } = conText;

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the member to kick.');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));
        if (player.guild.role !== 'master' && player.guild.role !== 'officer') {
            return reply('❌ Only guild master or officers can kick members.');
        }
        if (targetJid === sender) return reply('❌ You cannot kick yourself.');

        const target = await fetchPlayer(targetJid);
        if (target?.guild?.guildId !== player.guild.guildId) {
            return reply(t('social.player_not_in_guild'));
        }
        if (target?.guild?.role === 'master') {
            return reply('❌ Cannot kick the guild master.');
        }

        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            { $set: { 'guild.guildId': null, 'guild.guildName': null, 'guild.role': null } }
        );
        await Guild.updateOne(
            { guildId: player.guild.guildId },
            { $pull: { members: targetJid } }
        );

        const tName = target?.username || targetJid.split('@')[0];
        await react('👢');
        await reply(
            buildBox('👢 MEMBER KICKED', [
                `  *${tName}* has been removed from *${player.guild.guildName}*.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-promote — Promote a member to officer
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-promote',
        aliases:     ['guildpromote', 'promotemember'],
        category:    'social',
        react:       '⬆️',
        description: 'Promote a guild member to officer',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, mentionedJid, t } = conText;

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the member to promote.');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));
        if (player.guild.role !== 'master') return reply('❌ Only the guild master can promote members.');

        const target = await fetchPlayer(targetJid);
        if (target?.guild?.guildId !== player.guild.guildId) {
            return reply(t('social.player_not_in_guild'));
        }

        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            { $set: { 'guild.role': 'officer' } }
        );

        const tName = target?.username || targetJid.split('@')[0];
        await react('⬆️');
        await reply(
            buildBox('⬆️ MEMBER PROMOTED', [
                `  *${tName}* is now an *Officer* of *${player.guild.guildName}*!`,
                `  ───────`,
                `  Officers can: kick members, declare war`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-upgrade — Upgrade guild level using vault gold
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-upgrade',
        aliases:     ['guildupgrade', 'upguildlevel'],
        category:    'social',
        react:       '⬆️',
        description: 'Upgrade your guild level (uses vault gold)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));
        if (player.guild.role !== 'master') return reply('❌ Only the guild master can upgrade the guild.');

        const guild    = await Guild.findOne({ guildId: player.guild.guildId });
        if (!guild) return reply(t('social.guild_not_found'));

        const nextLevel  = guild.level + 1;
        const upgradeCost = nextLevel * 10000; // 10k per level

        if (guild.vault.gold < upgradeCost) {
            return reply(
                buildBox('❌ INSUFFICIENT VAULT GOLD', [
                    `  Next Level: *${nextLevel}*`,
                    `  Cost:       *${upgradeCost.toLocaleString()} Gold*`,
                    `  Vault:      *${guild.vault.gold.toLocaleString()} Gold*`,
                    `  ───────`,
                    `  Deposit more with *.guild-vault <amount>*`,
                ])
            );
        }

        const newMaxMembers = getGuildMaxMembers(nextLevel);
        await Guild.findOneAndUpdate(
            { guildId: guild.guildId },
            {
                $inc: { level: 1, 'vault.gold': -upgradeCost },
                $set: { maxMembers: newMaxMembers },
            }
        );

        const benefits = [
            `  👥 Max members: *${newMaxMembers}*`,
            `  +${nextLevel}% vault capacity`,
            `  +${nextLevel * 2}% war win bonus`,
        ];

        await react('⬆️');
        await reply(
            buildBox('⬆️ GUILD UPGRADED', [
                `  *${guild.name}* → Level *${nextLevel}*!`,
                `  💰 Cost: -${upgradeCost.toLocaleString()} Gold`,
                `  ───────`,
                `  New Benefits:`,
                ...benefits,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-withdraw — Master withdraws gold from vault
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-withdraw',
        aliases:     ['guildwithdraw', 'guildwithdrawal'],
        category:    'social',
        react:       '💸',
        description: 'Withdraw gold from guild vault (master only)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        if (!q) return reply('❌ Usage: *.guild-withdraw <amount>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));
        if (player.guild.role !== 'master') return reply('❌ Only the guild master can withdraw from vault.');

        const amount = parseInt(q);
        if (!amount || amount <= 0) return reply(t('economy.invalid_amount'));

        const guild = await Guild.findOne({ guildId: player.guild.guildId });
        if (!guild) return reply(t('social.guild_not_found'));

        if (guild.vault.gold < amount) {
            return reply(`❌ Vault only has *${guild.vault.gold.toLocaleString()} Gold*.`);
        }

        await Guild.findOneAndUpdate(
            { guildId: guild.guildId },
            { $inc: { 'vault.gold': -amount } }
        );
        await addGold(sender, amount);
        await addKarma(sender, -10); // slight karma penalty for withdrawing

        await react('💸');
        await reply(
            buildBox('💸 VAULT WITHDRAWAL', [
                `  Guild: *${guild.name}*`,
                `  💰 Withdrawn: *${amount.toLocaleString()} Gold*`,
                `  ⚖️  Karma: -10`,
                `  ───────`,
                `  Vault remaining: *${(guild.vault.gold - amount).toLocaleString()} Gold*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-lb — Guild leaderboard
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-lb',
        aliases:     ['guildlb', 'guildleaderboard', 'toplguilds'],
        category:    'social',
        react:       '🏆',
        description: 'View top guilds leaderboard',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react, t } = conText;

        const topGuilds = await Guild.find()
            .sort({ level: -1, wins: -1, 'vault.gold': -1 })
            .limit(10);

        if (!topGuilds.length) return reply('❌ No guilds found yet.');

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const lines  = topGuilds.map((g, i) =>
            `  ${medals[i]} *${g.name}*\n     Lv.${g.level} · 👥${g.members.length} · ⚔️${g.wins}W · 💰${g.vault.gold.toLocaleString()}g`
        );

        await react('🏆');
        await reply(
            buildBox('🏆 GUILD LEADERBOARD', [
                ...lines.map((l, i) => i < lines.length - 1 ? l + '\n  ───────' : l),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .guild-members — List all guild members
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'guild-members',
        aliases:     ['guildmembers', 'guildlist'],
        category:    'social',
        react:       '👥',
        description: 'List all members in your guild',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));

        const guild   = await Guild.findOne({ guildId: player.guild.guildId });
        if (!guild) return reply(t('social.guild_not_found'));

        const members = await GlobalPlayer.find({ 'guild.guildId': guild.guildId })
            .select('jid username level jobRole guild.role');

        const roleEmoji = { master: '👑', officer: '⭐', member: '👤' };

        const lines = members.map(m => {
            const rEmoji = roleEmoji[m.guild?.role || 'member'] || '👤';
            const job    = m.jobRole ? ` · ${m.jobRole}` : '';
            return `  ${rEmoji} *${m.username || m.jid.split('@')[0]}* Lv.${m.level}${job}`;
        });

        await react('👥');
        await reply(
            buildBox(`👥 ${guild.name} — MEMBERS`, [
                `  Level: *${guild.level}*  Members: *${members.length}*`,
                `  💰 Vault: *${guild.vault.gold.toLocaleString()} Gold*`,
                `  ───────`,
                ...lines,
            ])
        );
    }
);


// ══════════════════════════════════════════════════════════════════════
// EXTENDED COMMANDS — from new_cmds/social2.js
// ══════════════════════════════════════════════════════════════════════
const CD_SOCIAL2 = {
    guildupgrade: 24 * 60 * 60 * 1000,
    alliance:     48 * 60 * 60 * 1000,
    declarePeace: 24 * 60 * 60 * 1000,
    embassy:      12 * 60 * 60 * 1000,
    election:     7  * 24 * 60 * 60 * 1000,
    campaign:     24 * 60 * 60 * 1000,
    impeach:      48 * 60 * 60 * 1000,
    spy:          6  * 60 * 60 * 1000,
    negotiate:    12 * 60 * 60 * 1000,
    treaty:       48 * 60 * 60 * 1000,
    propaganda:   24 * 60 * 60 * 1000,
    bountyclaim:  60 * 60 * 1000,
    influence:    6  * 60 * 60 * 1000,
};


mxd(
    {
        pattern:     'guild-rank',
        aliases:     ['guildrank', 'guildlb'],
        category:    'social',
        react:       '🏆',
        description: 'View the global guild leaderboard',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react, t } = conText;

        const top    = await Guild.find().sort({ level: -1, exp: -1 }).limit(10).lean();
        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

        await react('🏆');
        await reply(
            buildBox('🏆 GUILD LEADERBOARD', [
                ...(top.length
                    ? top.map((g, i) =>
                        `  ${medals[i]} *${g.name}* — Lv.${g.level} | 👥 ${g.members.length} | ⚔️ ${g.wins}W`
                      )
                    : ['  No guilds yet!']),
            ])
        );
    }
);

mxd(
    {
        pattern:     'guild-disband',
        aliases:     ['guilddisband', 'disband'],
        category:    'social',
        react:       '💔',
        description: 'Disband your guild (master only, irreversible)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));
        if (player.guild.role !== 'master') return reply('❌ Only the guild master can disband.');

        if (q?.toLowerCase() !== 'confirm') {
            return reply(buildBox('💔 DISBAND GUILD', [
                `  ⚠️  This will permanently delete ${player.guild.guildName}!`,
                `  All members will be removed.`,
                `  Type *.guild-disband confirm* to proceed.`,
            ]));
        }

        const guild = await Guild.findOne({ guildId: player.guild.guildId });
        if (guild) {
            // Remove all members
            await GlobalPlayer.updateMany(
                { jid: { $in: guild.members } },
                { $set: { guild: { guildId: null, guildName: null, role: 'member', joinedAt: null } } }
            );
            await Guild.deleteOne({ guildId: player.guild.guildId });
        }

        await react('💔');
        await reply(buildBox('💔 GUILD DISBANDED', [
            `  ${player.guild.guildName} has been dissolved.`,
            `  All members have been released.`,
        ]));
    }
);

mxd(
    {
        pattern:     'alliance',
        aliases:     ['formalliance', 'ally'],
        category:    'social',
        react:       '🤝',
        description: 'Form an alliance with another guild (master only)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));
        if (player.guild.role !== 'master') return reply('❌ Only the guild master can form alliances.');

        const { onCooldown, remaining } = checkCooldown(player, 'alliance', CD.alliance);
        if (onCooldown) return reply(buildBox('🤝 ON COOLDOWN', [`  Alliance resets in: ${formatCooldown(remaining)}`]));

        if (!q) return reply('❌ Usage: *.alliance <guild name>*');

        const targetGuild = await Guild.findOne({ name: { $regex: new RegExp(q, 'i') } });
        if (!targetGuild) return reply(`❌ Guild *${q}* not found.`);
        if (targetGuild.guildId === player.guild.guildId) return reply('❌ Cannot ally with yourself.');

        const myAllies = ALLIANCES.get(player.guild.guildId) || new Set();
        myAllies.add(targetGuild.guildId);
        ALLIANCES.set(player.guild.guildId, myAllies);

        const theirAllies = ALLIANCES.get(targetGuild.guildId) || new Set();
        theirAllies.add(player.guild.guildId);
        ALLIANCES.set(targetGuild.guildId, theirAllies);

        await addKarma(sender, 20);
        await setCooldown(sender, 'alliance');

        await react('🤝');
        await reply(
            buildBox('🤝 ALLIANCE FORMED', [
                `  ${player.guild.guildName} ⟷ ${targetGuild.name}`,
                `  Alliance active!`,
                `  ⚖️  Karma: +20`,
                `  Allied guilds share +5% EXP in raids.`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'declare-peace',
        aliases:     ['declarepeace', 'peace'],
        category:    'social',
        react:       '☮️',
        description: 'Declare peace to end an ongoing guild war',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply(t('social.not_in_guild'));
        if (player.guild.role !== 'master') return reply('❌ Only the guild master can declare peace.');

        const { onCooldown, remaining } = checkCooldown(player, 'declarePeace', CD.declarePeace);
        if (onCooldown) return reply(buildBox('☮️ ON COOLDOWN', [`  Peace declaration resets in: ${formatCooldown(remaining)}`]));

        const targetGuild = q ? await Guild.findOne({ name: { $regex: new RegExp(q, 'i') } }) : null;
        const tName       = targetGuild?.name || 'All enemies';

        await addKarma(sender, 30);
        await setCooldown(sender, 'declarePeace');

        await react('☮️');
        await reply(
            buildBox('☮️ PEACE DECLARED', [
                `  ${player.guild.guildName} declares peace with ${tName}.`,
                `  ⚖️  Karma: +30`,
                `  Hostilities have ceased.`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'embassy',
        aliases:     ['buildembassy', 'diplomatic'],
        category:    'social',
        react:       '🏛️',
        description: 'Establish an embassy for diplomatic EXP and karma bonuses',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply('❌ You must be in a guild to establish an embassy.');

        const { onCooldown, remaining } = checkCooldown(player, 'embassy', CD.embassy);
        if (onCooldown) return reply(buildBox('🏛️ ON COOLDOWN', [`  Embassy resets in: ${formatCooldown(remaining)}`]));

        const cost = 3000;
        if (player.gold < cost) return reply(`❌ Embassy costs ${cost.toLocaleString()} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        const scaled = scaleRewards({ exp: 500, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await addKarma(sender, 40);
        await setCooldown(sender, 'embassy');

        await react('🏛️');
        await reply(
            buildBox('🏛️ EMBASSY ESTABLISHED', [
                `  Diplomatic presence secured!`,
                `  💰 Cost: -${cost.toLocaleString()} Gold`,
                `  ✨ EXP: +${scaled.exp}`,
                `  ⚖️  Karma: +40`,
                `  Bonus: +10% EXP from social interactions`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'reputation',
        aliases:     ['rep', 'worldrep'],
        category:    'social',
        react:       '🌟',
        description: 'View your reputation standing across all factions',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const karma      = player.karma;
        const { rankName } = getRank(player.level, player.jid);

        const hunterRep  = Math.min(100, player.combat.kills * 2 + player.combat.dungeonClears * 5);
        const merchantRep = Math.min(100, Math.floor(player.gold / 1000));
        const darkRep    = ['Dark', 'Chaos'].includes(player.alignment) ? Math.abs(karma / 5) : 0;
        const lightRep   = ['Light'].includes(player.alignment) ? karma / 5 : 0;

        await react('🌟');
        await reply(
            buildBox('🌟 WORLD REPUTATION', [
                `  Hunter: ${name}  |  ${rankName}`,
                `  ───────`,
                `  ⚔️  Hunter Faction:   ${Math.floor(hunterRep)}/100`,
                `  💰 Merchant Guild:   ${Math.floor(merchantRep)}/100`,
                `  ☀️  Light Order:      ${Math.floor(Math.max(0, lightRep))}/100`,
                `  🌑 Dark Brotherhood: ${Math.floor(Math.max(0, darkRep))}/100`,
                `  ───────`,
                `  Overall Karma: ${karma}`,
                `  Alignment: ${player.alignment}`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'fame',
        aliases:     ['famestatus', 'celebrity'],
        category:    'social',
        react:       '⭐',
        description: 'Check your fame score based on level, kills and achievements',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        const targetJid = conText.user || sender;
        await getPlayer(targetJid, botId);
        const player = await fetchPlayer(targetJid);
        const name   = player.username || (targetJid === sender ? pushName : targetJid.split('@')[0]);

        const fameScore = Math.floor(
            player.level * 10
            + player.combat.kills * 5
            + player.combat.bossKills * 20
            + player.combat.dungeonClears * 8
            + (player.achievements?.list?.length || 0) * 15
            + player.rebirths * 100
        );

        const fameTier =
            fameScore >= 10000 ? '👑 Legendary'   :
            fameScore >= 5000  ? '💎 Renowned'    :
            fameScore >= 2000  ? '🌟 Famous'      :
            fameScore >= 500   ? '⭐ Known'       :
                                 '👤 Unknown';

        await react('⭐');
        await reply(
            buildBox('⭐ FAME STATUS', [
                `  Hunter: ${name}`,
                `  Fame Score: ${fameScore.toLocaleString()}`,
                `  Status: ${fameTier}`,
                `  ───────`,
                `  Level contribution:      +${player.level * 10}`,
                `  Kill contribution:       +${player.combat.kills * 5}`,
                `  Boss kill contribution:  +${player.combat.bossKills * 20}`,
                `  Achievement contribution: +${(player.achievements?.list?.length || 0) * 15}`,
                `  Rebirth contribution:    +${player.rebirths * 100}`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'influence',
        aliases:     ['worldinfluence', 'exertpower'],
        category:    'social',
        react:       '👁️',
        description: 'Exert your influence to gain world bonuses (karma-based)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'influence', CD.influence);
        if (onCooldown) return reply(buildBox('👁️ ON COOLDOWN', [`  Influence resets in: ${formatCooldown(remaining)}`]));

        if (Math.abs(player.karma) < 100) {
            return reply('❌ Need 100+ Karma (positive or negative) to exert influence.');
        }

        const mult   = getRankMultiplier(player.level, player.jid);
        const effect = player.karma > 0
            ? { desc: 'Light Decree — boosted EXP for all light hunters', exp: 300, gold: 200 }
            : { desc: 'Dark Edict — boosted gold from dark activities', exp: 100, gold: 500 };

        const scaled = scaleRewards({ exp: effect.exp, gold: effect.gold }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'influence');

        await react('👁️');
        await reply(
            buildBox('👁️ INFLUENCE EXERTED', [
                `  ${effect.desc}`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                `  🏅 Rank bonus: ${mult}x`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'council',
        aliases:     ['worldcouncil', 'joincouncil'],
        category:    'social',
        react:       '🏛️',
        description: 'View or apply to join the World Council (A-Rank+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;
        const { rankId, rankName } = getRank(player.level, player.jid);

        const councilMembers = await GlobalPlayer.find({ registered: true })
            .sort({ karma: -1, level: -1 })
            .limit(5)
            .lean();

        const eligible = rankId >= 5 && player.karma >= 200;

        await react('🏛️');
        await reply(
            buildBox('🏛️ WORLD COUNCIL', [
                `  CURRENT SEATS:`,
                ...councilMembers.map((m, i) => {
                    const mName = m.username || m.jid.split('@')[0];
                    const { rankName: rn } = getRank(m.level, m.jid);
                    return `  ${i + 1}. ${mName} — ${rn} | Karma: ${m.karma}`;
                }),
                `  ───────`,
                `  YOUR STATUS: ${eligible ? '✅ Eligible' : '❌ Not eligible'}`,
                eligible ? `  Use *.campaign* to run for council.` : `  Need: A-Rank + 200 Karma`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'election',
        aliases:     ['startelection', 'vote-leader'],
        category:    'social',
        react:       '🗳️',
        description: 'Start or participate in a guild leadership election',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        if (!player.guild?.guildId) return reply('❌ You must be in a guild for elections.');

        const { onCooldown, remaining } = checkCooldown(player, 'election', CD.election);
        if (onCooldown) return reply(buildBox('🗳️ ON COOLDOWN', [`  Election resets in: ${formatCooldown(remaining)}`]));

        const elecId = player.guild.guildId;
        const active = ELECTIONS.get(elecId);

        // View or vote
        if (!q || q === 'view') {
            if (!active) return reply(buildBox('🗳️ NO ELECTION', [
                `  No active election in ${player.guild.guildName}.`,
                `  Use *.campaign* to run for master.`,
            ]));
            const lines = Object.entries(active.votes)
                .sort(([,a],[,b]) => b - a)
                .map(([n, v]) => `  ${n}: ${v} votes`);
            return reply(buildBox('🗳️ ACTIVE ELECTION', [...lines, `  *.election vote <name>* to vote`]));
        }

        // Cast vote
        if (q.startsWith('vote ')) {
            if (!active) return reply('❌ No active election.');
            const candidate = q.replace('vote ', '').trim();
            if (!active.votes[candidate] === undefined) return reply(`❌ ${candidate} is not a candidate.`);
            active.votes[candidate] = (active.votes[candidate] || 0) + 1;
            await setCooldown(sender, 'election');
            return reply(buildBox('🗳️ VOTE CAST', [`  Voted for: ${candidate}`]));
        }

        await reply('❌ Usage: *.election* | *.election vote <name>*');
    }
);

mxd(
    {
        pattern:     'campaign',
        aliases:     ['runcampaign', 'runforoffice'],
        category:    'social',
        react:       '📢',
        description: 'Run a campaign for guild master or council seat',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        if (!player.guild?.guildId) return reply('❌ You must be in a guild to campaign.');

        const { onCooldown, remaining } = checkCooldown(player, 'campaign', CD.campaign);
        if (onCooldown) return reply(buildBox('📢 ON COOLDOWN', [`  Campaign resets in: ${formatCooldown(remaining)}`]));

        const cost = 1000;
        if (player.gold < cost) return reply(`❌ Campaigning costs ${cost} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });

        // Register as candidate
        const elecId = player.guild.guildId;
        if (!ELECTIONS.has(elecId)) {
            ELECTIONS.set(elecId, { votes: {}, endsAt: Date.now() + 24 * 3600000 });
        }
        ELECTIONS.get(elecId).votes[name] = 0;

        await addKarma(sender, 10);
        await setCooldown(sender, 'campaign');

        const slogan = q || 'For a stronger guild!';
        await react('📢');
        await reply(
            buildBox('📢 CAMPAIGN LAUNCHED', [
                `  *${name}* is running for guild master!`,
                `  Slogan: "${slogan}"`,
                `  💰 Cost: -${cost} Gold`,
                `  ⚖️  Karma: +10`,
                `  Guild members can vote with *.election vote ${name}*`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'impeach',
        aliases:     ['overthrow', 'remove-master'],
        category:    'social',
        react:       '⚡',
        description: 'Attempt to impeach the current guild master',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply('❌ You must be in a guild.');
        if (player.guild.role === 'master') return reply('❌ You are already the master!');

        const { onCooldown, remaining } = checkCooldown(player, 'impeach', CD.impeach);
        if (onCooldown) return reply(buildBox('⚡ ON COOLDOWN', [`  Impeach resets in: ${formatCooldown(remaining)}`]));

        const cost = 5000;
        if (player.gold < cost) return reply(`❌ Impeachment costs ${cost} Gold.`);

        const success = Math.random() < 0.35; // 35% success rate
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await setCooldown(sender, 'impeach');

        if (success) {
            await GlobalPlayer.updateOne({ jid: sender }, { $set: { 'guild.role': 'master' } });
            await addKarma(sender, -50);
            await react('⚡');
            await reply(
                buildBox('⚡ IMPEACHMENT SUCCESS', [
                    `  You seized control of ${player.guild.guildName}!`,
                    `  💰 Cost: -${cost.toLocaleString()} Gold`,
                    `  ⚖️  Karma: -50 (power grab)`,
                    `  You are now the Guild Master! 👑`,
                ])
            );
        } else {
            await addKarma(sender, -20);
            await react('❌');
            await reply(
                buildBox('⚡ IMPEACHMENT FAILED', [
                    `  The guild rallied behind the master!`,
                    `  💰 Cost: -${cost.toLocaleString()} Gold (lost)`,
                    `  ⚖️  Karma: -20`,
                ])
            );
        }
    }
);

mxd(
    {
        pattern:     'exile',
        aliases:     ['banish', 'expel'],
        category:    'social',
        react:       '🚷',
        description: 'Exile a player from your territory (requires territory ownership)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to exile.');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.territoriesOwned?.length) {
            return reply('❌ You must own a territory to exile players.');
        }

        if (player.alignment !== 'Light' && player.karma < 200) {
            return reply('❌ Exile requires Light alignment or 200+ Karma.');
        }

        const target  = await fetchPlayer(targetJid);
        const tName   = target?.username || targetJid.split('@')[0];

        await jailPlayer(targetJid, 60 * 60 * 1000); // 1 hour
        await addKarma(sender,    10);
        await addKarma(targetJid, -20);

        await react('🚷');
        await reply(
            buildBox('🚷 PLAYER EXILED', [
                `  ${tName} has been exiled!`,
                `  Duration: 1 hour`,
                `  ⚖️  Your Karma: +10`,
                `  ⚖️  Their Karma: -20`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'pardon',
        aliases:     ['freeplayer', 'release-player'],
        category:    'social',
        react:       '🕊️',
        description: 'Pardon and release a jailed player (Light alignment)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to pardon.');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.alignment !== 'Light') {
            return reply('❌ Only Light alignment can issue pardons.');
        }

        const target = await fetchPlayer(targetJid);
        if (!target?.isJailed) return reply('❌ That player is not jailed.');

        const tName = target.username || targetJid.split('@')[0];
        await releaseJail(targetJid);
        await addKarma(sender,    20);
        await addKarma(targetJid, 10);

        await react('🕊️');
        await reply(
            buildBox('🕊️ PARDON GRANTED', [
                `  ${tName} has been released!`,
                `  ⚖️  Your Karma:  +20`,
                `  ⚖️  Their Karma: +10`,
                `  May they walk a better path.`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'bounty-claim',
        aliases:     ['bountyclaim', 'claimkill'],
        category:    'social',
        react:       '🎯',
        description: 'Claim a bounty reward after eliminating a wanted player',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the wanted player to claim their bounty.');

        await getPlayer(sender, botId);
        const { onCooldown, remaining } = checkCooldown(await fetchPlayer(sender), 'bountyclaim', CD.bountyclaim);
        if (onCooldown) return reply(buildBox('🎯 ON COOLDOWN', [`  Bounty claim resets in: ${formatCooldown(remaining)}`]));

        const target = await fetchPlayer(targetJid);
        if (!target) return reply(t('social.player_not_found'));
        if (!target.bounty || target.bounty <= 0) return reply('❌ That player has no bounty!');

        const bounty = target.bounty;
        await GlobalPlayer.updateOne({ jid: targetJid }, { $set: { bounty: 0 } });
        await GlobalPlayer.updateOne({ jid: sender },    { $inc: { gold: bounty } });
        await addKarma(sender, 15);
        await setCooldown(sender, 'bountyclaim');

        const tName = target.username || targetJid.split('@')[0];
        await react('🎯');
        await reply(
            buildBox('🎯 BOUNTY CLAIMED', [
                `  Target: ${tName}`,
                `  💰 Bounty: +${bounty.toLocaleString()} Gold`,
                `  ⚖️  Karma: +15`,
                buildFooter(0, bounty, await fetchPlayer(sender)),
            ])
        );
    }
);

mxd(
    {
        pattern:     'spy',
        aliases:     ['spyguild', 'infiltrate'],
        category:    'social',
        react:       '🕵️',
        description: 'Spy on another guild to learn their vault and war record',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'spy', CD.spy);
        if (onCooldown) return reply(buildBox('🕵️ ON COOLDOWN', [`  Spy resets in: ${formatCooldown(remaining)}`]));

        if (!q) return reply('❌ Usage: *.spy <guild name>*');

        const guild      = await Guild.findOne({ name: { $regex: new RegExp(q, 'i') } }).lean();
        if (!guild) return reply(`❌ Guild *${q}* not found.`);

        const cost = 500;
        if (player.gold < cost) return reply(`❌ Spying costs ${cost} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await addKarma(sender, -10);
        await setCooldown(sender, 'spy');

        const success = Math.random() < 0.7;

        if (success) {
            await react('🕵️');
            await reply(
                buildBox(`🕵️ INTEL ON ${guild.name.toUpperCase()}`, [
                    `  Level:    ${guild.level}`,
                    `  Members:  ${guild.members.length}`,
                    `  Vault:    ~${Math.floor(guild.vault.gold / 100) * 100} Gold`,
                    `  Wars:     ${guild.wars} | Wins: ${guild.wins}`,
                    `  💰 Cost: -${cost} Gold`,
                    `  ⚖️  Karma: -10`,
                ])
            );
        } else {
            await reply(buildBox('🕵️ SPY CAUGHT', [
                `  Your spy was detected!`,
                `  💰 Cost: -${cost} Gold (wasted)`,
                `  ⚖️  Karma: -10`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'negotiate',
        aliases:     ['deal', 'bargain'],
        category:    'social',
        react:       '🤝',
        description: 'Negotiate a gold deal with another player for karma bonus',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, args, botId, t } = conText;

        const targetJid = conText.user || conText.mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag the player to negotiate with.');

        const amount = parseInt(args[0]) || parseInt(args[1]) || 500;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const { onCooldown, remaining } = checkCooldown(player, 'negotiate', CD.negotiate);
        if (onCooldown) return reply(buildBox('🤝 ON COOLDOWN', [`  Negotiate resets in: ${formatCooldown(remaining)}`]));

        if (player.gold < amount) return reply(`❌ Not enough gold.`);

        const target = await fetchPlayer(targetJid);
        const tName  = target?.username || targetJid.split('@')[0];

        // Negotiation gives karma bonus on top of transfer
        await GlobalPlayer.updateOne({ jid: sender },    { $inc: { gold: -amount } });
        await GlobalPlayer.updateOne({ jid: targetJid }, { $inc: { gold:  amount } });
        await addKarma(sender,    15);
        await addKarma(targetJid, 10);
        await setCooldown(sender, 'negotiate');

        await react('🤝');
        await reply(
            buildBox('🤝 DEAL NEGOTIATED', [
                `  ${name} ⟷ ${tName}`,
                `  💰 Transferred: ${amount.toLocaleString()} Gold`,
                `  ⚖️  Your Karma:  +15`,
                `  ⚖️  Their Karma: +10`,
                buildFooter(0, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'treaty',
        aliases:     ['formtreaty', 'pact'],
        category:    'social',
        react:       '📜',
        description: 'Form a formal non-aggression treaty with another guild',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply('❌ You must be in a guild to form treaties.');
        if (player.guild.role !== 'master') return reply('❌ Only the guild master can form treaties.');

        const { onCooldown, remaining } = checkCooldown(player, 'treaty', CD.treaty);
        if (onCooldown) return reply(buildBox('📜 ON COOLDOWN', [`  Treaty resets in: ${formatCooldown(remaining)}`]));

        if (!q) return reply('❌ Usage: *.treaty <guild name>*');

        const targetGuild = await Guild.findOne({ name: { $regex: new RegExp(q, 'i') } }).lean();
        if (!targetGuild) return reply(`❌ Guild *${q}* not found.`);

        const key = [player.guild.guildId, targetGuild.guildId].sort().join('-');
        TREATIES.set(key, { type: 'non-aggression', endsAt: Date.now() + 7 * 24 * 3600000 });

        await addKarma(sender, 25);
        await setCooldown(sender, 'treaty');

        await react('📜');
        await reply(
            buildBox('📜 TREATY SIGNED', [
                `  ${player.guild.guildName} ⟷ ${targetGuild.name}`,
                `  Type: Non-Aggression Pact`,
                `  Duration: 7 days`,
                `  ⚖️  Karma: +25`,
                `  Both guilds are now under treaty protection.`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'propaganda',
        aliases:     ['spreadrumor', 'demoralize'],
        category:    'social',
        react:       '📣',
        description: 'Spread propaganda against a rival guild (reduces their karma)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId, t } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.guild?.guildId) return reply('❌ You must be in a guild to spread propaganda.');

        const { onCooldown, remaining } = checkCooldown(player, 'propaganda', CD.propaganda);
        if (onCooldown) return reply(buildBox('📣 ON COOLDOWN', [`  Propaganda resets in: ${formatCooldown(remaining)}`]));

        if (!q) return reply('❌ Usage: *.propaganda <guild name>*');

        const cost = 1000;
        if (player.gold < cost) return reply(`❌ Propaganda campaign costs ${cost} Gold.`);

        const targetGuild = await Guild.findOne({ name: { $regex: new RegExp(q, 'i') } }).lean();
        if (!targetGuild) return reply(`❌ Guild *${q}* not found.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });
        await addKarma(sender, -15);
        await setCooldown(sender, 'propaganda');

        // Damage karma of guild master
        if (targetGuild.masterId) {
            await GlobalPlayer.updateOne({ jid: targetGuild.masterId }, { $inc: { karma: -30 } });
        }

        await react('📣');
        await reply(
            buildBox('📣 PROPAGANDA SPREAD', [
                `  Rumors spread against ${targetGuild.name}!`,
                `  💰 Cost: -${cost.toLocaleString()} Gold`,
                `  ⚖️  Your Karma: -15`,
                `  ⚖️  Their Master Karma: -30`,
                `  Their reputation suffers!`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'census',
        aliases:     ['worldcensus', 'worldstats'],
        category:    'social',
        react:       '📊',
        description: 'View global census data — total players, guilds, and stats',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react, t } = conText;

        const totalPlayers  = await GlobalPlayer.countDocuments({ registered: true });
        const totalGuilds   = await Guild.countDocuments();
        const lightCount    = await GlobalPlayer.countDocuments({ alignment: 'Light', registered: true });
        const darkCount     = await GlobalPlayer.countDocuments({ alignment: 'Dark',  registered: true });
        const chaosCount    = await GlobalPlayer.countDocuments({ alignment: 'Chaos', registered: true });
        const neutralCount  = await GlobalPlayer.countDocuments({ alignment: 'Neutral', registered: true });
        const topPlayer     = await GlobalPlayer.findOne({ registered: true }).sort({ level: -1 }).lean();
        const topName       = topPlayer ? (topPlayer.username || topPlayer.jid.split('@')[0]) : 'None';

        await react('📊');
        await reply(
            buildBox('📊 WORLD CENSUS', [
                `  🌍 Total Hunters:  ${totalPlayers}`,
                `  🏰 Total Guilds:   ${totalGuilds}`,
                `  ───────`,
                `  ALIGNMENT SPLIT:`,
                `  ☀️  Light:   ${lightCount}`,
                `  ⚖️  Neutral: ${neutralCount}`,
                `  🌑 Dark:    ${darkCount}`,
                `  ☠️  Chaos:   ${chaosCount}`,
                `  ───────`,
                `  👑 Top Hunter: ${topName} (Lv.${topPlayer?.level || 0})`,
            ])
        );
    }
);
