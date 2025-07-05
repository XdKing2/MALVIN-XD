/*
Project Name : MALVIN XD
Creator      : Malvin King ( Mr Lord Malvin )
Repo         : https://github.com/XdKing2/MALVIN-XD
Support      : wa.me/263714757857
*/

const config = require('../settings');
const { malvin } = require('../malvin');
const { runtime } = require('../lib/functions');

const more = String.fromCharCode(8206);
const readMore = more.repeat(4001);

malvin({
    pattern: "support",
    alias: ["follow", "links"],
    desc: "Display support and follow links",
    category: "main",
    react: "📡",
    filename: __filename
}, 
async (conn, mek, m, {
    from, reply, pushname
}) => {
    try {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const uptimeFormatted = runtime(process.uptime());

        const message = `
╭─『 *𝗠𝗔𝗟𝗩𝗜𝗡 𝗫𝗗 - 𝗦𝗨𝗣𝗣𝗢𝗥𝗧* 』─
│ 👤 *Developer* : Mr Malvin 🇿🇼
│ ⚙️ *Mode*      : ${config.MODE}
│ ⏱️ *Uptime*    : ${uptimeFormatted}
│ 💠 *Prefix*    : ${config.PREFIX}
│ 🔖 *Version*   : ${config.version}
│ 🕰️ *Time*      : ${currentTime}
╰─────────────

📢 *Follow & Support MALVIN XD* ${readMore}

🔔 *Official WhatsApp Channel*
🔗 https://whatsapp.com/channel/0029VbB3YxTDJ6H15SKoBv3S

🎬 *YouTube Channel*
🔗 https://youtube.com/@malvintech2

👨‍💻 *Developer Contact*
🔗 wa.me/263714757857?text=Hi%20Malvin,%20I%20need%20support!

> 💡 Powered by *Malvin King*
        `.trim();

        await conn.sendMessage(from, {
            image: { url: 'https://files.catbox.moe/bddvfr.jpg' },
            caption: message,
            contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363402507750390@newsletter',
                    newsletterName: '🪀『 𝙼𝙰𝙻𝚅𝙸𝙽-𝚇ᴅ 』🪀',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

    } catch (e) {
        console.error("Support Cmd Error:", e);
        reply(`⚠️ An error occurred:\n${e.message}`);
    }
});
