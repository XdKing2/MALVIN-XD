// malvin/downloads.js
// Merged from the former malvin/downloader.js (gitclone, fb, tiktok, ig, yt)
// and malvin/dl2.js (spotify, gdrive, mediafire, mega, pastebin, alamy, snack,
// terabox, vidsplay, tiktokv2/2/5/7, apk, capcut, savefrom, twitter2, douyin,
// snackvideo2, lahelu, fastdl, ummy).

const {
        mxd,
        gitRepoRegex,
        MAX_MEDIA_SIZE,
        getFileSize,
        getMimeCategory,
        getMimeFromUrl,
    } = require("../king"),
    axios = require("axios"),
    { sendButtons } = require("malvin-btns"),
    { classifyApiError } = require("../king/mxdcore2"),
    { fancy } = require("../king/fancyFont");

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

const isValidBuffer = (buf) => Buffer.isBuffer(buf) && buf.length > 10240;

// ==================== FROM downloader.js ====================

mxd(
    {
        pattern: "gitclone",
        category: "downloader",
        react: "📦",
        aliases: ["gitdl", "github", "git", "repodl", "clone"],
        description: "Download GitHub repository as zip file",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, sender, botName, newsletterJid } =
            conText;

        if (!q) {
            await react("❌");
            return reply(
                `Please provide a GitHub repository link.\n\n*Usage:* .gitclone https://github.com/user/repo`,
            );
        }

        if (!gitRepoRegex.test(q)) {
            await react("❌");
            return reply(
                "Invalid GitHub link format. Please provide a valid GitHub repository URL.",
            );
        }

        try {
            let [, user, repo] = q.match(gitRepoRegex) || [];
            repo = repo.replace(/\.git$/, "").split("/")[0];

            const apiUrl = `https://api.github.com/repos/${user}/${repo}`;
            const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;

            await reply(`Fetching repository *${user}/${repo}*...`);

            const repoResponse = await axios.get(apiUrl);
            if (!repoResponse.data) {
                await react("❌");
                return reply(
                    "Repository not found or access denied. Make sure the repository is public.",
                );
            }

            const repoData = repoResponse.data;
            const defaultBranch = repoData.default_branch || "main";
            const filename = `${user}-${repo}-${defaultBranch}.zip`;

            await Malvin.sendMessage(
                from,
                {
                    document: { url: zipUrl },
                    fileName: filename,
                    mimetype: "application/zip",
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: newsletterJid,
                            newsletterName: botName,
                            serverMessageId: 143,
                        },
                    },
                },
                { quoted: mek },
            );

            await react("✅");
        } catch (error) {
            console.error("GitClone error:", error);
            await react("❌");

            if (error.message?.includes("404")) {
                return reply("Repository not found.");
            } else if (error.message?.includes("rate limit")) {
                return reply(
                    "GitHub API rate limit exceeded. Please try again later.",
                );
            } else {
                return reply(`Failed to download repository: ${error.message}`);
            }
        }
    },
);

mxd(
    {
        pattern: "fb",
        category: "downloader",
        react: "📘",
        aliases: ["fbdl", "facebookdl", "facebook"],
        description: "Download Facebook videos",
    },
    async (from, Malvin, conText) => {
        const {
            q,
            mek,
            reply,
            react,
            botFooter,
            mxdBuffer,
            toAudio,
            MalvinTechApi,
            MalvinApiKey,
        } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Facebook video URL");
        }

        if (!q.includes("facebook.com") && !q.includes("fb.watch")) {
            await react("❌");
            return reply("Please provide a valid Facebook URL");
        }

        try {
            await react("⏳");

            const apiRes = await axios.get(`${MalvinTechApi}/download/fbdown`, {
                params: { apikey: MalvinApiKey, url: q },
                timeout: 30000,
                validateStatus: () => true,
            });
            if (apiRes.status >= 400 || apiRes.data?.status === false) {
                const { rawMessage } = classifyApiError(apiRes.status, apiRes.data);
                throw new Error(rawMessage);
            }
            const result = apiRes.data?.data;

            // Real shape: { title, thumbnail, total, medias: [{quality, download_url, ...}], provider }
            const medias = result?.medias || [];
            if (!medias.length) {
                await react("❌");
                return reply("No video found in this post.");
            }

            const best = medias.find(m => /hd/i.test(m.quality || "")) || medias[0];
            const videoUrl = best.download_url || best.direct_url;
            const thumbnail = result.thumbnail;
            const caption = result.title;

            if (!videoUrl) {
                await react("❌");
                return reply("No downloadable link found in this post.");
            }

            const dateNow = Date.now();
            const buttons = [
                { id: `fb_video_${dateNow}`, text: `Video (${best.quality || "HD"})` },
                { id: `fb_audio_${dateNow}`, text: "Audio Only" },
            ];

            await sendButtons(Malvin, from, {
                title: `\`FACEBOOK DOWNLOADER\``,
                text: caption ? `📝 *${caption.substring(0, 100)}*\n\n*Select download type:*` : `*Select download type:*`,
                footer: botFooter,
                image: { url: thumbnail || "https://via.placeholder.com/400" },
                buttons: buttons,
            });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId) return;
                if (!selectedButtonId.includes(`_${dateNow}`)) return;

                const isFromSameChat = messageData.key?.remoteJid === from;
                if (!isFromSameChat) return;

                await react("⬇️");

                try {
                    if (selectedButtonId.startsWith("fb_audio")) {
                        const videoBuffer = await mxdBuffer(videoUrl);
                        const audioBuffer = await toAudio(videoBuffer);
                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: "facebook_audio.mp3",
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                {
                                    audio: audioBuffer,
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        }
                    } else {
                        const fileSize = await getFileSize(videoUrl);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: { url: videoUrl },
                                    fileName: "facebook_video.mp4",
                                    mimetype: "video/mp4",
                                    caption: caption ? `📝 ${caption.substring(0, 100)}` : "",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                {
                                    video: { url: videoUrl },
                                    mimetype: "video/mp4",
                                    caption: caption ? `📝 ${caption.substring(0, 100)}` : "",
                                },
                                { quoted: messageData },
                            );
                        }
                    }

                    await react("✅");
                } catch (error) {
                    console.error("Facebook download error:", error);
                    await react("❌");
                    await reply("Failed to download. Please try again.", messageData);
                }
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(
                () => Malvin.ev.off("messages.upsert", handleResponse),
                300000,
            );

        } catch (error) {
            console.error("Facebook API error:", error.message);
            await react("❌");
            return reply(`An error occurred: ${error.message}`);
        }
    },
);

