const { mxd } = require("../king");
const { mrxd } = require('../king/mrxd');
const { sendButtons } = require("malvin-btns");
const axios = require("axios");
const { classifyApiError } = require("../king/mxdcore2");
const { fancy } = require("../king/fancyFont");

async function sendCanvasImage(from, Malvin, conText, endpoint, params, caption) {
    const { react, MalvinTechApi, MalvinApiKey, mek } = conText;

    try {
        await react("🎨");
        // Default JSON response: { status, data: { url }, timestamp }.
        // Just hand the URL straight to WhatsApp — no need to download the
        // bytes ourselves and re-upload them.
        const res = await axios.get(`${MalvinTechApi}/canvas/${endpoint}`, {
            params: { apikey: MalvinApiKey, ...params },
            timeout: 30000,
            validateStatus: () => true,
        });

        if (res.status >= 400 || res.data?.status === false || !res.data?.data?.url) {
            const { rawMessage } = classifyApiError(res.status, res.data);
            throw new Error(rawMessage);
        }

        await Malvin.sendMessage(from, {
            image: { url: res.data.data.url },
            caption: caption
        }, { quoted: mek });
        
        await react("✅");
    } catch (err) {
        console.error(`${endpoint} error:`, err.message);
        await react("❌");
        conText.reply(`Failed to generate image: ${err.message}`);
    }
}

// ==================== FILTERS ====================

mxd({ pattern: "greyscale", category: "canvas", react: "🎨", description: "Convert image to greyscale" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .greyscale <image_url>");
    await sendCanvasImage(from, Malvin, conText, "greyscale", { image: q }, "🎨 Greyscale Filter");
});

mxd({ pattern: "invert", category: "canvas", react: "🎨", description: "Invert image colors" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .invert <image_url>");
    await sendCanvasImage(from, Malvin, conText, "invert", { image: q }, "🎨 Invert Colors");
});

mxd({ pattern: "blur", category: "canvas", react: "🌀", description: "Apply blur effect to image" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .blur <image_url>");
    await sendCanvasImage(from, Malvin, conText, "blur", { image: q }, "🌀 Blur Effect");
});

mxd({ pattern: "darkness", category: "canvas", react: "🌑", description: "Apply darkness effect to image" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .darkness <image_url> <amount>\nExample: .darkness image.jpg 50");
    const parts = q.split(/\s+/);
    const image = parts[0];
    const amount = parts[1];
    if (!image) return conText.reply("Please provide image URL");
    if (!amount) return conText.reply("Please provide amount value (0-100)");
    await sendCanvasImage(from, Malvin, conText, "darkness", { image, amount }, "🌑 Darkness Filter");
});

mxd({ pattern: "circle", category: "canvas", react: "⭕", description: "Crop image to circle shape" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .circle <image_url>");
    await sendCanvasImage(from, Malvin, conText, "circle", { image: q }, "⭕ Circle Crop");
});

// ==================== MEMES ====================

mxd({ pattern: "affect", category: "canvas", react: "😢", description: "Generate 'affect' meme" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .affect <image_url>");
    await sendCanvasImage(from, Malvin, conText, "affect", { image: q }, "😢 Affect Meme");
});

mxd({ pattern: "beautiful", category: "canvas", react: "✨", description: "Generate 'beautiful' meme" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .beautiful <image_url>");
    await sendCanvasImage(from, Malvin, conText, "beautiful", { image: q }, "✨ Beautiful Meme");
});

mxd({ pattern: "facepalm", category: "canvas", react: "🤦", description: "Add facepalm effect" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .facepalm <image_url>");
    await sendCanvasImage(from, Malvin, conText, "facepalm", { image: q }, "🤦 Facepalm");
});

mxd({ pattern: "delete", category: "canvas", react: "🗑️", description: "Generate delete confirmation card" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .delete <image_url>");
    await sendCanvasImage(from, Malvin, conText, "delete", { image: q }, "🗑️ Delete Card");
});

// NOTE: .xn (endpoint "xnxx") and .fakeg (endpoint "fake-xnxx") were
// removed — those endpoints don't exist in the migrated canvas API at all
// (only the effects listed in canvas.ts's EFFECTS table are live).

mxd({ pattern: "kisspic", category: "canvas", react: "😘", description: "Kiss effect between two images" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .kiss <image1_url> | <image2_url>");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 2) return conText.reply("Missing: image1 and image2 (both required)");
    const [image1, image2] = parts;
    await sendCanvasImage(from, Malvin, conText, "kiss", { image1, image2 }, "😘 Kiss");
});

