const { mxd, toAudio, toVideo, toPtt, stickerToImage, mxdFancy, mxdRandom, getSetting, runFFmpeg, getVideoDuration, mxdSticker } = require("../king");
const fs = require("fs").promises;
const { StickerTypes } = require("wa-sticker-formatter");
const { mrxd } = require('../king/mrxd');
const axios = require("axios");
const { classifyApiError } = require("../king/mxdcore2");
const { fancy } = require("../king/fancyFont");

mxd({
    pattern: "sticker",
    aliases: ["st", "take"],
    category: "converter",
    react: "🔄️",
    description: "Convert image/video/sticker to sticker.",
}, async (from, Malvin, conText) => {
    const { q, mek, reply, react, quoted, packName, packAuthor } = conText;

    try {
        if (!quoted) {
            await react("❌");
            return reply("Please reply to/quote an image, video or sticker");
        }

        const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage;

        if (!quotedImg && !quotedSticker && !quotedVideo) {
            await react("❌");
            return reply("That quoted message is not an image, video or sticker");
        }

        let tempFilePath;
        try {
            if (quotedImg || quotedVideo) {
                tempFilePath = await Malvin.downloadAndSaveMediaMessage(
                    quotedImg || quotedVideo,
                    "temp_media"
                );

                let fileExt = quotedImg ? ".jpg" : ".mp4";
                let mediaFile = mxdRandom(fileExt);
                const data = await fs.readFile(tempFilePath);
                await fs.writeFile(mediaFile, data);

                // 🔥 If video → convert to webp
                if (quotedVideo) {
                    const compressedFile = mxdRandom(".webp");
                    let duration = 8; // default duration
                    
                    try {
                        duration = await getVideoDuration(mediaFile);
                        if (duration > 10) duration = 10; // trim to first 10 seconds
                    } catch (e) {
                        console.error("Using default duration due to error:", e);
                    }
                    
                    await runFFmpeg(mediaFile, compressedFile, 320, 15, duration);
                    await fs.unlink(mediaFile).catch(() => {});
                    mediaFile = compressedFile;
                }

                const stickerBuffer = await mxdSticker(mediaFile, {
                    pack: packName || fancy("malvin-xd", "smallcaps"), 
                    author: packAuthor || fancy("malvin tech", "smallcaps"),
                    type: q.includes("--crop") || q.includes("-c") ? StickerTypes.CROPPED : StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: "12345",
                    quality: 75,
                    background: "transparent"
                });

                await fs.unlink(mediaFile).catch(() => {});
                await react("✅");
                return Malvin.sendMessage(from, { sticker: stickerBuffer }, { quoted: mrxd});

            } else if (quotedSticker) {
                // Sticker → Sticker (recompress if too big)
                tempFilePath = await Malvin.downloadAndSaveMediaMessage(quotedSticker, "temp_media");
                const stickerData = await fs.readFile(tempFilePath);
                const stickerFile = mxdRandom(".webp");
                await fs.writeFile(stickerFile, stickerData);

                const newStickerBuffer = await mxdSticker(stickerFile, {
                    pack: packName || fancy("malvin-xd", "smallcaps"), 
                    author: packAuthor || fancy("malvin tech", "smallcaps"),
                    type: q.includes("--crop") || q.includes("-c") ? StickerTypes.CROPPED : StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    id: "12345",
                    quality: 75,
                    background: "transparent"
                });

                await fs.unlink(stickerFile).catch(() => {});
                await react("✅");
                return Malvin.sendMessage(from, { sticker: newStickerBuffer }, { quoted: mrxd });
            }
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(() => {});
        }
    } catch (e) {
        console.error("Error in sticker command:", e);
        await react("❌");
        await reply("Failed to convert to sticker");
    }
});


mxd({
    pattern: "toimg",
    aliases: ["s2img"],
    category: "converter",
    react: "🔄️",
    description: "Convert Sticker to Image.",
}, async (from, Malvin, conText) => {
    const { mek, reply, sender, botName, react, quoted, botFooter, quotedMsg, newsletterJid } = conText;

    try {
        if (!quotedMsg) {
            await react("❌");
            return reply("Please reply to/quote a sticker");
        }
        
        const quotedSticker = quoted?.stickerMessage || quoted?.message?.stickerMessage;
        if (!quotedSticker) {
            await react("❌");
            return reply("That quoted message is not a sticker");
        }
        
        let tempFilePath;
        try {
            tempFilePath = await Malvin.downloadAndSaveMediaMessage(quotedSticker, 'temp_media');
            const stickerBuffer = await fs.readFile(tempFilePath);
            const imageBuffer = await stickerToImage(stickerBuffer);  
        await Malvin.sendMessage(
        from,
        {
          image: imageBuffer,
          caption: `*Here is your image*\n\n> *${botFooter}*`,
          contextInfo: {
            mentionedJid: [sender],
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 143
            },
          },
        },
        { quoted: mrxd }
      );
            await react("✅");
        } finally {
            if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
        }
    } catch (e) {
        console.error("Error in toimg command:", e);
        await react("❌");
        await reply("Failed to convert sticker to image");
    }
});