mxd(
    {
        pattern: "tiktok",
        category: "downloader",
        react: "🎵",
        aliases: ["tiktokdl", "ttdl", "tt"],
        description: "Download TikTok videos",
    },
    async (from, Malvin, conText) => {
        const {
            q,
            mek,
            reply,
            react,
            botName,
            botFooter,
            mxdBuffer,
            toAudio,
            formatAudio,
            MalvinTechApi,
            MalvinApiKey,
        } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a TikTok URL");
        }

        if (!q.includes("tiktok.com")) {
            await react("❌");
            return reply("Please provide a valid TikTok URL");
        }

        try {
            await react("⏳");

            const apiRes = await axios.get(`${MalvinTechApi}/download/tikwm`, {
                params: { apikey: MalvinApiKey, url: q },
                timeout: 30000,
                validateStatus: () => true,
            });
            if (apiRes.status >= 400 || apiRes.data?.status === false) {
                const { rawMessage } = classifyApiError(apiRes.status, apiRes.data);
                throw new Error(rawMessage);
            }
            const result = apiRes.data?.data;

            // Real shape: { title, author, cover, stats, medias: [{type, quality, url}] }
            const medias = result?.medias || [];
            if (!medias.length) {
                await react("❌");
                return reply("Failed to fetch TikTok video. Please try again.");
            }

            const videoMedia =
                medias.find(m => m.type === "video" && /hd/i.test(m.quality || "")) ||
                medias.find(m => m.type === "video" && /no watermark/i.test(m.quality || "")) ||
                medias.find(m => m.type === "video");
            const audioMedia = medias.find(m => m.type === "audio");
            const isSlideshow = !videoMedia && medias.some(m => m.type === "image");

            if (isSlideshow) {
                const images = medias.filter(m => m.type === "image");
                for (const img of images) {
                    await Malvin.sendMessage(from, { image: { url: img.url } }, { quoted: mek });
                }
                await react("✅");
                return;
            }

            if (!videoMedia) {
                await react("❌");
                return reply("No downloadable video found.");
            }

            const videoUrl = videoMedia.url;
            const title = result.title || "TikTok Video";
            const authorName = result.author?.name || result.author?.username || "Unknown";
            const cover = result.cover;
            const musicUrl = audioMedia?.url || null;
            const stats = result.stats || {};

            const dateNow = Date.now();

            const buttons = [
                { id: `tt_video_${dateNow}`, text: `🎬 ${fancy("Video Only", "mono")}` },
                { id: `tt_audio_${dateNow}`, text: `🎧 ${fancy("Audio only", "mono")}` },
            ];

            await sendButtons(Malvin, from, {
                title: `${botName} TIKTOK DOWNLOADER`,
                text: `*Title:* ${title}\n*Author:* ${authorName}\n❤️ Likes: ${stats.likes || 0}\n👁️ Views: ${stats.views || 0}\n\n*Select download type:*`,
                footer: botFooter,
                image: { url: cover || "https://via.placeholder.com/400" },
                buttons: buttons,
            });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId) return;
                if (!selectedButtonId.includes(`_${dateNow}`)) return;

                const isFromSameChat = messageData.key?.remoteJid === from;
                if (!isFromSameChat) return;

                await react("⬇️");

                try {
                    if (selectedButtonId.startsWith("tt_video")) {
                        const fileSize = await getFileSize(videoUrl);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: { url: videoUrl },
                                    fileName: `${title.replace(/[^\w\s.-]/gi, "")}.mp4`,
                                    mimetype: "video/mp4",
                                    caption: `*${title}*\n👤 ${authorName}\n❤️ ${stats.likes || 0} | 👁️ ${stats.views || 0}`,
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                {
                                    video: { url: videoUrl },
                                    mimetype: "video/mp4",
                                    caption: `*${title}*\n👤 ${authorName}\n❤️ ${stats.likes || 0} | 👁️ ${stats.views || 0}`,
                                },
                                { quoted: messageData },
                            );
                        }
                    } else if (selectedButtonId.startsWith("tt_audio")) {
                        let audioBuffer;

                        if (musicUrl) {
                            audioBuffer = await mxdBuffer(musicUrl);
                            audioBuffer = await formatAudio(audioBuffer);
                        } else {
                            const videoBuffer = await mxdBuffer(videoUrl);
                            audioBuffer = await toAudio(videoBuffer);
                        }

                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: `${title.replace(/[^\w\s.-]/gi, "")}.mp3`,
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                {
                                    audio: audioBuffer,
                                    mimetype: "audio/mpeg",
                                    ptt: false,
                                },
                                { quoted: messageData },
                            );
                        }
                    }

                    await react("✅");
                } catch (error) {
                    console.error("TikTok download error:", error);
                    await react("❌");
                    await reply(
                        "Failed to download. Please try again.",
                        messageData,
                    );
                }
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(
                () => Malvin.ev.off("messages.upsert", handleResponse),
                300000,
            );

        } catch (error) {
            console.error("TikTok API error:", error.message);
            await react("❌");
            return reply(`An error occurred: ${error.message}`);
        }
    },
);

/* DISABLED: /download/x2 (Twitter/X downloader) no longer exists in the API — removed server-side, no replacement endpoint found. Commented out until a new source is wired up.
mxd(
    {
        pattern: "twitter",
        category: "downloader",
        react: "🐦",
        aliases: ["twitterdl", "xdl", "xdownloader", "twitterdownloader", "x"],
        description: "Download Twitter/X videos",
    },
    async (from, Malvin, conText) => {
        const {
            q,
            mek,
            reply,
            react,
            botFooter,
            mxdBuffer,
            toAudio,
            t,
        } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Twitter/X URL");
        }

        if (!q.includes("twitter.com") && !q.includes("x.com")) {
            await react("❌");
            return reply("Please provide a valid Twitter/X URL");
        }

        try {
            await react("⏳");

            const { callMalvinApi } = require("../king/malvinApi");
            const result = await callMalvinApi("/download/x2", { url: q });

            // Real shape: { text, author: {username,...}, media: [{type, download_url, thumbnail, variants}] }
            const mediaItems = result?.media || [];
            const username = result?.author?.username;
            const caption = result?.text;

            const videoItem = mediaItems.find(m => m.type === "video" || m.type === "animated_gif");
            const photoItems = mediaItems.filter(m => m.type === "photo");

            if (!videoItem && !photoItems.length) {
                await react("❌");
                return reply("No downloadable media found in this tweet.");
            }

            if (!videoItem && photoItems.length) {
                for (const photo of photoItems) {
                    await Malvin.sendMessage(
                        from,
                        { image: { url: photo.download_url }, caption: username ? `👤 ${username}` : "" },
                        { quoted: mek },
                    );
                }
                await react("✅");
                return;
            }

            const videoUrl = videoItem.download_url;
            const thumbnail = videoItem.thumbnail;

            if (!videoUrl) {
                await react("❌");
                return reply("No downloadable video URL found for this tweet.");
            }

            const dateNow = Date.now();
            const buttons = [
                { id: `tw_video_${dateNow}`, text: "🎬 Video" },
                { id: `tw_audio_${dateNow}`, text: `🎧 ${fancy("Audio only", "mono")}` },
            ];

            await sendButtons(Malvin, from, {
                title: `\`TWITTER DOWNLOADER\``,
                text: username ? `👤 *${username}*\n📝 *${caption || 'No caption'}*\n\n*Select download type:*` : `*Select download type:*`,
                footer: botFooter,
                image: { url: thumbnail || "https://via.placeholder.com/400" },
                buttons: buttons,
            });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId) return;
                if (!selectedButtonId.includes(`_${dateNow}`)) return;

                const isFromSameChat = messageData.key?.remoteJid === from;
                if (!isFromSameChat) return;

                await react("⬇️");

                try {
                    if (selectedButtonId.startsWith("tw_audio")) {
                        const videoBuffer = await mxdBuffer(videoUrl);
                        const audioBuffer = await toAudio(videoBuffer);
                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: "twitter_audio.mp3",
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                {
                                    audio: audioBuffer,
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        }
                    } else {
                        const fileSize = await getFileSize(videoUrl);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: { url: videoUrl },
                                    fileName: "twitter_video.mp4",
                                    mimetype: "video/mp4",
                                    caption: username ? `👤 ${username}` : "",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                {
                                    video: { url: videoUrl },
                                    mimetype: "video/mp4",
                                    caption: username ? `👤 ${username}` : "",
                                },
                                { quoted: messageData },
                            );
                        }
                    }

                    await react("✅");
                } catch (error) {
                    console.error("Twitter download error:", error);
                    await react("❌");
                    await reply("Failed to download. Please try again.", messageData);
                }
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(
                () => Malvin.ev.off("messages.upsert", handleResponse),
                300000,
            );

        } catch (error) {
            console.error("Twitter API error:", error.rawMessage || error.message);
            await react("❌");
            return reply(t ? t(error.i18nKey || "api.request_failed", { error: error.rawMessage || error.message }) : "An error occurred. Please try again.");
        }
    },
);
*/

