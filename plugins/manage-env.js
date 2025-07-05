//---------------------------------------------------------------------------
//           MALVIN-XD 
//---------------------------------------------------------------------------
//  ⚠️ DO NOT MODIFY THIS FILE ⚠️  
//---------------------------------------------------------------------------
const { malvin, commands } = require('../malvin');
const config = require('../settings');
const prefix = config.PREFIX;
const fs = require('fs');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, sleep, fetchJson } = require('../lib/functions2');
const { writeFileSync } = require('fs');
const path = require('path');

malvin({
    pattern: "admin-events",
    alias: ["adminevents"],
    desc: "Enable or disable admin event notifications",
    category: "settings",
    filename: __filename
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    if (status === "on") {
        config.ADMIN_EVENTS = "true";
        return reply("✅ Admin event notifications are now enabled.");
    } else if (status === "off") {
        config.ADMIN_EVENTS = "false";
        return reply("❌ Admin event notifications are now disabled.");
    } else {
        return reply(`Example: .admin-events on`);
    }
});

malvin({
    pattern: "faketyping",
    alias: ["faketyping"],
    desc: "Enable or disable fake typing of status",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isOwner, reply }) => {
    if (!isOwner) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Default value for FAKE_TYPING is "false"
    if (args[0] === "on") {
        config.FAKE_TYPING = "true";
        return reply("Fake Typing is now enabled.");
    } else if (args[0] === "off") {
        config.FAKE_TYPING = "false";
        return reply("fake typing is now disabled.");
    } else {
        return reply(`Example: .faketyping on`);
    }
});

//--------------------------------------------
//  FAKE RECORDING COMMANDS
//--------------------------------------------

malvin({
    pattern: "fakerecording",
    alias: ["fakerecording"],
    desc: "Enable or disable fake recording of statuses",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isOwner, reply }) => {
    if (!isOwner) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Default value for FAKE_RECORDING is "false"
    if (args[0] === "on") {
        config.FAKE_RECORDING = "true";
        return reply("fake recording of status is now enabled.");
    } else if (args[0] === "off") {
        config.FAKE_RECORDING = "false";
        return reply("fake recording of status is now disabled.");
    } else {
        return reply(`Example: .fakerecording on`);
    }
});

malvin({
    pattern: "welcome",
    alias: ["welcomeset"],
    desc: "Enable or disable welcome messages for new members",
    category: "settings",
    filename: __filename
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    if (status === "on") {
        config.WELCOME = "true";
        return reply("✅ Welcome messages are now enabled.");
    } else if (status === "off") {
        config.WELCOME = "false";
        return reply("❌ Welcome messages are now disabled.");
    } else {
        return reply(`Example: .welcome on`);
    }
});



malvin({
    pattern: "mode",
    alias: ["setmode"],
    react: "🫟",
    desc: "Set bot mode to private or public.",
    category: "settings",
    filename: __filename,
}, async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 Only the owner can use this command!*");

    // Si aucun argument n'est fourni, afficher le mode actuel et l'usage
    if (!args[0]) {
        return reply(`📌 Current mode: *${config.MODE}*\n\nUsage: .mode private OR .mode public`);
    }

    const modeArg = args[0].toLowerCase();

    if (modeArg === "private") {
        config.MODE = "private";
        return reply("✅ Bot mode is now set to *PRIVATE*.");
    } else if (modeArg === "public") {
        config.MODE = "public";
        return reply("✅ Bot mode is now set to *PUBLIC*.");
    } else {
        return reply("❌ Invalid mode. Please use `.mode private` or `.mode public`.");
    }
});

malvin({
    pattern: "auto-typing",
    description: "Enable or disable auto-typing feature.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    if (!["on", "off"].includes(status)) {
        return reply("*🫟 ᴇxᴀᴍᴘʟᴇ:  .ᴀᴜᴛᴏ-ᴛʏᴘɪɴɢ ᴏɴ*");
    }

    config.AUTO_TYPING = status === "on" ? "true" : "false";
    return reply(`Auto typing has been turned ${status}.`);
});

