const { DATABASE } = require("./db");
const { DataTypes } = require("sequelize");
const { globalLidMapping } = require("mrxd-baileys/lib/Utils/lid-mapping");

const LidMappingDB = DATABASE.define(
    "LidMapping",
    {
        lid: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        jid: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        tableName: "lid_mapping",
        timestamps: true,
    },
);

async function syncLidMappingTable() {
    await LidMappingDB.sync();
}

async function loadPersistedLidMappings() {
    try {
        await syncLidMappingTable();
        const rows = await LidMappingDB.findAll();
        let count = 0;
        for (const row of rows) {
            globalLidMapping.set(row.lid, row.jid);
            count++;
        }
        if (count > 0) {
            console.log(`✅ Loaded ${count} persisted LID mappings into globalLidMapping`);
        }
    } catch (err) {
        console.error("Failed to load persisted LID mappings:", err.message);
    }
}

async function persistLidMapping(lid, jid) {
    try {
        if (!lid || !jid) return;
        if (!lid.endsWith("@lid") || !jid.endsWith("@s.whatsapp.net")) return;
        await LidMappingDB.upsert({ lid, jid });
    } catch (err) {
    }
}

async function getLidMappingFromDb(lid) {
    try {
        if (!lid || !lid.endsWith("@lid")) return null;
        await syncLidMappingTable();
        const row = await LidMappingDB.findOne({ where: { lid } });
        return row ? row.jid : null;
    } catch (err) {
        return null;
    }
}

module.exports = { loadPersistedLidMappings, persistLidMapping, getLidMappingFromDb };