mxd({
    pattern: "toaudio",
    aliases: ['tomp3'],
    category: "converter",
    react: "🔄️",
    description: "Convert video to audio"
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, botPic, quoted, quotedMsg, newsletterUrl } = conText;

    if (!quotedMsg) {
      await react("❌");
      return reply("Please reply to a video message");
    }

    const quotedVideo = quoted?.videoMessage || quoted?.message?.videoMessage || quoted?.pvtMessage || quoted?.message?.pvtMessage;
    
    if (!quotedVideo) {
      await react("❌");
      return reply("The quoted message doesn't contain any video");
    }

    let tempFilePath;
    try {
      tempFilePath = await Malvin.downloadAndSaveMediaMessage(quotedVideo, 'temp_media');
      const buffer = await fs.readFile(tempFilePath);
      const convertedBuffer = await toAudio(buffer);
      
      await Malvin.sendMessage(from, {
        audio: convertedBuffer,
        mimetype: "audio/mpeg",
        externalAdReply: {
          title: 'Converted Audio',
          body: 'Video to Audio',
          mediaType: 1,
          thumbnailUrl: botPic,
          sourceUrl: newsletterUrl,
          renderLargerThumbnail: false,
          showAdAttribution: true,
        }
      }, { quoted: mrxd });
      
      await react("✅");
    } catch (e) {
      console.error("Error in toaudio command:", e);
      await react("❌");
      const errMsg = e.message || String(e);
      if (errMsg.includes('no audio')) {
        await reply("This video has no audio track to extract.");
      } else {
        await reply("Failed to convert video to audio");
      }
    } finally {
      if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
    }
  }
);


mxd({
    pattern: "toptt",
    aliases: ['tovoice', 'tovn', 'tovoicenote'],
    category: "converter",
    react: "🎙️",
    description: "Convert audio to WhatsApp voice note"
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, botPic, quoted, quotedMsg } = conText;

    if (!quotedMsg) {
      await react("❌");
      return reply("Please reply to an audio message");
    }

    const quotedAudio = quoted?.audioMessage || quoted?.message?.audioMessage;
    
    if (!quotedAudio) {
      await react("❌");
      return reply("The quoted message doesn't contain any audio");
    }

    let tempFilePath;
    try {
      tempFilePath = await Malvin.downloadAndSaveMediaMessage(quotedAudio, 'temp_media');
      const buffer = await fs.readFile(tempFilePath);
      const convertedBuffer = await toPtt(buffer);
      
      await Malvin.sendMessage(from, {
        audio: convertedBuffer,
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      }, { quoted: mrxd });
      
      await react("✅");
    } catch (e) {
      console.error("Error in toptt command:", e);
      await react("❌");
      await reply("Failed to convert to voice note");
    } finally {
      if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
    }
  }
);


mxd({
    pattern: "tovideo",
    aliases: ['tomp4', 'tovid', 'toblackscreen', 'blackscreen'],
    category: "converter",
    react: "🎥",
    description: "Convert audio to video with black screen"
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, botPic, quoted, quotedMsg } = conText;

    if (!quotedMsg) {
      await react("❌");
      return reply("Please reply to an audio message");
    }

    const quotedAudio = quoted?.audioMessage || quoted?.message?.audioMessage;
    
    if (!quotedAudio) {
      await react("❌");
      return reply("The quoted message doesn't contain any audio");
    }

    let tempFilePath;
    try {
      tempFilePath = await Malvin.downloadAndSaveMediaMessage(quotedAudio, 'temp_media');
      const buffer = await fs.readFile(tempFilePath);
      const convertedBuffer = await toVideo(buffer);
      
      await Malvin.sendMessage(from, {
        video: convertedBuffer,
        mimetype: "video/mp4",
        caption: 'Converted Video',
      }, { quoted: mrxd });
      
      await react("✅");
    } catch (e) {
      console.error("Error in tovideo command:", e);
      await react("❌");
      await reply("Failed to convert audio to video");
    } finally {
      if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error);
    }
  }
);