//mention reply 


malvin({
    pattern: "mention-reply",
    alias: ["menetionreply", "mee"],
    description: "Set bot status to always online or offline.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.MENTION_REPLY = "true";
        return reply("Mention Reply feature is now enabled.");
    } else if (args[0] === "off") {
        config.MENTION_REPLY = "false";
        return reply("Mention Reply feature is now disabled.");
    } else {
        return reply(`_example:  .mee on_`);
    }
});


//--------------------------------------------
// ALWAYS_ONLINE COMMANDS
//--------------------------------------------
malvin({
    pattern: "always-online",
    alias: ["alwaysonline"],
    desc: "Enable or disable the always online mode",
    category: "settings",
    filename: __filename
},
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    if (status === "on") {
        config.ALWAYS_ONLINE = "true";
        await reply("*✅ always online mode is now enabled.*");
    } else if (status === "off") {
        config.ALWAYS_ONLINE = "false";
        await reply("*❌ always online mode is now disabled.*");
    } else {
        await reply(`*🛠️ ᴇxᴀᴍᴘʟᴇ: .ᴀʟᴡᴀʏs-ᴏɴʟɪɴᴇ ᴏɴ*`);
    }
});

//--------------------------------------------
//  AUTO_RECORDING COMMANDS
//--------------------------------------------
malvin({
    pattern: "auto-recording",
    alias: ["autorecoding"],
    description: "Enable or disable auto-recording feature.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    if (!["on", "off"].includes(status)) {
        return reply("*🫟 ᴇxᴀᴍᴘʟᴇ: .ᴀᴜᴛᴏ-ʀᴇᴄᴏʀᴅɪɴɢ ᴏɴ*");
    }

    config.AUTO_RECORDING = status === "on" ? "true" : "false";
    if (status === "on") {
        await conn.sendPresenceUpdate("recording", from);
        return reply("Auto recording is now enabled. Bot is recording...");
    } else {
        await conn.sendPresenceUpdate("available", from);
        return reply("Auto recording has been disabled.");
    }
});
//--------------------------------------------
// AUTO_VIEW_STATUS COMMANDS
//--------------------------------------------
malvin({
    pattern: "auto-seen",
    alias: ["autostatusview"],
    desc: "Enable or disable auto-viewing of statuses",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Default value for AUTO_VIEW_STATUS is "false"
    if (args[0] === "on") {
        config.AUTO_STATUS_SEEN = "true";
        return reply("Auto-viewing of statuses is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_STATUS_SEEN = "false";
        return reply("Auto-viewing of statuses is now disabled.");
    } else {
        return reply(`*🫟 ᴇxᴀᴍᴘʟᴇ:  .ᴀᴜᴛᴏ-sᴇᴇɴ ᴏɴ*`);
    }
}); 
//--------------------------------------------
// AUTO_LIKE_STATUS COMMANDS
//--------------------------------------------
malvin({
    pattern: "status-react",
    alias: ["statusreaction"],
    desc: "Enable or disable auto-liking of statuses",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Default value for AUTO_LIKE_STATUS is "false"
    if (args[0] === "on") {
        config.AUTO_STATUS_REACT = "true";
        return reply("Auto-liking of statuses is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_STATUS_REACT = "false";
        return reply("Auto-liking of statuses is now disabled.");
    } else {
        return reply(`Example: . status-react on`);
    }
});

//--------------------------------------------
//  READ-MESSAGE COMMANDS
//--------------------------------------------
malvin({
    pattern: "read-message",
    alias: ["autoread"],
    desc: "enable or disable readmessage.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.READ_MESSAGE = "true";
        return reply("readmessage feature is now enabled.");
    } else if (args[0] === "off") {
        config.READ_MESSAGE = "false";
        return reply("readmessage feature is now disabled.");
    } else {
        return reply(`_example:  .readmessage on_`);
    }
});

// AUTO_VOICE

malvin({
    pattern: "auto-voice",
    alias: ["autovoice"],
    desc: "enable or disable readmessage.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_VOICE = "true";
        return reply("AUTO_VOICE feature is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_VOICE = "false";
        return reply("AUTO_VOICE feature is now disabled.");
    } else {
        return reply(`_example:  .autovoice on_`);
    }
});


//--------------------------------------------
//  ANI-BAD COMMANDS
//--------------------------------------------
malvin({
    pattern: "anti-bad",
    alias: ["antibadword"],
    desc: "enable or disable antibad.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.ANTI_BAD_WORD = "true";
        return reply("*anti bad word is now enabled.*");
    } else if (args[0] === "off") {
        config.ANTI_BAD_WORD = "false";
        return reply("*anti bad word feature is now disabled*");
    } else {
        return reply(`_example:  .antibad on_`);
    }
});
//--------------------------------------------
//  AUTO-STICKER COMMANDS
//--------------------------------------------
malvin({
    pattern: "auto-sticker",
    alias: ["autosticker"],
    desc: "enable or disable auto-sticker.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_STICKER = "true";
        return reply("auto-sticker feature is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_STICKER = "false";
        return reply("auto-sticker feature is now disabled.");
    } else {
        return reply(`_example:  .auto-sticker on_`);
    }
});
//--------------------------------------------
//  AUTO-REPLY COMMANDS
//--------------------------------------------
malvin({
    pattern: "auto-reply",
    alias: ["autoreply"],
    desc: "enable or disable auto-reply.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_REPLY = "true";
        return reply("*auto-reply  is now enabled.*");
    } else if (args[0] === "off") {
        config.AUTO_REPLY = "false";
        return reply("auto-reply feature is now disabled.");
    } else {
        return reply(`*🫟 ᴇxᴀᴍᴘʟᴇ: . ᴀᴜᴛᴏ-ʀᴇᴘʟʏ ᴏɴ*`);
    }
});

