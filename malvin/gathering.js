/**
 * malvin/gathering.js
 * Gathering & Crafting — Malvin-XD Sovereign RPG
 * 45 Commands: .mine .fish .farm .harvest .woodcut .forge .craft .dismantle
 *              .upgrade .repair .alchemy .enchant .refine .melt .socket .identify
 *              + supporting commands
 */

const { mxd } = require('../king');
const { getPlayerPassives } = require('../king/rpg/roles');
const { getWorldModifiers, getWorldTime } = require('../king/rpg/worldTime');
const { getWorld } = require('../king/rpg/worlds');
const { trackQuestStat } = require('../king/rpg/questHooks');
const { tryFindPet, PET_SPECIES, RARITY_EMOJIS } = require('../king/rpg/pets');
const {
    getPlayer, fetchPlayer,
    grantExp, addGold, addCrystals,
    addItem, removeItem, addWeapon,
    checkCooldown, setCooldown, formatCooldown,
    buildBox, buildFooter, scaleRewards, getRankMultiplier,
} = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { GlobalPlayer } = require('../king/rpg/model');

// ─── Cooldowns ────────────────────────────────────────────────────────────────
const CD = {
    mine:      20 * 60 * 1000, // 20 min
    fish:      15 * 60 * 1000, // 15 min
    farm:      30 * 60 * 1000, // 30 min
    harvest:   30 * 60 * 1000, // 30 min
    woodcut:   20 * 60 * 1000, // 20 min
    forge:     45 * 60 * 1000, // 45 min
    craft:     30 * 60 * 1000, // 30 min
    alchemy:   60 * 60 * 1000, // 1 hr
    enchant:   2 * 60 * 60 * 1000, // 2 hrs
    refine:    60 * 60 * 1000, // 1 hr
    dismantle: 15 * 60 * 1000, // 15 min
    socket:    3 * 60 * 60 * 1000, // 3 hrs
    identify:  10 * 60 * 1000, // 10 min
};

// ─── Loot tables ─────────────────────────────────────────────────────────────
const MINE_DROPS = [
    { item: 'ore',       count: [2, 5], chance: 0.7,  desc: 'Iron Ore'      },
    { item: 'crystalOre',count: [1, 2], chance: 0.25, desc: 'Crystal Ore'   },
    { item: 'ore',       count: [5, 10],chance: 0.05, desc: 'Rich Ore Vein' },
];

const FISH_DROPS = [
    { item: 'fish', count: [1, 3], chance: 0.6,  desc: 'Common Fish'  },
    { item: 'fish', count: [3, 6], chance: 0.3,  desc: 'Silver Fish'  },
    { item: 'fish', count: [5, 10],chance: 0.1,  desc: 'Golden Carp'  },
];

const FARM_DROPS = [
    { item: 'food',  count: [3, 8],  chance: 0.6,  desc: 'Vegetables' },
    { item: 'herbs', count: [1, 3],  chance: 0.3,  desc: 'Herbs'      },
    { item: 'food',  count: [8, 15], chance: 0.1,  desc: 'Bumper Crop'},
];

const WOOD_DROPS = [
    { item: 'wood', count: [3, 7],  chance: 0.65, desc: 'Oak Wood'    },
    { item: 'wood', count: [5, 12], chance: 0.3,  desc: 'Hardwood'    },
    { item: 'wood', count: [10, 20],chance: 0.05, desc: 'Ancient Wood'},
];

// Weapons craftable from materials
const WEAPON_RECIPES = {
    'Iron Sword':    { ore: 5,  wood: 2, desc: '+15 ATK',  atk: 15  },
    'Steel Blade':   { ore: 10, wood: 3, desc: '+30 ATK',  atk: 30  },
    'Crystal Staff': { ore: 3,  crystalOre: 5, desc: '+50 ATK, +20 MP', atk: 50 },
    'Shadow Dagger': { ore: 8,  crystalOre: 3, desc: '+40 ATK, +10% crit', atk: 40 },
    'Dragon Spear':  { ore: 20, crystalOre: 10, wood: 5, desc: '+80 ATK', atk: 80 },
};

// Armor craftable
const ARMOR_RECIPES = {
    'Leather Armor': { wood: 5,  ore: 3,  desc: '+10 DEF', def: 10 },
    'Iron Plate':    { ore: 15,  wood: 5, desc: '+25 DEF', def: 25 },
    'Crystal Robe':  { crystalOre: 8, herbs: 5, desc: '+15 DEF +30 MP', def: 15 },
    'Shadow Cloak':  { crystalOre: 5, ore: 8,   desc: '+20 DEF +10% flee', def: 20 },
};

// Potion recipes
const POTION_RECIPES = {
    'Health Potion':  { herbs: 3, water: 2, count: 1, desc: 'Restores 40% HP'  },
    'Mana Potion':    { herbs: 5, water: 3, count: 1, desc: 'Restores 40% MP'  },
    'Elixir':         { herbs: 10, crystalOre: 2, water: 5, count: 2, desc: 'Full restore HP+MP' },
    'Strength Tonic': { herbs: 8, fish: 3, count: 1, desc: '+10 STR for 1 hour' },
};

// Enchantment effects
const ENCHANTMENTS = [
    { name: 'Flame',    effect: '+15% fire damage',   cost: { crystalOre: 3 } },
    { name: 'Shadow',   effect: '+10% crit rate',     cost: { crystalOre: 5 } },
    { name: 'Holy',     effect: '+20 HP per kill',    cost: { crystalOre: 4 } },
    { name: 'Storm',    effect: '+10% attack speed',  cost: { crystalOre: 3 } },
    { name: 'Ancient',  effect: '+25% all stats',     cost: { crystalOre: 10 } },
];

