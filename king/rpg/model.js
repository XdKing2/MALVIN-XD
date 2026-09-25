/**
 * king/rpg/model.js
 * Global Sovereign Schema — Malvin-XD RPG Universe
 * Supports 350+ command variables across all systems.
 */

const mongoose = require('mongoose');

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const StatsSchema = new mongoose.Schema({
    str:  { type: Number, default: 1 },
    int:  { type: Number, default: 1 },
    luk:  { type: Number, default: 1 },
    agi:  { type: Number, default: 1 }, // affects flee/speed
    vit:  { type: Number, default: 1 }, // affects max HP
    def:  { type: Number, default: 1 }, // affects damage reduction
}, { _id: false });

const BankSchema = new mongoose.Schema({
    balance:    { type: Number, default: 0 },
    capacity:   { type: Number, default: 5000 },
    lastDeposit:{ type: Date,   default: null },
}, { _id: false });

const WorldQuestEntrySchema = new mongoose.Schema({
    id:        { type: String, required: true },
    world:     { type: String, required: true },
    progress:  { type: Number, default: 0    },
    completed: { type: Boolean, default: false },
    claimed:   { type: Boolean, default: false },
}, { _id: false });

const WorldProgressSchema = new mongoose.Schema({
    worldHunts:       { type: Number, default: 0 },
    worldGathers:     { type: Number, default: 0 },
    worldExplores:    { type: Number, default: 0 },
    worldBossKills:   { type: Number, default: 0 },
    worldDaysSurvived:{ type: Number, default: 0 },
    lastWorldEntry:   { type: Date, default: null },
}, { _id: false });

const QuestEntrySchema = new mongoose.Schema({
    id:        { type: String, required: true },
    progress:  { type: Number, default: 0    },
    completed: { type: Boolean, default: false },
    claimed:   { type: Boolean, default: false },
}, { _id: false });

const QuestStatsSchema = new mongoose.Schema({
    duelsWon:        { type: Number, default: 0 },
    gathered:        { type: Number, default: 0 },
    goldEarned:      { type: Number, default: 0 },
    totalGoldEarned: { type: Number, default: 0 },
    explored:        { type: Number, default: 0 },
    levelsGained:    { type: Number, default: 0 },
    huntsWon:        { type: Number, default: 0 },
}, { _id: false });

const QuestSchema = new mongoose.Schema({
    daily:      { type: [QuestEntrySchema], default: [] },
    dailyReset: { type: Date, default: null             },
    claimable:  { type: [String], default: []           }, // story/challenge ready to claim
    completed:  { type: [String], default: []           }, // claimed story/challenge IDs
    stats:      { type: QuestStatsSchema, default: () => ({}) },
}, { _id: false });

const PetSchema = new mongoose.Schema({
    species:    { type: String, required: true       }, // key from PET_SPECIES
    name:       { type: String, required: true       }, // custom or default name
    level:      { type: Number, default: 1           },
    exp:        { type: Number, default: 0           },
    hunger:     { type: Number, default: 100         }, // 0-100
    happiness:  { type: Number, default: 100         }, // 0-100
    active:     { type: Boolean, default: true       }, // in party or in storage
    birthYear:  { type: Number, default: null        }, // Aevoria year found
    foundAt:    { type: String, default: null        }, // activity found during
}, { _id: true });

const ShadowSchema = new mongoose.Schema({
    name:       { type: String },
    rank:       { type: String, default: 'E' },
    level:      { type: Number, default: 1 },
    power:      { type: Number, default: 10 },
}, { _id: false });

const GuildSchema = new mongoose.Schema({
    guildId:    { type: String, default: null },
    guildName:  { type: String, default: null },
    role:       { type: String, default: 'member' }, // master/officer/member
    role:       { type: String, default: 'member' }, // member, officer, master
    joinedAt:   { type: Date,   default: null },
}, { _id: false });

const CooldownSchema = new mongoose.Schema({
    hunt:       { type: Date, default: null },
    dungeon:    { type: Date, default: null },
    raid:       { type: Date, default: null },
    mine:       { type: Date, default: null },
    fish:       { type: Date, default: null },
    farm:       { type: Date, default: null },
    woodcut:    { type: Date, default: null },
    rob:        { type: Date, default: null },
    assassinate:{ type: Date, default: null },
    duel:       { type: Date, default: null },
    daily:      { type: Date, default: null },
    work:       { type: Date, default: null },
    travel:     { type: Date, default: null },
    slot:       { type: Date, default: null },
    cook:       { type: Date, default: null },
    explore:    { type: Date, default: null },
    boss:       { type: Date, default: null },
}, { _id: false });

