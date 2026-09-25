const { mxd } = require("../king");
const yts = require("yt-search");
const axios = require("axios");
const { classifyApiError } = require("../king/mxdcore2");

function extractButtonId(msg) {
    if (!msg) return null;
    if (msg.templateButtonReplyMessage?.selectedId)
        return msg.templateButtonReplyMessage.selectedId;
    if (msg.buttonsResponseMessage?.selectedButtonId)
        return msg.buttonsResponseMessage.selectedButtonId;
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId)
        return msg.listResponseMessage.singleSelectReply.selectedRowId;
    if (msg.interactiveResponseMessage) {
        const nf = msg.interactiveResponseMessage.nativeFlowResponseMessage;
        if (nf?.paramsJson) {
            try { const p = JSON.parse(nf.paramsJson); if (p.id) return p.id; } catch {}
        }
        return msg.interactiveResponseMessage.buttonId || null;
    }
    return null;
}

const {
    downloadContentFromMessage,
    generateWAMessageFromContent,
    normalizeMessageContent,
} = require("mrxd-baileys");
const { sendButtons } = require("malvin-btns");

const isValidBuffer = (buf) => Buffer.isBuffer(buf) && buf.length > 10240;

// ==================== FOLLOW REDIRECT TO REAL FILE URL ====================
async function getRealDownloadUrl(url) {
    try {
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            }
        });

        // If the response has a fileUrl (ytdown.to style), use that
        if (response.data?.fileUrl && response.data.fileUrl !== 'Waiting...') {
            console.log('✅ Found real file URL:', response.data.fileUrl);
            return response.data.fileUrl;
        }

        // If it's already a direct file, return original
        return url;
    } catch (e) {
        console.log('⚠️ Failed to get real URL, using original:', e.message);
        return url;
    }
}

// ==================== FETCH FROM YOUR API ====================
// GET /download/youtube2?url=&apikey=
// Confirmed shape (same as downloads.js's yt command): { creator, title,
// thumbnail, audio, videos: {144,240,360,480,720,1080}, available_qualities }
async function fetchFromYoutube(videoUrl, conText) {
    const { MalvinTechApi, MalvinApiKey } = conText;
    const res = await axios.get(`${MalvinTechApi}/download/youtube2`, {
        params: { apikey: MalvinApiKey, url: videoUrl },
        timeout: 20000,
        validateStatus: () => true,
    });
    if (res.status >= 400 || res.data?.status === false) {
        const apiMessage = res.data?.error || res.data?.message;
        if (apiMessage) throw new Error(apiMessage);
        const { rawMessage } = classifyApiError(res.status, res.data);
        throw new Error(rawMessage);
    }
    return res.data?.data;
}

