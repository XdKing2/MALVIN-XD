/**
 * malvin/roles.js
 * Role Commands — Malvin-XD Sovereign RPG
 *
 * .setrole    — Choose your job role
 * .roles      — View all available roles
 * .myrole     — View your current roles & passives
 * .checkroles — Check if you've unlocked any special roles
 * .roleinfo   — View details of a specific role
 */

const { mxd } = require('../king');
const { buildBox } = require('../king/rpg/db');
const { fetchPlayer, getPlayer, removeGold } = require('../king/rpg/db');
const {
    JOB_ROLES, SPECIAL_ROLES,
    getJobRole, getSpecialRole,
    checkSpecialRoles, getPlayerPassives, formatRoles,
} = require('../king/rpg/roles');
const { GlobalPlayer } = require('../king/rpg/model');

// ════════════════════════════════════════════════════════════════════════════
// .roles — View all available job roles
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'roles',
        aliases:     ['rolelist', 'jobroles'],
        category:    'rpg',
        react:       '📜',
        description: 'View all available job roles',
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const jobLines = Object.entries(JOB_ROLES).map(([key, r]) =>
            `  ${r.emoji} *${r.name}* — ${r.description}`
        );

        const specialLines = Object.entries(SPECIAL_ROLES).map(([key, r]) =>
            `  ${r.emoji} *${r.name}* — ${r.condition}`
        );

        await react('📜');
        await reply(
            buildBox('📜 AEVORIA ROLES', [
                `  ⚔️ *JOB ROLES* (choose one)`,
                `  ───────`,
                ...jobLines,
                `  ───────`,
                `  Use *.setrole <name>* to choose`,
                `  Cost to change: 5,000 Gold`,
                `  ───────`,
                `  👁️ *SPECIAL ROLES* (earned)`,
                `  ───────`,
                ...specialLines,
                `  ───────`,
                `  Use *.roleinfo <name>* for details`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .setrole — Choose or change your job role
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'setrole',
        aliases:     ['chooserole', 'pickrole', 'classchange'],
        category:    'rpg',
        react:       '⚔️',
        description: 'Choose your job role — .setrole <warrior|mage|ranger|assassin|knight|alchemist>',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        if (!q) {
            return reply(
                buildBox('⚔️ CHOOSE YOUR ROLE', [
                    `  Usage: *.setrole <role>*`,
                    `  ───────`,
                    `  ⚔️ warrior   🔮 mage`,
                    `  🏹 ranger    🗡️ assassin`,
                    `  🛡️ knight    ⚗️ alchemist`,
                    `  ───────`,
                    `  First choice is FREE`,
                    `  Changing costs 5,000 Gold`,
                ])
            );
        }

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;
        const input  = q.trim().toLowerCase();
        const role   = getJobRole(input);

        if (!role) {
            return reply(
                `❌ Unknown role *${q}*.\nChoose: warrior, mage, ranger, assassin, knight, alchemist`
            );
        }

        // Already has this role
        if (player.jobRole === input) {
            return reply(`❌ You are already a *${role.name}*!`);
        }

        // Changing role costs gold (first time is free)
        const isFirstTime = !player.jobRole;
        if (!isFirstTime) {
            if (player.gold < role.changeCost) {
                return reply(
                    buildBox('❌ INSUFFICIENT GOLD', [
                        `  Cost:    ${role.changeCost.toLocaleString()} Gold`,
                        `  Balance: ${player.gold.toLocaleString()} Gold`,
                        `  ───────`,
                        `  Earn more: *.work* *.hunt* *.daily*`,
                    ])
                );
            }
            await removeGold(sender, role.changeCost);
        }

        // Set role and cooldown
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            {
                $set: {
                    jobRole:        input,
                    lastRoleChange: new Date(),
                }
            }
        );

        // Format passives for display
        const p = role.passives;
        const passiveLines = Object.entries(p)
            .filter(([k, v]) => v !== 0 && v !== false)
            .map(([k, v]) => {
                const labels = {
                    expBonus:          `✨ EXP Bonus: +${(v*100).toFixed(0)}%`,
                    goldBonus:         `💰 Gold Bonus: +${(v*100).toFixed(0)}%`,
                    gatherBonus:       `🌾 Gather Bonus: +${(v*100).toFixed(0)}%`,
                    dropRateBonus:     `🎁 Drop Rate: +${(v*100).toFixed(0)}%`,
                    huntWinBonus:      `⚔️ Hunt Win: +${(v*100).toFixed(0)}%`,
                    bossDefBonus:      `🛡️ Boss Defense: +${(v*100).toFixed(0)}%`,
                    duelWinBonus:      `🗡️ Duel Win: +${(v*100).toFixed(0)}%`,
                    cooldownReduce:    `⏱️ Cooldown: -${(v*100).toFixed(0)}%`,
                    hungerDrainReduce: `🍖 Hunger Drain: -${(v*100).toFixed(0)}%`,
                    critChance:        `💥 Crit Chance: +${(v*100).toFixed(0)}%`,
                    raidExpBonus:      `⚔️ Raid EXP: +${(v*100).toFixed(0)}%`,
                    craftBonus:        `⚗️ Craft Bonus: +${(v*100).toFixed(0)}%`,
                };
                return labels[k] ? `  ${labels[k]}` : null;
            })
            .filter(Boolean);

        await react('✅');
        await reply(
            buildBox(`${role.emoji} ROLE SELECTED`, [
                `  Hunter: *${name}*`,
                `  Role:   ${role.emoji} *${role.name}*`,
                `  ───────`,
                `  ${role.description}`,
                `  ───────`,
                `  Passive Bonuses:`,
                ...passiveLines,
                `  ───────`,
                isFirstTime
                    ? `  First role selection was FREE!`
                    : `  Cost: -${role.changeCost.toLocaleString()} Gold`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .myrole — View your current roles and passives
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'myrole',
        aliases:     ['myclass', 'rolestat', 'myjob'],
        category:    'rpg',
        react:       '👤',
        description: 'View your current roles and passive bonuses',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const name    = player.username || pushName;
        const { jobLine, specialLine } = formatRoles(player);
        const passives = getPlayerPassives(player);

        const passiveLines = Object.entries(passives)
            .filter(([k, v]) => v !== 0 && v !== false && v !== 1)
            .map(([k, v]) => {
                const labels = {
                    expBonus:            `✨ EXP Bonus: +${(v*100).toFixed(0)}%`,
                    goldBonus:           `💰 Gold Bonus: +${(v*100).toFixed(0)}%`,
                    gatherBonus:         `🌾 Gather: +${(v*100).toFixed(0)}%`,
                    dropRateBonus:       `🎁 Drop Rate: +${(v*100).toFixed(0)}%`,
                    huntWinBonus:        `⚔️ Hunt Win: +${(v*100).toFixed(0)}%`,
                    bossDefBonus:        `🛡️ Boss Def: +${(v*100).toFixed(0)}%`,
                    duelWinBonus:        `🗡️ Duel Win: +${(v*100).toFixed(0)}%`,
                    cooldownReduce:      `⏱️ Cooldowns: -${(v*100).toFixed(0)}%`,
                    hungerDrainReduce:   `🍖 Hunger: -${(v*100).toFixed(0)}%`,
                    critChance:          `💥 Crit: +${(v*100).toFixed(0)}%`,
                    raidExpBonus:        `⚔️ Raid EXP: +${(v*100).toFixed(0)}%`,
                    craftBonus:          `⚗️ Craft: +${(v*100).toFixed(0)}%`,
                    allStatBonus:        `📊 All Stats: +${v}`,
                    shadowSlotBonus:     `👥 Shadow Slots: +${v}`,
                    passiveGoldPerHour:  `💰 Passive Gold: ${v}/hr`,
                    immortal:            `♾️ Immortal: Never ages`,
                    hungerImmune:        `🍖 Hunger Immune`,
                    pvpImmunity:         `🛡️ PvP: Cannot be one-shot`,
                    dimensionJumpFree:   `🌀 Dimension Jump: FREE`,
                };
                return labels[k] ? `  ${labels[k]}` : null;
            })
            .filter(Boolean);

        await react('👤');
        await reply(
            buildBox('👤 MY ROLES', [
                `  Hunter: *${name}*`,
                `  ───────`,
                `  ⚔️ Job Role:     ${jobLine}`,
                ...(specialLine ? [`  👁️ Special Role: ${specialLine}`] : [`  👁️ Special Role: *None yet*`]),
                `  🌕 Bloodmoons:  *${player.bloodmoonsSeen || 0}* seen`,
                `  ───────`,
                passiveLines.length > 0 ? `  Active Passives:` : `  No passives yet — choose a role!`,
                ...passiveLines,
                ...(passiveLines.length === 0 ? [`  Use *.setrole* to get started`] : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .checkroles — Check if you've earned any special roles
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'checkroles',
        aliases:     ['checkunlock', 'rolecheck', 'specialrole'],
        category:    'rpg',
        react:       '🔍',
        description: 'Check if you have earned any special roles',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const name    = player.username || pushName;
        const earned  = checkSpecialRoles(player);

        // Auto-assign newly earned special roles
        let newlyUnlocked = null;
        if (earned.length > 0) {
            const topRole = earned[0];
            if (player.specialRole !== topRole.key) {
                await GlobalPlayer.findOneAndUpdate(
                    { jid: sender },
                    { $set: { specialRole: topRole.key } }
                );
                // If immortal role, set immortal flag too
                if (topRole.passives?.immortal) {
                    await GlobalPlayer.findOneAndUpdate(
                        { jid: sender },
                        { $set: { immortal: true } }
                    );
                }
                newlyUnlocked = topRole;
            }
        }

        // Show progress toward unearned roles
        const progressLines = Object.entries(SPECIAL_ROLES)
            .filter(([k]) => !earned.find(e => e.key === k))
            .map(([key, role]) => {
                let progress = '';
                if (key === 'voidwalker') progress = `${player.combat?.dungeonClears || 0}/100 dungeons`;
                else if (key === 'deathshand') progress = `${player.combat?.deaths || 0}/50 deaths`;
                else if (key === 'moonborn') progress = `${player.bloodmoonsSeen || 0}/10 bloodmoons`;
                else if (key === 'immortal_one') progress = `${player.rebirths || 0}/5 rebirths`;
                else if (key === 'cursedone') progress = `${player.combat?.deaths || 0}/100 deaths`;
                else if (key === 'sovereign' || key === 'monarch') progress = `Lv.${player.level}/200`;
                return progress ? `  ${role.emoji} ${role.name}: *${progress}*` : null;
            })
            .filter(Boolean);

        await react(newlyUnlocked ? '🎉' : '🔍');
        await reply(
            buildBox('🔍 SPECIAL ROLE CHECK', [
                `  Hunter: *${name}*`,
                `  ───────`,
                ...(newlyUnlocked
                    ? [
                        `  🎉 *NEW ROLE UNLOCKED!*`,
                        `  ${newlyUnlocked.emoji} *${newlyUnlocked.name}*`,
                        `  ${newlyUnlocked.description}`,
                        `  ───────`,
                      ]
                    : []
                ),
                earned.length > 0
                    ? `  ✅ Earned Special Roles:`
                    : `  ❌ No special roles yet`,
                ...earned.map(r => `  ${r.emoji} *${r.name}*`),
                `  ───────`,
                `  📊 Progress to next:`,
                ...progressLines,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .roleinfo — View details of a specific role
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'roleinfo',
        aliases:     ['classinfo', 'jobinfo'],
        category:    'rpg',
        react:       '📖',
        description: 'View details of a role — .roleinfo <role name>',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;

        if (!q) return reply('❌ Usage: *.roleinfo <role name>*\nExample: *.roleinfo warrior*');

        const input = q.trim().toLowerCase().replace(/\s+/g, '');
        const job     = getJobRole(input);
        const special = getSpecialRole(input);
        const role    = job || special;

        if (!role) {
            return reply(`❌ Role *${q}* not found.\nUse *.roles* to see all available roles.`);
        }

        const isSpecial = !!special;
        const passiveLines = Object.entries(role.passives)
            .filter(([k, v]) => v !== 0 && v !== false)
            .map(([k, v]) => {
                if (typeof v === 'boolean') return `  ✅ ${k}`;
                if (k.includes('Bonus') || k.includes('Chance') || k.includes('Reduce'))
                    return `  • ${k}: *${typeof v === 'number' && v < 2 ? '+' + (v*100).toFixed(0) + '%' : v}*`;
                return `  • ${k}: *${v}*`;
            })
            .filter(Boolean);

        await react('📖');
        await reply(
            buildBox(`${role.emoji} ${role.name.toUpperCase()}`, [
                `  Type: ${isSpecial ? '👁️ Special (Earned)' : '⚔️ Job Role (Chosen)'}`,
                `  ───────`,
                `  ${role.description}`,
                `  ───────`,
                isSpecial
                    ? `  🔓 Unlock: *${role.condition}*`
                    : `  💰 Change Cost: *${role.changeCost?.toLocaleString()} Gold*`,
                ...(job ? [`  📊 Primary Stats: *${job.primaryStats.join(', ').toUpperCase()}*`] : []),
                `  ───────`,
                `  Passive Bonuses:`,
                ...passiveLines,
            ])
        );
    }
);