function rollDrop(table) {
    const roll = Math.random();
    let cum    = 0;
    for (const drop of table) {
        cum += drop.chance;
        if (roll < cum) return drop;
    }
    return table[0];
}

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ════════════════════════════════════════════════════════════════════════════
// .mine — Mine for ore and crystals
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'mine',
        aliases:     ['mining', 'dig'],
        category:    'gathering',
        react:       '⛏️',
        description: 'Mine for ore and crystal ore',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'mine', CD.mine);
        if (onCooldown) return reply(buildBox('⛏️ ON COOLDOWN', [`  Mine resets in: ${formatCooldown(remaining)}`]));

        const mult   = getRankMultiplier(player.level, player.jid);
        const drop   = rollDrop(MINE_DROPS);
        const _gMods0  = await getWorldModifiers();
        const _rPass0  = getPlayerPassives(player);
        const _wWorld0 = getWorld ? getWorld(player.currentWorld || 'aevoria') : { multipliers: { gather: 1 } };
        const _hBoost0 = (1 + (_gMods0.harvestBonus || 0) / 100) * (1 + (_rPass0.gatherBonus || 0)) * (_wWorld0.multipliers.gather || 1);
        const count  = Math.floor(randInt(drop.count[0], drop.count[1]) * _hBoost0);
        const bonus  = Math.floor(count * (mult - 1));
        const total  = count + bonus;

        await addItem(sender, drop.item, total);

        const scaled = await scaleRewards({ exp: 40, gold: 20 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'mine');

        await react('⛏️');
        await reply(
            buildBox('⛏️ MINING RESULT', [
                `  📍 ${drop.desc}`,
                `  ${drop.item === 'crystalOre' ? '🔮' : '🪨'} ${drop.item}: +${total}`,
                ...(bonus > 0 ? [`  🏅 Rank bonus: +${bonus}`] : []),
                `  ✨ EXP: +${scaled.exp}`,
                `  ───────`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .fish — Catch fish for food and gold
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'fish',
        aliases:     ['fishing', 'cast'],
        category:    'gathering',
        react:       '🎣',
        description: 'Go fishing for food and gold',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'fish', CD.fish);
        if (onCooldown) return reply(buildBox('🎣 ON COOLDOWN', [`  Fishing resets in: ${formatCooldown(remaining)}`]));

        const lukBonus = 1 + (player.stats.luk - 1) * 0.03;
        const drop     = rollDrop(FISH_DROPS);
        const _gMods1  = await getWorldModifiers();
        const _rPass1  = getPlayerPassives(player);
        const _hBoost1 = (1 + (_gMods1.harvestBonus || 0) / 100) * (1 + (_rPass1.gatherBonus || 0));
        const count    = Math.floor(randInt(drop.count[0], drop.count[1]) * lukBonus * _hBoost1);
        const goldEarned = count * 30;

        await addItem(sender, 'fish', count);
        const scaled = await scaleRewards({ exp: 30, gold: goldEarned }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'fish');

        await react('🎣');
        await reply(
            buildBox('🎣 FISHING RESULT', [
                `  🐟 ${drop.desc}`,
                `  Fish caught: +${count}`,
                `  💰 Sold for: +${scaled.gold}`,
                `  ✨ EXP: +${scaled.exp}`,
                `  🍀 LUK bonus: ${lukBonus.toFixed(2)}x`,
                `  ───────`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .farm — Grow crops for food and herbs
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'farm',
        aliases:     ['farming', 'plant'],
        category:    'gathering',
        react:       '🌾',
        description: 'Farm crops for food and herbs',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'farm', CD.farm);
        if (onCooldown) return reply(buildBox('🌾 ON COOLDOWN', [`  Farm resets in: ${formatCooldown(remaining)}`]));

        const drop  = rollDrop(FARM_DROPS);
        const count = randInt(drop.count[0], drop.count[1]);

        await addItem(sender, drop.item, count);
        const scaled = await scaleRewards({ exp: 35, gold: 50 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'farm');

        await react('🌾');
        await reply(
            buildBox('🌾 HARVEST RESULT', [
                `  🌱 ${drop.desc}`,
                `  ${drop.item}: +${count}`,
                `  ✨ EXP: +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                `  ───────`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .harvest — Harvest herbs from the wild
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'harvest',
        aliases:     ['gather', 'forage'],
        category:    'gathering',
        react:       '🌿',
        description: 'Harvest herbs and plants from the wild',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'harvest', CD.harvest);
        if (onCooldown) return reply(buildBox('🌿 ON COOLDOWN', [`  Harvest resets in: ${formatCooldown(remaining)}`]));

        const _gMods4 = await getWorldModifiers();
        const _hBoost4 = 1 + (_gMods4.harvestBonus || 0) / 100;
        const count = Math.floor(randInt(2, 8) * _hBoost4);
        const rare  = Math.random() < 0.1 + (player.stats.luk - 1) * 0.01;

        await addItem(sender, 'herbs', count + (rare ? 5 : 0));
        const scaled = await scaleRewards({ exp: 25, gold: 30 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'harvest');

        await react('🌿');
        await reply(
            buildBox('🌿 HARVEST RESULT', [
                `  🌿 Herbs gathered: +${count}`,
                ...(rare ? [`  ✨ RARE FIND! +5 bonus herbs!`] : []),
                `  ✨ EXP: +${scaled.exp}`,
                `  ───────`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .woodcut — Chop wood for crafting
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'woodcut',
        aliases:     ['chop', 'lumber', 'wood'],
        category:    'gathering',
        react:       '🪵',
        description: 'Chop wood for crafting and building',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'woodcut', CD.woodcut);
        if (onCooldown) return reply(buildBox('🪵 ON COOLDOWN', [`  Woodcut resets in: ${formatCooldown(remaining)}`]));

        const drop  = rollDrop(WOOD_DROPS);
        const count = randInt(drop.count[0], drop.count[1]);

        await addItem(sender, 'wood', count);
        const scaled = await scaleRewards({ exp: 30, gold: 25 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'woodcut');

        await react('🪵');
        await reply(
            buildBox('🪵 WOODCUTTING RESULT', [
                `  🌲 ${drop.desc}`,
                `  Wood: +${count}`,
                `  ✨ EXP: +${scaled.exp}`,
                `  ───────`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .inventory — View all gathered materials
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'inventory',
        aliases:     ['inv', 'bag', 'items'],
        category:    'gathering',
        react:       '🎒',
        description: 'View all your gathered materials and items',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const inv    = player.inventory;

        // Build inventory sections — only show items with qty > 0
        const matLines = [
            inv.ore          > 0 ? `  🪨 Ore:           *${inv.ore}*`          : null,
            inv.crystalOre   > 0 ? `  🔮 Crystal Ore:   *${inv.crystalOre}*`   : null,
            inv.wood         > 0 ? `  🪵 Wood:          *${inv.wood}*`          : null,
            inv.herbs        > 0 ? `  🌿 Herbs:         *${inv.herbs}*`         : null,
            inv.fish         > 0 ? `  🐟 Fish:          *${inv.fish}*`          : null,
            inv.food         > 0 ? `  🍖 Food:          *${inv.food}*`          : null,
            inv.water        > 0 ? `  💧 Water:         *${inv.water}*`         : null,
            // World materials
            inv.fireOre      > 0 ? `  🔥 Fire Ore:      *${inv.fireOre}*`       : null,
            inv.magmaCrystal > 0 ? `  🌋 Magma Crystal: *${inv.magmaCrystal}*`  : null,
            inv.frostCrystal > 0 ? `  🧊 Frost Crystal: *${inv.frostCrystal}*`  : null,
            inv.iceOre       > 0 ? `  ❄️ Ice Ore:       *${inv.iceOre}*`        : null,
            inv.voidEssenceRaw > 0 ? `  🌑 Void Essence: *${inv.voidEssenceRaw}*` : null,
            inv.shadowFragment > 0 ? `  👤 Shadow Frag:  *${inv.shadowFragment}*` : null,
        ].filter(Boolean);

        const consumLines = [
            inv.potions      > 0 ? `  🧪 Potions:      *${inv.potions}*`       : null,
            inv.keys         > 0 ? `  🗝️ Keys:          *${inv.keys}*`          : null,
            inv.antidotes    > 0 ? `  💊 Antidotes:    *${inv.antidotes}*`      : null,
            inv.elixirs      > 0 ? `  ✨ EXP Elixirs:  *${inv.elixirs}*`       : null,
            inv.goldDrafts   > 0 ? `  💰 Gold Drafts:  *${inv.goldDrafts}*`    : null,
            inv.reviveStones > 0 ? `  💎 Revive Stones:*${inv.reviveStones}*`  : null,
        ].filter(Boolean);

        const petLines = [
            inv.petFood    > 0 ? `  🐾 Pet Food:     *${inv.petFood}*`    : null,
            inv.petToys    > 0 ? `  🎾 Pet Toys:     *${inv.petToys}*`    : null,
            inv.petTreats  > 0 ? `  🦴 Pet Treats:   *${inv.petTreats}*`  : null,
            inv.petElixirs > 0 ? `  🌟 Pet Elixirs:  *${inv.petElixirs}*` : null,
        ].filter(Boolean);

        const gearLines = [
            inv.warriorAegis  > 0 ? `  🛡️ Warrior Aegis: *${inv.warriorAegis}*`   : null,
            inv.mageGrimoire  > 0 ? `  📚 Mage Grimoire: *${inv.mageGrimoire}*`    : null,
            inv.rangerQuiver  > 0 ? `  🏹 Ranger Quiver: *${inv.rangerQuiver}*`    : null,
            inv.shadowDagger  > 0 ? `  🗡️ Shadow Dagger:  *${inv.shadowDagger}*`   : null,
            inv.knightPlate   > 0 ? `  ⚔️ Knight Plate:   *${inv.knightPlate}*`    : null,
            inv.alchemistKit  > 0 ? `  ⚗️ Alchemist Kit:  *${inv.alchemistKit}*`   : null,
        ].filter(Boolean);

        const worldLines = [
            inv.voidEssence    > 0 ? `  🌑 Void Essence:   *${inv.voidEssence}*`   : null,
            inv.shadowTalisman > 0 ? `  🕳️ Shadow Talisman: *${inv.shadowTalisman}*` : null,
            inv.infernalOrb    > 0 ? `  🔥 Infernal Orb:   *${inv.infernalOrb}*`   : null,
            inv.demonBlood     > 0 ? `  😈 Demon Blood:    *${inv.demonBlood}*`     : null,
            inv.frostCore      > 0 ? `  🧊 Frost Core:     *${inv.frostCore}*`      : null,
            inv.glacialShard   > 0 ? `  ❄️ Glacial Shard:  *${inv.glacialShard}*`   : null,
        ].filter(Boolean);

        const rareLines = [
            inv.ancientRune  > 0 ? `  📜 Ancient Rune:  *${inv.ancientRune}*`  : null,
            inv.beastCore    > 0 ? `  🦴 Beast Core:    *${inv.beastCore}*`    : null,
            inv.voidCrystal  > 0 ? `  💎 Void Crystal:  *${inv.voidCrystal}*`  : null,
            inv.darkSigil    > 0 ? `  🌑 Dark Sigil:    *${inv.darkSigil}*`    : null,
            inv.infernalCore > 0 ? `  🔥 Infernal Core: *${inv.infernalCore}*` : null,
            inv.glacialCore  > 0 ? `  ❄️ Glacial Core:  *${inv.glacialCore}*`  : null,
        ].filter(Boolean);

        const equipLines = [
            inv.weapons?.length > 0 ? `  ⚔️ Weapons: *${inv.weapons.join(', ')}*` : null,
            inv.armor?.length   > 0 ? `  🛡️ Armor:   *${inv.armor.join(', ')}*`   : null,
        ].filter(Boolean);

        // Build final display
        const sections = [];
        if (matLines.length)    sections.push(...['  🌾 *MATERIALS*', '  ───────', ...matLines]);
        if (consumLines.length) sections.push(...['  ───────', '  🧪 *CONSUMABLES*', '  ───────', ...consumLines]);
        if (petLines.length)    sections.push(...['  ───────', '  🐾 *PET ITEMS*', '  ───────', ...petLines]);
        if (gearLines.length)   sections.push(...['  ───────', '  ⚔️ *ROLE GEAR*', '  ───────', ...gearLines]);
        if (worldLines.length)  sections.push(...['  ───────', '  🌍 *WORLD ITEMS*', '  ───────', ...worldLines]);
        if (rareLines.length)   sections.push(...['  ───────', '  💎 *RARE DROPS*', '  ───────', ...rareLines]);
        if (equipLines.length)  sections.push(...['  ───────', '  🗡️ *EQUIPMENT*', '  ───────', ...equipLines]);

        if (sections.length === 0) {
            sections.push('  Your inventory is empty!');
            sections.push('  Try *.hunt* *.gather* or *.shop* to get items.');
        }

        await react('🎒');
        await reply(
            buildBox('🎒 INVENTORY', [
                `  Hunter: *${name}*`,
                `  ───────`,
                ...sections,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .forge — Forge weapons from materials
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'forge',
        aliases:     ['smith', 'blacksmith'],
        category:    'gathering',
        react:       '🔨',
        description: 'Forge weapons from gathered materials',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) {
            const list = Object.entries(WEAPON_RECIPES).map(([name, r]) => {
                const mats = Object.entries(r)
                    .filter(([k]) => !['desc', 'atk'].includes(k))
                    .map(([k, v]) => `${k}x${v}`)
                    .join(', ');
                return `  ⚔️  ${name}: ${mats} → ${r.desc}`;
            });
            return reply(buildBox('🔨 FORGE MENU', [
                ...list,
                `  ───────`,
                `  Usage: *.forge <weapon name>*`,
            ]));
        }

        const weaponName = Object.keys(WEAPON_RECIPES).find(
            w => w.toLowerCase() === q.toLowerCase()
        );
        if (!weaponName) return reply(`❌ Unknown weapon: *${q}*\nUse *.forge* to see recipes.`);

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const recipe  = WEAPON_RECIPES[weaponName];

        // Check the { onCooldown, remaining } = checkCooldown
        const { onCooldown, remaining } = checkCooldown(player, 'forge', CD.forge);
        if (onCooldown) return reply(buildBox('🔨 ON COOLDOWN', [`  Forge resets in: ${formatCooldown(remaining)}`]));

        // Check materials
        const missing = [];
        for (const [mat, qty] of Object.entries(recipe)) {
            if (['desc', 'atk'].includes(mat)) continue;
            const have = player.inventory[mat] || 0;
            if (have < qty) missing.push(`${mat}: need ${qty}, have ${have}`);
        }

        if (missing.length) {
            return reply(buildBox('🔨 MISSING MATERIALS', missing.map(m => `  ❌ ${m}`)));
        }

        // Deduct materials
        for (const [mat, qty] of Object.entries(recipe)) {
            if (['desc', 'atk'].includes(mat)) continue;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { [`inventory.${mat}`]: -qty } });
        }

        // Chance of success based on INT
        const successRate = Math.min(0.95, 0.6 + (player.stats.int - 1) * 0.02);
        const success     = Math.random() < successRate;

        await setCooldown(sender, 'forge');

        if (success) {
            await addWeapon(sender, weaponName);
            await GlobalPlayer.updateOne({ jid: sender }, {
                $inc: { 'combat.attack': recipe.atk }
            });
            const scaled = await scaleRewards({ exp: 100, gold: 0 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, 0, botId);

            await react('🔨');
            await reply(
                buildBox('🔨 FORGING SUCCESS', [
                    `  ⚔️  ${weaponName} crafted!`,
                    `  ${recipe.desc}`,
                    `  ✨ EXP: +${scaled.exp}`,
                    `  ⚔️  ATK permanently increased!`,
                ])
            );
        } else {
            await react('💀');
            await reply(
                buildBox('🔨 FORGING FAILED', [
                    `  The forge collapsed! Materials lost.`,
                    `  Success rate: ${Math.floor(successRate * 100)}%`,
                    `  Upgrade INT to improve success rate.`,
                ])
            );
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .craft — Craft armor and gear
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'craft',
        aliases:     ['make', 'create'],
        category:    'gathering',
        react:       '🛡️',
        description: 'Craft armor and gear from materials',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) {
            const list = Object.entries(ARMOR_RECIPES).map(([name, r]) => {
                const mats = Object.entries(r)
                    .filter(([k]) => !['desc', 'def'].includes(k))
                    .map(([k, v]) => `${k}x${v}`)
                    .join(', ');
                return `  🛡️  ${name}: ${mats} → ${r.desc}`;
            });
            return reply(buildBox('🛡️ CRAFT MENU', [
                ...list,
                `  ───────`,
                `  Usage: *.craft <armor name>*`,
            ]));
        }

        const armorName = Object.keys(ARMOR_RECIPES).find(
            a => a.toLowerCase() === q.toLowerCase()
        );
        if (!armorName) return reply(`❌ Unknown armor: *${q}*\nUse *.craft* to see recipes.`);

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const recipe = ARMOR_RECIPES[armorName];

        const { onCooldown, remaining } = checkCooldown(player, 'craft', CD.craft);
        if (onCooldown) return reply(buildBox('🛡️ ON COOLDOWN', [`  Craft resets in: ${formatCooldown(remaining)}`]));

        const missing = [];
        for (const [mat, qty] of Object.entries(recipe)) {
            if (['desc', 'def'].includes(mat)) continue;
            if ((player.inventory[mat] || 0) < qty) missing.push(`${mat}: need ${qty}, have ${player.inventory[mat] || 0}`);
        }

        if (missing.length) return reply(buildBox('🛡️ MISSING MATERIALS', missing.map(m => `  ❌ ${m}`)));

        for (const [mat, qty] of Object.entries(recipe)) {
            if (['desc', 'def'].includes(mat)) continue;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { [`inventory.${mat}`]: -qty } });
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $push: { 'inventory.armor': armorName },
            $inc:  { 'combat.defense': recipe.def },
        });

        const scaled = await scaleRewards({ exp: 80, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'craft');

        await react('🛡️');
        await reply(
            buildBox('🛡️ CRAFTING SUCCESS', [
                `  🛡️  ${armorName} crafted!`,
                `  ${recipe.desc}`,
                `  ✨ EXP: +${scaled.exp}`,
                `  🛡️  DEF permanently increased!`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .dismantle — Break down gear for materials
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'dismantle',
        aliases:     ['breakdown', 'salvage'],
        category:    'gathering',
        react:       '🔧',
        description: 'Dismantle gear to recover some materials',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.dismantle <weapon or armor name>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'dismantle', CD.dismantle);
        if (onCooldown) return reply(buildBox('🔧 ON COOLDOWN', [`  Dismantle resets in: ${formatCooldown(remaining)}`]));

        const hasWeapon = player.inventory.weapons.includes(q);
        const hasArmor  = player.inventory.armor.includes(q);

        if (!hasWeapon && !hasArmor) {
            return reply(`❌ You don't own *${q}*.\nUse *.inventory* to see your gear.`);
        }

        // Recover 50% of materials
        const recipe = WEAPON_RECIPES[q] || ARMOR_RECIPES[q];
        const recovered = {};

        if (recipe) {
            for (const [mat, qty] of Object.entries(recipe)) {
                if (['desc', 'atk', 'def'].includes(mat)) continue;
                recovered[mat] = Math.max(1, Math.floor(qty * 0.5));
                await GlobalPlayer.updateOne({ jid: sender }, { $inc: { [`inventory.${mat}`]: recovered[mat] } });
            }
        }

        if (hasWeapon) await GlobalPlayer.updateOne({ jid: sender }, { $pull: { 'inventory.weapons': q } });
        if (hasArmor)  await GlobalPlayer.updateOne({ jid: sender }, { $pull: { 'inventory.armor':   q } });

        await setCooldown(sender, 'dismantle');

        const recLines = Object.entries(recovered).map(([k, v]) => `  🪨 ${k}: +${v}`);
        await react('🔧');
        await reply(
            buildBox('🔧 DISMANTLED', [
                `  ${q} broken down!`,
                `  Recovered materials:`,
                ...(recLines.length ? recLines : ['  Nothing recovered.']),
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .alchemy — Brew potions from herbs
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'alchemy',
        aliases:     ['brew', 'potion'],
        category:    'gathering',
        react:       '⚗️',
        description: 'Brew potions and elixirs from herbs',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) {
            const list = Object.entries(POTION_RECIPES).map(([name, r]) => {
                const mats = Object.entries(r)
                    .filter(([k]) => !['count', 'desc'].includes(k))
                    .map(([k, v]) => `${k}x${v}`)
                    .join(', ');
                return `  ⚗️  ${name}: ${mats} → ${r.desc}`;
            });
            return reply(buildBox('⚗️ ALCHEMY MENU', [
                ...list,
                `  ───────`,
                `  Usage: *.alchemy <potion name>*`,
            ]));
        }

        const potionName = Object.keys(POTION_RECIPES).find(
            p => p.toLowerCase() === q.toLowerCase()
        );
        if (!potionName) return reply(`❌ Unknown recipe: *${q}*\nUse *.alchemy* to see recipes.`);

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'alchemy', CD.alchemy);
        if (onCooldown) return reply(buildBox('⚗️ ON COOLDOWN', [`  Alchemy resets in: ${formatCooldown(remaining)}`]));

        const recipe  = POTION_RECIPES[potionName];
        const missing = [];

        for (const [mat, qty] of Object.entries(recipe)) {
            if (['count', 'desc'].includes(mat)) continue;
            if ((player.inventory[mat] || 0) < qty) missing.push(`${mat}: need ${qty}`);
        }

        if (missing.length) return reply(buildBox('⚗️ MISSING MATERIALS', missing.map(m => `  ❌ ${m}`)));

        for (const [mat, qty] of Object.entries(recipe)) {
            if (['count', 'desc'].includes(mat)) continue;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { [`inventory.${mat}`]: -qty } });
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.potions': recipe.count } });
        const scaled = await scaleRewards({ exp: 70, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'alchemy');

        await react('⚗️');
        await reply(
            buildBox('⚗️ BREWING SUCCESS', [
                `  🧪 ${potionName} x${recipe.count} brewed!`,
                `  ${recipe.desc}`,
                `  ✨ EXP: +${scaled.exp}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .enchant — Enchant a weapon with effects
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'enchant',
        aliases:     ['ench', 'enchantment'],
        category:    'gathering',
        react:       '✨',
        description: 'Enchant your weapon with magical effects',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) {
            const list = ENCHANTMENTS.map(e => {
                const cost = Object.entries(e.cost).map(([k, v]) => `${k}x${v}`).join(', ');
                return `  ✨ ${e.name}: ${cost} → ${e.effect}`;
            });
            return reply(buildBox('✨ ENCHANTMENT SHOP', [
                ...list,
                `  ───────`,
                `  Usage: *.enchant <name>*`,
            ]));
        }

        const ench = ENCHANTMENTS.find(e => e.name.toLowerCase() === q.toLowerCase());
        if (!ench) return reply(`❌ Unknown enchantment: *${q}*`);

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'enchant', CD.enchant);
        if (onCooldown) return reply(buildBox('✨ ON COOLDOWN', [`  Enchant resets in: ${formatCooldown(remaining)}`]));

        if (!player.inventory.weapons.length) return reply('❌ You have no weapons to enchant!');

        const missing = [];
        for (const [mat, qty] of Object.entries(ench.cost)) {
            if ((player.inventory[mat] || 0) < qty) missing.push(`${mat}: need ${qty}`);
        }
        if (missing.length) return reply(buildBox('✨ MISSING MATERIALS', missing.map(m => `  ❌ ${m}`)));

        for (const [mat, qty] of Object.entries(ench.cost)) {
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { [`inventory.${mat}`]: -qty } });
        }

        const success = Math.random() < 0.75;
        await setCooldown(sender, 'enchant');

        if (success) {
            const expGain = await scaleRewards({ exp: 120, gold: 0 }, player.level, player.jid).exp;
            await grantExp(sender, expGain, 0, botId);
            await react('✨');
            await reply(
                buildBox('✨ ENCHANTMENT SUCCESS', [
                    `  Weapon enchanted with *${ench.name}*!`,
                    `  Effect: ${ench.effect}`,
                    `  ✨ EXP: +${expGain}`,
                ])
            );
        } else {
            await react('❌');
            await reply(buildBox('✨ ENCHANTMENT FAILED', [
                `  The enchantment fizzled out!`,
                `  Materials consumed. Try again.`,
            ]));
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .refine — Refine raw materials into higher grade
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'refine',
        aliases:     ['purify', 'upgrade-mat'],
        category:    'gathering',
        react:       '🔬',
        description: 'Refine raw ore into refined materials',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        const REFINE_RECIPES = {
            ore:       { output: 'crystalOre', input: 10, out: 1, desc: '10 Ore → 1 Crystal Ore' },
            herbs:     { output: 'water',       input: 5,  out: 3, desc: '5 Herbs → 3 purified Water' },
            wood:      { output: 'ore',          input: 8,  out: 2, desc: '8 Wood → 2 charcoal Ore' },
        };

        if (!q || !REFINE_RECIPES[q.toLowerCase()]) {
            const list = Object.entries(REFINE_RECIPES).map(([k, v]) => `  🔬 ${v.desc}`);
            return reply(buildBox('🔬 REFINE MENU', [
                ...list,
                `  Usage: *.refine <material>*`,
            ]));
        }

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'refine', CD.refine);
        if (onCooldown) return reply(buildBox('🔬 ON COOLDOWN', [`  Refine resets in: ${formatCooldown(remaining)}`]));

        const recipe = REFINE_RECIPES[q.toLowerCase()];
        const have   = player.inventory[q.toLowerCase()] || 0;

        if (have < recipe.input) {
            return reply(`❌ Need ${recipe.input} ${q}. You have ${have}.`);
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                [`inventory.${q.toLowerCase()}`]: -recipe.input,
                [`inventory.${recipe.output}`]:    recipe.out,
            }
        });

        await setCooldown(sender, 'refine');
        await react('🔬');
        await reply(
            buildBox('🔬 REFINING COMPLETE', [
                `  ${recipe.desc}`,
                `  🪨 ${q}: -${recipe.input}`,
                `  ✨ ${recipe.output}: +${recipe.out}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .melt — Melt weapons for ore
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'melt',
        aliases:     ['smelt', 'meltdown'],
        category:    'gathering',
        react:       '🔥',
        description: 'Melt down a weapon to recover ore',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        if (!q) return reply('❌ Usage: *.melt <weapon name>*');

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (!player.inventory.weapons.includes(q)) {
            return reply(`❌ You don't own *${q}*.\nUse *.inventory* to see your weapons.`);
        }

        const recipe  = WEAPON_RECIPES[q];
        const oreBack = recipe ? Math.floor((recipe.ore || 0) * 0.6) : 3;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $pull: { 'inventory.weapons': q },
            $inc:  { 'inventory.ore': oreBack, 'combat.attack': -(recipe?.atk || 10) },
        });

        await react('🔥');
        await reply(
            buildBox('🔥 MELTED', [
                `  ${q} melted down!`,
                `  🪨 Ore recovered: +${oreBack}`,
                `  ⚔️  ATK reduced (weapon removed)`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .socket — Socket gems into weapon for bonus stats
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'socket',
        aliases:     ['gem', 'socketing'],
        category:    'gathering',
        react:       '💎',
        description: 'Socket crystal gems into your weapon for bonus stats',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'socket', CD.socket);
        if (onCooldown) return reply(buildBox('💎 ON COOLDOWN', [`  Socket resets in: ${formatCooldown(remaining)}`]));

        if (!player.inventory.weapons.length) return reply('❌ No weapons to socket gems into!');
        if ((player.inventory.crystalOre || 0) < 3) return reply('❌ Need 3 Crystal Ore to socket a gem.');

        const success = Math.random() < 0.7;

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -3 } });
        await setCooldown(sender, 'socket');

        if (success) {
            const statBoost = Math.floor(Math.random() * 3) + 1;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.attack': statBoost * 5 } });
            await react('💎');
            await reply(
                buildBox('💎 GEM SOCKETED', [
                    `  Crystal gem inserted successfully!`,
                    `  ⚔️  ATK: +${statBoost * 5}`,
                    `  🔮 Crystal Ore: -3`,
                ])
            );
        } else {
            await react('❌');
            await reply(buildBox('💎 SOCKETING FAILED', [
                `  The gem shattered on insertion!`,
                `  🔮 Crystal Ore: -3 (lost)`,
                `  Try again — 70% success rate.`,
            ]));
        }
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .identify — Identify mystery items
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'identify',
        aliases:     ['id', 'appraise'],
        category:    'gathering',
        react:       '🔍',
        description: 'Identify mystery items to reveal their properties',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'identify', CD.identify);
        if (onCooldown) return reply(buildBox('🔍 ON COOLDOWN', [`  Identify resets in: ${formatCooldown(remaining)}`]));

        const MYSTERY_RESULTS = [
            { name: 'Rare Herb',      effect: 'herbs +5',         action: async () => addItem(sender, 'herbs', 5)  },
            { name: 'Ancient Ore',    effect: 'ore +10',           action: async () => addItem(sender, 'ore', 10)   },
            { name: 'Crystal Shard',  effect: 'crystalOre +3',     action: async () => addItem(sender, 'crystalOre', 3) },
            { name: 'Cursed Stone',   effect: 'nothing (cursed!)', action: async () => {} },
            { name: 'Hunter\'s Map',  effect: '+100 EXP bonus',    action: async () => grantExp(sender, 100, 0, botId) },
        ];

        const result = MYSTERY_RESULTS[Math.floor(Math.random() * MYSTERY_RESULTS.length)];
        await result.action();
        await setCooldown(sender, 'identify');

        await react('🔍');
        await reply(
            buildBox('🔍 IDENTIFICATION RESULT', [
                `  📦 Item revealed: *${result.name}*`,
                `  Effect: ${result.effect}`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .repair — Repair worn gear
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'repair',
        aliases:     ['fix', 'mend'],
        category:    'gathering',
        react:       '🔧',
        description: 'Repair your weapons and armor at the smithy',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const weaponCount = player.inventory.weapons.length;
        const armorCount  = player.inventory.armor.length;

        if (!weaponCount && !armorCount) {
            return reply('❌ No gear to repair!');
        }

        const cost = (weaponCount + armorCount) * 200;

        if (player.gold < cost) {
            return reply(`❌ Repair costs ${cost} Gold. You have ${player.gold.toLocaleString()}.`);
        }

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });

        await react('🔧');
        await reply(
            buildBox('🔧 GEAR REPAIRED', [
                `  ⚔️  Weapons: ${weaponCount}`,
                `  🛡️  Armor:   ${armorCount}`,
                `  💰 Cost: -${cost} Gold`,
                `  All gear restored to full durability!`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .material-sell — Sell all gathered materials for gold
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'sell',
        aliases:     ['sellall', 'sellmats'],
        category:    'gathering',
        react:       '💰',
        description: 'Sell gathered materials for gold',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        const SELL_PRICES = {
            ore:        20,
            crystalOre: 150,
            wood:       15,
            herbs:      25,
            fish:       30,
        };

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const inv    = player.inventory;

        let totalGold = 0;
        const lines   = [];

        for (const [mat, price] of Object.entries(SELL_PRICES)) {
            const qty = inv[mat] || 0;
            if (qty > 0) {
                const earned = qty * price;
                totalGold += earned;
                lines.push(`  ${mat}: ${qty} × ${price} = ${earned.toLocaleString()} Gold`);
                await GlobalPlayer.updateOne({ jid: sender }, { $set: { [`inventory.${mat}`]: 0 } });
            }
        }

        if (!lines.length) return reply('❌ No materials to sell. Go gather first!');

        await addGold(sender, totalGold);
        await react('💰');
        await reply(
            buildBox('💰 MATERIALS SOLD', [
                ...lines,
                `  ───────`,
                `  💰 Total: +${totalGold.toLocaleString()} Gold`,
            ])
        );
    }
);

module.exports = {};


// ══════════════════════════════════════════════════════════════════════
// EXTENDED COMMANDS — from new_cmds/gathering2.js
// ══════════════════════════════════════════════════════════════════════
const CD_GATHERING2 = {
    prospect:     45 * 60 * 1000,
    deepmine:     60 * 60 * 1000,
    crystalhunt:  2  * 60 * 60 * 1000,
    rarefish:     60 * 60 * 1000,
    nightfarm:    8  * 60 * 60 * 1000,
    herbrun:      30 * 60 * 1000,
    masschop:     45 * 60 * 1000,
    smeltall:     30 * 60 * 1000,
    craftbatch:   60 * 60 * 1000,
    autocraftcd:  2  * 60 * 60 * 1000,
    research:     4  * 60 * 60 * 1000,
    upgradetool:  6  * 60 * 60 * 1000,
    gatherall:    60 * 60 * 1000,
    transmute:    3  * 60 * 60 * 1000,
    extractgem:   2  * 60 * 60 * 1000,
    polish:       30 * 60 * 1000,
    mastercraft:  8  * 60 * 60 * 1000,
    inscribe:     4  * 60 * 60 * 1000,
    runecraft:    6  * 60 * 60 * 1000,
    potionbatch:  2  * 60 * 60 * 1000,
    crystalforge: 4  * 60 * 60 * 1000,
    shadowforge:  8  * 60 * 60 * 1000,
    origincraft:  24 * 60 * 60 * 1000,
};
const TOOL_LEVELS = new Map(); // jid → { pickaxe, rod, hoe, axe }


mxd(
    {
        pattern:     'prospect',
        aliases:     ['scout-area', 'survey'],
        category:    'gathering',
        react:       '🗺️',
        description: 'Prospect your area for rich resource deposits',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'prospect', CD.prospect);
        if (onCooldown) return reply(buildBox('🗺️ ON COOLDOWN', [`  Prospect resets in: ${formatCooldown(remaining)}`]));

        const lukMult = 1 + (player.stats.luk - 1) * 0.03;
        const FINDS   = [
            { name: 'Rich Iron Vein',    item: 'ore',        qty: [8, 15],  rare: false },
            { name: 'Crystal Deposit',   item: 'crystalOre', qty: [3, 6],   rare: false },
            { name: 'Ancient Ore Vein',  item: 'ore',        qty: [15, 25], rare: true  },
            { name: 'Pure Crystal Node', item: 'crystalOre', qty: [5, 10],  rare: true  },
            { name: 'Nothing found',     item: null,         qty: [0, 0],   rare: false },
        ];

        const roll  = Math.random();
        const find  = roll < 0.05 * lukMult
            ? FINDS[Math.floor(Math.random() * 2) + 2] // rare finds
            : roll < 0.7
                ? FINDS[Math.floor(Math.random() * 2)]
                : FINDS[4];

        await setCooldown(sender, 'prospect');

        if (find.item) {
            const qty = Math.floor((find.qty[0] + Math.random() * (find.qty[1] - find.qty[0])) * lukMult);
            await addItem(sender, find.item, qty);
            const scaled = scaleRewards({ exp: 60, gold: 40 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);

            await react('🗺️');
            await reply(
                buildBox('🗺️ PROSPECTING RESULT', [
                    ...(find.rare ? [`  ✨ RARE FIND!`] : []),
                    `  ${find.name}`,
                    `  ${find.item}: +${qty}`,
                    `  ✨ EXP: +${scaled.exp}`,
                    `  🍀 LUK bonus: ${lukMult.toFixed(2)}x`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            await react('🗺️');
            await reply(buildBox('🗺️ PROSPECTING RESULT', [
                `  Nothing significant found.`,
                `  Try a different area or upgrade LUK.`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'deep-mine',
        aliases:     ['deepmine', 'deepdig'],
        category:    'gathering',
        react:       '⛏️',
        description: 'Deep mine for rare materials (Level 30+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.level < 30) return reply('❌ Deep Mining requires Level 30+.');

        const { onCooldown, remaining } = checkCooldown(player, 'deepmine', CD.deepmine);
        if (onCooldown) return reply(buildBox('⛏️ ON COOLDOWN', [`  Deep Mine resets in: ${formatCooldown(remaining)}`]));

        const mult     = getRankMultiplier(player.level, player.jid);
        const oreAmt   = Math.floor((5 + Math.random() * 10) * mult);
        const crystAmt = Math.floor((2 + Math.random() * 5)  * mult);

        await addItem(sender, 'ore', oreAmt);
        await addItem(sender, 'crystalOre', crystAmt);

        const scaled = scaleRewards({ exp: 150, gold: 100 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'deepmine');

        await react('⛏️');
        await reply(
            buildBox('⛏️ DEEP MINE RESULT', [
                `  Drilled deep into the earth!`,
                `  🪨 Ore:         +${oreAmt}`,
                `  🔮 Crystal Ore: +${crystAmt}`,
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
        pattern:     'crystal-hunt',
        aliases:     ['crystalhunt', 'findcrystal'],
        category:    'gathering',
        react:       '🔮',
        description: 'Hunt for crystal ore exclusively (Level 50+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.level < 50) return reply('❌ Crystal Hunt requires Level 50+.');

        const { onCooldown, remaining } = checkCooldown(player, 'crystalhunt', CD.crystalhunt);
        if (onCooldown) return reply(buildBox('🔮 ON COOLDOWN', [`  Crystal Hunt resets in: ${formatCooldown(remaining)}`]));

        const lukMult  = 1 + (player.stats.luk - 1) * 0.04;
        const crystAmt = Math.floor((5 + Math.random() * 10) * lukMult);
        const rareDrop = Math.random() < 0.1 * lukMult;

        await addItem(sender, 'crystalOre', crystAmt);
        if (rareDrop) await addCrystals(sender, 1);

        const scaled = scaleRewards({ exp: 200, gold: 150 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'crystalhunt');

        await react('🔮');
        await reply(
            buildBox('🔮 CRYSTAL HUNT RESULT', [
                `  🔮 Crystal Ore: +${crystAmt}`,
                ...(rareDrop ? [`  ✨ RARE! +1 Pure Crystal!`] : []),
                `  ✨ EXP:  +${scaled.exp}`,
                `  🍀 LUK:  ${lukMult.toFixed(2)}x`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'rare-fish',
        aliases:     ['rarefish', 'deepfish'],
        category:    'gathering',
        react:       '🎣',
        description: 'Fish for rare species for higher gold value',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'rarefish', CD.rarefish);
        if (onCooldown) return reply(buildBox('🎣 ON COOLDOWN', [`  Rare Fish resets in: ${formatCooldown(remaining)}`]));

        const lukMult = 1 + (player.stats.luk - 1) * 0.03;
        const FISH_TYPES = [
            { name: 'Golden Carp',    qty: [1, 3],  goldPer: 150, chance: 0.2  },
            { name: 'Moonfish',       qty: [1, 2],  goldPer: 300, chance: 0.1  },
            { name: 'Shadow Eel',     qty: [1, 2],  goldPer: 500, chance: 0.05 },
            { name: 'Common Fish',    qty: [2, 5],  goldPer: 50,  chance: 0.65 },
        ];

        const roll = Math.random() / lukMult;
        let caught = FISH_TYPES[3];
        let cum    = 0;
        for (const f of FISH_TYPES) {
            cum += f.chance;
            if (roll < cum) { caught = f; break; }
        }

        const qty      = Math.floor(caught.qty[0] + Math.random() * (caught.qty[1] - caught.qty[0] + 1));
        const goldEarned = qty * caught.goldPer;

        await addItem(sender, 'fish', qty);
        const scaled = scaleRewards({ exp: 80, gold: goldEarned }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'rarefish');

        await react('🎣');
        await reply(
            buildBox('🎣 RARE FISHING RESULT', [
                `  🐟 ${caught.name} x${qty}`,
                `  💰 Value: +${scaled.gold.toLocaleString()} Gold`,
                `  ✨ EXP:   +${scaled.exp}`,
                `  🍀 LUK bonus applied`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'night-farm',
        aliases:     ['nightfarm', 'moonharvest'],
        category:    'gathering',
        react:       '🌙',
        description: 'Farm under moonlight for double yield and rare herbs',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'nightfarm', CD.nightfarm);
        if (onCooldown) return reply(buildBox('🌙 ON COOLDOWN', [`  Night Farm resets in: ${formatCooldown(remaining)}`]));

        const foodAmt  = Math.floor((8 + Math.random() * 12));
        const herbAmt  = Math.floor((5 + Math.random() * 8));
        const rareDrop = Math.random() < 0.15;

        await addItem(sender, 'food',  foodAmt);
        await addItem(sender, 'herbs', herbAmt);
        if (rareDrop) await addItem(sender, 'crystalOre', 1);

        const scaled = scaleRewards({ exp: 120, gold: 80 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'nightfarm');

        await react('🌙');
        await reply(
            buildBox('🌙 NIGHT FARM RESULT', [
                `  Farmed under moonlight!`,
                `  🍖 Food:  +${foodAmt} (2x yield)`,
                `  🌿 Herbs: +${herbAmt}`,
                ...(rareDrop ? [`  ✨ Moon Crystal dropped! +1 Crystal Ore`] : []),
                `  ✨ EXP:   +${scaled.exp}`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'herb-run',
        aliases:     ['herbrun', 'quickherb'],
        category:    'gathering',
        react:       '🌿',
        description: 'Quick herb gathering run — 3 spots in one go',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'herbrun', CD.herbrun);
        if (onCooldown) return reply(buildBox('🌿 ON COOLDOWN', [`  Herb Run resets in: ${formatCooldown(remaining)}`]));

        const lukMult  = 1 + (player.stats.luk - 1) * 0.02;
        const spots    = [0, 1, 2].map(() => Math.floor((3 + Math.random() * 6) * lukMult));
        const total    = spots.reduce((s, v) => s + v, 0);

        await addItem(sender, 'herbs', total);
        const scaled = scaleRewards({ exp: 70, gold: 50 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'herbrun');

        await react('🌿');
        await reply(
            buildBox('🌿 HERB RUN COMPLETE', [
                `  Spot 1: +${spots[0]} herbs`,
                `  Spot 2: +${spots[1]} herbs`,
                `  Spot 3: +${spots[2]} herbs`,
                `  ───────`,
                `  🌿 Total: +${total} herbs`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'mass-chop',
        aliases:     ['masschop', 'masslumber'],
        category:    'gathering',
        react:       '🪵',
        description: 'Mass woodcutting session — 5x normal yield',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'masschop', CD.masschop);
        if (onCooldown) return reply(buildBox('🪵 ON COOLDOWN', [`  Mass Chop resets in: ${formatCooldown(remaining)}`]));

        const mult    = getRankMultiplier(player.level, player.jid);
        const woodAmt = Math.floor((20 + Math.random() * 30) * mult);

        await addItem(sender, 'wood', woodAmt);
        const scaled = scaleRewards({ exp: 120, gold: 80 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'masschop');

        await react('🪵');
        await reply(
            buildBox('🪵 MASS CHOP COMPLETE', [
                `  Chopped through an entire forest!`,
                `  🪵 Wood: +${woodAmt}`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  🏅 Rank bonus: ${mult}x`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'smelt-all',
        aliases:     ['smeltall', 'refineall'],
        category:    'gathering',
        react:       '🔥',
        description: 'Smelt all your ore at once into refined bars for selling',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'smeltall', CD.smeltall);
        if (onCooldown) return reply(buildBox('🔥 ON COOLDOWN', [`  Smelt All resets in: ${formatCooldown(remaining)}`]));

        const oreAmt = player.inventory.ore || 0;
        if (oreAmt < 5) return reply('❌ Need at least 5 ore to smelt.');

        const bars     = Math.floor(oreAmt / 3);
        const goldGain = bars * 60;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $set: { 'inventory.ore': oreAmt % 3 },
            $inc: { gold: goldGain },
        });

        const scaled = scaleRewards({ exp: 80, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'smeltall');

        await react('🔥');
        await reply(
            buildBox('🔥 SMELT ALL COMPLETE', [
                `  🪨 Ore used:   ${oreAmt - (oreAmt % 3)}`,
                `  🪨 Remaining:  ${oreAmt % 3}`,
                `  ⚙️  Bars made:  ${bars}`,
                `  💰 Gold:       +${goldGain.toLocaleString()}`,
                `  ✨ EXP:        +${scaled.exp}`,
                buildFooter(scaled.exp, goldGain, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'craft-batch',
        aliases:     ['craftbatch', 'bulkcraft'],
        category:    'gathering',
        react:       '⚒️',
        description: 'Craft multiple potions in one batch (uses more materials)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        const qty = Math.min(parseInt(q) || 3, 10);

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'craftbatch', CD.craftbatch);
        if (onCooldown) return reply(buildBox('⚒️ ON COOLDOWN', [`  Craft Batch resets in: ${formatCooldown(remaining)}`]));

        const herbCost  = qty * 3;
        const waterCost = qty * 2;

        if ((player.inventory.herbs || 0) < herbCost || (player.inventory.water || 0) < waterCost) {
            return reply(buildBox('⚒️ NOT ENOUGH MATERIALS', [
                `  Need: ${herbCost} herbs + ${waterCost} water`,
                `  Have: ${player.inventory.herbs || 0} herbs, ${player.inventory.water || 0} water`,
            ]));
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'inventory.herbs':   -herbCost,
                'inventory.water':   -waterCost,
                'inventory.potions':  qty,
            }
        });

        const scaled = scaleRewards({ exp: 100 * qty, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'craftbatch');

        await react('⚒️');
        await reply(
            buildBox('⚒️ BATCH CRAFT COMPLETE', [
                `  💊 Potions crafted: x${qty}`,
                `  🌿 Herbs used:  -${herbCost}`,
                `  💧 Water used:  -${waterCost}`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'auto-craft',
        aliases:     ['autocraft', 'smartcraft'],
        category:    'gathering',
        react:       '🤖',
        description: 'Auto-detect and craft the best recipe from your materials',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'autocraftcd', CD.autocraftcd);
        if (onCooldown) return reply(buildBox('🤖 ON COOLDOWN', [`  Auto-Craft resets in: ${formatCooldown(remaining)}`]));

        const inv = player.inventory;
        const crafted = [];

        // Try to craft potions
        while ((inv.herbs || 0) >= 3 && (inv.water || 0) >= 2 && crafted.length < 5) {
            inv.herbs -= 3;
            inv.water -= 2;
            crafted.push('Health Potion');
        }

        if (!crafted.length) {
            return reply('❌ Not enough materials to auto-craft anything.\nNeed: 3 herbs + 2 water minimum.');
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $set: { 'inventory.herbs': inv.herbs, 'inventory.water': inv.water },
            $inc: { 'inventory.potions': crafted.length }
        });

        const scaled = scaleRewards({ exp: 80 * crafted.length, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'autocraftcd');

        await react('🤖');
        await reply(
            buildBox('🤖 AUTO-CRAFT COMPLETE', [
                `  Auto-detected best recipe!`,
                `  💊 Health Potion x${crafted.length} crafted`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'blueprint',
        aliases:     ['blueprints', 'recipes'],
        category:    'gathering',
        react:       '📐',
        description: 'View all unlocked crafting blueprints and recipes',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;
        const { rankName } = getRank(player.level, player.jid);

        const BLUEPRINTS = [
            { name: 'Health Potion',  req: 1,   mats: '3 herbs + 2 water'       },
            { name: 'Iron Sword',     req: 1,   mats: '5 ore + 2 wood'           },
            { name: 'Leather Armor',  req: 1,   mats: '5 wood + 3 ore'           },
            { name: 'Steel Blade',    req: 20,  mats: '10 ore + 3 wood'          },
            { name: 'Crystal Staff',  req: 40,  mats: '3 ore + 5 crystalOre'     },
            { name: 'Elixir',         req: 50,  mats: '10 herbs + 5 water + 2 crystalOre' },
            { name: 'Crystal Robe',   req: 50,  mats: '8 crystalOre + 5 herbs'   },
            { name: 'Shadow Dagger',  req: 60,  mats: '8 ore + 3 crystalOre'     },
            { name: 'Dragon Spear',   req: 80,  mats: '20 ore + 10 crystalOre + 5 wood' },
        ];

        const unlocked = BLUEPRINTS.filter(b => player.level >= b.req);
        const locked   = BLUEPRINTS.filter(b => player.level < b.req);

        await react('📐');
        await reply(
            buildBox('📐 BLUEPRINT LIBRARY', [
                `  Hunter: ${name}  |  ${rankName}`,
                `  ───────`,
                `  UNLOCKED (${unlocked.length}):`,
                ...unlocked.map(b => `  ✅ ${b.name} — ${b.mats}`),
                `  ───────`,
                `  LOCKED (${locked.length}):`,
                ...locked.map(b => `  🔒 ${b.name} (Lv.${b.req})`),
            ])
        );
    }
);

mxd(
    {
        pattern:     'research',
        aliases:     ['study', 'investigate'],
        category:    'gathering',
        react:       '🔬',
        description: 'Research new crafting techniques for bonus yield',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'research', CD.research);
        if (onCooldown) return reply(buildBox('🔬 ON COOLDOWN', [`  Research resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.crystalOre || 0) < 2) return reply('❌ Research requires 2 Crystal Ore.');

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -2, skillPoints: 1 } });
        const scaled = scaleRewards({ exp: 300, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'research');

        await react('🔬');
        await reply(
            buildBox('🔬 RESEARCH COMPLETE', [
                `  New crafting knowledge unlocked!`,
                `  🔮 Crystal Ore: -2`,
                `  ✨ EXP: +${scaled.exp}`,
                `  ⚡ +1 Skill Point`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'upgrade-tool',
        aliases:     ['upgradetool', 'tooltier'],
        category:    'gathering',
        react:       '🔧',
        description: 'Upgrade a gathering tool for better yield',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        const TOOLS = ['pickaxe', 'rod', 'hoe', 'axe'];
        const tool  = q?.toLowerCase();

        if (!tool || !TOOLS.includes(tool)) {
            return reply(buildBox('🔧 UPGRADE TOOL', [
                `  Available tools: ${TOOLS.join(', ')}`,
                `  Usage: *.upgrade-tool <tool>*`,
            ]));
        }

        await getPlayer(sender, botId);
        const player   = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'upgradetool', CD.upgradetool);
        if (onCooldown) return reply(buildBox('🔧 ON COOLDOWN', [`  Tool upgrade resets in: ${formatCooldown(remaining)}`]));

        const currentLevel = getToolLevel(sender, tool);
        const cost         = currentLevel * 500;

        if (player.gold < cost) return reply(`❌ Upgrading ${tool} to level ${currentLevel + 1} costs ${cost} Gold.`);

        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { gold: -cost } });

        const tools = TOOL_LEVELS.get(sender) || { pickaxe: 1, rod: 1, hoe: 1, axe: 1 };
        tools[tool]++;
        TOOL_LEVELS.set(sender, tools);

        await setCooldown(sender, 'upgradetool');

        await react('🔧');
        await reply(
            buildBox('🔧 TOOL UPGRADED', [
                `  ${tool.toUpperCase()} upgraded!`,
                `  Level: ${currentLevel} → ${currentLevel + 1}`,
                `  💰 Cost: -${cost.toLocaleString()} Gold`,
                `  Yield bonus: +${currentLevel * 10}%`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'tool-stats',
        aliases:     ['toolstats', 'mytools'],
        category:    'gathering',
        react:       '🛠️',
        description: 'View your current tool levels and bonuses',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;
        const tools  = TOOL_LEVELS.get(sender) || { pickaxe: 1, rod: 1, hoe: 1, axe: 1 };

        await react('🛠️');
        await reply(
            buildBox('🛠️ TOOL STATS', [
                `  Hunter: ${name}`,
                `  ───────`,
                `  ⛏️  Pickaxe: Lv.${tools.pickaxe} (+${(tools.pickaxe - 1) * 10}% mine yield)`,
                `  🎣 Fishing Rod: Lv.${tools.rod} (+${(tools.rod - 1) * 10}% fish yield)`,
                `  🌾 Hoe: Lv.${tools.hoe} (+${(tools.hoe - 1) * 10}% farm yield)`,
                `  🪓 Axe: Lv.${tools.axe} (+${(tools.axe - 1) * 10}% wood yield)`,
                `  ───────`,
                `  Use *.upgrade-tool <name>* to upgrade`,
            ])
        );
    }
);

mxd(
    {
        pattern:     'gather-all',
        aliases:     ['gatherall', 'megagather'],
        category:    'gathering',
        react:       '🎒',
        description: 'Gather all resources in one session (1hr cooldown)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'gatherall', CD.gatherall);
        if (onCooldown) return reply(buildBox('🎒 ON COOLDOWN', [`  Gather All resets in: ${formatCooldown(remaining)}`]));

        const mult  = getRankMultiplier(player.level, player.jid);
        const ore   = Math.floor((3 + Math.random() * 5) * mult);
        const wood  = Math.floor((4 + Math.random() * 6) * mult);
        const herbs = Math.floor((3 + Math.random() * 4) * mult);
        const fish  = Math.floor((2 + Math.random() * 4) * mult);

        await addItem(sender, 'ore',   ore);
        await addItem(sender, 'wood',  wood);
        await addItem(sender, 'herbs', herbs);
        await addItem(sender, 'fish',  fish);

        const scaled = scaleRewards({ exp: 200, gold: 150 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'gatherall');

        await react('🎒');
        await reply(
            buildBox('🎒 GATHER ALL COMPLETE', [
                `  🪨 Ore:   +${ore}`,
                `  🪵 Wood:  +${wood}`,
                `  🌿 Herbs: +${herbs}`,
                `  🐟 Fish:  +${fish}`,
                `  ───────`,
                `  ✨ EXP:  +${scaled.exp}`,
                `  💰 Gold: +${scaled.gold}`,
                `  🏅 Rank: ${mult}x`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'material-rank',
        aliases:     ['materialrank', 'gatherrank'],
        category:    'gathering',
        react:       '📊',
        description: 'View the top gatherers leaderboard',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        const top = await GlobalPlayer.find({ registered: true })
            .sort({ 'inventory.ore': -1 })
            .limit(10)
            .lean();

        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

        await react('📊');
        await reply(
            buildBox('📊 GATHERER LEADERBOARD', [
                ...top.map((p, i) => {
                    const name  = p.username || p.jid.split('@')[0];
                    const total = (p.inventory.ore || 0) + (p.inventory.crystalOre || 0)
                        + (p.inventory.wood || 0) + (p.inventory.herbs || 0) + (p.inventory.fish || 0);
                    return `  ${medals[i]} *${name}* — 📦 ${total} total mats`;
                }),
            ])
        );
    }
);

mxd(
    {
        pattern:     'transmute',
        aliases:     ['transform', 'convert-mat'],
        category:    'gathering',
        react:       '⚗️',
        description: 'Transmute 10 ore + 5 herbs into Crystal Ore',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'transmute', CD.transmute);
        if (onCooldown) return reply(buildBox('⚗️ ON COOLDOWN', [`  Transmute resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.ore || 0) < 10 || (player.inventory.herbs || 0) < 5) {
            return reply(buildBox('⚗️ TRANSMUTE', [
                `  Requires: 10 Ore + 5 Herbs`,
                `  You have: ${player.inventory.ore || 0} ore, ${player.inventory.herbs || 0} herbs`,
                `  Output: 2-4 Crystal Ore`,
            ]));
        }

        const crystals = Math.floor(2 + Math.random() * 3);

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'inventory.ore':        -10,
                'inventory.herbs':      -5,
                'inventory.crystalOre':  crystals,
            }
        });

        const scaled = scaleRewards({ exp: 200, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'transmute');

        await react('⚗️');
        await reply(
            buildBox('⚗️ TRANSMUTATION COMPLETE', [
                `  🪨 Ore: -10  🌿 Herbs: -5`,
                `  🔮 Crystal Ore: +${crystals}`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'extract-gem',
        aliases:     ['extractgem', 'gemextract'],
        category:    'gathering',
        react:       '💎',
        description: 'Extract a pure gem from Crystal Ore (5 ore = 1 gem)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'extractgem', CD.extractgem);
        if (onCooldown) return reply(buildBox('💎 ON COOLDOWN', [`  Extract Gem resets in: ${formatCooldown(remaining)}`]));

        const crystalOre = player.inventory.crystalOre || 0;
        if (crystalOre < 5) return reply(`❌ Need 5 Crystal Ore. You have ${crystalOre}.`);

        const gems = Math.floor(crystalOre / 5);
        const used = gems * 5;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'inventory.crystalOre': -used, diamonds: gems }
        });

        const scaled = scaleRewards({ exp: 150, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'extractgem');

        await react('💎');
        await reply(
            buildBox('💎 GEM EXTRACTED', [
                `  🔮 Crystal Ore used: ${used}`,
                `  💎 Diamonds gained:  +${gems}`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'polish',
        aliases:     ['gempolish', 'shine'],
        category:    'gathering',
        react:       '✨',
        description: 'Polish your diamonds to increase their sell value',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, q, botId } = conText;

        const amount = parseInt(q) || 1;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'polish', CD.polish);
        if (onCooldown) return reply(buildBox('✨ ON COOLDOWN', [`  Polish resets in: ${formatCooldown(remaining)}`]));

        if (player.diamonds < amount) return reply(`❌ Not enough diamonds. You have ${player.diamonds}.`);

        // Polishing converts diamonds to more gold than normal sell rate
        const goldGain = amount * 550; // 550 vs normal 450
        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { diamonds: -amount, gold: goldGain }
        });
        await setCooldown(sender, 'polish');

        await react('✨');
        await reply(
            buildBox('✨ GEMS POLISHED & SOLD', [
                `  💎 Polished: ${amount}`,
                `  💰 Premium sale: +${goldGain.toLocaleString()} Gold`,
                `  Rate: 550g (vs normal 450g)`,
                buildFooter(0, goldGain, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'mastercraft',
        aliases:     ['mastercrafting', 'legendary-craft'],
        category:    'gathering',
        react:       '🌟',
        description: 'Craft a legendary masterwork item (Level 70+, high materials)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.level < 70) return reply('❌ Mastercraft requires Level 70+.');

        const { onCooldown, remaining } = checkCooldown(player, 'mastercraft', CD.mastercraft);
        if (onCooldown) return reply(buildBox('🌟 ON COOLDOWN', [`  Mastercraft resets in: ${formatCooldown(remaining)}`]));

        const inv = player.inventory;
        if ((inv.ore || 0) < 20 || (inv.crystalOre || 0) < 10 || (inv.wood || 0) < 10) {
            return reply(buildBox('🌟 MASTERCRAFT REQUIREMENTS', [
                `  Need: 20 ore + 10 crystalOre + 10 wood`,
                `  Have: ${inv.ore || 0} ore, ${inv.crystalOre || 0} crystalOre, ${inv.wood || 0} wood`,
            ]));
        }

        const success = Math.random() < Math.min(0.7, 0.3 + (player.stats.int - 1) * 0.02);

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: { 'inventory.ore': -20, 'inventory.crystalOre': -10, 'inventory.wood': -10 }
        });
        await setCooldown(sender, 'mastercraft');

        if (success) {
            const atkGain = 30;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'combat.attack': atkGain } });
            const scaled = scaleRewards({ exp: 1000, gold: 500 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, scaled.gold, botId);

            await react('🌟');
            await reply(
                buildBox('🌟 MASTERWORK FORGED', [
                    `  A legendary item has been created!`,
                    `  ⚔️  ATK: +${atkGain} (permanent)`,
                    `  ✨ EXP: +${scaled.exp}`,
                    `  💰 Gold: +${scaled.gold}`,
                    buildFooter(scaled.exp, scaled.gold, player),
                ])
            );
        } else {
            await react('❌');
            await reply(buildBox('🌟 MASTERCRAFT FAILED', [
                `  The materials crumbled!`,
                `  Materials consumed. Upgrade INT to improve odds.`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'inscribe',
        aliases:     ['inscription', 'carve'],
        category:    'gathering',
        react:       '✍️',
        description: 'Inscribe a weapon with power runes for stat boosts',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'inscribe', CD.inscribe);
        if (onCooldown) return reply(buildBox('✍️ ON COOLDOWN', [`  Inscribe resets in: ${formatCooldown(remaining)}`]));

        if (!player.inventory.weapons?.length) return reply('❌ No weapons to inscribe!');
        if ((player.inventory.crystalOre || 0) < 4) return reply('❌ Inscribing requires 4 Crystal Ore.');

        const success = Math.random() < 0.65;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -4 } });
        await setCooldown(sender, 'inscribe');

        if (success) {
            const statGain = Math.floor(Math.random() * 3) + 1;
            await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'stats.int': statGain } });
            await react('✍️');
            await reply(buildBox('✍️ INSCRIPTION SUCCESS', [
                `  Runes etched into your weapon!`,
                `  🧠 INT: +${statGain}`,
                `  🔮 Crystal Ore: -4`,
                buildFooter(0, 0, player),
            ]));
        } else {
            await react('❌');
            await reply(buildBox('✍️ INSCRIPTION FAILED', [
                `  The runes crumbled during inscription.`,
                `  🔮 Crystal Ore: -4 (lost)`,
                `  65% success rate. Try again.`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'rune-craft',
        aliases:     ['runecraft', 'makerune'],
        category:    'gathering',
        react:       '🔯',
        description: 'Craft power runes from Crystal Ore and herbs',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'runecraft', CD.runecraft);
        if (onCooldown) return reply(buildBox('🔯 ON COOLDOWN', [`  Rune Craft resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.crystalOre || 0) < 3 || (player.inventory.herbs || 0) < 5) {
            return reply('❌ Rune Craft requires 3 Crystal Ore + 5 Herbs.');
        }

        const RUNE_EFFECTS = [
            { name: 'Strength Rune',  stat: 'str', gain: 2 },
            { name: 'Speed Rune',     stat: 'agi', gain: 2 },
            { name: 'Wisdom Rune',    stat: 'int', gain: 2 },
            { name: 'Fortune Rune',   stat: 'luk', gain: 2 },
        ];

        const rune = RUNE_EFFECTS[Math.floor(Math.random() * RUNE_EFFECTS.length)];

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'inventory.crystalOre': -3,
                'inventory.herbs':      -5,
                [`stats.${rune.stat}`]:  rune.gain,
            }
        });

        const scaled = scaleRewards({ exp: 250, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'runecraft');

        await react('🔯');
        await reply(
            buildBox('🔯 RUNE CRAFTED', [
                `  ${rune.name} created!`,
                `  ${rune.stat.toUpperCase()}: +${rune.gain} (permanent)`,
                `  🔮 Crystal Ore: -3  🌿 Herbs: -5`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'potion-batch',
        aliases:     ['potionbatch', 'brewbatch'],
        category:    'gathering',
        react:       '⚗️',
        description: 'Brew as many potions as possible from all your herbs',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        const { onCooldown, remaining } = checkCooldown(player, 'potionbatch', CD.potionbatch);
        if (onCooldown) return reply(buildBox('⚗️ ON COOLDOWN', [`  Potion Batch resets in: ${formatCooldown(remaining)}`]));

        const herbs   = player.inventory.herbs  || 0;
        const water   = player.inventory.water  || 0;
        const batches = Math.min(Math.floor(herbs / 3), Math.floor(water / 2), 20);

        if (batches === 0) return reply('❌ Not enough herbs/water. Need 3 herbs + 2 water per batch.');

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'inventory.herbs':   -(batches * 3),
                'inventory.water':   -(batches * 2),
                'inventory.potions':  batches,
            }
        });

        const scaled = scaleRewards({ exp: 80 * batches, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'potionbatch');

        await react('⚗️');
        await reply(
            buildBox('⚗️ POTION BATCH COMPLETE', [
                `  💊 Potions brewed: x${batches}`,
                `  🌿 Herbs used: -${batches * 3}`,
                `  💧 Water used: -${batches * 2}`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'crystal-forge',
        aliases:     ['crystalforge', 'pureforge'],
        category:    'gathering',
        react:       '🔮',
        description: 'Forge a pure crystal weapon for massive ATK (Level 60+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.level < 60) return reply('❌ Crystal Forge requires Level 60+.');

        const { onCooldown, remaining } = checkCooldown(player, 'crystalforge', CD.crystalforge);
        if (onCooldown) return reply(buildBox('🔮 ON COOLDOWN', [`  Crystal Forge resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.crystalOre || 0) < 15) {
            return reply(`❌ Crystal Forge requires 15 Crystal Ore. You have ${player.inventory.crystalOre || 0}.`);
        }

        const success = Math.random() < 0.75;
        await GlobalPlayer.updateOne({ jid: sender }, { $inc: { 'inventory.crystalOre': -15 } });
        await setCooldown(sender, 'crystalforge');

        if (success) {
            const atkGain = 50;
            await GlobalPlayer.updateOne({ jid: sender }, {
                $push: { 'inventory.weapons': 'Crystal Weapon' },
                $inc:  { 'combat.attack': atkGain }
            });
            const scaled = scaleRewards({ exp: 800, gold: 0 }, player.level, player.jid);
            await grantExp(sender, scaled.exp, 0, botId);

            await react('🔮');
            await reply(
                buildBox('🔮 CRYSTAL WEAPON FORGED', [
                    `  A weapon of pure crystal energy!`,
                    `  ⚔️  ATK: +${atkGain}`,
                    `  🔮 Crystal Ore: -15`,
                    `  ✨ EXP: +${scaled.exp}`,
                    buildFooter(scaled.exp, 0, player),
                ])
            );
        } else {
            await react('❌');
            await reply(buildBox('🔮 CRYSTAL FORGE FAILED', [
                `  The crystal shattered during forging!`,
                `  🔮 Crystal Ore: -15 (lost)`,
                `  75% success rate. Try again.`,
            ]));
        }
    }
);

mxd(
    {
        pattern:     'shadow-forge',
        aliases:     ['shadowforge', 'darkforge'],
        category:    'gathering',
        react:       '🖤',
        description: 'Forge a shadow-infused weapon using shadow energy (Level 80+)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);

        if (player.level < 80) return reply('❌ Shadow Forge requires Level 80+.');
        if (!player.shadows?.length) return reply('❌ Shadow Forge requires at least 1 shadow soldier.');

        const { onCooldown, remaining } = checkCooldown(player, 'shadowforge', CD.shadowforge);
        if (onCooldown) return reply(buildBox('🖤 ON COOLDOWN', [`  Shadow Forge resets in: ${formatCooldown(remaining)}`]));

        if ((player.inventory.ore || 0) < 10 || (player.inventory.crystalOre || 0) < 5) {
            return reply('❌ Shadow Forge requires 10 Ore + 5 Crystal Ore.');
        }

        const shadowBonus = player.shadowCount * 5;
        const atkGain     = 40 + shadowBonus;

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'inventory.ore':       -10,
                'inventory.crystalOre':-5,
                'combat.attack':        atkGain,
            },
            $push: { 'inventory.weapons': 'Shadow Blade' }
        });

        const scaled = scaleRewards({ exp: 1000, gold: 0 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, 0, botId);
        await setCooldown(sender, 'shadowforge');

        await react('🖤');
        await reply(
            buildBox('🖤 SHADOW WEAPON FORGED', [
                `  Shadow energy bound into steel!`,
                `  ⚔️  ATK: +${atkGain} (shadow bonus: +${shadowBonus})`,
                `  🪨 Ore: -10  🔮 Crystal Ore: -5`,
                `  ✨ EXP: +${scaled.exp}`,
                buildFooter(scaled.exp, 0, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'origin-craft',
        aliases:     ['origincraft', 'sovereigncraft'],
        category:    'gathering',
        react:       '👑',
        description: 'Craft the ultimate Origin-class weapon (Level 400+ / Origin rank)',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, botId } = conText;

        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const name   = player.username || pushName;

        const { rankId } = getRank(player.level, player.jid);
        if (rankId < 11 && !sender.includes('263776388689')) {
            return reply('❌ Origin Craft is reserved for Origin rank (Level 400+).');
        }

        const { onCooldown, remaining } = checkCooldown(player, 'origincraft', CD.origincraft);
        if (onCooldown) return reply(buildBox('👑 ON COOLDOWN', [`  Origin Craft resets in: ${formatCooldown(remaining)}`]));

        const inv = player.inventory;
        if ((inv.ore || 0) < 50 || (inv.crystalOre || 0) < 25 || (inv.wood || 0) < 20) {
            return reply(buildBox('👑 ORIGIN CRAFT REQUIREMENTS', [
                `  50 Ore + 25 Crystal Ore + 20 Wood`,
                `  Have: ${inv.ore || 0} ore, ${inv.crystalOre || 0} crystalOre, ${inv.wood || 0} wood`,
            ]));
        }

        await GlobalPlayer.updateOne({ jid: sender }, {
            $inc: {
                'inventory.ore':        -50,
                'inventory.crystalOre': -25,
                'inventory.wood':       -20,
                'combat.attack':         100,
                'stats.str':             10,
                'stats.int':             10,
            },
            $push: { 'inventory.weapons': 'Sovereign Blade' }
        });

        const scaled = scaleRewards({ exp: 5000, gold: 3000 }, player.level, player.jid);
        await grantExp(sender, scaled.exp, scaled.gold, botId);
        await setCooldown(sender, 'origincraft');

        await react('👑');
        await reply(
            buildBox('👑 ORIGIN CRAFT COMPLETE', [
                `  👑 *${name}* has forged the Sovereign Blade!`,
                `  ───────`,
                `  ⚔️  ATK: +100 (permanent)`,
                `  ⚔️  STR: +10 (permanent)`,
                `  🧠 INT: +10 (permanent)`,
                `  ───────`,
                `  ✨ EXP:  +${scaled.exp.toLocaleString()}`,
                `  💰 Gold: +${scaled.gold.toLocaleString()}`,
                buildFooter(scaled.exp, scaled.gold, player),
            ])
        );
    }
);

mxd(
    {
        pattern:     'recipe-book',
        aliases:     ['recipebook', 'allrecipes'],
        category:    'gathering',
        react:       '📖',
        description: 'View the complete recipe book',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;

        await react('📖');
        await reply(
            buildBox('📖 RECIPE BOOK', [
                `  WEAPONS (via *.forge*):`,
                `  ⚔️  Iron Sword:    5 ore + 2 wood`,
                `  ⚔️  Steel Blade:   10 ore + 3 wood`,
                `  ⚔️  Crystal Staff: 3 ore + 5 crystalOre`,
                `  ⚔️  Shadow Dagger: 8 ore + 3 crystalOre`,
                `  ⚔️  Dragon Spear:  20 ore + 10 crystalOre + 5 wood`,
                `  ───────`,
                `  ARMOR (via *.craft*):`,
                `  🛡️  Leather Armor: 5 wood + 3 ore`,
                `  🛡️  Iron Plate:    15 ore + 5 wood`,
                `  🛡️  Crystal Robe:  8 crystalOre + 5 herbs`,
                `  ───────`,
                `  POTIONS (via *.alchemy*):`,
                `  💊 Health Potion:  3 herbs + 2 water`,
                `  💊 Mana Potion:    5 herbs + 3 water`,
                `  💊 Elixir:         10 herbs + 5 water + 2 crystalOre`,
                `  ───────`,
                `  SPECIAL (advanced cmds):`,
                `  🔮 Crystal Weapon: 15 crystalOre (*.crystal-forge*)`,
                `  🖤 Shadow Blade:   10 ore + 5 crystalOre (*.shadow-forge*)`,
                `  👑 Sovereign Blade: 50 ore + 25 crystalOre + 20 wood (*.origin-craft*)`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .inv-sell — Sell materials from inventory
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'inv-sell',
        aliases:     ['sellmat', 'sellinv', 'invsell'],
        category:    'gathering',
        react:       '💰',
        description: 'Sell materials — .inv-sell <item> <qty>',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, args, botId } = conText;

        if (!args[0]) return reply('❌ Usage: *.inv-sell <item> <qty>*\nExample: *.inv-sell ore 10*');

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const name    = player.username || pushName;
        const itemKey = args[0].toLowerCase();
        const qty     = Math.max(1, parseInt(args[1]) || 1);

        // Material sell prices
        const SELL_PRICES = {
            ore: 50, crystalOre: 200, wood: 40, herbs: 60, fish: 45,
            food: 20, water: 15, fireOre: 300, magmaCrystal: 800,
            frostCrystal: 900, iceOre: 350, voidEssenceRaw: 500,
            shadowFragment: 400, ancientRune: 1000, beastCore: 800,
            voidCrystal: 2000, darkSigil: 1500, infernalCore: 3000,
            glacialCore: 4000, frostSigil: 2500, phantomCore: 1800,
        };

        const price = SELL_PRICES[itemKey];
        if (!price) return reply(`❌ *${itemKey}* cannot be sold here.\nCheck *.shop* for tradeable items.`);

        const invQty = player.inventory?.[itemKey] || 0;
        if (invQty < qty) return reply(`❌ You only have *${invQty}* ${itemKey}.`);

        const total = price * qty;
        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            {
                $inc: {
                    gold: total,
                    [`inventory.${itemKey}`]: -qty,
                }
            }
        );

        await react('💰');
        await reply(
            buildBox('💰 ITEMS SOLD', [
                `  Hunter: *${name}*`,
                `  ───────`,
                `  Item: *${itemKey}* x${qty}`,
                `  💰 Earned: *+${total.toLocaleString()} Gold*`,
                `  ───────`,
                `  Remaining: *${invQty - qty}*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .inv-drop — Drop/discard items from inventory
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'inv-drop',
        aliases:     ['dropitem', 'invdrop', 'discard'],
        category:    'gathering',
        react:       '🗑️',
        description: 'Discard items from inventory — .inv-drop <item> <qty>',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, reply, react, args, botId } = conText;

        if (!args[0]) return reply('❌ Usage: *.inv-drop <item> <qty>*');

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const itemKey = args[0].toLowerCase();
        const qty     = Math.max(1, parseInt(args[1]) || 1);

        const invQty = player.inventory?.[itemKey];
        if (invQty === undefined || invQty === null) {
            return reply(`❌ *${itemKey}* not found in inventory.`);
        }
        if (invQty < qty) return reply(`❌ You only have *${invQty}* ${itemKey}.`);

        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            { $inc: { [`inventory.${itemKey}`]: -qty } }
        );

        await react('🗑️');
        await reply(
            buildBox('🗑️ ITEMS DISCARDED', [
                `  *${itemKey}* x${qty} discarded.`,
                `  Remaining: *${invQty - qty}*`,
            ])
        );
    }
);

// ════════════════════════════════════════════════════════════════════════════
// .inv-give — Give items to another player
// ════════════════════════════════════════════════════════════════════════════
mxd(
    {
        pattern:     'inv-give',
        aliases:     ['giveitem', 'invgive', 'tradeitem'],
        category:    'gathering',
        react:       '🎁',
        description: 'Give items to another player — .inv-give @player <item> <qty>',
        filename:    __filename,
    },
    async (from, Malvin, conText) => {
        const { sender, pushName, reply, react, args, mentionedJid, botId } = conText;

        const targetJid = conText.user || mentionedJid?.[0];
        if (!targetJid) return reply('❌ Tag a player to give items to.');
        if (targetJid === sender) return reply('❌ Cannot give items to yourself.');

        const itemKey = args[1]?.toLowerCase() || args[0]?.toLowerCase();
        const qty     = Math.max(1, parseInt(args[2]) || parseInt(args[1]) || 1);

        if (!itemKey) return reply('❌ Usage: *.inv-give @player <item> <qty>*');

        await getPlayer(sender, botId);
        const player  = await fetchPlayer(sender);
        const name    = player.username || pushName;
        const invQty  = player.inventory?.[itemKey] || 0;

        if (invQty < qty) return reply(`❌ You only have *${invQty}* ${itemKey}.`);

        await getPlayer(targetJid, botId);
        const target  = await fetchPlayer(targetJid);
        const tName   = target?.username || targetJid.split('@')[0];

        await GlobalPlayer.findOneAndUpdate(
            { jid: sender },
            { $inc: { [`inventory.${itemKey}`]: -qty } }
        );
        await GlobalPlayer.findOneAndUpdate(
            { jid: targetJid },
            { $inc: { [`inventory.${itemKey}`]: qty } }
        );

        await react('🎁');
        await reply(
            buildBox('🎁 ITEMS GIVEN', [
                `  From: *${name}*`,
                `  To:   *${tName}*`,
                `  ───────`,
                `  Item: *${itemKey}* x${qty}`,
            ])
        );
    }
);
