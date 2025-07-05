const { malvin } = require("../malvin");
const moment = require("moment");

let botStartTime = Date.now(); // Recording the start time of the bot
const ALIVE_IMG = "https://files.catbox.moe/v1rf80.jpg"; // Ensure this URL is valid

malvin({
    pattern: "help",
    desc: "Check if the bot is active.",
    category: "main",
    react: "🕓",
    filename: __filename
}, async (conn, mek, m, { reply, from }) => {
    try {
        const pushname = m.pushName || "User"; // Default username
        const currentTime = moment().format("HH:mm:ss");
        const currentDate = moment().format("dddd, MMMM Do YYYY");

        const runtimeMilliseconds = Date.now() - botStartTime;
        const runtimeSeconds = Math.floor((runtimeMilliseconds / 1000) % 60);
        const runtimeMinutes = Math.floor((runtimeMilliseconds / (1000 * 60)) % 60);
        const runtimeHours = Math.floor(runtimeMilliseconds / (1000 * 60 * 60));

        const formattedInfo = `
╭───  𝙈𝘼𝙇𝙑𝙄𝙉 𝙓𝘿 𝘽𝙊𝙏  ───╮
│  
│ 👤 *User:* ${pushname}
│ 🕒 *Time:* ${currentTime}
│ 📅 *Date:* ${currentDate}
│ ⏳ *Uptime:* ${runtimeHours}h ${runtimeMinutes}m ${runtimeSeconds}s
│  
╰─────────────────╯

Absolutely! Let’s go through each section of the commands:

---

📌 *General Commands:*  
• *Say* - Makes the bot say something.  
• *Bass* - Boosts bass in the audio.  
• *Blown* - Distorts and increases volume.  
• *Deep* - Lowers pitch for a deep voice.  
• *Earrape* - Extremely loud sound.  
• *Fast* - Speeds up audio.  
• *Nightcore* - High-pitched, fast remix.  
• *Reverse* - Plays audio backward.  
• *Robot* - Adds a robotic effect.  
• *Slow* - Slows down audio.  

---

🛠 *Converter Commands:*  
• *Attr, attr2, attr3* - File format conversions.  
• *Binary* - Converts text to binary.  
• *EmojiMix* - Mixes emojis into text.  
• *MP3* - Converts audio files.  

---

🤖 *AI Commands:*  
• *Malvin* - Generates an AI response.  
• *Malvinai* - Generates image response.  
• *AI* - Generates an AI response.  
• *Bug* - Handles bot bugs.  
• *GPT* - ChatGPT integration.  
• *DALL·E* - AI image generation.  

---

🛠 *Tool Commands:*  
• *Calculator* - Solves math problems.  
• *TempMail* - Generates temporary emails.  
• *TTS* - Converts text to speech.  

---

📌 *Group Commands:*  
• *LinkGroup* - Retrieves the group link.  
• *SetPPGC* - Changes group profile picture.  
• *SetName* - Renames the group.  
• *SetDesc* - Changes group description.  
• *Group* - Manages group settings.  
• *Welcome* - Sends welcome messages.  
• *Kick* - Removes a member.  
• *Promote/Demote* - Changes member rank.  

---

📥 *Download Commands:*  
• *APK* - Downloads APK files.  
• *Facebook* - Downloads from Facebook.  
• *Pinterest* - Downloads images from Pinterest.  
• *Instagram* - Downloads Instagram media.  
• *YouTube MP3/MP4* - Downloads music/videos.  

---

⭐ *Premium Commands:*  
• *BugMenu* - Debugging tools.  
• *DocBug* - Finds document errors.  
• *UnlimitedBug* - Debugs without restrictions.  

---

🔎 *Search Commands:*  
• *Play* - Searches and plays music.  
• *YouTube* - Searches YouTube.  
• *Google* - Google search.  
• *IMDB* - Searches movie details.  
• *Pinterest* - Finds images.  

---

📌 *Main Commands:*  
• *Ping* - Checks bot response speed.  
• *Alive* - Shows bot status.  
• *Menu* - Displays all commands.  
• *InfoBot* - Details about the bot.  

---

👑 *Owner Commands:*  
• *Join* - Bot joins a group.  
• *Leave* - Bot exits a group.  
• *Block/Unblock* - Manages user access.  
• *SetPPBot* - Sets bot profile picture.  
• *AntiCall* - Blocks unknown calls.  
> etc
---

> 🤖 *Status:* ✅ *Malvin is Alive and Ready!*
🎉 *Enjoy the Service!*
        `.trim();

        // Check if the image URL is valid
        const isValidImage = ALIVE_IMG && ALIVE_IMG.startsWith("http");

        if (isValidImage) {
            await conn.sendMessage(from, {
                image: { url: ALIVE_IMG },
                caption: formattedInfo,
                contextInfo: { 
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363402507750390@newsletter',
                        newsletterName: '𝐌𝐀𝐋𝐕𝐈𝐍 𝐀𝐋𝐈𝐕𝐄',
                        serverMessageId: 143
                    }
                }
            }, { quoted: mek });
        } else {
            reply(formattedInfo); // Send as text if the image URL is invalid
        }

    } catch (error) {
        console.error("Error in start command: ", error);
        
        const errorMessage = `
❌ *Error:* An issue occurred while processing the "start" command.
🛠 *Details:* ${error.message}

Please report this issue or try again later.
        `.trim();

        return reply(errorMessage);
    }
});
