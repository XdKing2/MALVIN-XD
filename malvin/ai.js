const { mxd } = require("../king");
const { mrxd } = require('../king/mrxd');
const { sendButtons } = require("malvin-btns");
const axios = require("axios");
const { classifyApiError } = require("../king/mxdcore2");
const { fancy } = require("../king/fancyFont");

// ==================== SHARED HELPERS ====================

/**
 * Generic text-AI caller. `extractText(data)` pulls the reply text out of
 * the endpoint's own `data` shape (they're not all identical — malvinai
 * nests under .result, gemini under .text, etc).
 */
async function queryAI(endpoint, paramName, query, conText, extractText) {
  const { reply, MalvinTechApi, MalvinApiKey } = conText;

  if (!query) {
    return reply("Please provide a question or prompt.");
  }

  try {
    const res = await axios.get(`${MalvinTechApi}/ai/${endpoint}`, {
      params: { apikey: MalvinApiKey, [paramName]: query },
      timeout: 100000,
      validateStatus: () => true,
    });

    if (res.status >= 400 || res.data?.status === false) {
      const { rawMessage } = classifyApiError(res.status, res.data);
      return reply(`Failed to get a response: ${rawMessage}`);
    }

    const responseText = extractText(res.data?.data);
    if (!responseText) return reply("No response received.");
    reply(typeof responseText === 'string' ? responseText : JSON.stringify(responseText));
  } catch (err) {
    console.error(`AI ${endpoint} error:`, err.message);
    reply("Error: " + err.message);
  }
}

/**
 * Generic image-AI caller. All live image endpoints now return JSON
 * (`{ data: { image_url } }`) rather than raw image bytes, so this just
 * fetches the URL and hands it straight to sendButtons.
 */
