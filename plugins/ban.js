const fs = require("fs");
const path = require("path");
const { malvin } = require("../malvin");

malvin({
    pattern: "ban",
    alias: ["blockuser", "addban"],
    desc: "Ban a user from using the bot",
    category: "owner",
    react: "⛔",
    filename: __filename
}, async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("_❗Only the bot owner can use this command!_");

        let target = m.mentionedJid?.[0] 
            || (m.quoted?.sender ?? null)
            || (args[0]?.replace(/[^0-9]/g, '') + "@s.whatsapp.net");

        if (!target) return reply("❌ Please provide a number or tag/reply a user.");

        let banned = JSON.parse(fs.readFileSync("./lib/ban.json", "utf-8"));

        if (banned.includes(target)) {
            return reply("❌ This user is already banned.");
        }

        banned.push(target);
        fs.writeFileSync("./lib/ban.json", JSON.stringify([...new Set(banned)], null, 2));

        await conn.sendMessage(from, {
            image: { url: "https://files.catbox.moe/01f9y1.jpg" },
            caption: `⛔ User has been banned from using the bot.`
        }, { quoted: mek });

    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});

malvin({
    pattern: "unban",
    alias: ["removeban"],
    desc: "Unban a user",
    category: "owner",
    react: "✅",
    filename: __filename
}, async (conn, mek, m, { from, args, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("_❗Only the bot owner can use this command!_");

        let target = m.mentionedJid?.[0] 
            || (m.quoted?.sender ?? null)
            || (args[0]?.replace(/[^0-9]/g, '') + "@s.whatsapp.net");

        if (!target) return reply("❌ Please provide a number or tag/reply a user.");

        let banned = JSON.parse(fs.readFileSync("./lib/ban.json", "utf-8"));

        if (!banned.includes(target)) {
            return reply("❌ This user is not banned.");
        }

        const updated = banned.filter(u => u !== target);
        fs.writeFileSync("./lib/ban.json", JSON.stringify(updated, null, 2));

        await conn.sendMessage(from, {
            image: { url: "https://files.catbox.moe/01f9y1.jpg" },
            caption: `✅ User has been unbanned.`
        }, { quoted: mek });

    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});

malvin({
    pattern: "listban",
    alias: ["banlist", "bannedusers"],
    desc: "List all banned users",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("_❗Only the bot owner can use this command!_");

        let banned = JSON.parse(fs.readFileSync("./lib/ban.json", "utf-8"));
        banned = [...new Set(banned)];

        if (banned.length === 0) return reply("✅ No banned users found.");

        let msg = "`⛔ Banned Users:`\n\n";
        banned.forEach((id, i) => {
            msg += `${i + 1}. ${id.replace("@s.whatsapp.net", "")}\n`;
        });

        await conn.sendMessage(from, {
            image: { url: "https://files.catbox.moe/qumhu4.jpg" },
            caption: msg
        }, { quoted: mek });
    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});
