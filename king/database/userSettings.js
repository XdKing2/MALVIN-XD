/**
 * king/database/userSettings.js
 * Generic per-user key/value settings store — mirrors groupSettings.js
 * but keyed by userJid instead of groupJid. Used for things like a
 * user's personal language preference that shouldn't require RPG
 * registration to exist.
 */
const { DATABASE } = require("./db");
const { DataTypes } = require("sequelize");

const UserSettingsDB = DATABASE.define(
    "UserSettings",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userJid: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: false,
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: false,
        },
        value: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: "user_settings",
        timestamps: true,
        indexes: [
            { fields: ["userJid", "key"] },
        ],
    },
);

const USER_SETTING_DEFAULTS = {
    LANGUAGE: "", // empty = no personal override, falls back to group/global
};

async function initializeUserSettings() {
    try {
        await UserSettingsDB.sync({ alter: true });
        console.log("✅ User Settings Initialized.");
    } catch (error) {
        if (error.original?.code === 'SQLITE_ERROR' && error.original?.message?.includes('already exists')) {
            console.log("✅ User Settings Initialized.");
        } else {
            throw error;
        }
    }
}

async function getUserSetting(userJid, key) {
    const record = await UserSettingsDB.findOne({
        where: { userJid, key },
    });

    if (record) {
        return record.value;
    }

    return USER_SETTING_DEFAULTS[key] ?? "";
}

async function setUserSetting(userJid, key, value) {
    try {
        const existing = await UserSettingsDB.findOne({ where: { userJid, key } });

        if (existing) {
            existing.value = value;
            await existing.save();
        } else {
            await UserSettingsDB.create({ userJid, key, value });
        }

        return true;
    } catch (error) {
        console.error(`[setUserSetting] Error: ${error.message}`);
        throw error;
    }
}

module.exports = {
    UserSettingsDB,
    USER_SETTING_DEFAULTS,
    initializeUserSettings,
    getUserSetting,
    setUserSetting,
};