mxd({ pattern: "batslap", category: "canvas", react: "🦇", description: "Bat slap meme with two faces" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .batslap <image1_url> | <image2_url>");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 2) return conText.reply("Missing: image1 and image2 (both required)");
    const [image1, image2] = parts;
    await sendCanvasImage(from, Malvin, conText, "batslap", { image1, image2 }, "🦇 Bat Slap");
});

mxd({ pattern: "captcha", category: "canvas", react: "🔐", description: "Generate captcha verification image" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .captcha <background_url> | <captcha_key>\nExample: .captcha bg.jpg | ABC123");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 2) return conText.reply("Missing: background_url and captcha_key (both required)");
    const [background, captchaKey] = parts;
    await sendCanvasImage(from, Malvin, conText, "captcha", { background, captchaKey }, "🔐 Captcha");
});

// NOTE: .gay (endpoint "gay") was removed — that endpoint doesn't exist
// in the migrated canvas API.

mxd({ pattern: "ship", category: "canvas", react: "💕", description: "Generate relationship percentage card" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .ship <avatar1_url> | <avatar2_url> | <percentage> | <background_url>\nExample: .ship face1.jpg | face2.jpg | 75 | bg.jpg");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 4) return conText.reply("Missing: avatar1, avatar2, persen, background (all required)");
    const [avatar1, avatar2, persen, background] = parts;
    await sendCanvasImage(from, Malvin, conText, "ship", { avatar1, avatar2, persen, background }, `💕 Ship Match: ${persen}%`);
});

// ==================== SOCIAL CARDS ====================

mxd({ pattern: "tweet", category: "canvas", react: "🐦", description: "Generate X/Twitter post card" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .tweet <displayName> | <username> | <comment> | <avatar> | <verified> | <theme>\nExample: .tweet Malvin | malvinking | Hello world | avatar.jpg | true | dark");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 4) return conText.reply("Missing: displayName, username, comment, avatar (all required)");
    const [displayName, username, comment, avatar, verified, theme] = parts;
    await sendCanvasImage(from, Malvin, conText, "tweet", { displayName, username, comment, avatar, verified: verified || "false", theme: theme || "dark" }, "🐦 Tweet Card");
});

mxd({ pattern: "spotifycard", category: "canvas", react: "🎧", description: "Generate Spotify music card" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .spotify <title> | <artist> | <start m:ss> | <end m:ss> | <image_url>\nExample: .spotify Blinding Lights | The Weeknd | 1:23 | 3:20 | album.jpg");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 5) return conText.reply("Missing: title, artist, start, end, image (all required)");
    const [title, artist, start, end, image] = parts;
    await sendCanvasImage(from, Malvin, conText, "spotify", { title, artist, start, end, image }, "🎧 Spotify Card");
});

mxd({ pattern: "cprofile", category: "canvas", react: "👤", description: "Generate user profile/level card" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .profile <background> | <avatar> | <rankName> | <exp> | <requireExp> | <level> | <name>\nExample: .profile bg.jpg | avatar.jpg | Master | 500 | 1000 | 10 | Malvin");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 7) return conText.reply("Missing: background, avatar, rankName, exp, requireExp, level, name (all required)");
    const [backgroundURL, avatarURL, rankName, exp, requireExp, level, name] = parts;
    await sendCanvasImage(from, Malvin, conText, "profile", { backgroundURL, avatarURL, rankName, exp, requireExp, level, name }, `👤 ${name}'s Profile`);
});

mxd({ pattern: "levelup", category: "canvas", react: "⬆️", description: "Generate level up notification card" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .levelup <background> | <avatar> | <fromLevel> | <toLevel> | <name>\nExample: .levelup bg.jpg | avatar.jpg | 9 | 10 | Malvin");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 5) return conText.reply("Missing: background, avatar, fromLevel, toLevel, name (all required)");
    const [backgroundURL, avatarURL, fromLevel, toLevel, name] = parts;
    await sendCanvasImage(from, Malvin, conText, "level-up", { backgroundURL, avatarURL, fromLevel, toLevel, name }, `⬆️ ${name} Leveled Up!`);
});

