const { malvin ,commands } = require('../malvin');
const { exec } = require('child_process');
const config = require('../settings');
const {sleep} = require('../lib/functions')
// 1. Shutdown Bot
malvin({
    pattern: "shutdown",
    desc: "Shutdown the bot.",
    category: "owner",
    react: "🛑",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    reply("🛑 Shutting down...").then(() => process.exit());
});
// 2. Broadcast Message to All Groups
malvin({
    pattern: "broadcast",
    desc: "Broadcast a message to all groups.",
    category: "owner",
    react: "📢",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, args, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    if (args.length === 0) return reply("📢 Please provide a message to broadcast.");
    const message = args.join(' ');
    const groups = Object.keys(await conn.groupFetchAllParticipating());
    for (const groupId of groups) {
        await conn.sendMessage(groupId, { text: message }, { quoted: mek });
    }
    reply("📢 Message broadcasted to all groups.");
});
// 3. Set Profile Picture
malvin({
    pattern: "setpp",
    desc: "Set bot profile picture.",
    category: "owner",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, quoted, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    if (!quoted || !quoted.message.imageMessage) return reply("❌ Please reply to an image.");
    try {
        const media = await conn.downloadMediaMessage(quoted);
        await conn.updateProfilePicture(conn.user.jid, { url: media });
        reply("🖼️ Profile picture updated successfully!");
    } catch (error) {
        reply(`❌ Error updating profile picture: ${error.message}`);
    }
});

// 6. Clear All Chats
malvin({
    pattern: "clearchats",
    desc: "Clear all chats from the bot.",
    category: "owner",
    react: "🧹",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    try {
        const chats = conn.chats.all();
        for (const chat of chats) {
            await conn.modifyChat(chat.jid, 'delete');
        }
        reply("🧹 All chats cleared successfully!");
    } catch (error) {
        reply(`❌ Error clearing chats: ${error.message}`);
    }
});

// 8. Group JIDs List
malvin({
    pattern: "gjid",
    desc: "Get the list of JIDs for all groups the bot is part of.",
    category: "owner",
    react: "📝",
    filename: __filename
},
async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("❌ You are not the owner!");
    const groups = await conn.groupFetchAllParticipating();
    const groupJids = Object.keys(groups).join('\n');
    reply(`📝 *Group JIDs:*\n\n${groupJids}`);
});


// delete 
malvin({
    pattern: "delete",
    alias: ["del"],
    desc: "Delete replied message (works in group & private)",
    category: "group",
    use: ".del (as reply)",
    react: "❌",
    filename: __filename
},
async (conn, mek, m, {
    from, quoted, isGroup, isAdmins, isBotAdmins, isOwner, reply
}) => {
    try {
        // Check if the user replied to a message
        if (!m.quoted) return reply("⚠️ Please *reply* to the message you want to delete using `.del`");

        // Group-specific admin checks
        if (isGroup) {
            if (!isOwner && !isAdmins) return reply("🚫 Only *group admins* can use this command in groups.");
            if (!isBotAdmins) return reply("🤖 I need *admin rights* to delete messages in this group.");
        }

        // Build key for deletion
        const key = {
            remoteJid: m.chat,
            fromMe: false,
            id: m.quoted.id,
            participant: m.quoted.sender
        };

        // Delete the message
        await conn.sendMessage(m.chat, { delete: key });

    } catch (e) {
        console.error("❌ Delete Error:", e);
        reply("❌ Couldn't delete the message. It might be too old or already deleted.");
    }
});