mxd(
    {
        pattern: "ig",
        category: "downloader",
        react: "📸",
        aliases: ["insta", "instadl", "igdl", "instagram"],
        description: "Download Instagram reels/videos/images",
    },
    async (from, Malvin, conText) => {
        const {
            q,
            mek,
            reply,
            react,
            botName,
            botFooter,
            mxdBuffer,
            toAudio,
            MalvinTechApi,
            MalvinApiKey,
        } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide an Instagram URL");
        }

        if (!q.includes("instagram.com")) {
            await react("❌");
            return reply("Please provide a valid Instagram URL");
        }

        try {
            await react("⏳");

            // NOTE: /download/igvid was removed server-side. Swapped to
            // /download/instagram2, the closest replacement that still
            // returns a direct video file URL (the plain /download/instagram
            // endpoint only returns a thumbnail for video posts, no file URL).
            // Shape: { media: [{index, type: "video"|"image", url}], total }
            // — no title/thumbnail and no per-item quality variants anymore,
            // so the "best quality" selection and thumbnail preview are gone.
            const apiRes = await axios.get(`${MalvinTechApi}/download/instagram2`, {
                params: { apikey: MalvinApiKey, url: q },
                timeout: 30000,
                validateStatus: () => true,
            });
            if (apiRes.status >= 400 || apiRes.data?.status === false) {
                const { rawMessage } = classifyApiError(apiRes.status, apiRes.data);
                throw new Error(rawMessage);
            }
            const result = apiRes.data?.data;

            const mediaItems = result?.media || [];
            const thumbnail = null; // instagram2 doesn't return one; falls back to placeholder below

            const videoItem = mediaItems.find(m => m.type === "video");
            const imageItems = mediaItems.filter(m => m.type === "image");

            if (!videoItem && !imageItems.length) {
                await react("❌");
                return reply("No downloadable content found.");
            }

            if (!videoItem && imageItems.length) {
                for (const img of imageItems) {
                    if (img.url) {
                        await Malvin.sendMessage(from, { image: { url: img.url } }, { quoted: mek });
                    }
                }
                await react("✅");
                return;
            }

            const videoUrl = videoItem.url;

            if (!videoUrl) {
                await react("❌");
                return reply("No downloadable video URL found.");
            }

            const dateNow = Date.now();
            const buttons = [
                { id: `ig_video_${dateNow}`, text: `🎬 ${fancy("Video Only", "mono")}` },
                { id: `ig_audio_${dateNow}`, text: `🎧 ${fancy("Audio only", "mono")}` },
            ];

            await sendButtons(Malvin, from, {
                title: `\`INSTAGRAM DOWNLOADER\``,
                text: `*Select download type:*`,
                footer: botFooter,
                image: { url: thumbnail || "https://via.placeholder.com/400" },
                buttons: buttons,
            });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId) return;
                if (!selectedButtonId.includes(`_${dateNow}`)) return;

                const isFromSameChat = messageData.key?.remoteJid === from;
                if (!isFromSameChat) return;

                await react("⬇️");

                try {
                    if (selectedButtonId.startsWith("ig_video")) {
                        const fileSize = await getFileSize(videoUrl);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: { url: videoUrl },
                                    fileName: "instagram_video.mp4",
                                    mimetype: "video/mp4",
                                    caption: `*Downloaded via ${botName}*`,
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                {
                                    video: { url: videoUrl },
                                    mimetype: "video/mp4",
                                    caption: `*Downloaded via ${botName}*`,
                                },
                                { quoted: messageData },
                            );
                        }
                    } else if (selectedButtonId.startsWith("ig_audio")) {
                        const videoBuffer = await mxdBuffer(videoUrl);
                        const audioBuffer = await toAudio(videoBuffer);
                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: "instagram_audio.mp3",
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                {
                                    audio: audioBuffer,
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        }
                    }

                    await react("✅");
                } catch (error) {
                    console.error("Instagram download error:", error);
                    await react("❌");
                    await reply(
                        "Failed to download. Please try again.",
                        messageData,
                    );
                }
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(
                () => Malvin.ev.off("messages.upsert", handleResponse),
                300000,
            );

        } catch (error) {
            console.error("Instagram API error:", error.message);
            await react("❌");
            return reply(`An error occurred: ${error.message}`);
        }
    },
);

mxd(
    {
        pattern: "yt",
        category: "downloader",
        react: "▶️",
        aliases: ["ytdl", "youtube", "ytmp4", "ytmp3"],
        description: "Download YouTube videos/audio",
    },
    async (from, Malvin, conText) => {
        const {
            q,
            mek,
            reply,
            react,
            botName,
            botFooter,
            mxdBuffer,
            toAudio,
            MalvinTechApi,
            MalvinApiKey,
        } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a YouTube URL");
        }

        if (!q.includes("youtube.com") && !q.includes("youtu.be")) {
            await react("❌");
            return reply("Please provide a valid YouTube URL");
        }

        try {
            await react("⏳");

            // Confirmed working: /download/youtube2 is a direct passthrough
            // to Hector's YouTube worker, just wrapped in this API's
            // standard {status, data, timestamp} envelope — the inner
            // shape itself is unchanged from before the migration.
            const apiRes = await axios.get(`${MalvinTechApi}/download/youtube2`, {
                params: { apikey: MalvinApiKey, url: q },
                timeout: 30000,
                validateStatus: () => true,
            });
            if (apiRes.status >= 400 || apiRes.data?.status === false) {
                const { rawMessage } = classifyApiError(apiRes.status, apiRes.data);
                throw new Error(rawMessage);
            }
            const result = apiRes.data?.data;

            // Confirmed real shape: { creator, title, thumbnail, audio,
            // videos: {144,240,360,480,720,1080}, available_qualities: [...] }
            const title = result?.title || "YouTube Video";
            const creator = result?.creator;
            const thumbnail = result?.thumbnail;
            const audioUrl = result?.audio;
            const videos = result?.videos || {};
            const PREFERRED_QUALITIES = ["360", "720", "1080"];
            const availableQualities = PREFERRED_QUALITIES.filter(q => videos[q]);

            if (!Object.keys(videos).length && !audioUrl) {
                await react("❌");
                return reply("No downloadable formats found for this video.");
            }

            const dateNow = Date.now();
            const buttons = availableQualities.map(quality => ({
                id: `yt_${quality}_${dateNow}`,
                text: `🎬 ${quality}p`,
            }));
            if (audioUrl) buttons.push({ id: `yt_mp3_${dateNow}`, text: "🎧 MP3 Audio" });

            await sendButtons(Malvin, from, {
                title: `${botName} YOUTUBE DOWNLOADER`,
                text: `*${title}*${creator ? `\n👤 ${creator}` : ""}\n\n*Select quality:*`,
                footer: botFooter,
                image: { url: thumbnail || "https://via.placeholder.com/400" },
                buttons: buttons,
            });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId) return;
                if (!selectedButtonId.includes(`_${dateNow}`)) return;

                const isFromSameChat = messageData.key?.remoteJid === from;
                if (!isFromSameChat) return;

                await react("⬇️");

                try {
                    if (selectedButtonId.startsWith("yt_mp3")) {
                        const audioBuffer = await mxdBuffer(audioUrl);
                        const fileSize = audioBuffer.length;

                        if (fileSize > MAX_MEDIA_SIZE) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: audioBuffer,
                                    fileName: `${title.replace(/[^\w\s.-]/gi, "")}.mp3`,
                                    mimetype: "audio/mpeg",
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                { audio: audioBuffer, mimetype: "audio/mpeg" },
                                { quoted: messageData },
                            );
                        }
                    } else {
                        const parts = selectedButtonId.split("_");
                        const quality = parts[1];
                        const videoUrl = videos[quality];

                        if (!videoUrl) {
                            await react("❌");
                            return reply("Selected quality not available.", messageData);
                        }

                        const fileSize = await getFileSize(videoUrl);
                        const sendAsDoc = fileSize > MAX_MEDIA_SIZE;

                        if (sendAsDoc) {
                            await Malvin.sendMessage(
                                from,
                                {
                                    document: { url: videoUrl },
                                    fileName: `${title.replace(/[^\w\s.-]/gi, "")}_${quality}p.mp4`,
                                    mimetype: "video/mp4",
                                    caption: `*${title}*`,
                                },
                                { quoted: messageData },
                            );
                        } else {
                            await Malvin.sendMessage(
                                from,
                                { video: { url: videoUrl }, mimetype: "video/mp4", caption: `*${title}*` },
                                { quoted: messageData },
                            );
                        }
                    }

                    await react("✅");
                } catch (error) {
                    console.error("YouTube download error:", error);
                    await react("❌");
                    await reply("Failed to download. Please try again.", messageData);
                }
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(
                () => Malvin.ev.off("messages.upsert", handleResponse),
                300000,
            );

        } catch (error) {
            console.error("YouTube API error:", error.message);
            await react("❌");
            return reply(`An error occurred: ${error.message}`);
        }
    },
);

