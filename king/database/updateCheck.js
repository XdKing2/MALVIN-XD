const { DATABASE } = require('./db');
const { DataTypes } = require('sequelize');

const UpdateDB = DATABASE.define('UpdateInfo', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
        defaultValue: 1,
    },
    commitHash: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    tableName: 'update_info',
    timestamps: false,
    hooks: {
        beforeCreate: (record) => { record.id = 1; },
        beforeBulkCreate: (records) => {
            records.forEach(record => { record.id = 1; });
        },
    },
});

async function initializeUpdateDB() {
    await UpdateDB.sync();
    const [record, created] = await UpdateDB.findOrCreate({
        where: { id: 1 },
        defaults: { commitHash: 'unknown' },
    });
    return record;
}

async function setCommitHash(hash) {
    await initializeUpdateDB();
    const record = await UpdateDB.findByPk(1);
    record.commitHash = hash;
    await record.save();
}

async function getCommitHash() {
    await initializeUpdateDB();
    const record = await UpdateDB.findByPk(1);
    return record ? record.commitHash : 'unknown';
}

module.exports = {
    UpdateDB,
    setCommitHash,
    getCommitHash,
};
