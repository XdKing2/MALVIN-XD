/**
 * malvin/utility.js
 * Utility Commands — Malvin-XD Bot
 */

const { mxd } = require('../king');
const axios = require('axios');
const { mrxd } = require('../king/mrxd');
const { sendButtons } = require('malvin-btns');
const { listAvailableLocales, isValidLocale } = require('../king/i18n');
const { getUserSetting, setUserSetting } = require('../king/database/userSettings');
const { getGroupSetting, setGroupSetting } = require('../king/database/groupConfig');

const LOCALE_NAMES = {
    en: 'English', sw: 'Kiswahili', ha: 'Hausa', yo: 'Yorùbá',
    pcm: 'Naija Pidgin', hi: 'हिन्दी', ur: 'اردو', si: 'සිංහල',
    sn: 'chiShona', af: 'Afrikaans', zu: 'isiZulu',
};

// ── .qr — Generate QR code ────────────────────────────────────────────────────
mxd(
    {
        pattern:     'qr',
        aliases:     ['qrcode', 'generateqr'],
        category:    'utility',
        react:       '📱',
        description: 'Generate a QR code — .qr <text or URL>',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.qr <text or URL>*');
        await react('📱');
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(q)}`;
        await Malvin.sendMessage(from, { image: { url }, caption: `📱 QR Code for: ${q}` }, { quoted: mrxd });
    }
);

// ── .password — Generate secure password ──────────────────────────────────────
mxd(
    {
        pattern:     'password',
        aliases:     ['genpass', 'passgen', 'randompass'],
        category:    'utility',
        react:       '🔐',
        description: 'Generate a secure password — .password [length]',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        const length = Math.min(64, Math.max(8, parseInt(q) || 16));
        const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let pass = '';
        for (let i = 0; i < length; i++) {
            pass += chars[Math.floor(Math.random() * chars.length)];
        }
        await react('🔐');
        await reply(`🔐 *Generated Password (${length} chars):*\n\`\`\`${pass}\`\`\``);
    }
);

// ── .calc — Calculator ────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'calc',
        aliases:     ['calculate', 'math', 'compute'],
        category:    'utility',
        react:       '🧮',
        description: 'Calculate a math expression — .calc 2+2*10',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.calc <expression>*\nExample: *.calc 2+2*10*');
        try {
            // Safe eval — only allow math characters
            if (!/^[0-9+\-*/.() %^]+$/.test(q)) return reply('❌ Invalid expression. Only numbers and operators allowed.');
            const result = Function(`"use strict"; return (${q})`)();
            await react('🧮');
            await reply(`🧮 *${q}*\n= *${result}*`);
        } catch (e) {
            await reply('❌ Invalid math expression.');
        }
    }
);

