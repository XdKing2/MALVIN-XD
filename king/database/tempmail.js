const { DATABASE } = require('./db');
const { DataTypes, Op } = require('sequelize');

const EXPIRY_MINUTES = 10;

const TempMailDB = DATABASE.define('TempMail', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userJid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'temp_mails',
    timestamps: true,
});

async function initTempMailDB() {
    await TempMailDB.sync();
    cleanupExpiredEmails();
}

async function cleanupExpiredEmails() {
    try {
        const expiryTime = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000);
        const deleted = await TempMailDB.destroy({
            where: {
                createdAt: { [Op.lt]: expiryTime }
            }
        });
        if (deleted > 0) {
            console.log(`[TempMail] Auto-deleted ${deleted} expired email(s)`);
        }
    } catch (e) {
        console.error("[TempMail] Cleanup error:", e.message);
    }
}

setInterval(cleanupExpiredEmails, 60 * 1000);

async function setUserEmail(userJid, email) {
    await initTempMailDB();
    const existing = await TempMailDB.findOne({ where: { userJid } });
    if (existing) {
        existing.email = email;
        existing.createdAt = new Date();
        await existing.save();
        return existing;
    }
    return await TempMailDB.create({ userJid, email });
}

async function getUserEmailWithExpiry(userJid) {
    await initTempMailDB();
    const record = await TempMailDB.findOne({ where: { userJid } });
    
    if (!record) return null;
    
    const createdAt = new Date(record.createdAt);
    const expiresAt = new Date(createdAt.getTime() + EXPIRY_MINUTES * 60 * 1000);
    const now = new Date();
    
    if (now >= expiresAt) {
        await TempMailDB.destroy({ where: { userJid } });
        return null;
    }
    
    const remainingMs = expiresAt - now;
    const remainingMins = Math.floor(remainingMs / 60000);
    const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
    
    return {
        email: record.email,
        createdAt: createdAt,
        expiresAt: expiresAt,
        remainingMs: remainingMs,
        remainingMins: remainingMins,
        remainingSecs: remainingSecs,
        timeRemaining: remainingMins > 0 ? `${remainingMins}m ${remainingSecs}s` : `${remainingSecs}s`
    };
}

async function getUserEmail(userJid) {
    const data = await getUserEmailWithExpiry(userJid);
    return data ? data.email : null;
}

async function deleteUserEmail(userJid) {
    await initTempMailDB();
    const result = await TempMailDB.destroy({ where: { userJid } });
    return result > 0;
}

module.exports = {
    initTempMailDB,
    setUserEmail,
    getUserEmail,
    getUserEmailWithExpiry,
    deleteUserEmail,
    cleanupExpiredEmails,
    TempMailDB,
    EXPIRY_MINUTES,
};
