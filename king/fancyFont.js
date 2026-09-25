/**
 * king/fancyFont.js
 * Shared stylized-text helper — the single source of truth for every
 * "fancy font" used in bot output (headers, banners, labels, etc).
 *
 * Change a style's mapping here once, and every message using fancy()
 * picks it up — no more hunting hardcoded Unicode across 23 files.
 *
 * Usage:
 *   const { fancy } = require('./fancyFont');
 *   fancy('Malvin XD', 'smallcaps')   -> ᴍᴀʟᴠɪɴ xᴅ
 *   fancy('Deploy Complete', 'mono')  -> 𝙳𝚎𝚙𝚕𝚘𝚢 𝙲𝚘𝚖𝚙𝚕𝚎𝚝𝚎
 *   fancy('Note', 'bold')             -> 𝐍𝐨𝐭𝐞
 *
 * Only ASCII letters/digits are remapped; everything else (spaces,
 * punctuation, emoji, existing Unicode) passes through unchanged.
 */

// Latin small-caps letters aren't a contiguous Unicode block, so this
// one needs an explicit lookup table rather than an offset formula.
const SMALLCAPS_MAP = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ',
    i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ',
    q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x',
    y: 'ʏ', z: 'ᴢ',
};

// Mathematical Alphanumeric Symbols block — each style is a contiguous
// run of 26 uppercase + 26 lowercase (+ 10 digits where the block has
// them), so these are done as codepoint offsets instead of tables.
const OFFSET_STYLES = {
    mono:      { upperBase: 0x1D670, lowerBase: 0x1D68A, digitBase: 0x1D7F6 }, // 𝙳𝚎𝚙𝚕𝚘𝚢
    bold:      { upperBase: 0x1D400, lowerBase: 0x1D41A, digitBase: 0x1D7CE }, // 𝐍𝐨𝐭𝐞
    sansBold:  { upperBase: 0x1D5D4, lowerBase: 0x1D5EE, digitBase: 0x1D7EC }, // 𝗦𝗮𝗻𝘀 𝗕𝗼𝗹𝗱
    sans:      { upperBase: 0x1D5A0, lowerBase: 0x1D5BA, digitBase: 0x1D7E2 }, // 𝖲𝖺𝗇𝗌
    boldItalic:{ upperBase: 0x1D468, lowerBase: 0x1D482, digitBase: null },     // 𝑩𝒐𝒍𝒅 𝑰𝒕𝒂𝒍𝒊𝒄
    italic:    { upperBase: 0x1D434, lowerBase: 0x1D44E, digitBase: null },     // 𝐵𝑜𝑙𝑑
};

const STYLES = ['smallcaps', ...Object.keys(OFFSET_STYLES)];

// In-memory global override. When set, every fancy() call uses this style
// instead of whatever style it was individually called with — this is what
// lets a single command (.setfont) re-skin every message in the bot at once.
// Kept as a plain synchronous variable (not read from the DB per-call) so
// fancy() stays a cheap, sync, dependency-free function everywhere it's
// used — including at module-load time, before any DB connection exists.
// index.js primes this from the persisted FONT_STYLE setting on startup;
// the .setfont command updates both the DB (so it survives restarts) and
// this variable (so the change is instant, no restart needed).
let globalOverrideStyle = null;

function setGlobalStyle(style) {
    if (style && !STYLES.includes(style)) {
        throw new Error(`setGlobalStyle(): unknown style "${style}". Valid styles: ${STYLES.join(', ')}`);
    }
    globalOverrideStyle = style || null;
}

function getGlobalStyle() {
    return globalOverrideStyle;
}

/**
 * Convert plain ASCII text into one of the fixed fancy styles.
 * @param {string} text - plain text to convert
 * @param {string} style - one of: smallcaps, mono, bold, sansBold, sans, boldItalic, italic.
 *   Used only when no global style is active. Once setGlobalStyle() / the
 *   .setfont command sets one, it wins over every call's own style argument
 *   everywhere — that's what makes .setfont a single command that reskins
 *   the whole bot instead of something you'd apply call-site by call-site.
 * @returns {string}
 */
function fancy(text, style = 'smallcaps') {
    if (!text) return text;
    style = globalOverrideStyle || style;

    if (style === 'smallcaps') {
        return String(text).replace(/[a-zA-Z]/g, (ch) => {
            const lower = ch.toLowerCase();
            return SMALLCAPS_MAP[lower] || ch;
        });
    }

    const map = OFFSET_STYLES[style];
    if (!map) {
        throw new Error(`fancy(): unknown style "${style}". Valid styles: ${STYLES.join(', ')}`);
    }

    return String(text).replace(/[a-zA-Z0-9]/g, (ch) => {
        if (ch >= 'A' && ch <= 'Z') return String.fromCodePoint(map.upperBase + (ch.charCodeAt(0) - 65));
        if (ch >= 'a' && ch <= 'z') return String.fromCodePoint(map.lowerBase + (ch.charCodeAt(0) - 97));
        if (ch >= '0' && ch <= '9') {
            // Bold-italic and italic have no digit glyphs in this block —
            // leave digits as plain ASCII rather than emit nothing.
            return map.digitBase ? String.fromCodePoint(map.digitBase + (ch.charCodeAt(0) - 48)) : ch;
        }
        return ch;
    });
}

module.exports = { fancy, STYLES, setGlobalStyle, getGlobalStyle };