// ==================== SENDAUDIO ====================
mxd(
  {
    pattern: "sendaudio",
    aliases: ["sendmp3", "dlmp3", "dlaudio"],
    category: "downloader",
    react: "🎶",
    description: "Download Audio from url",
  },
  async (from, Malvin, conText) => {
    const { q, mek, reply, react, botFooter, mxdBuffer, formatAudio } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide audio url");
    }

    try {
      const buffer = await mxdBuffer(q);
      const convertedBuffer = await formatAudio(buffer);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the audio file.");
      }
      await Malvin.sendMessage(from, {
        audio: convertedBuffer,
        mimetype: "audio/mpeg",
        caption: `> *${botFooter}*`,
      }, { quoted: mek });
      await react("✅");
    } catch (error) {
      console.error("Error:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);

// ==================== SENDVIDEO ====================
mxd(
  {
    pattern: "sendvideo",
    aliases: ["sendmp4", "dlmp4", "dvideo"],
    category: "downloader",
    react: "🎥",
    description: "Download Video from url",
  },
  async (from, Malvin, conText) => {
    const { q, mek, reply, react, botFooter, mxdBuffer } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide video url");
    }

    try {
      const buffer = await mxdBuffer(q);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the video file.");
      }
      await Malvin.sendMessage(from, {
        document: buffer,
        fileName: "Video.mp4",
        mimetype: "video/mp4",
        caption: `> *${botFooter}*`,
      }, { quoted: mek });
      await react("✅");
    } catch (error) {
      console.error("Error:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);

// ==================== PLAY (AUDIO) ====================
mxd(
  {
    pattern: "play",
    aliases: ["ytmp3", "ytmp3doc", "audiodoc", "song"],
    category: "downloader",
    react: "🎶",
    description: "Download Audio from Youtube",
  },
  async (from, Malvin, conText) => {
    const {
      q,
      reply,
      react,
      botPic,
      botName,
      botFooter,
      mxdBuffer,
      formatAudio,
    } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide a song name");
    }

    try {
      const searchResponse = await yts(q);
      if (!searchResponse.videos.length) {
        return reply("No video found for your query.");
      }

      const firstVideo = searchResponse.videos[0];
      const videoUrl = `https://youtu.be/${firstVideo.videoId}`;

      await react("🔍");

      // Get data from your API
      const result = await fetchFromYoutube(videoUrl, conText);

      if (!result?.audio) {
        await react("❌");
        return reply("Failed to fetch audio. Please try again.");
      }

      const title = result?.title || firstVideo.title;
      const duration = firstVideo.timestamp;
      const thumbnail = result?.thumbnail || firstVideo.thumbnail;

      // Get the real download URL (follow redirect if needed)
      const realUrl = await getRealDownloadUrl(result.audio);
      let bufferRes = await mxdBuffer(realUrl);

      if (!isValidBuffer(bufferRes)) {
        await react("❌");
        return reply("Failed to download audio. Please try again later.");
      }

      // Large file — send as document
      if (bufferRes.length > 60 * 1024 * 1024) {
        await react("📄");
        const convertedBuffer = await formatAudio(bufferRes);
        await Malvin.sendMessage(from, {
          document: convertedBuffer,
          mimetype: "audio/mpeg",
          fileName: `${title}.mp3`.replace(/[^\w\s.-]/gi, ""),
          caption: `⿻ *Title:* ${title}\n⿻ *Duration:* ${duration}\n\n_File too large for audio streaming — sent as document_`,
        });
        return;
      }

      const dateNow = Date.now();
      const buttonId = `play_${firstVideo.id}_${dateNow}`;

      await sendButtons(Malvin, from, {
        title: `${botName} SONG DOWNLOADER`,
        text: `⿻ *Title:* ${title}\n⿻ *Duration:* ${duration}\n\n*Select download format:*`,
        footer: botFooter,
        image: { url: thumbnail || botPic },
        buttons: [
          { id: `audio_${buttonId}`, text: "Audio 🎶" },
          { id: `doc_${buttonId}`, text: "Audio Document 📄" },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "Watch on Youtube",
              url: firstVideo.url,
            }),
          },
        ],
      });

      let cachedBuffer = null;

      const handleResponse = async (event) => {
        const messageData = event.messages[0];
        if (!messageData.message) return;

        const selectedButtonId = extractButtonId(messageData.message);
        if (!selectedButtonId) return;

        const isFromSameChat = messageData.key?.remoteJid === from;
        if (!isFromSameChat || !selectedButtonId.includes(dateNow.toString())) return;

        await react("⬇️");

        try {
          if (!cachedBuffer) cachedBuffer = bufferRes;
          const convertedBuffer = await formatAudio(cachedBuffer);

          if (selectedButtonId.startsWith('audio_')) {
            await Malvin.sendMessage(from, { audio: convertedBuffer, mimetype: "audio/mpeg" }, { quoted: messageData });
          }
          else if (selectedButtonId.startsWith('doc_')) {
            await Malvin.sendMessage(from, {
              document: convertedBuffer,
              mimetype: "audio/mpeg",
              fileName: `${title}.mp3`.replace(/[^\w\s.-]/gi, ""),
              caption: title,
            }, { quoted: messageData });
          }
          await react("✅");
        } catch (error) {
          console.error("Error sending media:", error);
          await react("❌");
          await Malvin.sendMessage(from, { text: "Failed to send media. Please try again." }, { quoted: messageData });
        }
      };

      Malvin.ev.on("messages.upsert", handleResponse);
      setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);

    } catch (error) {
      console.error("Error:", error);
      await react("❌");
      return reply(`Failed to fetch audio: ${error.message}`);
    }
  },
);

