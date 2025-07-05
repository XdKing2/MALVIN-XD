const config = require('../settings');
const { malvin } = require('../malvin');

const stylizedChars = {
  a: '🅐', b: '🅑', c: '🅒', d: '🅓', e: '🅔', f: '🅕', g: '🅖',
  h: '🅗', i: '🅘', j: '🅙', k: '🅚', l: '🅛', m: '🅜', n: '🅝',
  o: '🅞', p: '🅟', q: '🅠', r: '🅡', s: '🅢', t: '🅣', u: '🅤',
  v: '🅥', w: '🅦', x: '🅧', y: '🅨', z: '🅩',
  '0': '⓿', '1': '➊', '2': '➋', '3': '➌', '4': '➍',
  '5': '➎', '6': '➏', '7': '➐', '8': '➑', '9': '➒'
};

malvin({
  pattern: "channelreact",
  alias: ["creact", "chr"],
  react: "🔤",
  desc: "Stylized emoji reaction to channel messages",
  category: "owner",
  use: '.chr <channel-link> <text>',
  filename: __filename
}, async (conn, mek, m, {
  q, command, isCreator, reply
}) => {
  try {
    if (!isCreator) return reply("🚫 *Owner-only command*");

    if (!q) return reply(`⚠️ *Usage:*\n${command} https://whatsapp.com/channel/<id>/<msg-id> <text>`);

    const [link, ...textParts] = q.trim().split(' ');
    const inputText = textParts.join(' ').toLowerCase();

    if (!link.includes("whatsapp.com/channel/") || textParts.length === 0)
      return reply("❌ *Invalid link or missing text!*");

    const urlSegments = link.split('/');
    const channelId = urlSegments[4];
    const messageId = urlSegments[5];

    if (!channelId || !messageId) return reply("❎ *Link missing channel or message ID.*");

    // Stylize the text
    const emoji = inputText.split('').map(char => {
      if (char === ' ') return '―';
      return stylizedChars[char] || char;
    }).join('');

    // Fetch channel info and send the reaction
    const channelMeta = await conn.newsletterMetadata("invite", channelId);
    await conn.newsletterReactMessage(channelMeta.id, messageId, emoji);

    return reply(
`╭━━〔 𝙼𝙰𝙻𝚅𝙸𝙽-𝚇𝙳 ⚡ 〕━⬣
┃✨ *Reaction sent successfully!*
┃📡 *Channel:* ${channelMeta.name}
┃💬 *Reaction:* ${emoji}
╰──────────────⬣
> 🔗 *Powered by MALVIN-XD* 🔥`
    );
  } catch (e) {
    console.error(e);
    return reply(`⚠️ *Error:* ${e.message || "An unexpected error occurred."}`);
  }
});
