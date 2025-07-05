const { getInactiveUsers } = require('../lib/activityTracker');
const config = require('../settings')
const { malvin, commands } = require('../malvin')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('../lib/functions')

malvin({
  pattern: "taginactive",
  desc: "Tag users inactive for more than 7 days.",
  category: "group",
  react: "⏳",
  filename: __filename,
},
async (conn, mek, m, { from, isGroup, participants, reply }) => {
  if (!isGroup) return reply("❌ Group only.");

  const inactiveIds = getInactiveUsers(7);
  const inactive = participants.filter(p => inactiveIds.includes(p.id));

  if (!inactive.length) return reply("✅ No inactive users found.");

  let teks = `⏳ *INACTIVE MEMBERS*\nDetected users inactive for 7+ days:\n\n`;
  for (const u of inactive) teks += `⚠️ @${u.id.split("@")[0]}\n`;

  conn.sendMessage(from, { text: teks, mentions: inactive.map(p => p.id) }, { quoted: mek });
});
