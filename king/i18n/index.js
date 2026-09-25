/**
 * king/i18n/index.js
 * Malvin-XD translation engine.
 *
 * Resolution order for "what language do we reply in":
 *   1. The sending user's personal LANGUAGE setting (user_settings table)
 *   2. The current group's LANGUAGE setting (group_settings table)
 *   3. GLOBAL_FALLBACK below (English)
 *
 * Usage inside a command handler (once wired into conText, see msgSerializer.js):
 *   conText.t('miid.title')
 *   conText.t('rpg.xp_gained', { name: 'Bob', xp: 50 })
 *
 * Locale files live in king/i18n/locales/<code>.json and must all share
 * the same key set as en.json (the reference file). Missing keys in a
 * non-English file silently fall back to the English string so a partial
 * translation never breaks the bot.
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'locales');
const GLOBAL_FALLBACK = 'en';

const cache = new Map(); // code -> flat key/value object

function loadLocale(code) {
    if (cache.has(code)) return cache.get(code);

    const file = path.join(LOCALES_DIR, `${code}.json`);
    if (!fs.existsSync(file)) return null;

    try {
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        delete raw._meta;
        cache.set(code, raw);
        return raw;
    } catch (e) {
        console.error(`[i18n] Failed to load locale "${code}": ${e.message}`);
        return null;
    }
}

function listAvailableLocales() {
    if (!fs.existsSync(LOCALES_DIR)) return [];
    return fs.readdirSync(LOCALES_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
}

function isValidLocale(code) {
    return listAvailableLocales().includes(code);
}

// Replace {{var}} placeholders in a string with values from `vars`.
function interpolate(str, vars) {
    if (!vars) return str;
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match;
    });
}

/**
 * Look up a key in the given language, falling back to English, falling
 * back to the raw key itself if nothing matches (so a typo'd key never
 * throws — it just shows visibly as the key, easy to spot in testing).
 */
function translate(key, langCode, vars) {
    const lang = loadLocale(langCode) || {};
    const base = loadLocale(GLOBAL_FALLBACK) || {};

    const str = lang[key] ?? base[key] ?? key;
    return interpolate(str, vars);
}

/**
 * Resolve which language code to use for a given user/group, per the
 * 3-tier order documented above. Both getUserSetting/getGroupSetting
 * calls are cheap (indexed lookups) but callers should still avoid
 * calling this more than once per incoming message — buildContext()
 * does this once and hands back a bound `t()` closure.
 */
async function resolveLanguage({ userJid, groupJid, getUserSetting, getGroupSetting }) {
    try {
        if (userJid && getUserSetting) {
            const userLang = await getUserSetting(userJid, 'LANGUAGE');
            if (userLang && isValidLocale(userLang)) return userLang;
        }
    } catch (_) {}

    try {
        if (groupJid && getGroupSetting) {
            const groupLang = await getGroupSetting(groupJid, 'LANGUAGE');
            if (groupLang && isValidLocale(groupLang)) return groupLang;
        }
    } catch (_) {}

    return GLOBAL_FALLBACK;
}

/**
 * Build a `t(key, vars)` closure already bound to a resolved language
 * code, for attaching to conText once per incoming message.
 */
function makeTranslator(langCode) {
    return (key, vars) => translate(key, langCode, vars);
}

module.exports = {
    GLOBAL_FALLBACK,
    listAvailableLocales,
    isValidLocale,
    translate,
    resolveLanguage,
    makeTranslator,
};
