// MALVIN-XD Plugin | tagall.js

const config = require('../settings');
const { malvin } = require('../malvin');
const { getGroupAdmins } = require('../lib/functions');

malvin({
  pattern: "tagall",
  alias: ["gc_tagall"],
  desc: "Tag all group members with a custom or default message.",
  category: "group",
  use: ".tagall [message]",
  react: "📣",
  filename: __filename,
},
async (conn, mek, m, {
  from, isGroup, senderNumber, participants, reply, command, body, groupAdmins
}) => {
  try {
    if (!isGroup) return reply("❌ This command is only for groups.");

    const senderJid = m.sender;
const botOwner = conn.user.id.split(":")[0] + "@s.whatsapp.net";

if (!groupAdmins.includes(senderJid) && senderJid !== botOwner) {
  return reply("🚫 *Only group admins or the bot owner can use this command.*");
}


    const metadata = await conn.groupMetadata(from).catch(() => null);
    if (!metadata) return reply("❌ Failed to retrieve group information.");

    const groupName = metadata.subject || "Group";
    const totalMembers = participants?.length || 0;
    if (!totalMembers) return reply("❌ No members found to tag.");

    const emojis = ['📢', '🔊', '🌐', '🔰', '💬', '🛡️', '🎉', '🚀', '🔥', '🪩', '🎧', '📦', '📣', '⚡'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    const msg = body.slice(body.indexOf(command) + command.length).trim() || "Hello everyone!";

    let text = `╭───❖ *Group Broadcast* ❖───⬣
│ 🏷️ *Group*: ${groupName}
│ 👥 *Members*: ${totalMembers}
│ 💬 *Message*: ${msg}
╰────────────⬣

┌─⟪ *Tagged Members* ⟫\n`;

    for (const member of participants) {
      if (member?.id) {
        text += `${emoji} @${member.id.split("@")[0]}\n`;
      }
    }

    text += "└──✪ *MALVIN-XD BOT* ✪──";

    await conn.sendMessage(from, {
      text: text,
      mentions: participants.map(u => u.id)
    }, { quoted: mek });

  } catch (err) {
    console.error("TagAll Error:", err);
    reply(`❌ *Something went wrong:* ${err.message || err}`);
  }
});
