


const { malvin } = require('../malvin');

const config = require('../settings');

const { setPrefix } = require('../lib/prefix');

malvin({

  pattern: "setprefix",

  alias: ["prefix"],

  react: "🔧",

  desc: "Change the bot's command prefix.",

  category: "settings",

  filename: __filename,

}, async (conn, mek, m, { args, isCreator, reply }) => {

  if (!isCreator) return reply("*📛 Only the owner can use this command!*");

  const newPrefix = args[0];

  if (!newPrefix) return reply("❌ Provide new prefix. Example: `.setprefix !`");

  setPrefix(newPrefix); // updates without reboot

  return reply(`✅ Prefix updated to *${newPrefix}* — no restart needed.`);

});



  