mxd({ pattern: "security", category: "canvas", react: "🛡️", description: "Generate security verification card" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .security <avatar> | <background> | <createdTimestamp> | <suspectTimestamp>\nExample: .security avatar.jpg | bg.jpg | 1672531200000 | 604800000");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 4) return conText.reply("Missing: avatar, background, createdTimestamp, suspectTimestamp (all required)");
    const [avatar, background, createdTimestamp, suspectTimestamp] = parts;
    await sendCanvasImage(from, Malvin, conText, "security", { avatar, background, createdTimestamp, suspectTimestamp }, "🛡️ Security Check");
});

// ==================== WELCOME/GREETING CARDS ====================

mxd({ pattern: "goodbyev1", category: "canvas", react: "👋", description: "Generate goodbye card V1" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .goodbyev1 <username> | <guildName> | <memberCount> | <avatar> | <guildIcon> | <background> | <quality>\nExample: .goodbyev1 Malvin | MyServer | 100 | avatar.jpg | icon.jpg | bg.jpg | 80");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 4) return conText.reply("Missing: username, guildName, memberCount, avatar (all required)");
    const [username, guildName, memberCount, avatar, guildIcon, background, quality] = parts;
    if (!guildIcon) return conText.reply("Missing: guildIcon (required)");
    if (!background) return conText.reply("Missing: background (required)");
    await sendCanvasImage(from, Malvin, conText, "goodbyev1", { username, guildName, memberCount, avatar, guildIcon, background, quality: quality || "80" }, `👋 Goodbye ${username}`);
});

mxd({ pattern: "goodbyev2", category: "canvas", react: "👋", description: "Generate goodbye card V2" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .goodbyev2 <username> | <guildName> | <memberCount> | <avatar> | <background>\nExample: .goodbyev2 Malvin | MyServer | 100 | avatar.jpg | bg.jpg");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 5) return conText.reply("Missing: username, guildName, memberCount, avatar, background (all required)");
    const [username, guildName, memberCount, avatar, background] = parts;
    await sendCanvasImage(from, Malvin, conText, "goodbyev2", { username, guildName, memberCount, avatar, background }, `👋 Goodbye ${username}`);
});

mxd({ pattern: "goodbyev3", category: "canvas", react: "👋", description: "Generate goodbye card V3" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .goodbyev3 <username> | <avatar>\nExample: .goodbyev3 Malvin | avatar.jpg");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 2) return conText.reply("Missing: username and avatar (both required)");
    const [username, avatar] = parts;
    await sendCanvasImage(from, Malvin, conText, "goodbyev3", { username, avatar }, `👋 Goodbye ${username}`);
});

mxd({ pattern: "goodbyev4", category: "canvas", react: "👋", description: "Generate goodbye card V4" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .goodbyev4 <avatar> | <background> | <title> | <description>\nExample: .goodbyev4 avatar.jpg | bg.jpg | Goodbye | We'll miss you!");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 4) return conText.reply("Missing: avatar, background, title, description (all required)");
    const [avatar, background, title, description] = parts;
    await sendCanvasImage(from, Malvin, conText, "goodbyev4", { avatar, background, title, description }, `👋 ${title}`);
});

mxd({ pattern: "goodbyev5", category: "canvas", react: "👋", description: "Generate goodbye card V5" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .goodbyev5 <username> | <guildName> | <memberCount> | <avatar> | <background> | <quality>\nExample: .goodbyev5 Malvin | MyServer | 100 | avatar.jpg | bg.jpg | 90");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 5) return conText.reply("Missing: username, guildName, memberCount, avatar, background (all required)");
    const [username, guildName, memberCount, avatar, background, quality] = parts;
    await sendCanvasImage(from, Malvin, conText, "goodbyev5", { username, guildName, memberCount, avatar, background, quality: quality || "90" }, `👋 Goodbye ${username}`);
});

mxd({ pattern: "welcomev1", category: "canvas", react: "👋", description: "Generate welcome card V1" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .welcomev1 <username> | <guildName> | <memberCount> | <avatar> | <guildIcon> | <background> | <quality>\nExample: .welcomev1 Malvin | MyServer | 100 | avatar.jpg | icon.jpg | bg.jpg | 80");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 4) return conText.reply("Missing: username, guildName, memberCount, avatar (all required)");
    const [username, guildName, memberCount, avatar, guildIcon, background, quality] = parts;
    if (!guildIcon) return conText.reply("Missing: guildIcon (required)");
    if (!background) return conText.reply("Missing: background (required)");
    await sendCanvasImage(from, Malvin, conText, "welcomev1", { username, guildName, memberCount, avatar, guildIcon, background, quality: quality || "80" }, `👋 Welcome ${username}`);
});

