const config = require('../settings');
const { malvin, commands } = require('../malvin');

malvin({
    pattern: "list",
    alias: ["listcmd", "commands"],
    desc: "Menu the bot",
    category: "menu",
    react: "⚡",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let dec = `
╭━❮ *DOWNLOAD CMD* ❯━┈⊷
┃▸ 📄 COMMAND: .play - Download Audio from YouTube
┃▸ 📄 COMMAND: .song - Download song from YouTube
┃▸ 📄 COMMAND: .apk - Download APK from Playstore
┃▸ 📄 COMMAND: .video - Download video from YouTube
┃▸ 📄 COMMAND: .fb - Download video from Facebook
┃▸ 📄 COMMAND: .tk - Download video from TikTok
┃▸ 📄 COMMAND: .ig - Download video from Instagram
┃▸ 📄 COMMAND: .gdrive - Download files from Google Drive
┃▸ 📄 COMMAND: .twitter - Download video from Twitter
┃▸ 📄 COMMAND: .img - Download image
┃▸ 📄 COMMAND: .drama - Download full episode video
┃▸ 📄 COMMAND: .play2 - Download Audio from YouTube
┃▸ 📄 COMMAND: .video2 - Download video from YouTube
┃▸ 📄 COMMAND: .baiscope - Download video from Baiscope
┃▸ 📄 COMMAND: .mfire - Download mediafire files
╰━━━━━━━━━━━━⪼

╭━❮ *ANIME CMD* ❯━┈⊷
┃▸ 📄 COMMAND: .yts - Search videos from YouTube
┃▸ 📄 COMMAND: .king - Get info about "King"
┃▸ 📄 COMMAND: .dog - Get random dog images
┃▸ 📄 COMMAND: .anime - Get anime pictures
┃▸ 📄 COMMAND: .animegirl - Get anime girl pictures
┃▸ 📄 COMMAND: .loli - Get romantic anime pictures
╰━━━━━━━━━━━━⪼

╭━❮ *INFO CMD* ❯━┈⊷
┃▸ 📄 COMMAND: .alive - Check if the bot is online
┃▸ 📄 COMMAND: .ping - Check bot speed
┃▸ 📄 COMMAND: .menu - Show the main menu
┃▸ 📄 COMMAND: .menu2 - Show an alternate main menu
┃▸ 📄 COMMAND: .ai - Chat with AI bot
┃▸ 📄 COMMAND: .system - Check bot system status
┃▸ 📄 COMMAND: .owner - Get owner information
┃▸ 📄 COMMAND: .status - Check bot runtime
┃▸ 📄 COMMAND: .about - Get information about the bot
┃▸ 📄 COMMAND: .list - Get the bot command list
┃▸ 📄 COMMAND: .script - Get bot repository
╰━━━━━━━━━━━━⪼

╭━❮ *OTHER CMD* ❯━┈⊷
┃▸ 📄 COMMAND: .joke - Get a random joke
┃▸ 📄 COMMAND: .fact - Get a random fact
┃▸ 📄 COMMAND: .githubstalk - Get GitHub data of any user
┃▸ 📄 COMMAND: .gpass - Generate a strong password
┃▸ 📄 COMMAND: .hack - Prank with friends
┃▸ 📄 COMMAND: .srepo - Search repositories
┃▸ 📄 COMMAND: .define - Search any word
╰━━━━━━━━━━━━⪼

╭━❮ *GROUP CMD* ❯━┈⊷
┃▸ 📄 COMMAND: .mute - Mute group
┃▸ 📄 COMMAND: .unmute - Unmute group
┃▸ 📄 COMMAND: .left - Make the bot leave the group
┃▸ 📄 COMMAND: .remove - Remove member from group
┃▸ 📄 COMMAND: .add - Add members to the group
┃▸ 📄 COMMAND: .kick - Kick any user from the group
┃▸ 📄 COMMAND: .kickall - Remove all members from the group
┃▸ 📄 COMMAND: .promote - Make a group admin
┃▸ 📄 COMMAND: .demote - Demote any admin
┃▸ 📄 COMMAND: .tagall - Mention all group members
┃▸ 📄 COMMAND: .setgoodbye - Set member leave message
┃▸ 📄 COMMAND: .setwelcome - Set member welcome message
┃▸ 📄 COMMAND: .ginfo - Get group information
╰━━━━━━━━━━━━⪼

╭━❮ *OWNER CMD* ❯━┈⊷
┃▸ 📄 COMMAND: .update - Update bot version
┃▸ 📄 COMMAND: .restart - Restart the bot
┃▸ 📄 COMMAND: .settings - View bot settings
┃▸ 📄 COMMAND: .block - Block any user
┃▸ 📄 COMMAND: .unblock - Unblock any user
┃▸ 📄 COMMAND: .shutdown - Shutdown the bot
┃▸ 📄 COMMAND: .setpp - Update profile picture
╰━━━━━━━━━━━━⪼

╭━❮ *CONVERT CMD* ❯━┈⊷
┃▸ 📄 COMMAND: .sticker - Convert photo to sticker
┃▸ 📄 COMMAND: .tts - Convert text to speech
┃▸ 📄 COMMAND: .trt - Change language of the bot
╰━━━━━━━━━━━━⪼

${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/2prjby.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363398430045533@newsletter',
                        newsletterName: 'Malvin King',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

       

    } catch (e) {
        console.log(e);
        reply(`❌ An error occurred: ${e}`);
    }
});