// ── .convert — Unit converter ─────────────────────────────────────────────────
mxd(
    {
        pattern:     'convert',
        aliases:     ['unitconvert', 'uc', 'convertunit'],
        category:    'utility',
        react:       '🔄',
        description: 'Convert units — .convert 100 km miles',
    },
    async (from, Malvin, conText) => {
        const { reply, react, args } = conText;
        if (!args[0] || !args[1] || !args[2]) return reply('❌ Usage: *.convert <value> <from> <to>*\nExample: *.convert 100 km miles*');

        const value = parseFloat(args[0]);
        const from_unit = args[1].toLowerCase();
        const to_unit   = args[2].toLowerCase();

        if (isNaN(value)) return reply('❌ Invalid value.');

        const conversions = {
            // Length
            km: { miles: 0.621371, m: 1000, cm: 100000, ft: 3280.84, inch: 39370.1 },
            miles: { km: 1.60934, m: 1609.34, ft: 5280, cm: 160934 },
            m: { km: 0.001, miles: 0.000621, cm: 100, ft: 3.28084, inch: 39.3701 },
            cm: { m: 0.01, km: 0.00001, inch: 0.393701, ft: 0.0328084 },
            ft: { m: 0.3048, km: 0.0003048, miles: 0.000189394, inch: 12, cm: 30.48 },
            inch: { cm: 2.54, m: 0.0254, ft: 0.0833333 },
            // Weight
            kg: { lbs: 2.20462, g: 1000, oz: 35.274, ton: 0.001 },
            lbs: { kg: 0.453592, g: 453.592, oz: 16 },
            g: { kg: 0.001, lbs: 0.00220462, oz: 0.035274 },
            oz: { g: 28.3495, lbs: 0.0625, kg: 0.0283495 },
            ton: { kg: 1000, lbs: 2204.62 },
            // Temperature handled separately
            // Speed
            kph: { mph: 0.621371, ms: 0.277778 },
            mph: { kph: 1.60934, ms: 0.44704 },
            ms: { kph: 3.6, mph: 2.23694 },
            // Data
            gb: { mb: 1024, kb: 1048576, tb: 0.000976563 },
            mb: { gb: 0.000976563, kb: 1024, tb: 9.53674e-7 },
            kb: { mb: 0.000976563, gb: 9.53674e-7 },
            tb: { gb: 1024, mb: 1048576 },
        };

        // Temperature special case
        let result;
        if (from_unit === 'c' && to_unit === 'f') result = (value * 9/5) + 32;
        else if (from_unit === 'f' && to_unit === 'c') result = (value - 32) * 5/9;
        else if (from_unit === 'c' && to_unit === 'k') result = value + 273.15;
        else if (from_unit === 'k' && to_unit === 'c') result = value - 273.15;
        else if (from_unit === 'f' && to_unit === 'k') result = (value - 32) * 5/9 + 273.15;
        else if (from_unit === 'k' && to_unit === 'f') result = (value - 273.15) * 9/5 + 32;
        else if (conversions[from_unit]?.[to_unit] !== undefined) {
            result = value * conversions[from_unit][to_unit];
        } else {
            return reply(`❌ Cannot convert *${from_unit}* to *${to_unit}*.\nSupported: km, miles, m, cm, ft, inch, kg, lbs, g, oz, ton, kph, mph, gb, mb, kb, tb, c, f, k`);
        }

        await react('🔄');
        await reply(`🔄 *${value} ${from_unit}* = *${parseFloat(result.toFixed(6))} ${to_unit}*`);
    }
);

// ── .age — Age calculator ─────────────────────────────────────────────────────
mxd(
    {
        pattern:     'age',
        aliases:     ['calcage', 'howold', 'myage'],
        category:    'utility',
        react:       '🎂',
        description: 'Calculate age — .age DD/MM/YYYY',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.age DD/MM/YYYY*\nExample: *.age 15/03/2000*');

        const parts = q.split('/');
        if (parts.length !== 3) return reply('❌ Format: DD/MM/YYYY');

        const [day, month, year] = parts.map(Number);
        const birth = new Date(year, month - 1, day);
        const now   = new Date();

        if (isNaN(birth.getTime())) return reply('❌ Invalid date.');

        let years  = now.getFullYear() - birth.getFullYear();
        let months = now.getMonth() - birth.getMonth();
        let days   = now.getDate() - birth.getDate();

        if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
        if (months < 0) { years--; months += 12; }

        const nextBday   = new Date(now.getFullYear(), month - 1, day);
        if (nextBday < now) nextBday.setFullYear(now.getFullYear() + 1);
        const daysUntil  = Math.ceil((nextBday - now) / (1000 * 60 * 60 * 24));

        await react('🎂');
        await reply(`🎂 *Age Calculator*\n\n📅 Born: ${day}/${month}/${year}\n⏳ Age: *${years} years, ${months} months, ${days} days*\n🎉 Next birthday in: *${daysUntil} days*`);
    }
);