// ==================== BRAT STICKER ====================
mxd(
    {
        pattern: "brat",
        category: "sticker",
        react: "🎨",
        aliases: ["brateffect"],
        description: "Generate Brat text effect image",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Usage: .brat <text> | <style: green|white|black> | <blur: true|false>\n\n*Example:* .brat Hello");
        }

        const [text, style, blur] = q.split("|").map(s => s.trim());

        try {
            await react("🎨");
            // Endpoint moved from /sticker/brat to /maker/brat, and is now
            // JSON+url instead of raw bytes. isAnimated no longer exists —
            // the animated version is the separate /maker/bratanim endpoint
            // (used by .brat2 below), not a param on this one.
            const res = await axios.get(`${MalvinTechApi}/maker/brat`, {
                params: { apikey: MalvinApiKey, text, style: style || "white", blur: blur === "true" },
                timeout: 30000,
                validateStatus: () => true,
            });

            if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
                const { rawMessage } = classifyApiError(res.status, res.data);
                throw new Error(rawMessage);
            }

            await Malvin.sendMessage(from, {
                image: { url: res.data.data.url },
                caption: `🎨 *Brat Text Effect*\n📝 ${text}\n\n> *${botFooter}*`
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("Brat error:", error.message);
            await react("❌");
            reply(`Failed to generate Brat text effect: ${error.message}`);
        }
    }
);
// ==================== BRAT ANIMATED ====================
mxd(
    {
        pattern: "brat2",
        category: "sticker",
        react: "🎨",
        aliases: ["bratanim"],
        description: "Generate animated Brat text effect (words reveal one by one)",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Usage: .brat2 <text (max 10 words)> | <style> | <speed: slow|normal|fast>\n\n*Example:* .brat2 Hello there");
        }

        const [text, style, speed] = q.split("|").map(s => s.trim());

        try {
            await react("🎨");
            // Separate endpoint from static brat, not a param — this one
            // is capped at 10 words (vs 20 for the static version).
            const res = await axios.get(`${MalvinTechApi}/maker/bratanim`, {
                params: { apikey: MalvinApiKey, text, style: style || "white", speed: speed || "normal" },
                timeout: 45000,
                validateStatus: () => true,
            });

            if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
                const { rawMessage } = classifyApiError(res.status, res.data);
                throw new Error(rawMessage);
            }

            await Malvin.sendMessage(from, {
                image: { url: res.data.data.url },
                caption: `🎨 *Brat Text Effect (Animated)*\n📝 ${text}\n\n> *${botFooter}*`
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("Bratanim error:", error.message);
            await react("❌");
            reply(`Failed to generate animated Brat text effect: ${error.message}`);
        }
    }
);

// ==================== QUOTE CHAT BUBBLE (QC) ====================
mxd(
    {
        pattern: "qc",
        category: "sticker",
        react: "💬",
        aliases: ["quotly"],
        description: "Generate a Telegram-style quote chat bubble image",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Usage: .qc <username> | <text> | <avatar_url> | <color hex> | <bubble: dark|white|black>\n\n*Example:* .qc Malvin | hello there, how are you");
        }

        const [username, text, avatar, color, bubble] = q.split("|").map(s => s.trim());
        if (!username || !text) {
            await react("❌");
            return reply("Missing: username and text (both required)");
        }

        try {
            await react("💬");
            const res = await axios.get(`${MalvinTechApi}/maker/qc`, {
                params: {
                    apikey: MalvinApiKey,
                    username: username.slice(0, 40),
                    text: text.slice(0, 500),
                    ...(avatar ? { avatar } : {}),
                    ...(color ? { color } : {}),
                    ...(bubble ? { bubble } : {}),
                },
                timeout: 30000,
                validateStatus: () => true,
            });

            if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
                const { rawMessage } = classifyApiError(res.status, res.data);
                throw new Error(rawMessage);
            }

            await Malvin.sendMessage(from, {
                image: { url: res.data.data.url },
                caption: `> *${botFooter}*`
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("QC error:", error.message);
            await react("❌");
            reply(`Failed to generate quote card: ${error.message}`);
        }
    }
);

// ==================== FAKE iMESSAGE SCREENSHOT (IQC) ====================
mxd(
    {
        pattern: "iqc",
        category: "sticker",
        react: "📱",
        aliases: ["imessage", "fakeimessage"],
        description: "Generate a fake iMessage press-and-hold screenshot",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Usage: .iqc <text> | <time> | <clock> | <bubble: gray|blue|green|hex>\nSupports *bold* _italic_ ~strike~\n\n*Example:* .iqc Hello there");
        }

        const [text, time, clock, bubble] = q.split("|").map(s => s.trim());

        try {
            await react("📱");
            const res = await axios.get(`${MalvinTechApi}/maker/iqc`, {
                params: {
                    apikey: MalvinApiKey,
                    text: text.slice(0, 400),
                    ...(time ? { time } : {}),
                    ...(clock ? { clock } : {}),
                    ...(bubble ? { bubble } : {}),
                },
                timeout: 30000,
                validateStatus: () => true,
            });

            if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
                const { rawMessage } = classifyApiError(res.status, res.data);
                throw new Error(rawMessage);
            }

            await Malvin.sendMessage(from, {
                image: { url: res.data.data.url },
                caption: `> *${botFooter}*`
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("IQC error:", error.message);
            await react("❌");
            reply(`Failed to generate fake chat: ${error.message}`);
        }
    }
);