const InventorySchema = new mongoose.Schema({
    // ── Equipment ─────────────────────────────────────────────────────
    weapons:          { type: [String], default: [] },
    armor:            { type: [String], default: [] },
    // ── Materials ─────────────────────────────────────────────────────
    ore:              { type: Number, default: 0 },
    crystalOre:       { type: Number, default: 0 },
    wood:             { type: Number, default: 0 },
    herbs:            { type: Number, default: 0 },
    fish:             { type: Number, default: 0 },
    food:             { type: Number, default: 3 },
    water:            { type: Number, default: 3 },
    // World materials
    voidEssenceRaw:   { type: Number, default: 0 },
    shadowFragment:   { type: Number, default: 0 },
    fireOre:          { type: Number, default: 0 },
    magmaCrystal:     { type: Number, default: 0 },
    ashHerb:          { type: Number, default: 0 },
    iceOre:           { type: Number, default: 0 },
    frostCrystal:     { type: Number, default: 0 },
    arcticHerb:       { type: Number, default: 0 },
    // ── Consumables ───────────────────────────────────────────────────
    potions:          { type: Number, default: 0 },
    keys:             { type: Number, default: 0 },
    antidotes:        { type: Number, default: 0 },
    elixirs:          { type: Number, default: 0 },
    goldDrafts:       { type: Number, default: 0 },
    reviveStones:     { type: Number, default: 0 },
    // ── Pet items ─────────────────────────────────────────────────────
    petFood:          { type: Number, default: 0 },
    petToys:          { type: Number, default: 0 },
    petTreats:        { type: Number, default: 0 },
    petElixirs:       { type: Number, default: 0 },
    // ── Role gear ─────────────────────────────────────────────────────
    warriorAegis:     { type: Number, default: 0 },
    mageGrimoire:     { type: Number, default: 0 },
    rangerQuiver:     { type: Number, default: 0 },
    shadowDagger:     { type: Number, default: 0 },
    knightPlate:      { type: Number, default: 0 },
    alchemistKit:     { type: Number, default: 0 },
    // ── World items ───────────────────────────────────────────────────
    voidEssence:      { type: Number, default: 0 },
    shadowTalisman:   { type: Number, default: 0 },
    infernalOrb:      { type: Number, default: 0 },
    demonBlood:       { type: Number, default: 0 },
    frostCore:        { type: Number, default: 0 },
    glacialShard:     { type: Number, default: 0 },
    // ── Rare drops ────────────────────────────────────────────────────
    ancientRune:      { type: Number, default: 0 },
    beastCore:        { type: Number, default: 0 },
    voidCrystal:      { type: Number, default: 0 },
    darkSigil:        { type: Number, default: 0 },
    phantomCore:      { type: Number, default: 0 },
    infernalCore:     { type: Number, default: 0 },
    demonSigil:       { type: Number, default: 0 },
    flameRune:        { type: Number, default: 0 },
    glacialCore:      { type: Number, default: 0 },
    frostSigil:       { type: Number, default: 0 },
    eternalIce:       { type: Number, default: 0 },
}, { _id: false });

const CombatSchema = new mongoose.Schema({
    hp:         { type: Number, default: 100 },
    maxHp:      { type: Number, default: 100 },
    mp:         { type: Number, default: 50  },
    maxMp:      { type: Number, default: 50  },
    attack:     { type: Number, default: 10  },
    defense:    { type: Number, default: 5   },
    kills:      { type: Number, default: 0   },
    deaths:     { type: Number, default: 0   },
    dungeonClears: { type: Number, default: 0 },
    bossKills:  { type: Number, default: 0   },
}, { _id: false });

const MarriageSchema = new mongoose.Schema({
    partnerId:  { type: String, default: null },
    marriedAt:  { type: Date,   default: null },
    ring:       { type: String, default: null },
}, { _id: false });

const AchievementsSchema = new mongoose.Schema({
    list:       { type: [String], default: [] },
    titles:     { type: [String], default: [] },
    activeTitle:{ type: String,   default: null },
}, { _id: false });

const StocksSchema = new mongoose.Schema({
    portfolio:  { type: Map, of: Number, default: {} }, // { stockName: amount }
    lastTrade:  { type: Date, default: null },
}, { _id: false });

// ─── Main Player Schema ───────────────────────────────────────────────────────

