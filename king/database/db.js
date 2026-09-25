const config = require("../../config");
const Sequelize = require("sequelize");
const fs = require("fs");
const path = require("path");

class DatabaseManager {
    static instance = null;

    static getInstance() {
        if (!DatabaseManager.instance) {
            const DATABASE_URL = config.DATABASE_URL;
            const DEFAULT_SQLITE_PATH = path.join(__dirname, "database.db");

            if (!DATABASE_URL) {
                console.log("💡 DATABASE_URL Empty, Using Path");
                const dbDir = path.dirname(DEFAULT_SQLITE_PATH);
                if (!fs.existsSync(dbDir)) {
                    fs.mkdirSync(dbDir, { recursive: true });
                }

                DatabaseManager.instance = new Sequelize({
                    dialect: "sqlite",
                    storage: DEFAULT_SQLITE_PATH,
                    logging: false,
                    pool: {
                        max: 1,
                        min: 0,
                        acquire: 30000,
                        idle: 10000,
                    },
                    retry: {
                        max: 5,
                    },
                    dialectOptions: {
                        busyTimeout: 30000,
                    },
                });
            } else {
                DatabaseManager.instance = new Sequelize(DATABASE_URL, {
                    dialect: "postgres",
                    ssl: true,
                    protocol: "postgres",
                    dialectOptions: {
                        native: true,
                        ssl: { require: true, rejectUnauthorized: false },
                    },
                    logging: false,
                });
            }
        }
        return DatabaseManager.instance;
    }
}

const DATABASE = DatabaseManager.getInstance();

async function syncDatabase() {
    try {
        await DATABASE.sync();
        console.log("Database Synchronized.✅️");
    } catch (error) {
        console.error("Error synchronizing the database:", error);
        throw error;
    }
}

module.exports = { DATABASE, syncDatabase };
