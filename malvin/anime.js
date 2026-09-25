const { mxd } = require("../king");
const { mrxd } = require('../king/mrxd');
const { sendButtons } = require("malvin-btns");
const axios = require("axios");
const { classifyApiError } = require("../king/mxdcore2");
const { fancy } = require("../king/fancyFont");

// ==================== ANIME/MOVIE PROVIDERS ====================
// Full provider swap after the API migration — none of the old
// providers (otakudesu, auratail, anichin*, oploverz*, komikindo*,
// anime-quotes) exist anymore. Replaced with these 11, each exposed
// as one command covering all of that provider's actions via a
// `| <action>` suffix (defaults to that provider's own default action).
//
// Usage pattern: .provider <query>                -> default action (search, or home for donghub/animeinweb)
//                .provider <slug/url/id> | detail  -> detail action
//                .provider <url> | chapter         -> chapter images (manhwaland/luvyaa only)
//                .provider <id> | detail | tv      -> hurawatch only, 3rd segment = media_type
//                .animeinweb <id> | episodes / stream
//                .animeinweb <> | schedule | MONDAY
//                .animeinweb | genres

const PROVIDERS = {
    dracinema:   { valueParam: "query", altParam: "slug", altActions: ["detail"], defaultAction: "search" },
    dubindo:     { valueParam: "query", altParam: "url",  altActions: ["detail"], defaultAction: "search" },
    samehadaku:  { valueParam: "query", altParam: "url",  altActions: ["detail"], defaultAction: "search" },
    donghub:     { valueParam: "query", altParam: "slug", altActions: ["detail"], defaultAction: "home" },
    livechart:   { valueParam: "query", altParam: "query", altActions: ["detail"], defaultAction: "search" },
    manhwaland:  { valueParam: "query", altParam: "url",  altActions: ["detail", "chapter"], defaultAction: "search" },
    luvyaa:      { valueParam: "query", altParam: "url",  altActions: ["detail", "chapter"], defaultAction: "search" },
    anibiplay:   { valueParam: "query", altParam: "slug", altActions: ["detail"], defaultAction: "search" },
    klikfilm:    { valueParam: "query", altParam: "url",  altActions: ["detail"], defaultAction: "search" },
    hurawatch:   { valueParam: "query", altParam: "id",   altActions: ["detail"], defaultAction: "search", extraParam: "media_type" },
    animeinweb:  { valueParam: "query", altParam: "id",   altActions: ["detail", "episodes", "stream", "schedule", "genres"], defaultAction: "home" },
};

async function callAnimeApi(provider, params, conText) {
    const { MalvinTechApi, MalvinApiKey } = conText;
    const res = await axios.get(`${MalvinTechApi}/anime/${provider}`, {
        params: { apikey: MalvinApiKey, ...params },
        timeout: 30000,
        validateStatus: () => true,
    });
    if (res.status >= 400 || res.data?.status === false) {
        const { rawMessage } = classifyApiError(res.status, res.data);
        throw new Error(rawMessage);
    }
    return res.data?.data;
}

// Generic renderer — duck-types the response since each provider's
// shape differs (search=array of cards, detail=flat object,
// chapter=array of image URLs).
async function renderAnimeResult(from, Malvin, conText, providerLabel, data) {
    const { react, botFooter, newsletterUrl, mek } = conText;

    if (data === undefined || data === null || (Array.isArray(data) && !data.length)) {
        await react("❌");
        return conText.reply("No results found.");
    }

    // Array of plain strings -> chapter/page image URLs, send as images.
    if (Array.isArray(data) && typeof data[0] === "string" && /^https?:\/\//.test(data[0])) {
        const images = data.slice(0, 20);
        for (const img of images) {
            await Malvin.sendMessage(from, { image: { url: img } }, { quoted: mek });
        }
        if (data.length > 20) await conText.reply(`+ ${data.length - 20} more pages not sent (capped at 20).`);
        await react("✅");
        return;
    }

    let text = `📺 *${providerLabel}*\n\n`;

    if (Array.isArray(data)) {
        text += data.slice(0, 10).map((item, i) => {
            const name = item.title || item.name || "Unknown";
            const extra = item.type || item.rating || item.episodesCount !== undefined ? ` (${[item.type, item.rating, item.episodesCount !== undefined ? item.episodesCount + " eps" : null].filter(Boolean).join(" · ")})` : "";
            return `${i + 1}. ${name}${extra}`;
        }).join("\n");
        if (data.length > 10) text += `\n... and ${data.length - 10} more`;
    } else if (typeof data === "object") {
        if (data.title) text += `🎬 *${data.title}*\n`;
        if (data.synopsis) text += `📝 ${String(data.synopsis).substring(0, 300)}\n`;
        if (data.genres?.length) text += `🎭 Genres: ${(Array.isArray(data.genres) ? data.genres.map(g => g.name || g).join(", ") : data.genres)}\n`;
        if (data.episodes?.length !== undefined) text += `📖 Episodes: ${data.episodes.length}\n`;
        if (data.total_chapters !== undefined) text += `📖 Chapters: ${data.total_chapters}\n`;
        if (data.meta) text += Object.entries(data.meta).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join("\n") + "\n";
        if (text === `📺 *${providerLabel}*\n\n`) {
            text += JSON.stringify(data, null, 2).substring(0, 800);
        }
    }

    await sendButtons(Malvin, from, {
        text: text.substring(0, 1500),
        footer: `> *${botFooter}*`,
        buttons: [
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: `📢 ${fancy("Join Channel", "mono")}`, url: newsletterUrl }) },
        ],
    }, { quoted: mrxd });
    await react("✅");
}

