/**
 * malvin/pet.js
 * Pet Commands — Malvin-XD Sovereign RPG
 *
 * .pets       — View your pets
 * .petfeed    — Feed a pet
 * .petrename  — Rename a pet
 * .petrelease — Release a pet
 * .petactivate — Set active/inactive
 * .petinfo    — Info on a specific pet
 * .petspecies — View all pet species
 */

const { mxd } = require('../king');
const { buildBox, fetchPlayer, getPlayer } = require('../king/rpg/db');
const { PET_SPECIES, RARITY_EMOJIS, getPetPassives, formatPets } = require('../king/rpg/pets');
const { getWorldTime, getPlayerAge } = require('../king/rpg/worldTime');
const { GlobalPlayer } = require('../king/rpg/model');

// ════════════════════════════════════════════════════════════════════════════
// .pets — View your pets
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'pets',
        aliases:     ['mypets', 'petlist', 'mypet'],
        category:    'rpg',
        react:       '🐾',
        description: 'View your pets',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const name    = player.username || pushName;
        const pets    = player.pets || [];
        const wt      = await getWorldTime();
        const passives = getPetPassives(pets.filter(p => p.active));

        const petLines = pets.length > 0
            ? pets.map((p, i) => {
                const species = PET_SPECIES[p.species];
                const rEmoji  = RARITY_EMOJIS[species?.rarity || 'Common'];
                const status  = p.active ? '✅' : '💤';
                const age     = p.birthYear ? wt.year - p.birthYear : 0;
                return `  ${status} ${species?.emoji || '🐾'} *${p.name}* ${rEmoji}\n     Lv.${p.level} · Age ${age} · 🍖${p.hunger}% 😊${p.happiness}%`;
              })
            : [`  No pets yet!`, `  Find them during *.hunt* *.gather* *.explore*`];

        const passiveLines = Object.entries(passives)
            .filter(([k, v]) => v > 0)
            .map(([k, v]) => {
                const labels = {
                    expBonus:      `✨ EXP: +${(v*100).toFixed(0)}%`,
                    goldBonus:     `💰 Gold: +${(v*100).toFixed(0)}%`,
                    gatherBonus:   `🌾 Gather: +${(v*100).toFixed(0)}%`,
                    dropRateBonus: `🎁 Drops: +${(v*100).toFixed(0)}%`,
                    huntWinBonus:  `⚔️ Hunt: +${(v*100).toFixed(0)}%`,
                    bossDefBonus:  `🛡️ Boss: +${(v*100).toFixed(0)}%`,
                    duelWinBonus:  `🗡️ Duel: +${(v*100).toFixed(0)}%`,
                    cooldownReduce:`⏱️ CD: -${(v*100).toFixed(0)}%`,
                };
                return labels[k] ? `  ${labels[k]}` : null;
            }).filter(Boolean);

        await react('🐾');
        await reply(
            buildBox('🐾 MY PETS', [
                `  Hunter: *${name}*  · Slots: *${pets.filter(p=>p.active).length}/${player.maxPets || 3}*`,
                `  ───────`,
                ...petLines,
                ...(passiveLines.length > 0 ? [
                    `  ───────`,
                    `  Active Pet Bonuses:`,
                    ...passiveLines,
                ] : []),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .petfeed — Feed a pet
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'petfeed',
        aliases:     ['feedpet', 'pfeed'],
        category:    'rpg',
        react:       '🍖',
        description: 'Feed a pet — .petfeed <pet name>',
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.petfeed <pet name>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const pets   = player.pets || [];
        const petIdx = pets.findIndex(p => p.name.toLowerCase() === q.trim().toLowerCase());

        if (petIdx === -1) return reply(`❌ No pet named *${q}* found. Check *.pets*`);

        const pet = pets[petIdx];
        if (pet.hunger >= 100) return reply(`❌ *${pet.name}* is already full! 🍖`);

        // Feeding costs 50 gold
        const feedCost = 50;
        if (player.gold < feedCost) return reply(`❌ Feeding costs *${feedCost} Gold*. You have *${player.gold}*`);

        const newHunger    = Math.min(100, pet.hunger + 40);
        const newHappiness = Math.min(100, pet.happiness + 10);
        pets[petIdx].hunger    = newHunger;
        pets[petIdx].happiness = newHappiness;

        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            { $set: { pets }, $inc: { gold: -feedCost } }
        );

        const species = PET_SPECIES[pet.species];
        await react('🍖');
        await reply(
            buildBox(`🍖 PET FED`, [
                `  ${species?.emoji || '🐾'} *${pet.name}* enjoyed the meal!`,
                `  ───────`,
                `  🍖 Hunger:    *${newHunger}%*`,
                `  😊 Happiness: *${newHappiness}%*`,
                `  💰 Cost: -${feedCost} Gold`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .petrename — Rename a pet
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'petrename',
        aliases:     ['renamepet', 'prename'],
        category:    'rpg',
        react:       '✏️',
        description: 'Rename a pet — .petrename <old name> | <new name>',
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q || !q.includes('|')) return reply('❌ Usage: *.petrename <old name> | <new name>*');

        const [oldName, newName] = q.split('|').map(s => s.trim());
        if (!newName || newName.length < 2 || newName.length > 16)
            return reply('❌ New name must be 2-16 characters.');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const pets   = player.pets || [];
        const petIdx = pets.findIndex(p => p.name.toLowerCase() === oldName.toLowerCase());

        if (petIdx === -1) return reply(`❌ No pet named *${oldName}* found.`);

        // Rename costs 200 gold
        if (player.gold < 200) return reply(`❌ Renaming costs *200 Gold*. You have *${player.gold}*`);

        const species = PET_SPECIES[pets[petIdx].species];
        pets[petIdx].name = newName;

        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            { $set: { pets }, $inc: { gold: -200 } }
        );

        await react('✅');
        await reply(
            buildBox('✏️ PET RENAMED', [
                `  ${species?.emoji || '🐾'} *${oldName}* → *${newName}*`,
                `  💰 Cost: -200 Gold`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .petactivate — Toggle pet active/inactive
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'petactivate',
        aliases:     ['petswap', 'petstore', 'pactivate'],
        category:    'rpg',
        react:       '🔄',
        description: 'Toggle a pet active or inactive — .petactivate <pet name>',
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.petactivate <pet name>*');

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const pets    = player.pets || [];
        const maxPets = player.maxPets || 3;
        const petIdx  = pets.findIndex(p => p.name.toLowerCase() === q.trim().toLowerCase());

        if (petIdx === -1) return reply(`❌ No pet named *${q}* found.`);

        const pet = pets[petIdx];

        // Activating — check slots
        if (!pet.active) {
            const activePets = pets.filter(p => p.active).length;
            if (activePets >= maxPets) {
                return reply(`❌ Active pet limit: *${maxPets}*\nStore another pet first with *.petactivate <name>*`);
            }
        }

        pets[petIdx].active = !pet.active;
        const species = PET_SPECIES[pet.species];

        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            { $set: { pets } }
        );

        await react('🔄');
        await reply(
            buildBox('🔄 PET UPDATED', [
                `  ${species?.emoji || '🐾'} *${pet.name}*`,
                `  Status: *${pets[petIdx].active ? '✅ Active' : '💤 Stored'}*`,
                `  ───────`,
                pets[petIdx].active
                    ? `  Pet is now in your party!`
                    : `  Pet stored. Bonuses paused.`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .petrelease — Release a pet
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'petrelease',
        aliases:     ['releasepet', 'prelease'],
        category:    'rpg',
        react:       '🕊️',
        description: 'Release a pet back to the wild — .petrelease <pet name>',
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.petrelease <pet name>*\n⚠️ This is permanent!');

        // Require confirmation
        const input = q.trim().toLowerCase();
        if (!input.endsWith(' confirm')) {
            const petName = q.trim();
            return reply(
                buildBox('⚠️ CONFIRM RELEASE', [
                    `  Release *${petName}* forever?`,
                    `  This cannot be undone!`,
                    `  ───────`,
                    `  Type: *.petrelease ${petName} confirm*`,
                ])
            );
        }

        const petName = q.replace(/ confirm$/i, '').trim();
        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const pets    = player.pets || [];
        const petIdx  = pets.findIndex(p => p.name.toLowerCase() === petName.toLowerCase());

        if (petIdx === -1) return reply(`❌ No pet named *${petName}* found.`);

        const pet     = pets[petIdx];
        const species = PET_SPECIES[pet.species];
        pets.splice(petIdx, 1);

        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            { $set: { pets } }
        );

        await react('🕊️');
        await reply(
            buildBox('🕊️ PET RELEASED', [
                `  ${species?.emoji || '🐾'} *${pet.name}* has returned to the wild.`,
                `  ───────`,
                `  May you roam free in Aevoria... 🌍`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .petinfo — Detailed info on one pet
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'petinfo',
        aliases:     ['petstat', 'pinfo'],
        category:    'rpg',
        react:       '📖',
        description: 'View detailed info on a pet — .petinfo <pet name>',
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.petinfo <pet name>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const pets   = player.pets || [];
        const pet    = pets.find(p => p.name.toLowerCase() === q.trim().toLowerCase());

        if (!pet) return reply(`❌ No pet named *${q}* found. Check *.pets*`);

        const species  = PET_SPECIES[pet.species];
        const rEmoji   = RARITY_EMOJIS[species?.rarity || 'Common'];
        const wt       = await getWorldTime();
        const age      = pet.birthYear ? wt.year - pet.birthYear : 0;
        const lvlMult  = 1 + (pet.level - 1) * 0.05;

        const passiveLines = Object.entries(species?.passives || {})
            .map(([k, v]) => {
                const scaled = (v * lvlMult * 100).toFixed(0);
                const labels = {
                    expBonus:      `✨ EXP Bonus: +${scaled}%`,
                    goldBonus:     `💰 Gold Bonus: +${scaled}%`,
                    gatherBonus:   `🌾 Gather: +${scaled}%`,
                    dropRateBonus: `🎁 Drop Rate: +${scaled}%`,
                    huntWinBonus:  `⚔️ Hunt Win: +${scaled}%`,
                    bossDefBonus:  `🛡️ Boss Def: +${scaled}%`,
                    duelWinBonus:  `🗡️ Duel Win: +${scaled}%`,
                    cooldownReduce:`⏱️ Cooldown: -${scaled}%`,
                    allStatBonus:  `📊 All Stats: +${(v * lvlMult).toFixed(1)}`,
                };
                return labels[k] ? `  ${labels[k]}` : null;
            }).filter(Boolean);

        await react('📖');
        await reply(
            buildBox(`${species?.emoji || '🐾'} PET INFO`, [
                `  Name:     *${pet.name}*`,
                `  Species:  *${species?.name || pet.species}* ${rEmoji}`,
                `  Rarity:   *${species?.rarity || 'Common'}*`,
                `  ───────`,
                `  ⭐ Level:     *${pet.level}*`,
                `  📅 Age:       *${age} AE*`,
                `  🍖 Hunger:    *${pet.hunger}%*`,
                `  😊 Happiness: *${pet.happiness}%*`,
                `  Status:   *${pet.active ? '✅ Active' : '💤 Stored'}*`,
                `  ───────`,
                `  Found during: *${pet.foundAt || 'Unknown'}*`,
                `  ${species?.description || ''}`,
                `  ───────`,
                `  Passives (scaled to Lv.${pet.level}):`,
                ...passiveLines,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .petspecies — View all pet species and how to find them
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'petspecies',
        aliases:     ['allpets', 'petguide', 'pspecies'],
        category:    'rpg',
        react:       '📜',
        description: 'View all pet species and how to find them',
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const byRarity = { Common: [], Uncommon: [], Rare: [], Legendary: [] };
        for (const [key, pet] of Object.entries(PET_SPECIES)) {
            byRarity[pet.rarity]?.push(`  ${pet.emoji} *${pet.name}* — ${pet.foundIn.join('/')}${pet.condition ? ` (${Object.values(pet.condition).join(', ')})` : ''}`);
        }

        await react('📜');
        await reply(
            buildBox('📜 PET SPECIES GUIDE', [
                `  ⬜ *COMMON* (8% base chance)`,
                `  ───────`,
                ...byRarity.Common,
                `  ───────`,
                `  🟩 *UNCOMMON* (3% base chance)`,
                `  ───────`,
                ...byRarity.Uncommon,
                `  ───────`,
                `  🟦 *RARE* (0.8% base chance)`,
                `  ───────`,
                ...byRarity.Rare,
                `  ───────`,
                `  🟨 *LEGENDARY* (0.1% base chance)`,
                `  ───────`,
                ...byRarity.Legendary,
                `  ───────`,
                `  💡 LUK stat increases find chance`,
                `  💡 Find during *.hunt* *.gather* *.explore*`,
            ])
        );
    }
);