// ==================== VIDEO ====================
mxd(
  {
    pattern: "video",
    aliases: ["ytmp4doc", "mp4", "ytmp4", "dlmp4"],
    category: "downloader",
    react: "🎥",
    description: "Download Video from Youtube",
  },
  async (from, Malvin, conText) => {
    const {
      q,
      reply,
      react,
      botPic,
      botName,
      botFooter,
      mxdBuffer,
      formatVideo,
    } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide a video name");
    }

    try {
      const searchResponse = await yts(q);
      if (!searchResponse.videos.length) {
        return reply("No video found for your query.");
      }

      const firstVideo = searchResponse.videos[0];
      const videoUrl = `https://youtu.be/${firstVideo.videoId}`;

      await react("🔍");

      // Get data from your API
      const result = await fetchFromYoutube(videoUrl, conText);

      if (!result?.videos) {
        await react("❌");
        return reply("Failed to fetch video. Please try again.");
      }

      // Get best quality (720p or lowest available)
      let streamUrl = result.videos?.['720'] ||
                      result.videos?.['480'] ||
                      result.videos?.['360'] ||
                      Object.values(result.videos)[0];

      if (!streamUrl) {
        await react("❌");
        return reply("No video stream available.");
      }

      const title = result?.title || firstVideo.title;
      const duration = firstVideo.timestamp;
      const thumbnail = result?.thumbnail || firstVideo.thumbnail;

      // Get the real download URL (follow redirect if needed)
      const realUrl = await getRealDownloadUrl(streamUrl);
      let buffer = await mxdBuffer(realUrl);

      if (!isValidBuffer(buffer)) {
        await react("❌");
        return reply("Failed to download video. Please try again later.");
      }

      const sizeMB = buffer.length / (1024 * 1024);

      if (sizeMB > 100) {
        await react("📄");
        const convertedBuffer = await formatVideo(buffer);
        await Malvin.sendMessage(from, {
          document: convertedBuffer,
          mimetype: "video/mp4",
          fileName: `${title}.mp4`.replace(/[^\w\s.-]/gi, ""),
          caption: `⿻ *Title:* ${title}\n⿻ *Duration:* ${duration}\n\n_File too large — sent as document_`,
        });
        return;
      }

      if (sizeMB > 20) {
        await reply("File is large, processing might take a while...");
      }

      const dateNow = Date.now();
      const buttonId = `video_${firstVideo.id}_${dateNow}`;

      await sendButtons(Malvin, from, {
        title: `${botName} VIDEO DOWNLOADER`,
        text: `⿻ *Title:* ${title}\n⿻ *Duration:* ${duration}\n\n*Select download format:*`,
        footer: botFooter,
        image: { url: thumbnail || botPic },
        buttons: [
          { id: `vid_${buttonId}`, text: "Video 🎥" },
          { id: `doc_${buttonId}`, text: "Video Document 📄" },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "Watch on Youtube",
              url: firstVideo.url,
            }),
          },
        ],
      });

      let cachedBuffer = null;

      const handleResponse = async (event) => {
        const messageData = event.messages[0];
        if (!messageData.message) return;

        const selectedButtonId = extractButtonId(messageData.message);
        if (!selectedButtonId) return;

        const isFromSameChat = messageData.key?.remoteJid === from;
        if (!isFromSameChat || !selectedButtonId.includes(dateNow.toString())) return;

        await react("⬇️");

        try {
          if (selectedButtonId.startsWith('vid_')) {
            if (!cachedBuffer) cachedBuffer = buffer;
            const formattedVideo = await formatVideo(cachedBuffer);
            await Malvin.sendMessage(from, {
              video: formattedVideo,
              mimetype: "video/mp4",
              caption: `🎥 ${title}`,
            }, { quoted: messageData });
          }
          else if (selectedButtonId.startsWith('doc_')) {
            await Malvin.sendMessage(from, {
              document: buffer,
              mimetype: "video/mp4",
              fileName: `${title}.mp4`.replace(/[^\w\s.-]/gi, ""),
              caption: `📄 ${title}`,
            }, { quoted: messageData });
          }
          await react("✅");
        } catch (error) {
          console.error("Error sending media:", error);
          await react("❌");
          await Malvin.sendMessage(from, { text: "Failed to send media. Please try again." }, { quoted: messageData });
        }
      };

      Malvin.ev.on("messages.upsert", handleResponse);
      setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);

    } catch (error) {
      console.error("Error:", error);
      await react("❌");
      return reply(`Failed to fetch video: ${error.message}`);
    }
  },
);
