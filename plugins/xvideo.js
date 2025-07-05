const { fetchJson } = require("../lib/functions");
const { downloadTiktok } = require("@mrnima/tiktok-downloader");
const { facebook } = require("@mrnima/facebook-downloader");
const cheerio = require("cheerio");
const { igdl } = require("ruhend-scraper");
const axios = require("axios");
const { malvin, commands } = require('../malvin');




malvin({
  pattern: "porn",
  alias: ["xvideos", "xporn","xvideo"],
  desc: "Search and download adult videos from XVideos",
  category: "download",
  filename: __filename
}, async (conn, m, store, { from, quoted, q, reply }) => {
  try {
    if (!q) return reply("❌ Please enter a keyword. Example: .porn mia khalifa");

    await conn.sendMessage(from, {
      react: { text: '🔍', key: m.key }
    });

    // Search for video by keyword
    const searchRes = await fetch(`https://apis-keith.vercel.app/search/searchxvideos?q=${encodeURIComponent(q)}`);
    const searchData = await searchRes.json();

    if (!searchData.status || !searchData.result || !searchData.result[0]) {
      return reply("❌ No videos found for that keyword.");
    }

    const videoUrl = searchData.result[0].url;

    // Download using Keith's API
    const response = await fetch(`https://apis-keith.vercel.app/download/porn?url=${encodeURIComponent(videoUrl)}`);
    const data = await response.json();

    if (!data.status || !data.result) {
      return reply("⚠️ Failed to retrieve video. Please try again.");
    }

    const { videoInfo, downloads } = data.result;
    const { title, thumbnail, duration } = videoInfo;

    const caption = `
    
╭──┥❍ *ᴍᴀʟᴠɪɴ-xᴅ* ❍├─ 
┊
┊▸ *ᴛɪᴛʟᴇ:* ${title}
┊▸ *ᴅᴜʀᴀᴛɪᴏɴ:* _${Math.floor(duration / 60)} min ${duration % 60} sec_
╰──

📹 *ᴠɪᴅᴇᴏ ᴅʟ ᴏᴘᴛɪᴏɴs:*

1 *Low Quality*
2 *High Quality*

📌 *Reply with the number to download your choice.*

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ xᴅ

`;

    const sentMsg = await conn.sendMessage(from, {
      image: { url: thumbnail },
      caption: caption
    }, { quoted: m });

    const messageID = sentMsg.key.id;

    conn.ev.on("messages.upsert", async (msgData) => {
      const receivedMsg = msgData.messages[0];
      if (!receivedMsg.message) return;

      const receivedText = receivedMsg.message.conversation || receivedMsg.message.extendedTextMessage?.text;
      const senderID = receivedMsg.key.remoteJid;
      const isReplyToBot = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

      if (isReplyToBot) {
        await conn.sendMessage(senderID, {
          react: { text: '⬇️', key: receivedMsg.key }
        });

        switch (receivedText) {
          case "1":
            await conn.sendMessage(senderID, {
              video: { url: downloads.lowQuality },
              caption: "📥 *Downloaded in Low Quality*"
            }, { quoted: receivedMsg });
            break;

          case "2":
            await conn.sendMessage(senderID, {
              video: { url: downloads.highQuality },
              caption: "📥 *Downloaded in High Quality*"
            }, { quoted: receivedMsg });
            break;


          default:
            reply("❌ Invalid option! Please reply with option 1 or 2.");
        }
      }
    });

  } catch (error) {
    console.error("Error:", error);
    reply("❌ An error occurred while processing your request. Please try again.");
  }
});