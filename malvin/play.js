const { mxd } = require("../king");
const axios = require("axios");

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
const YT_URL_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/i;

// Safely turn any thrown value into a short, readable string for WhatsApp.
function describeError(error) {
    if (!error) return "Unknown error (nothing was thrown)";
    if (error.response?.data) {
        const d = error.response.data;
        return d?.error || d?.message || `HTTP ${error.response.status}`;
    }
    if (typeof error.message === "string" && error.message.length) return error.message;
    if (typeof error === "string") return error;
    try {
        const s = JSON.stringify(error);
        if (s && s !== "{}") return s.slice(0, 300);
    } catch {}
    return String(error);
}

// ==================== CLUTCH (search + download, single source) ====================
// GET /download/clutchplay?query= — searches by name, returns a ready MP3
// link plus metadata in one call.
async function fetchFromClutchPlay(query, conText) {
    const { MalvinTechApi, MalvinApiKey } = conText;
    const res = await axios.get(`${MalvinTechApi}/download/clutchplay`, {
        params: { apikey: MalvinApiKey, query },
        timeout: 20000,
        validateStatus: () => true,
    });
    if (res.status >= 400 || res.data?.status === false) {
        const apiMessage = res.data?.error || res.data?.message;
        throw new Error(apiMessage || `Search failed (HTTP ${res.status})`);
    }
    return res.data?.data;
}

// GET /download/clutchyt?url=&quality= — resolves a specific YouTube URL at
// a specific quality.
async function fetchFromClutchYoutube(videoUrl, conText, quality = "720") {
    const { MalvinTechApi, MalvinApiKey } = conText;
    const res = await axios.get(`${MalvinTechApi}/download/clutchyt`, {
        params: { apikey: MalvinApiKey, url: videoUrl, quality },
        timeout: 30000,
        validateStatus: () => true,
    });
    if (res.status >= 400 || res.data?.status === false) {
        const apiMessage = res.data?.error || res.data?.message;
        throw new Error(apiMessage || `Video fetch failed (HTTP ${res.status})`);
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
      await react("🔍");

      const result = await fetchFromClutchPlay(q, conText);

      if (!result?.audio) {
        await react("❌");
        return reply("Failed to fetch audio. Please try again.");
      }

      const title = result.title || "Audio";
      const duration = result.duration || "N/A";
      const thumbnail = result.thumbnail;
      const videoId = result.video_id || Date.now().toString();
      const watchUrl = result.url;

      let bufferRes = await mxdBuffer(result.audio);

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
      const buttonId = `play_${videoId}_${dateNow}`;

      const buttons = [
        { id: `audio_${buttonId}`, text: "Audio 🎶" },
        { id: `doc_${buttonId}`, text: "Audio Document 📄" },
      ];
      if (watchUrl) {
        buttons.push({
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "Watch on Youtube",
            url: watchUrl,
          }),
        });
      }

      await sendButtons(Malvin, from, {
        title: `${botName} SONG DOWNLOADER`,
        text: `⿻ *Title:* ${title}\n⿻ *Duration:* ${duration}\n\n*Select download format:*`,
        footer: botFooter,
        image: { url: thumbnail || botPic },
        buttons,
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
      return reply(`Failed to fetch audio: ${describeError(error)}`);
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
      await react("🔍");

      // A raw YouTube URL goes straight to clutchyt; a name/search term is
      // resolved to a URL first via clutchplay's search.
      let videoUrl = q;
      if (!YT_URL_RE.test(q)) {
        const searchResult = await fetchFromClutchPlay(q, conText);
        if (!searchResult?.url) {
          await react("❌");
          return reply("No video found for your query.");
        }
        videoUrl = searchResult.url;
      }

      const result = await fetchFromClutchYoutube(videoUrl, conText, "720");

      if (!result?.video) {
        await react("❌");
        return reply("Failed to fetch video. Please try again.");
      }

      const title = result.title || "Video";
      const duration = result.duration || "N/A";
      const thumbnail = result.thumbnail;
      const videoId = result.video_id || Date.now().toString();

      let buffer = await mxdBuffer(result.video);

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
      const buttonId = `video_${videoId}_${dateNow}`;

      const buttons = [
        { id: `vid_${buttonId}`, text: "Video 🎥" },
        { id: `doc_${buttonId}`, text: "Video Document 📄" },
      ];
      if (result.url) {
        buttons.push({
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "Watch on Youtube",
            url: result.url,
          }),
        });
      }

      await sendButtons(Malvin, from, {
        title: `${botName} VIDEO DOWNLOADER`,
        text: `⿻ *Title:* ${title}\n⿻ *Duration:* ${duration}\n\n*Select download format:*`,
        footer: botFooter,
        image: { url: thumbnail || botPic },
        buttons,
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
      return reply(`Failed to fetch video: ${describeError(error)}`);
    }
  },
);