// ── .color — Color info ───────────────────────────────────────────────────────
mxd(
    {
        pattern:     'color',
        aliases:     ['colorinfo', 'hex', 'rgb', 'colorpicker'],
        category:    'utility',
        react:       '🎨',
        description: 'Get color info — .color #FF5733 or .color 255,87,51',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.color #FF5733* or *.color 255,87,51*');
        await react('🎨');

        let r, g, b, hex;
        if (q.startsWith('#')) {
            hex = q.replace('#', '');
            if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
        } else if (q.includes(',')) {
            [r, g, b] = q.split(',').map(Number);
            hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
        } else {
            return reply('❌ Use hex (#FF5733) or RGB (255,87,51)');
        }

        const hsl = rgbToHsl(r, g, b);
        const imgUrl = `https://singlecolorimage.com/get/${hex}/200x200`;

        await Malvin.sendMessage(from, {
            image: { url: imgUrl },
            caption: `🎨 *Color Info*\n\n🔵 HEX: *#${hex}*\n🔴 RGB: *${r}, ${g}, ${b}*\n🟡 HSL: *${hsl.h}°, ${hsl.s}%, ${hsl.l}%*`,
        }, { quoted: mrxd });
    }
);

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ── .timer — Set a countdown reminder ─────────────────────────────────────────
mxd(
    {
        pattern:     'timer',
        aliases:     ['remind', 'remindme', 'countdown'],
        category:    'utility',
        react:       '⏱️',
        description: 'Set a reminder — .timer 5m <message>',
    },
    async (from, Malvin, conText) => {
        const { reply, react, sender, args, q } = conText;
        if (!q) return reply('❌ Usage: *.timer <time> <message>*\nExample: *.timer 5m Take a break*\nTime: 30s, 5m, 1h');

        const timeStr = args[0];
        const message = args.slice(1).join(' ') || 'Timer done!';

        let ms = 0;
        if (timeStr.endsWith('s')) ms = parseInt(timeStr) * 1000;
        else if (timeStr.endsWith('m')) ms = parseInt(timeStr) * 60000;
        else if (timeStr.endsWith('h')) ms = parseInt(timeStr) * 3600000;
        else return reply('❌ Use: 30s, 5m, 1h (max 2h)');

        if (ms > 7200000) return reply('❌ Max timer is 2 hours.');
        if (ms < 5000)    return reply('❌ Min timer is 5 seconds.');

        await react('⏱️');
        await reply(`⏱️ Timer set! I'll remind you in *${timeStr}*\n📝 *${message}*`);

        setTimeout(async () => {
            try {
                await Malvin.sendMessage(from, {
                    text: `⏰ *TIMER DONE!*\n@${sender.split('@')[0]} — *${message}*`,
                    mentions: [sender],
                });
            } catch(e) {}
        }, ms);
    }
);

// ── .poll — Create a poll ─────────────────────────────────────────────────────
mxd(
    {
        pattern:     'poll',
        aliases:     ['vote', 'createpoll'],
        category:    'utility',
        react:       '📊',
        description: 'Create a poll — .poll Question | Option1 | Option2 | Option3',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q || !q.includes('|')) return reply('❌ Usage: *.poll Question | Option1 | Option2*\nExample: *.poll Fav color? | Red | Blue | Green*');

        const parts   = q.split('|').map(s => s.trim());
        const question= parts[0];
        const options  = parts.slice(1);

        if (options.length < 2) return reply('❌ Need at least 2 options.');
        if (options.length > 12) return reply('❌ Max 12 options.');

        await react('📊');
        await Malvin.sendMessage(from, {
            poll: {
                name:           question,
                values:         options,
                selectableCount: 1,
            },
        });
    }
);

// ── .encode / .decode — Base64 ────────────────────────────────────────────────
mxd(
    {
        pattern:     'encode',
        aliases:     ['base64encode', 'b64enc'],
        category:    'utility',
        react:       '🔒',
        description: 'Base64 encode — .encode <text>',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.encode <text>*');
        await react('🔒');
        const encoded = Buffer.from(q).toString('base64');
        await reply(`🔒 *Base64 Encoded:*\n\`\`\`${encoded}\`\`\``);
    }
);

mxd(
    {
        pattern:     'decode',
        aliases:     ['base64decode', 'b64dec'],
        category:    'utility',
        react:       '🔓',
        description: 'Base64 decode — .decode <base64>',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.decode <base64 text>*');
        try {
            await react('🔓');
            const decoded = Buffer.from(q, 'base64').toString('utf8');
            await reply(`🔓 *Base64 Decoded:*\n\`\`\`${decoded}\`\`\``);
        } catch(e) {
            await reply('❌ Invalid base64 string.');
        }
    }
);

