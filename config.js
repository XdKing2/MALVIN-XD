const fs = require("fs-extra");
if (fs.existsSync(".env"))
    require("dotenv").config({ path: __dirname + "/.env", quiet: true });

module.exports = {
    MODE: process.env.MODE,
    OWNER_NAME: process.env.OWNER_NAME,
    OWNER_NUMBER: process.env.OWNER_NUMBER, 
    SESSION_ID: process.env.SESSION_ID,
    TIME_ZONE: process.env.TIME_ZONE,
    AUTO_READ_STATUS: process.env.AUTO_READ_STATUS,
    AUTO_LIKE_STATUS: process.env.AUTO_LIKE_STATUS,
    DATABASE_URL: process.env.DATABASE_URL, // Postress(Get one for free from neon.tech/supabase/render/heroku builtin postgress)...will fallback to path: ./king/database/database.db if not provided
    MALVIN_API_KEY: process.env.MALVIN_API_KEY, // Get your free key at https://api.malvin.gleeze.com (sign up, key is on your dashboard)
};

let fileName = require.resolve(__filename);
fs.watchFile(fileName, () => {
    fs.unwatchFile(fileName);
    console.log(`Writing File: ${__filename}`);
    delete require.cache[fileName];
    require(fileName);
});