for (const [provider, cfg] of Object.entries(PROVIDERS)) {
    mxd(
        { pattern: provider, category: "anime", react: "📺", description: `Search/browse ${provider} (actions: ${cfg.defaultAction}${cfg.altActions.length ? ", " + cfg.altActions.join(", ") : ""})` },
        async (from, Malvin, conText) => {
            const { q, reply, react } = conText;

            const parts = (q || "").split("|").map(s => s.trim());
            const [value, actionArg, extraArg] = parts;
            const action = (actionArg || cfg.defaultAction).toLowerCase();

            if (action !== "home" && action !== "genres" && !value && action !== "schedule") {
                await react("❌");
                return reply(`Usage: .${provider} <query>\n       .${provider} <${cfg.altParam}> | detail\n${cfg.altActions.includes("chapter") ? `       .${provider} <url> | chapter\n` : ""}${provider === "animeinweb" ? `       .${provider} <id> | episodes|stream\n       .${provider} | schedule | MONDAY\n       .${provider} | genres\n` : ""}${provider === "hurawatch" ? `       .${provider} <id> | detail | tv\n` : ""}`);
            }

            const params = { action };
            if (action === "search" || action === cfg.defaultAction && !cfg.altActions.includes(action)) {
                params[cfg.valueParam] = value;
            } else if (action === "schedule") {
                params.day = (value || extraArg || "SUNDAY").toUpperCase();
            } else if (action === "genres") {
                // no params needed
            } else if (cfg.altActions.includes(action)) {
                params[cfg.altParam] = value;
                if (cfg.extraParam && extraArg) params[cfg.extraParam] = extraArg;
            } else {
                params[cfg.valueParam] = value;
            }

            try {
                await react("⏳");
                const data = await callAnimeApi(provider, params, conText);
                await renderAnimeResult(from, Malvin, conText, `${provider.toUpperCase()} ${action.toUpperCase()}`, data);
            } catch (error) {
                console.error(`${provider} error:`, error.message);
                await react("❌");
                return reply(`Failed: ${error.message}`);
            }
        }
    );
}

// ==================== HELP ====================

mxd({ pattern: "animehelp", category: "anime", react: "📺", aliases: ["animemenu"], description: "Show all anime/movie provider commands" },
async (from, Malvin, conText) => {
    const { react, botName, botFooter, newsletterUrl } = conText;
    await react("📺");

    const msg = `╭══〘〘 *${botName} ANIME* 〙〙═⊷
│
│━━ *DRAMA / MOVIES* ━━
│↠ .dracinema <query> - Chinese short-dramas
│↠ .dubindo <query> - Dubbed anime/movies
│↠ .hurawatch <query> - Movies & TV (TMDB)
│↠ .klikfilm <query> - Movies
│
│━━ *ANIME* ━━
│↠ .samehadaku <query> - Anime search/detail
│↠ .animeinweb <query> - Anime (search/episodes/stream/schedule/genres)
│↠ .donghub <query> - Donghua
│↠ .anibiplay <query> - Anime search/detail
│↠ .livechart <query> - Seasonal anime tracker
│
│━━ *MANGA / MANHWA* ━━
│↠ .manhwaland <query> - Manhwa (search/detail/chapter)
│↠ .luvyaa <query> - Comics (search/detail/chapter)
│
│━━ *TIP* ━━
│↠ Add " | detail" after a slug/url/id for details
│↠ .manhwaland <url> | chapter - Get chapter page images
│↠ .animeinweb | genres - List genres
│
╰═════════════════⊷
`;

    await sendButtons(Malvin, from, {
        title: `ANIME`,
        text: msg,
        footer: `> *${botFooter}*`,
        buttons: [
            { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: `📢 ${fancy("Join Channel", "mono")}`, url: newsletterUrl }) },
        ],
    }, { quoted: mrxd });

    await react("✅");
});
