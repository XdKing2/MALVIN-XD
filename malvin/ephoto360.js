const { mxd } = require("../king");
const { mrxd } = require('../king/mrxd');
const axios = require("axios");
const { sendButtons } = require("malvin-btns");

// ==================== EPHOTO360 EFFECTS ====================

// Helper function for single text effects
async function sendEphotoEffect(from, Malvin, conText, effectName, endpoint, emoji, effectTitle, paramName = "text") {
    const { q, reply, react, MalvinTechApi, MalvinApiKey, botFooter, mek } = conText;

    if (!q) {
        await react("❌");
        return reply(`Please provide text\n\n*Example:* .${effectName} Malvin`);
    }

    try {
        await react("🎨");
        const apiUrl = `${MalvinTechApi}/ephoto360/${endpoint}?apikey=${MalvinApiKey}&${paramName}=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl, { timeout: 30000, validateStatus: () => true });

        if (!data?.status || !data?.data?.image_url) {
            await react("❌");
            return reply(`Failed to generate ${effectTitle} effect. Please try again.`);
        }

        await Malvin.sendMessage(from, {
            image: { url: data.data.image_url },
            caption: `${emoji} *${effectTitle}*\n📝 ${q}\n\n> *${botFooter}*`
        }, { quoted: mek });

        await react("✅");

    } catch (error) {
        console.error(`${effectName} error:`, error.message);
        await react("❌");
        reply(`Failed to generate ${effectTitle} effect. Please try again.`);
    }
}

// ==================== HELP COMMAND (WITH API LINK BUTTON) ====================
mxd({
    pattern: "ephoto",
    category: "tools",
    react: "🖼️",
    aliases: ["ephoto360", "textfx", "texteffect"],
    description: "Generate text effects from Ephoto360",
}, async (from, Malvin, conText) => {
    const { reply, react, botName, botFooter, MalvinTechApi } = conText;

    await react("🖼️");
    
    const message = `╭══〘〘 *EPHOTO360 EFFECTS* 〙〙═⊷
│↠🔥 .fire <text> - Fire effect
│↠💡 .neon <text> - Neon effect
│↠🍥 .naruto <text> - Naruto style
│↠🐉 .dragonball <text> - Dragon Ball
│↠🩷 .blackpink <text> - BlackPink logo
│↠😈 .devil <text> - Devil wings
│↠👾 .glitch <text> - Glitch effect
│↠🕵️ .hacker <text> - Hacker style
│↠🏖️ .sand <text> - Sand writing
│↠🧊 .ice <text> - Ice effect
│↠❄️ .snow <text> - Snow effect
│↠⚙️ .metal <text> - Metallic effect
│↠🟩 .matrix <text> - Matrix style
│↠✨ .light <text> - Light tech
│↠💜 .purple <text> - Purple glow
│↠⚡ .thunder <text> - Thunder effect
│↠🍃 .leaves <text> - Nature brush
│↠🎬 .vintage <text> - 1917 style
│↠🎨 .paint <text> - Paint effect
│↠⚔️ .wings <text> - Wings logo
│↠📱 .rov <text> - ROV wallpaper
│↠🏆 .lolavatar <text> - LoL avatar
│↠⚡ .pubg <text> - PUBG logo
│↠🌌 .galaxycover <text> - Galaxy cover
│↠🎮 .dota <text> - Dota avatar
│↠🐉 .dragonball2 <text> - DBZ alt
│↠💡 .neonsign <text> - Neon signature
│↠📺 .retroneon <text> - Retro neon
│↠🌌 .galaxyneon <text> - Galaxy neon
│↠💙 .blueneon <text> - Blue neon

📝 *Example:* .naruto Malvin

`;

    await sendButtons(Malvin, from, {
        title: botName,
        text: message,
        footer: `> *${botFooter}*`,
        buttons: [
            {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                    display_text: "🌐 API Site",
                    url: MalvinTechApi,
                }),
            },
        ],
    }, { quoted: mrxd });

    await react("✅");
});

// ==================== ALL 31 EFFECTS ====================

mxd({ pattern: "fire", category: "tools", react: "🔥", description: "Blazing fire text effect" }, 
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "fire", "fireText", "🔥", "Fire Text"); });

mxd({ pattern: "neon", category: "tools", react: "💡", description: "Colorful neon glow text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "neon", "neonText", "💡", "Neon Text"); });

mxd({ pattern: "ice", category: "tools", react: "🧊", description: "Frozen ice 3D text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "ice", "iceText", "🧊", "Ice Text"); });

mxd({ pattern: "snow", category: "tools", react: "❄️", description: "Snowy 3D text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "snow", "snowText", "❄️", "Snow Text"); });

mxd({ pattern: "metal", category: "tools", react: "⚙️", aliases: ["metallic"], description: "3D metallic text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "metal", "metallicText", "⚙️", "Metallic Text"); });

mxd({ pattern: "matrix", category: "tools", react: "🟩", description: "Matrix digital rain text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "matrix", "matrixText", "🟩", "Matrix Text"); });

mxd({ pattern: "light", category: "tools", react: "✨", description: "Futuristic light text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "light", "lightText", "✨", "Light Text"); });

mxd({ pattern: "purple", category: "tools", react: "💜", description: "Purple glow text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "purple", "purpleText", "💜", "Purple Text"); });

mxd({ pattern: "thunder", category: "tools", react: "⚡", description: "Electric thunder text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "thunder", "thunderText", "⚡", "Thunder Text"); });

mxd({ pattern: "leaves", category: "tools", react: "🍃", description: "Green nature brush text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "leaves", "leavesText", "🍃", "Leaves Text"); });

mxd({ pattern: "glitchtext", category: "tools", react: "👾", description: "Digital glitch distortion text" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "glitch", "glitchText", "👾", "Glitch Text"); });

mxd({ pattern: "hacker", category: "tools", react: "🕵️", description: "Anonymous hacker cyan neon text" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "hacker", "hackerText", "🕵️", "Hacker Text"); });

mxd({ pattern: "sand", category: "tools", react: "🏖️", description: "Write your name on the beach sand" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "sand", "sandText", "🏖️", "Sand Text"); });

mxd({ pattern: "naruto", category: "tools", react: "🍥", description: "Naruto Shippuden logo style" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "naruto", "naruto", "🍥", "Naruto Text"); });

mxd({ pattern: "dragonball", category: "tools", react: "🐉", aliases: ["dbz"], description: "Dragon Ball Z style text" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "dragonball", "dragonBall", "🐉", "Dragon Ball Text"); });

mxd({ pattern: "glossy", category: "tools", react: "🥈", description: "Glossy silver 3D text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "glossy", "glossySilver", "🥈", "Glossy Silver"); });

mxd({ pattern: "blackpink", category: "tools", react: "🩷", aliases: ["bp"], description: "BlackPink style logo" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "blackpink", "blackpinkLogo", "🩷", "BlackPink Logo"); });

mxd({ pattern: "devil", category: "tools", react: "😈", description: "Neon devil wings text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "devil", "devilText", "😈", "Devil Text"); });

mxd({ pattern: "vintage", category: "tools", react: "🎬", description: "1917 vintage movie style text" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "vintage", "vintageText", "🎬", "Vintage Text"); });

mxd({ pattern: "wings", category: "tools", react: "⚔️", description: "Arena of Valor / Wings logo" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "wings", "wingsLogo", "⚔️", "Wings Logo"); });

mxd({ pattern: "paint", category: "tools", react: "🎨", description: "3D colorful paint text effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "paint", "paintText", "🎨", "Paint Text"); });

mxd({ pattern: "rov", category: "tools", react: "📱", description: "AOV / ROV mobile wallpaper" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "rov", "rovWallpaper", "📱", "ROV Wallpaper", "name"); });

mxd({ pattern: "lolavatar", category: "tools", react: "🏆", description: "League of Legends avatar" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "lolavatar", "lolAvatar", "🏆", "LoL Avatar", "name"); });

mxd({ pattern: "pubg", category: "tools", react: "⚡", description: "Lightning PUBG video logo" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "pubg", "pubgLogo", "⚡", "PUBG Logo", "name"); });

mxd({ pattern: "galaxycover", category: "tools", react: "🌌", description: "Galaxy cover for LoL" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "galaxycover", "galaxyCover", "🌌", "Galaxy Cover", "name"); });

mxd({ pattern: "dota", category: "tools", react: "🎮", description: "Dota 2 avatar with your name" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "dota", "dotaAvatar", "🎮", "Dota Avatar", "name"); });

mxd({ pattern: "dragonball2", category: "tools", react: "🐉", description: "Dragon Ball style (alternate)" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "dragonball2", "dragonBall809", "🐉", "Dragon Ball Alt"); });

mxd({ pattern: "neonsign", category: "tools", react: "💡", description: "Neon light signature effect" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "neonsign", "neonSignature", "💡", "Neon Signature", "signature"); });

mxd({ pattern: "retroneon", category: "tools", react: "📺", description: "Retro neon text - 80s style" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "retroneon", "retroNeon", "📺", "Retro Neon"); });

mxd({ pattern: "galaxyneon", category: "tools", react: "🌌", description: "Neon light with galaxy style" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "galaxyneon", "galaxyNeon", "🌌", "Galaxy Neon"); });

mxd({ pattern: "blueneon", category: "tools", react: "💙", description: "Blue neon logo online" },
async (from, Malvin, conText) => { await sendEphotoEffect(from, Malvin, conText, "blueneon", "blueNeonLogo", "💙", "Blue Neon Logo"); });