// ── .shorten — URL shortener ──────────────────────────────────────────────────
mxd(
    {
        pattern:     'shorten',
        aliases:     ['shorturl', 'urlshorten', 'tinyurl'],
        category:    'utility',
        react:       '🔗',
        description: 'Shorten a URL — .shorten <url>',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.shorten <url>*');
        if (!q.startsWith('http')) return reply('❌ URL must start with http:// or https://');
        try {
            await react('🔗');
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`);
            await reply(`🔗 *Shortened URL:*\n${res.data}`);
        } catch(e) {
            await reply('❌ Failed to shorten URL.');
        }
    }
);

// ── .wordcount — Count words/chars ───────────────────────────────────────────
mxd(
    {
        pattern:     'wordcount',
        aliases:     ['wc', 'charcount', 'countwords'],
        category:    'utility',
        react:       '📝',
        description: 'Count words and characters — .wordcount <text>',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.wordcount <text>*');
        await react('📝');
        const words    = q.trim().split(/\s+/).length;
        const chars    = q.length;
        const noSpace  = q.replace(/\s/g, '').length;
        const sentences= (q.match(/[.!?]+/g) || []).length;
        await reply(`📝 *Word Count*\n\n📊 Words: *${words}*\n🔤 Characters: *${chars}*\n🔡 Chars (no space): *${noSpace}*\n📖 Sentences: *${sentences}*`);
    }
);

// ── .uuid — Generate UUID ─────────────────────────────────────────────────────
mxd(
    {
        pattern:     'uuid',
        aliases:     ['generateid', 'randomid', 'guid'],
        category:    'utility',
        react:       '🆔',
        description: 'Generate a random UUID',
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;
        await react('🆔');
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        await reply(`🆔 *Generated UUID:*\n\`\`\`${uuid}\`\`\``);
    }
);

// ── .palindrome — Check if palindrome ─────────────────────────────────────────
mxd(
    {
        pattern:     'palindrome',
        aliases:     ['ispalindrome', 'checkpalindrome'],
        category:    'utility',
        react:       '🔁',
        description: 'Check if a word/phrase is a palindrome — .palindrome racecar',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.palindrome <text>*');
        await react('🔁');
        const clean    = q.toLowerCase().replace(/[^a-z0-9]/g, '');
        const reversed = clean.split('').reverse().join('');
        const is       = clean === reversed;
        await reply(`🔁 *"${q}"*\n${is ? '✅ Is a palindrome!' : '❌ Not a palindrome.'}\nReversed: *${reversed}*`);
    }
);

// ── .percentage — Percentage calculator ──────────────────────────────────────
mxd(
    {
        pattern:     'percent',
        aliases:     ['percentage', 'pct', 'calcpercent'],
        category:    'utility',
        react:       '📊',
        description: 'Calculate percentage — .percent 20% of 500',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.percent 20% of 500*\nor *.percent 150 out of 200*');
        await react('📊');

        let result;
        // 20% of 500
        const ofMatch = q.match(/(\d+\.?\d*)%?\s+of\s+(\d+\.?\d*)/i);
        // 150 out of 200
        const outMatch = q.match(/(\d+\.?\d*)\s+out\s+of\s+(\d+\.?\d*)/i);

        if (ofMatch) {
            const [, pct, total] = ofMatch;
            result = `${pct}% of ${total} = *${(parseFloat(pct) / 100 * parseFloat(total)).toFixed(2)}*`;
        } else if (outMatch) {
            const [, part, total] = outMatch;
            result = `${part} out of ${total} = *${(parseFloat(part) / parseFloat(total) * 100).toFixed(2)}%*`;
        } else {
            return reply('❌ Format: *.percent 20% of 500* or *.percent 150 out of 200*');
        }

        await reply(`📊 ${result}`);
    }
);