// ==================== FROM dl2.js ====================

// NOTE: sendaudio and sendvideo are handled by malvin/play.js

// ==================== SPOTIFY DOWNLOADER ====================
mxd(
    {
        pattern: "spotify",
        category: "downloader",
        react: "🎧",
        aliases: ["spotifydl", "spotidl", "spoti"],
        description: "Download Spotify tracks by URL or song name",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, botName, botFooter, mxdBuffer, formatAudio, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Spotify URL or song name\n\n*Examples:*\n.spotify https://open.spotify.com/track/...\n.spotify The Spectre Alan Walker");
        }

        const truncate = (str, len) => str && str.length > len ? str.substring(0, len - 2) + ".." : str;

        const downloadAndSend = async (trackUrl, quotedMsg, format = "audio") => {
            try {
                // Endpoint renamed: /download/spotify -> /download/spotidown.
                // Track shape: { type:"track", title, artist, album, download_url, cover, ... }
                const apiUrl = `${MalvinTechApi}/download/spotidown?apikey=${MalvinApiKey}&url=${encodeURIComponent(trackUrl)}`;
                const { data } = await axios.get(apiUrl, { timeout: 30000, validateStatus: () => true });

                if (data?.status === false || !data?.data?.download_url) {
                    const { rawMessage } = classifyApiError(200, data);
                    throw new Error(data?.data?.type && data.data.type !== "track"
                        ? "This is a playlist/album URL — pick a track first, not the whole list."
                        : rawMessage);
                }

                const { title, download_url } = data.data;
                const audioBuffer = await mxdBuffer(download_url);
                
                if (!isValidBuffer(audioBuffer)) {
                    throw new Error("Invalid audio buffer");
                }
                
                const formattedAudio = await formatAudio(audioBuffer);

                if (format === "doc") {
                    await Malvin.sendMessage(from, {
                        document: formattedAudio,
                        fileName: `${(title || "spotify_track").replace(/[^\w\s.-]/gi, "")}.mp3`,
                        mimetype: "audio/mpeg",
                        caption: `🎧 ${title || "Spotify Track"}`,
                    }, { quoted: quotedMsg });
                } else {
                    await Malvin.sendMessage(from, {
                        audio: formattedAudio,
                        mimetype: "audio/mpeg",
                    }, { quoted: quotedMsg });
                }
                await react("✅");
            } catch (error) {
                console.error("Download error:", error.message);
                await react("❌");
                return reply(`Failed to fetch track: ${error.message}`, quotedMsg);
            }
        };

        try {
            if (q.includes("spotify.com")) {
                const dateNow = Date.now();
                const buttonId = `spotify_${dateNow}`;
                
                await sendButtons(Malvin, from, {
                    title: `${botName} SPOTIFY`,
                    text: `*Download this track:*\n\nSelect format:`,
                    footer: botFooter,
                    buttons: [
                        { id: `audio_${buttonId}`, text: "Audio 🎧" },
                        { id: `doc_${buttonId}`, text: "Document 📄" },
                    ],
                });

                const handleResponse = async (event) => {
                    const messageData = event.messages[0];
                    if (!messageData.message) return;

                    const selectedButtonId = extractButtonId(messageData.message);
                    if (!selectedButtonId || !selectedButtonId.includes(dateNow.toString())) return;
                    if (messageData.key?.remoteJid !== from) return;

                    await react("⬇️");
                    const format = selectedButtonId.startsWith('audio_') ? "audio" : "doc";
                    await downloadAndSend(q, messageData, format);
                    Malvin.ev.off("messages.upsert", handleResponse);
                };

                Malvin.ev.on("messages.upsert", handleResponse);
                setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
                return;
            }

            // NOTE: /search/spotifysearch wasn't included in the API source
            // I was given, so this response shape (data.success/data.results)
            // is unverified against the migrated API — confirm if this breaks.
            const searchUrl = `${MalvinTechApi}/search/spotifysearch?apikey=${MalvinApiKey}&query=${encodeURIComponent(q)}`;
            const searchResponse = await axios.get(searchUrl, { timeout: 30000 });
            const data = searchResponse.data;

            if (!data?.success || !data?.results?.length) {
                await react("❌");
                return reply("No tracks found. Try a direct Spotify URL.");
            }

            const tracks = data.results.slice(0, 3);
            const dateNow = Date.now();
            const buttons = tracks.map((track, index) => {
                const title = track.title || track.name || "Unknown Track";
                const artist = track.artist || "";
                const displayName = artist ? `${title} - ${artist}` : title;
                return { id: `sp_${index}_${dateNow}`, text: truncate(displayName, 20) };
            });

            const trackList = tracks.map((track, i) => {
                const title = track.title || track.name || "Unknown";
                const artist = track.artist || "Unknown";
                return `${i + 1}. ${title} - ${artist}`;
            }).join("\n");

            const thumbnailUrl = tracks[0]?.thumbnail || tracks[0]?.image || '';

            await sendButtons(Malvin, from, {
                title: `${botName} SPOTIFY`,
                text: `*Search Results:*\n\n${trackList}\n\n*Select a track:*`,
                footer: botFooter,
                image: { url: thumbnailUrl },
                buttons: buttons,
            });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId || !selectedButtonId.includes(`_${dateNow}`)) return;
                if (messageData.key?.remoteJid !== from) return;

                await react("⬇️");
                const index = parseInt(selectedButtonId.split("_")[1]);
                const selectedTrack = tracks[index];
                const trackUrl = selectedTrack?.url || selectedTrack?.link || selectedTrack?.spotify_url;

                if (!trackUrl) {
                    await react("❌");
                    return reply("Track URL not available.", messageData);
                }
                
                const formatButtonId = `spotifyfmt_${dateNow}`;
                await sendButtons(Malvin, from, {
                    title: `${botName} SPOTIFY`,
                    text: `*${selectedTrack.title || "Track"}*\n\nSelect download format:`,
                    footer: botFooter,
                    buttons: [
                        { id: `audio_${formatButtonId}`, text: "Audio 🎧" },
                        { id: `doc_${formatButtonId}`, text: "Document 📄" },
                    ],
                });

                const formatHandler = async (formatEvent) => {
                    const formatData = formatEvent.messages[0];
                    if (!formatData.message) return;

                    const formatId = extractButtonId(formatData.message);
                    if (!formatId || !formatId.includes(formatButtonId)) return;
                    if (formatData.key?.remoteJid !== from) return;

                    const formatType = formatId.startsWith('audio_') ? "audio" : "doc";
                    await downloadAndSend(trackUrl, formatData, formatType);
                    Malvin.ev.off("messages.upsert", formatHandler);
                };

                Malvin.ev.on("messages.upsert", formatHandler);
                setTimeout(() => Malvin.ev.off("messages.upsert", formatHandler), 300000);
                Malvin.ev.off("messages.upsert", handleResponse);
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
        } catch (error) {
            console.error("Spotify error:", error);
            await react("❌");
            return reply("An error occurred. Please try again.");
        }
    }
);