mxd({ pattern: "welcomev2", category: "canvas", react: "👋", description: "Generate welcome card V2" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .welcomev2 <username> | <guildName> | <memberCount> | <avatar> | <background>\nExample: .welcomev2 Malvin | MyServer | 100 | avatar.jpg | bg.jpg");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 5) return conText.reply("Missing: username, guildName, memberCount, avatar, background (all required)");
    const [username, guildName, memberCount, avatar, background] = parts;
    await sendCanvasImage(from, Malvin, conText, "welcomev2", { username, guildName, memberCount, avatar, background }, `👋 Welcome ${username}`);
});

mxd({ pattern: "welcomev3", category: "canvas", react: "👋", description: "Generate welcome card V3" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .welcomev3 <username> | <avatar>\nExample: .welcomev3 Malvin | avatar.jpg");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 2) return conText.reply("Missing: username and avatar (both required)");
    const [username, avatar] = parts;
    await sendCanvasImage(from, Malvin, conText, "welcomev3", { username, avatar }, `👋 Welcome ${username}`);
});

mxd({ pattern: "welcomev4", category: "canvas", react: "👋", description: "Generate welcome card V4" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .welcomev4 <avatar> | <background> | <description>\nExample: .welcomev4 avatar.jpg | bg.jpg | Welcome to the server!");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 3) return conText.reply("Missing: avatar, background, description (all required)");
    const [avatar, background, description] = parts;
    await sendCanvasImage(from, Malvin, conText, "welcomev4", { avatar, background, description }, "👋 Welcome!");
});

mxd({ pattern: "welcomev5", category: "canvas", react: "👋", description: "Generate welcome card V5" },
async (from, Malvin, conText) => {
    const { q } = conText;
    if (!q) return conText.reply("Usage: .welcomev5 <username> | <guildName> | <memberCount> | <avatar> | <background> | <quality>\nExample: .welcomev5 Malvin | MyServer | 100 | avatar.jpg | bg.jpg | 90");
    const parts = q.split("|").map(s => s.trim());
    if (parts.length < 5) return conText.reply("Missing: username, guildName, memberCount, avatar, background (all required)");
    const [username, guildName, memberCount, avatar, background, quality] = parts;
    await sendCanvasImage(from, Malvin, conText, "welcomev5", { username, guildName, memberCount, avatar, background, quality: quality || "90" }, `👋 Welcome ${username}`);
});

// ==================== HELP COMMAND ====================

mxd({ pattern: "canvashelp", category: "canvas", react: "🎨", aliases: ["canvas", "canvasmenu"], description: "Show all canvas commands" },
async (from, Malvin, conText) => {
    const { react, botName, botFooter, newsletterUrl } = conText;
    await react("🎨");
    
    const msg = `╭══〘〘 *CANVAS* 〙〙═⊷
│
│━━ *FILTERS* ━━
│↠ .greyscale
│↠ .invert 
│↠ .blur
│↠ .darkness 
│↠ .circle
│
━━ *MEMES* ━━
│↠ .affect
│↠ .beautiful
│↠ .facepalm
│↠ .delete 
│↠ .kiss
│↠ .batslap 
│↠ .captcha 
│↠ .ship 
│
━━ *SOCIAL* ━━
│↠ .tweet 
│↠ .spotify 
│↠ .profile 
│↠ .levelup
│↠ .security
│
━━ *GREETINGS* ━━
│↠ .goodbyev1
│↠ .goodbyev2
│↠ .goodbyev3
│↠ .goodbyev4
│↠ .goodbyev5
│↠ .welcomev1
│↠ .welcomev2
│↠ .welcomev3
│↠ .welcomev4
│↠ .welcomev5 
│
╰══════════════⊷

📝 *Separate parameters with | (pipe)*

`;

    await sendButtons(Malvin, from, {
        title: `CANVAS`,
        text: msg,
        footer: `> *${botFooter}*`,
        buttons: [
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: `📢 ${fancy("Join Channel", "mono")}`,
                    url: newsletterUrl,
                }),
            },
        ],
    }, { quoted: mrxd });
    
    await react("✅");
});