//--------------------------------------------
//   AUTO-REACT COMMANDS
//--------------------------------------------
malvin({
    pattern: "auto-react",
    alias: ["autoreact"],
    desc: "Enable or disable the autoreact feature",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_REACT = "true";
        await reply("*autoreact feature is now enabled.*");
    } else if (args[0] === "off") {
        config.AUTO_REACT = "false";
        await reply("autoreact feature is now disabled.");
    } else {
        await reply(`*🫟 ᴇxᴀᴍᴘʟᴇ: .ᴀᴜᴛᴏ-ʀᴇᴀᴄᴛ ᴏɴ*`);
    }
});
//--------------------------------------------
//  STATUS-REPLY COMMANDS
//--------------------------------------------
malvin({
    pattern: "status-reply",
    alias: ["autostatusreply"],
    desc: "enable or disable status-reply.",
    category: "settings",
    filename: __filename
},    
async (conn, mek, m, { from, args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const status = args[0]?.toLowerCase();
    // Check the argument for enabling or disabling the anticall feature
    if (args[0] === "on") {
        config.AUTO_STATUS_REPLY = "true";
        return reply("status-reply feature is now enabled.");
    } else if (args[0] === "off") {
        config.AUTO_STATUS_REPLY = "false";
        return reply("status-reply feature is now disabled.");
    } else {
        return reply(`*🫟 ᴇxᴀᴍᴘʟᴇ:  .sᴛᴀᴛᴜs-ʀᴇᴘʟʏ ᴏɴ*`);
    }
});

//--------------------------------------------
//  ANTILINK COMMANDS
//--------------------------------------------

malvin({
  pattern: "antilink",
  alias: ["antilinks"],
  desc: "Enable or disable ANTI_LINK in groups",
  category: "group",
  react: "🚫",
  filename: __filename
}, async (conn, mek, m, { isGroup, isAdmins, isBotAdmins, args, reply }) => {
  try {
    if (!isGroup) return reply('This command can only be used in a group.');
    if (!isBotAdmins) return reply('Bot must be an admin to use this command.');
    if (!isAdmins) return reply('You must be an admin to use this command.');

    if (args[0] === "on") {
      config.ANTI_LINK = "true";
      reply("✅ ANTI_LINK has been enabled.");
    } else if (args[0] === "off") {
      config.ANTI_LINK = "false";
      reply("❌ ANTI_LINK has been disabled.");
    } else {
      reply("Usage: *.antilink on/off*");
    }
  } catch (e) {
    reply(`Error: ${e.message}`);
  }
});

malvin({
  pattern: "antilinkkick",
  alias: ["kicklink"],
  desc: "Enable or disable ANTI_LINK_KICK in groups",
  category: "group",
  react: "⚠️",
  filename: __filename
}, async (conn, mek, m, { isGroup, isAdmins, isBotAdmins, args, reply }) => {
  try {
    if (!isGroup) return reply('This command can only be used in a group.');
    if (!isBotAdmins) return reply('Bot must be an admin to use this command.');
    if (!isAdmins) return reply('You must be an admin to use this command.');

    if (args[0] === "on") {
      config.ANTI_LINK_KICK = "true";
      reply("✅ ANTI_LINK_KICK has been enabled.");
    } else if (args[0] === "off") {
      config.ANTI_LINK_KICK = "false";
      reply("❌ ANTI_LINK_KICK has been disabled.");
    } else {
      reply("Usage: *.antilinkkick on/off*");
    }
  } catch (e) {
    reply(`Error: ${e.message}`);
  }
});


malvin({
  pattern: "deletelink",
  alias: ["linksdelete"],
  desc: "Enable or disable DELETE_LINKS in groups",
  category: "group",
  react: "❌",
  filename: __filename
}, async (conn, mek, m, { isGroup, isAdmins, isBotAdmins, args, reply }) => {
  try {
    if (!isGroup) return reply('This command can only be used in a group.');
    if (!isBotAdmins) return reply('Bot must be an admin to use this command.');
    if (!isAdmins) return reply('You must be an admin to use this command.');

    if (args[0] === "on") {
      config.DELETE_LINKS = "true";
      reply("✅ DELETE_LINKS is now enabled.");
    } else if (args[0] === "off") {
      config.DELETE_LINKS = "false";
      reply("❌ DELETE_LINKS is now disabled.");
    } else {
      reply("Usage: *.deletelink on/off*");
    }
  } catch (e) {
    reply(`Error: ${e.message}`);
  }
});


malvin({
    pattern: "setvar",
    alias: ["envvar", "cmdlist"],
    react: "📜",
    desc: "List all commands and their current status.",
    category: "settings",
    filename: __filename,
}, async (conn, mek, m, { from, isOwner, reply }) => {
    if (!isOwner) return reply("*📛 Only the owner can use this command!*");

    const cmdList = `
    ----------------------------------------
        MALVIN XD V3 SETTINGS 
    -----------------------------------------
 
🔧 *1. Mode*
   - Current Status: ${config.MODE || "public"}
   - Usage: ${config.PREFIX}mode private/public

🎯 *2. Auto Typing*
   - Current Status: ${config.AUTO_TYPING || "off"}
   - Usage: ${config.PREFIX}autotyping on/off

🌐 *3. Always Online*
   - Current Status: ${config.ALWAYS_ONLINE || "off"}
   - Usage: ${config.PREFIX}alwaysonline on/off

🎙️ *4. Auto Recording*
   - Current Status: ${config.AUTO_RECORDING || "off"}
   - Usage: ${config.PREFIX}autorecording on/off

📖 *5. Auto Read Status*
   - Current Status: ${config.AUTO_STATUS_REACT || "off"}
   - Usage: ${config.PREFIX}autoreadstatus on/off

🚫 *6. Anti Bad Word*
   - Current Status: ${config.ANTI_BAD_WORD || "off"}
   - Usage: ${config.PREFIX}antibad on/off

🗑️ *#. Anti Delete*
   - Current Status: ${config.ANTI_BAD_WORD || "off"}
   - Usage: ${config.PREFIX}antidelete on/off


🖼️ *7. Auto Sticker*
   - Current Status: ${config.AUTO_STICKER || "off"}
   - Usage: ${config.PREFIX}autosticker on/off

💬 *8. Auto Reply*
   - Current Status: ${config.AUTO_REPLY || "off"}
   - Usage: ${config.PREFIX}autoreply on/off

❤️ *9. Auto React*
   - Current Status: ${config.AUTO_REACT || "off"}
   - Usage: ${config.PREFIX}autoreact on/off

📢 *10. Status Reply*
   - Current Status: ${config.AUTO_STATUS_REPLY || "off"}
   - Usage: ${config.PREFIX}autostatusreply on/off

🔗 *11. Anti Link*
   - Current Status: ${config.ANTI_LINK || "off"}
   - Usage: ${config.PREFIX}antilink on/off

🤖 *12. Anti Bot*
   - Current Status: ${antibotAction || "off"}
   - Usage: ${config.PREFIX}antibot off/warn/delete/kick

💖 *13. Heart React*
   - Current Status: ${config.HEART_REACT || "off"}
   - Usage: ${config.PREFIX}heartreact on/off

🔧 *14. Set Prefix*
   - Current Prefix: ${config.PREFIX || "."}
   - Usage: ${config.PREFIX}setprefix <new_prefix>

📊 *15. Poll*
   - Usage: ${config.PREFIX}poll question;option1,option2,...

💞 *16. Random Ship*
   - Usage: ${config.PREFIX}randomship

👥 *17. New Group*
   - Usage: ${config.PREFIX}newgc group_name;number1,number2,...

🚪 *18. Exit Group*
   - Usage: ${config.PREFIX}exit

🔗 *19. Group Invite Link*
   - Usage: ${config.PREFIX}invite2

📢 *20. Broadcast*
   - Usage: ${config.PREFIX}broadcast <text>

🖼️ *21. Set Group Profile Picture*
   - Usage: ${config.PREFIX}setgrouppp (reply to an image)

📌 *Note*: Replace "on/off" with the desired state to enable or disable a feature.
`;

    return reply(cmdList);
});


malvin({
    pattern: "heartreact",
    react: "💖",
    alias: ["heart"],
    desc: "Enable or disable heart react.",
    category: "settings",
    filename: __filename,
}, async (conn, mek, m, { from, args, isOwner, reply }) => {
    if (!isOwner) return reply("*📛 ᴏɴʟʏ ᴛʜᴇ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜsᴇ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ!*");

    const option = args[0]?.toLowerCase();
    
    if (option === "on" || option === "true") {
        config.HEART_REACT = "true"; // Set to "true" for enabling
        return reply("❤️ Heart react is now enabled.");
    } else if (option === "off" || option === "false") {
        config.HEART_REACT = "false"; // Set to "false" for disabling
        return reply("💔 Heart react is now disabled.");
    } else {
        return reply("*🔥 Example: .heartreact on* or *[.heartreact off]*");
    }
});

malvin({
    pattern: "antibot",
    alias: ["antibot"],
    desc: "Enable Antibot and set action (off/warn/delete/kick)",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    if (!q) {
        return reply(`*Current Antibot Action:* ${antibotAction.toUpperCase()}\n\nUse *antibot off/warn/delete/kick* to change it.`);
    }

    const action = q.toLowerCase();
    if (["off", "warn", "delete", "kick"].includes(action)) {
        antibotAction = action;
        return reply(`*Antibot action set to:* ${action.toUpperCase()}`);
    } else {
        return reply("*🫟 ᴇxᴀᴍᴘʟᴇ: . ᴀɴᴛɪʙᴏᴛ ᴏғғ/ᴡᴀʀɴ/ᴅᴇʟᴇᴛᴇ/ᴋɪᴄᴋ*");
    }
});

// Malvin Kings Code