const GlobalPlayerSchema = new mongoose.Schema(
    {
        // Identity
        jid:            { type: String, required: true, unique: true, index: true },
        lid:            { type: String, default: null, sparse: true }, // WhatsApp LID (alternate ID)
        username:       { type: String, default: null, sparse: true }, // chosen display name
        registered:     { type: Boolean, default: false }, // true once .start is used
        lastBotUsed:    { type: String, default: '' },

        // Core Progression
        level:          { type: Number, default: 1,    min: 1 },
        exp:            { type: Number, default: 0,    min: 0 },
        rebirths:       { type: Number, default: 0             }, // prestige counter
        awakened:       { type: Boolean, default: false        }, // post-rebirth boost
        isPlayer:       { type: Boolean, default: false        }, // monthly chosen Player

        // Currency
        gold:           { type: Number, default: 1000, min: 0 },
        diamonds:       { type: Number, default: 0,    min: 0 },
        crystals:       { type: Number, default: 0,    min: 0 }, // rare currency
        bank:           { type: BankSchema, default: () => ({}) },

        // Stats & Points
        stats:          { type: StatsSchema, default: () => ({}) },
        statPoints:     { type: Number, default: 0, min: 0 },
        skillPoints:    { type: Number, default: 0, min: 0 },
        skills:         { type: [String], default: []          }, // unlocked skills

        // Alignment & Karma
        karma:          { type: Number, default: 0             }, // + = Light, - = Dark
        alignment:      { type: String, default: 'Neutral',
                          enum: ['Light', 'Neutral', 'Dark', 'Chaos'] },

        // Survival
        hunger:         { type: Number, default: 100, min: 0, max: 100 }, // % full
        thirst:         { type: Number, default: 100, min: 0, max: 100 },
        isJailed:       { type: Boolean, default: false        },
        jailUntil:      { type: Date,    default: null         },
        isHospitalized: { type: Boolean, default: false        },
        hospitalUntil:  { type: Date,    default: null         },

        // World & Location
        locationId:     { type: String, default: 'starter_town' },
        homeLocation:   { type: String, default: 'starter_town' },
        waypoints:      { type: [String], default: []          },
        territoriesOwned: { type: [String], default: []        },

        // Combat
        combat:         { type: CombatSchema, default: () => ({}) },

        // Shadows (Solo Leveling mechanic)
        shadows:        { type: [ShadowSchema], default: []    },
        pets:           { type: [PetSchema],   default: []    }, // active/stored pets
        maxPets:        { type: Number, default: 3              }, // max active pets
        quests:         { type: QuestSchema, default: () => ({}) }, // quest tracking
        // ── World travel ──────────────────────────────────────────────────
        currentWorld:       { type: String, default: 'aevoria'        },
        lastWorldTravel:    { type: Date,   default: null             }, // cooldown
        worldQuestProgress: { type: Map, of: WorldProgressSchema, default: {} },
        worldQuestsComplete:{ type: [String], default: []             },
        worldQuestsClaimable:{ type: [String], default: []            },
        shadowCount:    { type: Number, default: 0             },
        maxShadows:     { type: Number, default: 5             },

        // Bloodline
        bloodline:      { type: String, default: 'Common'      },
        bloodlineRank:  { type: String, default: 'F'           },
        // ── World / identity ──────────────────────────────────────────────
        birthYear:      { type: Number, default: null          }, // Aevoria year born
        immortal:       { type: Boolean, default: false        }, // stops aging at 1000
        gender:         { type: String, default: null          }, // male/female/other
        currentWorld:   { type: String, default: 'Aevoria'     }, // future multi-world
        // ── Roles ─────────────────────────────────────────────────────────
        jobRole:        { type: String, default: null          }, // warrior/mage/ranger etc
        specialRole:    { type: String, default: null          }, // sovereign/moonborn etc
        bloodmoonsSeen: { type: Number, default: 0             }, // for moonborn unlock
        lastRoleChange: { type: Date,   default: null          }, // cooldown on role change
        deathStreak:    { type: Number, default: 0             }, // consecutive deaths
        lastDeathTime:  { type: Date,   default: null          }, // for streak tracking
        dailyStreak:    { type: Number, default: 0             }, // consecutive daily claims
        lastActiveChat: { type: String, default: null          }, // for notifications
        rpgBanned:      { type: Boolean, default: false         }, // banned from RPG
        activeBoosts:   { type: mongoose.Schema.Types.Mixed, default: {} }, // timed boosts

        // Social
        guild:          { type: GuildSchema, default: () => ({}) },
        marriage:       { type: MarriageSchema, default: () => ({}) },
        friends:        { type: [String], default: []          },
        party:          { type: String, default: null          }, // party leader JID
        mentor:         { type: String, default: null          },
        apprentices:    { type: [String], default: []          },

        // Economy
        job:            { type: String, default: null          },
        bounty:         { type: Number, default: 0             },
        taxRate:        { type: Number, default: 0.05          },
        stocks:         { type: StocksSchema, default: () => ({}) },

        // Inventory
        inventory:      { type: InventorySchema, default: () => ({}) },

        // Achievements & Titles
        achievements:   { type: AchievementsSchema, default: () => ({}) },

        // Cooldowns (stored in DB so they survive restarts)
        cooldowns:      { type: CooldownSchema, default: () => ({}) },

        // Admin / System flags
        isBanned:       { type: Boolean, default: false        },
        isMaintenanced: { type: Boolean, default: false        },
        bannedUntil:    { type: Date,    default: null         },
    },
    {
        timestamps:  true,
        versionKey:  false,
    }
);

