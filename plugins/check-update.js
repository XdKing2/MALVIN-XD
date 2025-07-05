const axios = require('axios');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { malvin, commands } = require('../malvin');
const { runtime } = require('../lib/functions');

malvin({
  pattern: 'version',
  alias: ['changelog', 'cupdate', 'checkupdate'],
  react: '🚀',
  desc: 'Check bot version, system info, and update status.',
  category: 'owner',
  filename: __filename
}, async (conn, mek, m, { from, pushname, reply }) => {
  try {
    // Local version data
    const versionPath = path.join(__dirname, '../data/version.json');
    let localVersion = 'Unknown';
    let changelog = 'No changelog found.';
    if (fs.existsSync(versionPath)) {
      const data = JSON.parse(fs.readFileSync(versionPath));
      localVersion = data.version;
      changelog = data.changelog || changelog;
    }

    // Remote version data
    const repoRawURL = 'https://raw.githubusercontent.com/XdKing2/MALVIN-XD/main/data/version.json';
    let latestVersion = 'Unknown';
    let latestChangelog = 'Not available';
    try {
      const { data } = await axios.get(repoRawURL);
      latestVersion = data.version || latestVersion;
      latestChangelog = data.changelog || latestChangelog;
    } catch (err) {
      console.warn('🔸 Could not fetch latest version info.');
    }

    // Stats
    const pluginCount = fs.readdirSync(path.join(__dirname, '../plugins')).filter(f => f.endsWith('.js')).length;
    const commandCount = commands.length;
    const uptime = runtime(process.uptime());
    const ram = process.memoryUsage().heapUsed / 1024 / 1024;
    const totalRam = os.totalmem() / 1024 / 1024;
    const hostname = os.hostname();
    const lastUpdated = fs.statSync(versionPath).mtime.toLocaleString();

    const updateStatus = localVersion !== latestVersion
      ? `🔄 *Update Available!*\n👉 *Current:* ${localVersion}\n👉 *Latest:* ${latestVersion}\n\nUse *.update* to upgrade.`
      : `✅ Your MALVIN-XD bot is up-to-date!`;

    const caption = `
╭──〔 *MALVIN-XD STATUS* 〕─

🧑‍💻 ᴜsᴇʀ: *${pushname}*
📍 ʜᴏsᴛ: *${hostname}*
🕒 ᴜᴘᴛɪᴍᴇ: *${uptime}*

╭─💾 *Sʏsᴛᴇᴍ* ─
├ RAM: *${ram.toFixed(2)}MB / ${totalRam.toFixed(2)}MB*
├ Pʟᴜɢɪɴs: *${pluginCount}*
├ Cᴏᴍᴍᴀɴᴅs: *${commandCount}*
╰─────────

╭─📦 *Vᴇʀsɪᴏɴs* ─
├📍 Lᴏᴄᴀʟ: *${localVersion}*
├🆕️ Lᴀᴛᴇsᴛ: *${latestVersion}*
╰──────────

📅 *Last Local Update:* ${lastUpdated}
📜 *Changelog:* ${latestChangelog}

📎 *Repo:* https://github.com/XdKing2/MALVIN-XD
👑 *Owner:* https://github.com/XdKing2

${updateStatus}
`.trim();

    await conn.sendMessage(from, {
      image: { url: 'https://files.catbox.moe/01f9y1.jpg' },
      caption,
      contextInfo: {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363402507750390@newsletter',
          newsletterName: 'Malvin King',
          serverMessageId: 143
        }
      }
    }, { quoted: mek });

  } catch (error) {
    console.error('Version error:', error);
    reply('❌ Error while checking version info.');
  }
});