// ==================== GOOGLE DRIVE DOWNLOADER ====================
mxd(
    {
        pattern: "gdrive",
        category: "downloader",
        react: "📁",
        aliases: ["googledrive", "drive", "gdrivedl"],
        description: "Download from Google Drive",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, mxdBuffer, formatAudio, formatVideo, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Google Drive URL");
        }

        if (!q.includes("drive.google.com")) {
            await react("❌");
            return reply("Please provide a valid Google Drive URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/gdrive?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.status || !response.data?.data?.download_url) {
                await react("❌");
                return reply("Failed to fetch file. Make sure the file is publicly accessible.");
            }

            const { file_name, download_url, file_size } = response.data.data;
            const fileBuffer = await mxdBuffer(download_url);
            
            if (!isValidBuffer(fileBuffer)) {
                await react("❌");
                return reply("Failed to download file.");
            }
            
            const mimetype = getMimeFromUrl(file_name || download_url);
            const mimeCategory = getMimeCategory(mimetype);
            const caption = `📁 *Google Drive*\n📄 ${file_name || "File"}\n📦 ${file_size || "Unknown"}`;

            if (mimeCategory === "audio") {
                const formattedAudio = await formatAudio(fileBuffer);
                await Malvin.sendMessage(from, { audio: formattedAudio, mimetype: "audio/mpeg" }, { quoted: mek });
            } else if (mimeCategory === "video") {
                const formattedVideo = await formatVideo(fileBuffer);
                await Malvin.sendMessage(from, { video: formattedVideo, caption: caption }, { quoted: mek });
            } else if (mimeCategory === "image") {
                await Malvin.sendMessage(from, { image: fileBuffer, caption: caption }, { quoted: mek });
            } else {
                await Malvin.sendMessage(from, { document: fileBuffer, fileName: file_name || "gdrive_file", mimetype: mimetype }, { quoted: mek });
            }

            await react("✅");
        } catch (error) {
            console.error("Google Drive error:", error.message);
            await react("❌");
            reply("Failed to download. File may be deleted or not publicly accessible.");
        }
    }
);

