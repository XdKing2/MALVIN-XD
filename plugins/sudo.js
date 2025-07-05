const fs = require("fs");
const path = require("path");
const { malvin } = require("../malvin");

const OWNER_PATH = path.join(__dirname, "../lib/sudo.json");

// Ensure the sudo.json file exists
const ensureOwnerFile = () => {
  if (!fs.existsSync(OWNER_PATH)) {
    fs.writeFileSync(OWNER_PATH, JSON.stringify([]));
  }
};

// Command: Add a temporary owner
malvin({
    pattern: "setsudo",
    alias: ["addsudo", "addowner","sudo"],
    desc: "Add a temporary owner",
    category: "owner",
    react: "🎭",
    filename: __filename
}, async (conn, mek, m, { from, args, q, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("_❗This Command Can Only Be Used By My Owner!_");

        // Identify the target user
        let target = m.mentionedJid?.[0] 
            || (m.quoted?.sender ?? null)
            || (args[0]?.replace(/[^0-9]/g, '') + "@s.whatsapp.net");

        if (!target) return reply("❌ Please provide a number or tag/reply a user.");

        let owners = JSON.parse(fs.readFileSync(OWNER_PATH, "utf-8"));

        if (owners.includes(target)) {
            return reply("❌ This user is already a temporary owner.");
        }

        owners.push(target);
        const uniqueOwners = [...new Set(owners)];
        fs.writeFileSync(OWNER_PATH, JSON.stringify(uniqueOwners, null, 2));

        const successMsg = "✅ Successfully Added User As Temporary Owner";
        await conn.sendMessage(from, {
            image: { url: "https://files.catbox.moe/qumhu4.jpg" },
            caption: successMsg
        }, { quoted: mek });
    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});

// Command: Remove a temporary owner
malvin({
    pattern: "delsudo",
    alias: ["delowner", "deletesudo"],
    desc: "Remove a temporary owner",
    category: "owner",
    react: "🫩",
    filename: __filename
}, async (conn, mek, m, { from, args, q, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("_❗This Command Can Only Be Used By My Owner!_");

        let target = m.mentionedJid?.[0] 
            || (m.quoted?.sender ?? null)
            || (args[0]?.replace(/[^0-9]/g, '') + "@s.whatsapp.net");

        if (!target) return reply("❌ Please provide a number or tag/reply a user.");

        let owners = JSON.parse(fs.readFileSync(OWNER_PATH, "utf-8"));

        if (!owners.includes(target)) {
            return reply("❌ User not found in owner list.");
        }

        const updated = owners.filter(x => x !== target);
        fs.writeFileSync(OWNER_PATH, JSON.stringify(updated, null, 2));

        const successMsg = "✅ Successfully Removed User As Temporary Owner";
        await conn.sendMessage(from, {
            image: { url: "https://files.catbox.moe/qumhu4.jpg" },
            caption: successMsg
        }, { quoted: mek });
    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});

// Command: List all temporary owners
malvin({
    pattern: "listsudo",
    alias: ["listowner"],
    desc: "List all temporary owners",
    category: "owner",
    react: "📋",
    filename: __filename
}, async (conn, mek, m, { from, isCreator, reply }) => {
    try {
        if (!isCreator) return reply("_❗This Command Can Only Be Used By My Owner!_");

        let owners = JSON.parse(fs.readFileSync(OWNER_PATH, "utf-8"));
        owners = [...new Set(owners)];

        if (owners.length === 0) {
            return reply("❌ No temporary owners found.");
        }

        let listMessage = "`🤴 List of Sudo Owners:`\n\n";
        owners.forEach((owner, i) => {
            listMessage += `${i + 1}. ${owner.replace("@s.whatsapp.net", "")}\n`;
        });

        await conn.sendMessage(from, {
            image: { url: "https://files.catbox.moe/qumhu4.jpg" },
            caption: listMessage
        }, { quoted: mek });
    } catch (err) {
        console.error(err);
        reply("❌ Error: " + err.message);
    }
});
                