async function generateImage(endpoint, params, conText, captionLabel, promptForCaption) {
  const { reply, Malvin, from, MalvinTechApi, MalvinApiKey, botFooter, newsletterUrl } = conText;

  try {
    const res = await axios.get(`${MalvinTechApi}/ai/${endpoint}`, {
      params: { apikey: MalvinApiKey, ...params },
      timeout: 120000,
      validateStatus: () => true,
    });

    if (res.status >= 400 || res.data?.status === false) {
      const { rawMessage } = classifyApiError(res.status, res.data);
      return reply(`Failed to generate image: ${rawMessage}`);
    }

    const imageUrl = res.data?.data?.image_url;
    if (!imageUrl) return reply("No image generated.");

    await sendButtons(Malvin, from, {
      text: `🎨 *${captionLabel}*\n📝 ${promptForCaption}`,
      footer: `> *${botFooter}*`,
      image: { url: imageUrl },
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
  } catch (err) {
    console.error(`Image generation ${endpoint} error:`, err.message);
    reply("Error generating image: " + err.message);
  }
}

// ==================== TEXT AI COMMANDS ====================

mxd({ pattern: "malvinai", aliases: ["ai"], description: "Chat with MalvinAI assistant", category: "ai", filename: __filename },
async (from, Malvin, conText) => { await queryAI("malvinai", "text", conText.q, conText, (data) => data?.result); });

mxd({ pattern: "gemini", description: "Chat with Google Gemini", category: "ai", filename: __filename },
async (from, Malvin, conText) => { await queryAI("gemini", "prompt", conText.q, conText, (data) => data?.text); });

mxd({ pattern: "venice", aliases: ["veniceai"], description: "Chat with Venice AI (Dolphin 3.0)", category: "ai", filename: __filename },
async (from, Malvin, conText) => { await queryAI("venice", "text", conText.q, conText, (data) => data?.result); });

mxd({ pattern: "lumo", description: "Chat with Proton Lumo AI (encrypted)", category: "ai", filename: __filename },
async (from, Malvin, conText) => { await queryAI("lumo", "text", conText.q, conText, (data) => data?.result); });

mxd({ pattern: "bibleai", description: "Ask Bible questions with scripture references", category: "ai", filename: __filename },
async (from, Malvin, conText) => { await queryAI("bibleai", "question", conText.q, conText, (data) => data?.results?.answer); });

mxd({ pattern: "gita", description: "Ask questions about Bhagavad Gita wisdom", category: "ai", filename: __filename },
async (from, Malvin, conText) => { await queryAI("gita", "q", conText.q, conText, (data) => data); });

// ==================== IMAGE GENERATION COMMANDS ====================

mxd({ pattern: "dalle", description: "Generate images using DALL-E AI", category: "aiimage", filename: __filename },
async (from, Malvin, conText) => {
  const { q, reply } = conText;
  if (!q) return reply("Usage: .dalle <prompt>");
  await generateImage("dalle", { prompt: q }, conText, "DALL-E", q);
});

mxd({ pattern: "fluxai", aliases: ["flux"], description: "Generate images using Flux AI", category: "aiimage", filename: __filename },
async (from, Malvin, conText) => {
  const { q, reply } = conText;
  if (!q) return reply("Usage: .fluxai <prompt>");
  await generateImage("flux", { prompt: q }, conText, "FLUX AI", q);
});

mxd({ pattern: "diffusion", description: "Generate images using Stable Diffusion", category: "aiimage", filename: __filename },
async (from, Malvin, conText) => {
  const { q, reply } = conText;
  if (!q) return reply("Usage: .diffusion <prompt>");
  await generateImage("diffusion", { prompt: q }, conText, "STABLE DIFFUSION", q);
});

mxd({ pattern: "deepimg", description: "Generate images with Deep Image Flux AI (optional style)", category: "aiimage", filename: __filename },
async (from, Malvin, conText) => {
  const { q, reply } = conText;
  if (!q) return reply("Usage: .deepimg <prompt> | <style>\nStyles: realistic, anime, fantasy, sci-fi, cyberpunk");
  const [prompt, style] = q.split("|").map(s => s.trim());
  await generateImage("deepimg", { prompt: prompt || q, style: style || "realistic" }, conText, "DEEP IMAGE FLUX", `${prompt || q}${style ? `\n🎭 Style: ${style}` : ''}`);
});

mxd({ pattern: "pollinations", description: "Generate AI images using Pollinations (Stable Diffusion)", category: "aiimage", filename: __filename },
async (from, Malvin, conText) => {
  const { q, reply } = conText;
  if (!q) return reply("Usage: .pollinations <prompt>");
  await generateImage("pollination", { prompt: q }, conText, "POLLINATIONS AI", q);
});

mxd({ pattern: "animagine", description: "Generate anime images with Animagine XL 4.0 (optional ratio)", category: "aiimage", filename: __filename },
async (from, Malvin, conText) => {
  const { q, reply } = conText;
  if (!q) return reply("Usage: .animagine <prompt> | <ratio>\nRatios: 1:1, 9:7, 7:9, 19:13, 13:19, 7:4, 4:7, 12:5, 5:12");
  const [prompt, ratio] = q.split("|").map(s => s.trim());
  await generateImage("animegine", { prompt: prompt || q, ratio: ratio || "1:1" }, conText, "ANIMAGINE XL 4.0", `${prompt || q}${ratio ? `\n📐 Ratio: ${ratio}` : ''}`);
});

// ==================== AI LIST COMMAND ====================

mxd({ pattern: "ailist", description: "List all available AI commands", category: "ai", filename: __filename },
async (from, Malvin, conText) => {
  const { botFooter, newsletterUrl } = conText;

  const commands = `╭══〘〘 *AI COMMANDS* 〙〙═⊷
│
│━━ *📝 TEXT AI* ━━
│↠ .malvinai / .ai - MalvinAI
│↠ .gemini - Google Gemini
│↠ .venice - Venice AI
│↠ .lumo - Proton Lumo AI
│↠ .bibleai - Bible AI
│↠ .gita - Bhagavad Gita
│
━━ *🎨 IMAGE AI* ━━
│↠ .dalle - DALL-E
│↠ .fluxai - Flux AI
│↠ .diffusion - Stable Diffusion
│↠ .deepimg - Deep Image Flux (optional style)
│↠ .pollinations - Pollinations AI
│↠ .animagine - Animagine XL 4.0 (optional ratio)
│
╰═════════════════⊷

📝 *Examples:*
.malvinai Hello
.animagine cute anime girl | 9:7
.deepimg a lighthouse at sunset | realistic

`;

  await sendButtons(Malvin, from, {
    title: `AI MENU`,
    text: commands,
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
});