// Indexes
GlobalPlayerSchema.index({ level: -1, exp: -1 });
GlobalPlayerSchema.index({ karma: -1 });
GlobalPlayerSchema.index({ gold: -1 });
GlobalPlayerSchema.index({ 'guild.guildId': 1 });

// ─── Static: getOrCreate ──────────────────────────────────────────────────────
GlobalPlayerSchema.statics.getOrCreate = async function (jid, botId = '') {
    return this.findOneAndUpdate(
        { jid },
        { $setOnInsert: { jid, lastBotUsed: botId } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

const GlobalPlayer = mongoose.model('GlobalPlayer', GlobalPlayerSchema);

// ─── Guild Schema ─────────────────────────────────────────────────────────────
const GuildDocSchema = new mongoose.Schema(
    {
        guildId:    { type: String, required: true, unique: true },
        name:       { type: String, required: true               },
        masterId:   { type: String, required: true               }, // JID of guild master
        members:    { type: [String], default: []                },
        vault: {
            gold:     { type: Number, default: 0 },
            diamonds: { type: Number, default: 0 },
        },
        level:      { type: Number, default: 1  },
        exp:        { type: Number, default: 0  },
        territory:  { type: [String], default: [] },
        wars:       { type: Number, default: 0  },
        wins:       { type: Number, default: 0  },
        maxMembers: { type: Number, default: 20 }, // scales with level
        description:{ type: String, default: '' },
        currentWorld:{ type: String, default: 'aevoria' }, // guild home world
        emblem:     { type: String, default: '⚔️' }, // guild emoji
    },
    { timestamps: true, versionKey: false }
);

const Guild = mongoose.model('Guild', GuildDocSchema);

// ─── World Events Schema ──────────────────────────────────────────────────────
const WorldEventSchema = new mongoose.Schema(
    {
        eventId:    { type: String, required: true, unique: true },
        name:       { type: String, required: true               },
        type:       { type: String, enum: ['boss', 'raid', 'festival', 'war', 'rift'] },
        active:     { type: Boolean, default: true               },
        startedBy:  { type: String                               }, // JID of origin who started it
        endsAt:     { type: Date                                 },
        rewards: {
            gold:     { type: Number, default: 0 },
            diamonds: { type: Number, default: 0 },
            exp:      { type: Number, default: 0 },
            crystals: { type: Number, default: 0 },
        },
        participants: { type: [String], default: []              },
    },
    { timestamps: true, versionKey: false }
);

const WorldEvent = mongoose.model('WorldEvent', WorldEventSchema);

module.exports = { GlobalPlayer, Guild, WorldEvent };

// ─── Username/LID lookup helpers ──────────────────────────────────────────────

/**
 * Find a player by JID, LID, or username (case-insensitive).
 * Use this everywhere instead of findOne({ jid }) so username lookups work.
 */
GlobalPlayer.findByIdentifier = async function (identifier) {
    if (!identifier) return null;
    return GlobalPlayer.findOne({
        $or: [
            { jid: identifier },
            { lid: identifier },
            { username: new RegExp('^' + identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
        ]
    });
};

/**
 * Check if a username is already taken.
 */
GlobalPlayer.isUsernameTaken = async function (username) {
    return !!(await GlobalPlayer.exists({
        username: new RegExp('^' + username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
    }));
};

/**
 * Get the display name for a player — username first, then phone number.
 */
GlobalPlayer.getDisplayName = function (player) {
    return player.username || player.jid.split('@')[0];
};