// ── .timezone — Time in any city ──────────────────────────────────────────────
mxd(
    {
        pattern:     'timezone',
        aliases:     ['timein', 'citytime', 'tzone'],
        category:    'utility',
        react:       '🕐',
        description: 'Get time in a city — .timezone Tokyo',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.timezone <city>*\nExample: *.timezone Tokyo*');
        try {
            await react('🕐');
            const res = await axios.get(`https://worldtimeapi.org/api/timezone`);
            const zones = res.data;
            const match = zones.find(z => z.toLowerCase().includes(q.toLowerCase()));
            if (!match) return reply(`❌ Timezone not found for *${q}*`);

            const timeRes = await axios.get(`https://worldtimeapi.org/api/timezone/${match}`);
            const { datetime, timezone, utc_offset } = timeRes.data;
            const time = new Date(datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const date = new Date(datetime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            await reply(`🕐 *Time in ${q}*\n\n⏰ *${time}*\n📅 ${date}\n🌍 Timezone: ${timezone}\n🔢 UTC: ${utc_offset}`);
        } catch(e) {
            await reply('❌ Failed to get timezone info.');
        }
    }
);

// ── .moon — Moon phase ────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'moon',
        aliases:     ['moonphase', 'lunar', 'lunarphase'],
        category:    'utility',
        react:       '🌙',
        description: 'Get current moon phase',
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;
        await react('🌙');

        const now    = new Date();
        const year   = now.getFullYear();
        const month  = now.getMonth() + 1;
        const day    = now.getDate();

        // Calculate moon phase
        const c = Math.floor(year / 100);
        const g = year % 19;
        const e = (11 * g + 18) % 30;
        const adj = (e === 25 && g > 11) || e === 24 ? e + 1 : e;
        const jd  = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) + Math.floor(275 * month / 9) + day - 730531.5;
        const phase = ((jd % 29.53) + 29.53) % 29.53;

        let emoji, name, desc;
        if (phase < 1.85)       { emoji = '🌑'; name = 'New Moon';        desc = 'The moon is not visible'; }
        else if (phase < 7.38)  { emoji = '🌒'; name = 'Waxing Crescent'; desc = 'Growing toward first quarter'; }
        else if (phase < 9.22)  { emoji = '🌓'; name = 'First Quarter';   desc = 'Half moon, growing'; }
        else if (phase < 14.77) { emoji = '🌔'; name = 'Waxing Gibbous';  desc = 'Growing toward full moon'; }
        else if (phase < 16.61) { emoji = '🌕'; name = 'Full Moon';       desc = 'Fully illuminated'; }
        else if (phase < 22.15) { emoji = '🌖'; name = 'Waning Gibbous';  desc = 'Shrinking from full'; }
        else if (phase < 23.99) { emoji = '🌗'; name = 'Last Quarter';    desc = 'Half moon, shrinking'; }
        else if (phase < 29.53) { emoji = '🌘'; name = 'Waning Crescent'; desc = 'Nearly new moon'; }
        else                    { emoji = '🌑'; name = 'New Moon';        desc = 'The moon is not visible'; }

        const illumination = Math.round(50 * (1 - Math.cos(phase / 29.53 * 2 * Math.PI)));

        await reply(`${emoji} *Moon Phase*\n\n🌙 Phase: *${name}*\n📖 ${desc}\n💡 Illumination: *${illumination}%*\n📅 ${now.toDateString()}`);
    }
);

// ── .random — Random number ───────────────────────────────────────────────────
mxd(
    {
        pattern:     'random',
        aliases:     ['randnum', 'randomnumber', 'rng'],
        category:    'utility',
        react:       '🎲',
        description: 'Generate random number — .random 1 100',
    },
    async (from, Malvin, conText) => {
        const { reply, react, args } = conText;
        await react('🎲');
        const min = parseInt(args[0]) || 1;
        const max = parseInt(args[1]) || 100;
        if (min >= max) return reply('❌ Min must be less than max.');
        const num = Math.floor(Math.random() * (max - min + 1)) + min;
        await reply(`🎲 *Random number between ${min} and ${max}:*\n*${num}*`);
    }
);