// ==================== MEDIAFIRE DOWNLOADER ====================
mxd(
    {
        pattern: "mediafire",
        category: "downloader",
        react: "🔥",
        aliases: ["mfire", "mediafiredl", "mfiredl"],
        description: "Download from MediaFire",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, mxdBuffer, formatAudio, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a MediaFire URL");
        }

        if (!q.includes("mediafire.com")) {
            await react("❌");
            return reply("Please provide a valid MediaFire URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/mediafire?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.status || !response.data?.data?.download) {
                await react("❌");
                return reply("Failed to fetch file from MediaFire");
            }

            const { filename, filesize, download } = response.data.data;
            const fileBuffer = await mxdBuffer(download);
            
            if (!isValidBuffer(fileBuffer)) {
                await react("❌");
                return reply("Failed to download file.");
            }
            
            const mimetype = getMimeFromUrl(download);
            const mimeCategory = getMimeCategory(mimetype);

            if (mimeCategory === "audio") {
                const formattedAudio = await formatAudio(fileBuffer);
                await Malvin.sendMessage(from, { audio: formattedAudio, mimetype: "audio/mpeg" }, { quoted: mek });
            } else {
                await Malvin.sendMessage(from, {
                    document: fileBuffer,
                    fileName: filename || "mediafire_file",
                    mimetype: mimetype,
                    caption: `🔥 *MediaFire*\n📄 ${filename}\n📦 ${filesize || "Unknown"}`
                }, { quoted: mek });
            }

            await react("✅");
        } catch (error) {
            console.error("MediaFire error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== MEGA DOWNLOADER ====================
mxd(
    {
        pattern: "mega",
        category: "downloader",
        react: "💾",
        aliases: ["megadl", "meganz"],
        description: "Download from MEGA.nz",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, mxdBuffer, formatAudio, formatVideo, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a MEGA URL\n\n*Example:* .mega https://mega.nz/file/xxxx#xxxx");
        }

        if (!q.includes("mega.nz")) {
            await react("❌");
            return reply("Please provide a valid MEGA.nz URL");
        }

        try {
            await react("⬇️");

            // /download/mega returns JSON with a resolved MEGA download link
            // (name, size, mimetype, download) — it does NOT proxy/stream the
            // file itself, so the old arraybuffer fetch against this endpoint
            // was wrong. One call now covers what used to be two (info + dl).
            const apiUrl = `${MalvinTechApi}/download/mega?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const apiRes = await axios.get(apiUrl, { timeout: 30000, validateStatus: () => true });

            if (apiRes.status >= 400 || apiRes.data?.status === false || !apiRes.data?.data?.download) {
                const { rawMessage } = classifyApiError(apiRes.status, apiRes.data);
                await react("❌");
                return reply(`Failed to resolve MEGA link: ${rawMessage}`);
            }

            const { name, size, download } = apiRes.data.data;
            const fileBuffer = await mxdBuffer(download);

            if (!isValidBuffer(fileBuffer)) {
                await react("❌");
                return reply("Failed to download file from MEGA");
            }
            
            const fileName = name || "mega_file";
            const mimetype = getMimeFromUrl(fileName);
            const mimeCategory = getMimeCategory(mimetype);
            const caption = `💾 *MEGA*\n📄 ${fileName}\n📦 ${size || "Unknown"}`;

            if (mimeCategory === "audio") {
                const formattedAudio = await formatAudio(fileBuffer);
                await Malvin.sendMessage(from, { audio: formattedAudio, mimetype: "audio/mpeg" }, { quoted: mek });
            } else if (mimeCategory === "video") {
                const formattedVideo = await formatVideo(fileBuffer);
                await Malvin.sendMessage(from, { video: formattedVideo, caption: caption }, { quoted: mek });
            } else if (mimeCategory === "image") {
                await Malvin.sendMessage(from, { image: fileBuffer, caption: caption }, { quoted: mek });
            } else {
                await Malvin.sendMessage(from, { document: fileBuffer, fileName: fileName, mimetype: mimetype }, { quoted: mek });
            }

            await react("✅");
        } catch (error) {
            console.error("MEGA error:", error.message);
            await react("❌");
            reply("Failed to download. File may be too large (max 500MB) or private.");
        }
    }
);

// ==================== PASTEBIN VIEWER ====================
mxd(
    {
        pattern: "pastebin",
        category: "downloader",
        react: "📋",
        aliases: ["getpaste", "paste", "pastedl", "pastebindl"],
        description: "Fetch content from Pastebin",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, botName, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Pastebin URL\n\n*Example:* .pastebin https://pastebin.com/abc123");
        }

        if (!q.includes("pastebin.com")) {
            await react("❌");
            return reply("Please provide a valid Pastebin URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/pastebin?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });

            if (!response.data?.status || !response.data?.data) {
                await react("❌");
                return reply("Failed to fetch paste. It may be private or deleted.");
            }

            let content = response.data.data;
            content = content.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
            content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

            const pasteId = q.split("/").pop().split("?")[0];
            const header = `*${botName} PASTEBIN*\n*Paste ID:* ${pasteId}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
            const fullMessage = header + content;

            if (fullMessage.length > 65000) {
                await Malvin.sendMessage(from, {
                    document: Buffer.from(content, "utf-8"),
                    fileName: `pastebin_${pasteId}.txt`,
                    caption: `📋 Paste ID: ${pasteId}\n_Content too long, sent as file_`
                }, { quoted: mek });
            } else {
                await reply(fullMessage);
            }

            await react("✅");
        } catch (error) {
            console.error("Pastebin error:", error.message);
            await react("❌");
            reply("Failed to fetch paste. Please try again.");
        }
    }
);

// ==================== ALAMY DOWNLOADER ====================
mxd(
    {
        pattern: "alamy",
        category: "downloader",
        react: "📷",
        aliases: ["alamydl", "alamyvideo"],
        description: "Download videos from Alamy",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide an Alamy URL\n\n*Example:* .alamy https://www.alamy.com/video/...");
        }

        if (!q.includes("alamy.com")) {
            await react("❌");
            return reply("Please provide a valid Alamy URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/alamy?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.video_url) {
                await react("❌");
                return reply("Failed to fetch video from Alamy");
            }

            await Malvin.sendMessage(from, {
                video: { url: data.data.video_url },
                caption: "📷 *Alamy Video*"
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("Alamy error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== SNACKVIDEO DOWNLOADER ====================
mxd(
    {
        pattern: "snack",
        category: "downloader",
        react: "🍿",
        aliases: ["snackvideo", "snackdl", "sck"],
        description: "Download from SnackVideo",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a SnackVideo URL\n\n*Example:* .snack https://sck.io/p/...");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/snack?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.video_url) {
                await react("❌");
                return reply("Failed to fetch video from SnackVideo");
            }

            await Malvin.sendMessage(from, {
                video: { url: data.data.video_url },
                caption: "🍿 *SnackVideo*"
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("SnackVideo error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== TERABOX DOWNLOADER ====================
mxd(
    {
        pattern: "terabox",
        category: "downloader",
        react: "📦",
        aliases: ["teraboxdl", "tbdl", "1024terabox"],
        description: "Download from TeraBox",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a TeraBox URL\n\n*Example:* .terabox https://1024terabox.com/s/xxxxx");
        }

        const validDomains = ["terabox.com", "1024terabox.com", "teraboxapp.com", "terabox.app"];
        if (!validDomains.some(domain => q.includes(domain))) {
            await react("❌");
            return reply("Please provide a valid TeraBox URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/terabox?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 45000 });

            if (!data?.status || !data?.data?.files?.length) {
                await react("❌");
                return reply("Failed to fetch file from TeraBox");
            }

            const file = data.data.files[0];
            
            // If multiple files, show buttons
            if (data.data.total_files > 1) {
                const dateNow = Date.now();
                const buttons = data.data.files.slice(0, 5).map((f, i) => ({
                    id: `tb_${i}_${dateNow}`,
                    text: f.title.length > 20 ? f.title.substring(0, 17) + "..." : f.title
                }));

                await sendButtons(Malvin, from, {
                    title: "📦 TERABOX",
                    text: `*${data.data.total_files} files found*\n\nSelect file to download:`,
                    buttons: buttons,
                });

                const handleResponse = async (event) => {
                    const messageData = event.messages[0];
                    if (!messageData.message) return;

                    const selectedButtonId = extractButtonId(messageData.message);
                    if (!selectedButtonId || !selectedButtonId.includes(dateNow.toString())) return;
                    if (messageData.key?.remoteJid !== from) return;

                    await react("⬇️");
                    const index = parseInt(selectedButtonId.split("_")[1]);
                    const selectedFile = data.data.files[index];
                    
                    await Malvin.sendMessage(from, {
                        document: { url: selectedFile.download_url },
                        fileName: selectedFile.title,
                        caption: `📦 *TeraBox*\n📄 ${selectedFile.title}\n📦 ${selectedFile.size || "Unknown"}`
                    }, { quoted: messageData });
                    
                    await react("✅");
                    Malvin.ev.off("messages.upsert", handleResponse);
                };

                Malvin.ev.on("messages.upsert", handleResponse);
                setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
                return;
            }

            await Malvin.sendMessage(from, {
                document: { url: file.download_url },
                fileName: file.title || "terabox_file",
                caption: `📦 *TeraBox*\n📄 ${file.title}\n📦 ${file.size || "Unknown"}`
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("TeraBox error:", error.message);
            await react("❌");
            reply("Failed to download. Link may be expired or private.");
        }
    }
);

// ==================== VIDSPLAY DOWNLOADER ====================
mxd(
    {
        pattern: "vidsplay",
        category: "downloader",
        react: "🎬",
        aliases: ["vidsplaydl", "vplay"],
        description: "Download from Vidsplay",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Vidsplay URL\n\n*Example:* .vidsplay https://www.vidsplay.com/...");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/vidsplay?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.video_url) {
                await react("❌");
                return reply("Failed to fetch video from Vidsplay");
            }

            await Malvin.sendMessage(from, {
                video: { url: data.data.video_url },
                caption: "🎬 *Vidsplay Video*"
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("Vidsplay error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== TIKTOK V2 DOWNLOADER (tikwm) ====================
mxd(
    {
        pattern: "tiktokv2",
        category: "downloader",
        react: "📱",
        aliases: ["ttv2", "tikv2"],
        description: "Download TikTok videos (No Watermark) - TikWM API",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a TikTok URL\n\n*Example:* .tiktokv2 https://vt.tiktok.com/xxxxx");
        }

        if (!q.toLowerCase().includes("tiktok")) {
            await react("❌");
            return reply("Please provide a valid TikTok URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/tiktokv2?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.video_url) {
                await react("❌");
                return reply("Failed to fetch TikTok video");
            }

            const { video_url, title, author, stats } = data.data;
            const caption = `📱 *TikTok V2*\n👤 ${author?.username || "Unknown"}\n❤️ ${stats?.likes || 0} | 💬 ${stats?.comments || 0} | 🔁 ${stats?.shares || 0}\n\n${title || ""}`;

            await Malvin.sendMessage(from, {
                video: { url: video_url },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("TikTok V2 error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== TIKTOK APLMATE DOWNLOADER ====================
mxd(
    {
        pattern: "tiktok2",
        category: "downloader",
        react: "📱",
        aliases: ["ttaplmate", "tiktokaplmate", "tt2"],
        description: "Download TikTok videos (No Watermark) - Aplmate API",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a TikTok URL\n\n*Example:* .tiktok2 https://vt.tiktok.com/xxxxx");
        }

        if (!q.toLowerCase().includes("tiktok")) {
            await react("❌");
            return reply("Please provide a valid TikTok URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/tiktok2/aplmate?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.download_url) {
                await react("❌");
                return reply("Failed to fetch TikTok video");
            }

            const { title, author, thumbnail, download_url } = data.data;
            const caption = `📱 *TikTok (Aplmate)*\n👤 ${author || "Unknown"}\n\n${title || ""}`;

            await Malvin.sendMessage(from, {
                video: { url: download_url },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("TikTok Aplmate error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== APK DOWNLOADER ====================
mxd(
    {
        pattern: "apk",
        category: "downloader",
        react: "📱",
        aliases: ["app", "apkdl", "appdownload"],
        description: "Download Android APK files",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, botName, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide an app name\n\n*Example:* .apk WhatsApp");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/api/download/apkdl?apikey=${MalvinApiKey}&appName=${encodeURIComponent(q)}`;
            const response = await axios.get(apiUrl, { timeout: 60000 });

            if (!response.data?.success || !response.data?.data) {
                await react("❌");
                return reply("App not found. Please try a different name.");
            }

            const { appname, appicon, developer, download_url } = response.data.data;

            if (!download_url) {
                await react("❌");
                return reply("No download URL available for this app.");
            }

            const caption = `*${botName} APK DOWNLOADER*\n\n*App:* ${appname || q}\n*Developer:* ${developer || "Unknown"}\n\n_Downloading APK..._`;

            await Malvin.sendMessage(from, { image: { url: appicon }, caption: caption }, { quoted: mek });
            await Malvin.sendMessage(from, {
                document: { url: download_url },
                fileName: `${(appname || q).replace(/[^\w\s.-]/gi, "")}.apk`,
                mimetype: "application/vnd.android.package-archive",
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("APK error:", error);
            await react("❌");
            reply("An error occurred. Please try again.");
        }
    }
);
// ==================== TIKTOK5 DOWNLOADER ====================
mxd(
    {
        pattern: "tiktok5",
        category: "downloader",
        react: "📱",
        aliases: ["tt5", "tiktokv5"],
        description: "Download TikTok videos (No Watermark) - Alternative engine v5",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a TikTok URL\n\n*Example:* .tiktok5 https://vt.tiktok.com/xxxxx");
        }

        if (!q.toLowerCase().includes("tiktok")) {
            await react("❌");
            return reply("Please provide a valid TikTok URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/tiktok5?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to fetch TikTok video");
            }

            const result = data.data;
            const videoUrl = result.no_watermark_link || result.no_watermark_link_hd || result.watermark_link;
            
            if (!videoUrl) {
                await react("❌");
                return reply("No video URL found");
            }

            const caption = `📱 *TikTok v5*\n👤 ${result.author_nickname || "Unknown"}\n❤️ ${result.like_count || 0} | 💬 ${result.comment_count || 0} | 🔁 ${result.share_count || 0}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                video: { url: videoUrl },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("TikTok5 error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== TIKTOK7 DOWNLOADER ====================
mxd(
    {
        pattern: "tiktok7",
        category: "downloader",
        react: "📱",
        aliases: ["tt7", "tiktokv7"],
        description: "Download TikTok videos (No Watermark) - TikCDN engine",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a TikTok URL\n\n*Example:* .tiktok7 https://vt.tiktok.com/xxxxx");
        }

        if (!q.toLowerCase().includes("tiktok")) {
            await react("❌");
            return reply("Please provide a valid TikTok URL");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/tiktok7?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to fetch TikTok video");
            }

            const result = data.data;
            const videoUrl = result.no_watermark_link || result.no_watermark_link_hd;
            
            if (!videoUrl) {
                await react("❌");
                return reply("No video URL found");
            }

            const caption = `📱 *TikTok v7*\n👤 ${result.author_nickname || "Unknown"}\n❤️ ${result.like_count || 0} | 💬 ${result.comment_count || 0} | 🔁 ${result.share_count || 0}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                video: { url: videoUrl },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("TikTok7 error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== CAPCUT DOWNLOADER ====================
mxd(
    {
        pattern: "capcut",
        category: "downloader",
        react: "🎬",
        aliases: ["capcutdl", "cct"],
        description: "Download CapCut template videos",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a CapCut URL\n\n*Example:* .capcut https://www.capcut.com/tv2/ZSmm1R7Sd/");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/capcut?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.originalVideoUrl) {
                await react("❌");
                return reply("Failed to fetch CapCut template");
            }

            const result = data.data;
            const caption = `🎬 *CapCut Template*\n📝 ${result.title || "No title"}\n👤 ${result.authorName || "Unknown"}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                video: { url: result.originalVideoUrl },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("CapCut error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== SAVEFROM DOWNLOADER ====================
mxd(
    {
        pattern: "savefrom",
        category: "downloader",
        react: "📥",
        aliases: ["sf", "savefromdl"],
        description: "Download media from SoundCloud and other supported sites",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter, mxdBuffer, formatAudio } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a media URL\n\n*Example:* .savefrom https://soundcloud.com/artist/song");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/savefrom?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.length) {
                await react("❌");
                return reply("Failed to fetch media");
            }

            const media = data.data[0];
            
            if (media.type === "audio") {
                const audioUrl = media.data.url[0]?.url;
                if (audioUrl) {
                    const audioBuffer = await mxdBuffer(audioUrl);
                    const formattedAudio = await formatAudio(audioBuffer);
                    await Malvin.sendMessage(from, {
                        audio: formattedAudio,
                        mimetype: "audio/mpeg",
                        caption: `🎵 *${media.data.meta?.title || "Audio"}*\n\n> *${botFooter}*`
                    }, { quoted: mek });
                } else {
                    await reply("No audio URL found");
                }
            } else {
                await reply("Unsupported media type");
            }

            await react("✅");
        } catch (error) {
            console.error("SaveFrom error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== TWITTER2 DOWNLOADER ====================
mxd(
    {
        pattern: "twitter2",
        category: "downloader",
        react: "🐦",
        aliases: ["x2", "twitterdl2"],
        description: "Download Twitter/X videos (Alternative engine)",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Twitter/X URL\n\n*Example:* .twitter2 https://twitter.com/user/status/123456789");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/twitter2?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.downloadLink) {
                await react("❌");
                return reply("Failed to fetch Twitter video");
            }

            const result = data.data;
            const caption = `🐦 *Twitter/X*\n📝 ${result.videoTitle || "Video"}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                video: { url: result.downloadLink },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("Twitter2 error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== DOUYIN DOWNLOADER ====================
mxd(
    {
        pattern: "douyin",
        category: "downloader",
        react: "🎬",
        aliases: ["douyindl", "dydl"],
        description: "Download Douyin videos (Chinese TikTok)",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Douyin URL\n\n*Example:* .douyin https://www.douyin.com/video/xxxxx");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/douyin?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.downloads?.length) {
                await react("❌");
                return reply("Failed to fetch Douyin video");
            }

            const result = data.data;
            const videoUrl = result.downloads[0]?.url || result.downloads[1]?.url;
            
            if (!videoUrl) {
                await react("❌");
                return reply("No video URL found");
            }

            const caption = `🎬 *Douyin*\n📝 ${result.title || "Video"}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                video: { url: videoUrl },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("Douyin error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== SNACKVIDEO2 DOWNLOADER ====================
mxd(
    {
        pattern: "snackvideo2",
        category: "downloader",
        react: "🍿",
        aliases: ["snack2", "sv2"],
        description: "Download SnackVideo videos (Alternative engine)",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a SnackVideo URL\n\n*Example:* .snackvideo2 https://s.snackvideo.com/p/xxxxx");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/snackvideo2?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.videoUrl) {
                await react("❌");
                return reply("Failed to fetch SnackVideo");
            }

            const result = data.data;
            const caption = `🍿 *SnackVideo*\n📝 ${result.title || "Video"}\n👤 ${result.creator?.name || "Unknown"}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                video: { url: result.videoUrl },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("SnackVideo2 error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== LAHELU DOWNLOADER ====================
mxd(
    {
        pattern: "lahelu",
        category: "downloader",
        react: "🎬",
        aliases: ["laheludl", "lhl"],
        description: "Download videos from Lahelu",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Lahelu URL\n\n*Example:* .lahelu https://lahelu.com/post/xxxxx");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/lahelu?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.media) {
                await react("❌");
                return reply("Failed to fetch Lahelu post");
            }

            const result = data.data;
            const caption = `🎬 *Lahelu*\n📝 ${result.title || "Video"}\n👤 ${result.userUsername || "Unknown"}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                video: { url: result.media },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("Lahelu error:", error.message);
            await react("❌");
            reply("Failed to download. Please try again.");
        }
    }
);

// ==================== FASTDL DOWNLOADER (Instagram) ====================
mxd(
    {
        pattern: "fastdl",
        category: "downloader",
        react: "📸",
        aliases: ["fdl", "fastinstagram"],
        description: "Download Instagram reels, stories, and profile data",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide an Instagram username or post URL\n\n*Example:* .fastdl username\n.fastdl https://www.instagram.com/p/xxxxx");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/fastdl?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.data?.length) {
                await react("❌");
                return reply("Failed to fetch Instagram data");
            }

            const user = data.data.data[0].user;
            const caption = `📸 *Instagram FastDL*\n👤 ${user.username}\n📛 ${user.full_name || "No name"}\n👥 Followers: ${user.follower_count || 0}\n📷 Posts: ${user.media_count || 0}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                image: { url: user.profile_pic_url },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("FastDL error:", error.message);
            await react("❌");
            reply("Failed to fetch Instagram data. Please try again.");
        }
    }
);

// ==================== UMMY DOWNLOADER (Instagram) ====================
mxd(
    {
        pattern: "ummy",
        category: "downloader",
        react: "🖼️",
        aliases: ["ummydl", "instagramdl"],
        description: "Download Instagram profile data and media",
    },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, MalvinTechApi, MalvinApiKey, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide an Instagram username\n\n*Example:* .ummy nasaartemis");
        }

        try {
            await react("⬇️");
            const apiUrl = `${MalvinTechApi}/download/ummy?apikey=${MalvinApiKey}&url=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 30000 });

            if (!data?.status || !data?.data?.data?.length) {
                await react("❌");
                return reply("Failed to fetch Instagram data");
            }

            const user = data.data.data[0].user;
            const caption = `🖼️ *UmmY Instagram*\n👤 @${user.username}\n📛 ${user.full_name || "No name"}\n📝 ${user.biography || "No bio"}\n✅ Verified: ${user.is_verified ? "Yes" : "No"}\n👥 Followers: ${user.follower_count || 0}\n👤 Following: ${user.following_count || 0}\n📷 Posts: ${user.media_count || 0}\n\n> *${botFooter}*`;

            await Malvin.sendMessage(from, {
                image: { url: user.profile_pic_url },
                caption: caption
            }, { quoted: mek });

            await react("✅");
        } catch (error) {
            console.error("UmmY error:", error.message);
            await react("❌");
            reply("Failed to fetch Instagram data. Please try again.");
        }
    }
);
// ==================== NEW PROVIDERS FROM MIGRATED API ====================
// Added from live router source (router/download/*.ts). Each is a
// standalone alternate/new-category downloader — kept simple (fetch,
// send best item) rather than the full button-picker UX the primary
// fb/tiktok/ig/yt commands use, since these are meant as fallbacks or
// newly-available categories.

async function apiGetData(endpoint, params, conText, timeout = 30000) {
    const { MalvinTechApi, MalvinApiKey } = conText;
    const res = await axios.get(`${MalvinTechApi}${endpoint}`, {
        params: { apikey: MalvinApiKey, ...params },
        timeout,
        validateStatus: () => true,
    });
    if (res.status >= 400 || res.data?.status === false) {
        const { rawMessage } = classifyApiError(res.status, res.data);
        throw new Error(rawMessage);
    }
    return res.data?.data;
}

// ---- Threads: primary (direct scrape, best metadata) ----
mxd(
    { pattern: "threads", category: "downloader", react: "🧵", aliases: ["threadsdl"], description: "Download media from a Threads post" },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, botFooter } = conText;
        if (!q || !/threads\.(net|com)\/@[^/]+\/post\//i.test(q)) { await react("❌"); return reply("Please provide a valid Threads post URL"); }
        try {
            await react("⬇️");
            const result = await apiGetData("/download/threads", { url: q }, conText, 30000);
            const medias = result?.medias || [];
            if (!medias.length) { await react("❌"); return reply("No downloadable media found — try .threadsddl or .threadster instead."); }
            const caption = `🧵 *Threads*\n👤 ${result.author?.username ? "@" + result.author.username : "Unknown"}\n📝 ${(result.description || "").substring(0, 150)}\n\n> *${botFooter}*`;
            for (const m of medias) {
                if (m.type === "video") await Malvin.sendMessage(from, { video: { url: m.url }, caption }, { quoted: mek });
                else await Malvin.sendMessage(from, { image: { url: m.url }, caption }, { quoted: mek });
            }
            await react("✅");
        } catch (error) {
            console.error("threads error:", error.message);
            await react("❌");
            return reply(`Failed: ${error.message}\n\nTry .threadsddl or .threadster as alternates.`);
        }
    }
);

// ---- Pinterest ----
mxd(
    { pattern: "pinterest", category: "downloader", react: "📌", aliases: ["pin", "pinterestdl"], description: "Download a Pinterest pin (image/video/carousel/story)" },
    async (from, Malvin, conText) => {
        const { q, mek, reply, react, botFooter } = conText;
        if (!q || !/pinterest\.com\/pin\/|pin\.it\//i.test(q)) { await react("❌"); return reply("Please provide a valid Pinterest pin URL"); }
        try {
            await react("⬇️");
            const result = await apiGetData("/download/pinterestdl", { url: q }, conText, 30000);
            const medias = result?.medias || [];
            if (!medias.length) { await react("❌"); return reply("No media found on this pin."); }
            const caption = `📌 *${result.title || "Pinterest"}*\n📝 ${(result.description || "").substring(0, 150)}\n\n> *${botFooter}*`;
            for (const m of medias) {
                if (m.type === "video") await Malvin.sendMessage(from, { video: { url: m.url }, caption }, { quoted: mek });
                else await Malvin.sendMessage(from, { image: { url: m.url }, caption }, { quoted: mek });
            }
            await react("✅");
        } catch (error) {
            console.error("pinterest error:", error.message);
            await react("❌");
            return reply(`Failed: ${error.message}`);
        }
    }
);

