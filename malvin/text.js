const { mxd } = require("../king");
const axios = require("axios");
const { classifyApiError } = require("../king/mxdcore2");

// ==================== TEXT UTILITIES ====================
// Brand new category (/api/text/*) — 28 simple text-manipulation
// endpoints, all following the same envelope: { status, data, timestamp }.
// Args are passed pipe-separated in the order listed for each command;
// trailing optional args can be omitted.

const COMMANDS = {
    affine:        { params: ["text", "a", "b", "mode"], required: 1, usage: ".affine <text> | <a> | <b> | <mode: encode|decode>" },
    anagram:       { params: ["a", "b", "ignore_case", "ignore_non_alnum"], required: 2, usage: ".anagram <text1> | <text2>" },
    case:          { params: ["text", "to"], required: 1, usage: ".case <text> | <to: upper|lower|title|camel|pascal|snake|kebab|constant>" },
    charfreq:      { params: ["text", "ignore_case", "ignore_whitespace"], required: 1, usage: ".charfreq <text>", endpoint: "char-frequency" },
    charinfo:      { params: ["char"], required: 1, usage: ".charinfo <single character>", endpoint: "char-info" },
    textcount:     { params: ["text"], required: 1, usage: ".textcount <text>", endpoint: "count" },
    textdiff:      { params: ["a", "b"], required: 2, usage: ".textdiff <text1> | <text2>", endpoint: "diff" },
    escapetext:    { params: ["text", "mode", "type"], required: 1, usage: ".escapetext <text> | <mode: escape|unescape> | <type: html|url|json|regex>", endpoint: "escape" },
    findreplace:   { params: ["text", "find", "replace", "regex", "flags"], required: 3, usage: ".findreplace <text> | <find> | <replace>" },
    leetspeak:     { params: ["text", "level"], required: 1, usage: ".leetspeak <text> | <level: 1-3>" },
    linenumbers:   { params: ["text", "separator", "start"], required: 1, usage: ".linenumbers <text>", endpoint: "line-numbers" },
    md2text:       { params: ["text"], required: 1, usage: ".md2text <markdown text>", endpoint: "markdown" },
    padtext:       { params: ["text", "length", "char", "mode"], required: 1, usage: ".padtext <text> | <length> | <char> | <mode: left|right|center>", endpoint: "pad" },
    palindrome:    { params: ["text", "ignore_case", "ignore_non_alnum"], required: 1, usage: ".palindrome <text>" },
    piglatin:      { params: ["text"], required: 1, usage: ".piglatin <text>", endpoint: "pig-latin" },
    railfence:     { params: ["text", "rails", "mode"], required: 1, usage: ".railfence <text> | <rails> | <mode: encode|decode>", endpoint: "rail-fence" },
    readingtime:   { params: ["text", "wpm"], required: 1, usage: ".readingtime <text>", endpoint: "reading-time" },
    regextest:     { params: ["pattern", "text", "flags"], required: 2, usage: ".regextest <pattern> | <text> | <flags>", endpoint: "regex" },
    reversetext:   { params: ["text", "mode"], required: 1, usage: ".reversetext <text> | <mode: chars|words|lines>", endpoint: "reverse" },
    rot47:         { params: ["text"], required: 1, usage: ".rot47 <text>" },
    sorttext:      { params: ["text", "by", "order"], required: 1, usage: ".sorttext <text> | <by: lines|words|chars> | <order: asc|desc>", endpoint: "sort" },
    striphtml:     { params: ["text", "decode_entities", "trim"], required: 1, usage: ".striphtml <html text>", endpoint: "strip-html" },
    syllablecount: { params: ["text"], required: 1, usage: ".syllablecount <text>", endpoint: "syllable-count" },
    textstat:      { params: ["text"], required: 1, usage: ".textstat <text>", endpoint: "text-stat" },
    truncatetext:  { params: ["text", "length", "ellipsis", "word_boundary"], required: 1, usage: ".truncatetext <text> | <length> | <ellipsis>", endpoint: "truncate" },
    uniquetext:    { params: ["text", "by", "ci"], required: 1, usage: ".uniquetext <text> | <by: lines|words|chars>", endpoint: "unique" },
    wordfreq:      { params: ["text", "limit", "order"], required: 1, usage: ".wordfreq <text> | <limit> | <order: asc|desc>", endpoint: "word-frequency" },
    wraptext:      { params: ["text", "width", "break_long"], required: 1, usage: ".wraptext <text> | <width>", endpoint: "wrap" },
};

async function callTextApi(endpoint, params, conText) {
    const { MalvinTechApi, MalvinApiKey } = conText;
    const res = await axios.get(`${MalvinTechApi}/text/${endpoint}`, {
        params: { apikey: MalvinApiKey, ...params },
        timeout: 20000,
        validateStatus: () => true,
    });
    if (res.status >= 400 || res.data?.status === false) {
        const { rawMessage } = classifyApiError(res.status, res.data);
        throw new Error(rawMessage);
    }
    return res.data?.data;
}

function renderTextResult(data) {
    if (data === undefined || data === null) return "No result.";
    if (typeof data.result === "string") return data.result;
    if (Array.isArray(data.result)) {
        return data.result.map((item, i) => typeof item === "object" ? `${i + 1}. ${JSON.stringify(item)}` : `${i + 1}. ${item}`).join("\n").substring(0, 3000);
    }
    if (typeof data.result === "object" && data.result !== null) {
        return Object.entries(data.result).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n").substring(0, 3000);
    }
    // No top-level "result" field (e.g. count, diff, palindrome, char-info,
    // text-stat) — just dump the whole data object's fields.
    return Object.entries(data).map(([k, v]) => {
        if (typeof v === "object" && v !== null) return `${k}: ${JSON.stringify(v)}`;
        return `${k}: ${v}`;
    }).join("\n").substring(0, 3000);
}

for (const [pattern, cfg] of Object.entries(COMMANDS)) {
    const endpoint = cfg.endpoint || pattern;
    mxd(
        { pattern, category: "tools", react: "📝", description: `Text utility: ${endpoint}` },
        async (from, Malvin, conText) => {
            const { q, reply, react } = conText;
            const parts = (q || "").split("|").map(s => s.trim());

            if (parts.filter(Boolean).length < cfg.required || !parts[0]) {
                await react("❌");
                return reply(`Usage: ${cfg.usage}`);
            }

            const params = {};
            cfg.params.forEach((paramName, i) => {
                if (parts[i] !== undefined && parts[i] !== "") params[paramName] = parts[i];
            });

            try {
                await react("⏳");
                const data = await callTextApi(endpoint, params, conText);
                const text = renderTextResult(data);
                await react("✅");
                return reply(text || "No result.");
            } catch (error) {
                console.error(`${endpoint} error:`, error.message);
                await react("❌");
                return reply(`Failed: ${error.message}`);
            }
        }
    );
}

// ==================== HELP ====================

mxd({ pattern: "texthelp", category: "tools", react: "📝", aliases: ["textmenu"], description: "Show all text utility commands" },
async (from, Malvin, conText) => {
    const { react, reply } = conText;
    await react("📝");
    const list = Object.entries(COMMANDS).map(([p]) => `.${p}`).join(", ");
    return reply(`📝 *TEXT UTILITIES*\n\n${list}\n\nUse "<usage>" per command, e.g. .case hello | upper\nArgs are separated by " | " in order.`);
});