// ── .choose — Random choice ───────────────────────────────────────────────────
mxd(
    {
        pattern:     'choose',
        aliases:     ['pick', 'decide', 'randomchoice'],
        category:    'utility',
        react:       '🎯',
        description: 'Pick a random choice — .choose pizza | pasta | burger',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q || !q.includes('|')) return reply('❌ Usage: *.choose option1 | option2 | option3*');
        await react('🎯');
        const options = q.split('|').map(s => s.trim()).filter(Boolean);
        const chosen  = options[Math.floor(Math.random() * options.length)];
        await reply(`🎯 *I choose:* *${chosen}*\n\n_(from ${options.length} options)_`);
    }
);

// ── .flip — Coin flip ─────────────────────────────────────────────────────────
mxd(
    {
        pattern:     'flip',
        aliases:     ['coinflip2', 'headortails', 'toss'],
        category:    'utility',
        react:       '🪙',
        description: 'Flip a coin',
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;
        await react('🪙');
        const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        await reply(`🪙 *Coin Flip:* *${result}*\n${result === 'HEADS' ? '👑' : '💿'}`);
    }
);

// ── .lang / .setlang — View or set language preference ────────────────────────
mxd(
    {
        pattern:     'lang',
        aliases:     ['setlang', 'language'],
        react:       '🌐',
        category:    'utility',
        description: 'View or set your (or, if admin, the group\'s) language',
    },
    async (from, Malvin, conText) => {
        const { sender, args, reply, react, t, lang, isGroup, isAdmin, isSuperUser } = conText;
        const codes = listAvailableLocales();

        try {
            const requested = (args?.[0] || '').toLowerCase().trim();

            // No args → show current language + how to change it
            if (!requested) {
                const currentName = LOCALE_NAMES[lang] || lang;
                const listLines = codes
                    .map(c => `┃ • ${c} — ${LOCALE_NAMES[c] || c}`)
                    .join('\n');

                let text = `${t('lang.current', { language: currentName })}\n\n`;
                text += `${t('lang.list_title')}\n${listLines}\n\n`;
                text += `> Use *.lang <code>* to change (e.g. .lang sw)`;
                if (isGroup && isAdmin) {
                    text += `\n> As an admin, this only sets *your* language.\n> Use *.setgrouplang <code>* to set it for the whole group.`;
                }

                await reply(text);
                await react('✅');
                return;
            }

            // Requested a change
            if (!isValidLocale(requested)) {
                await reply(t('lang.invalid', { available: codes.join(', ') }));
                await react('❌');
                return;
            }

            await setUserSetting(sender, 'LANGUAGE', requested);
            await reply(t('lang.set_success', { language: LOCALE_NAMES[requested] || requested }));
            await react('✅');
        } catch (e) {
            await reply(t ? t('common.error_generic', { error: e.message }) : `❌ ${e.message}`);
        }
    },
);

// ── .setgrouplang — Admin-only: set the whole group's default language ────────
mxd(
    {
        pattern:     'setgrouplang',
        aliases:     ['grouplang'],
        react:       '🌐',
        category:    'group',
        description: "Set this group's default language (admin only)",
    },
    async (from, Malvin, conText) => {
        const { args, reply, react, t, isGroup, isAdmin } = conText;
        const codes = listAvailableLocales();

        try {
            if (!isGroup) {
                await reply(t('common.group_only'));
                return;
            }
            if (!isAdmin) {
                await reply(t('common.admin_only'));
                return;
            }

            const requested = (args?.[0] || '').toLowerCase().trim();
            if (!requested || !isValidLocale(requested)) {
                await reply(t('lang.invalid', { available: codes.join(', ') }));
                await react('❌');
                return;
            }

            await setGroupSetting(from, 'LANGUAGE', requested);
            await reply(t('lang.set_group_success', { language: LOCALE_NAMES[requested] || requested }));
            await react('✅');
        } catch (e) {
            await reply(t ? t('common.error_generic', { error: e.message }) : `❌ ${e.message}`);
        }
    },
);
