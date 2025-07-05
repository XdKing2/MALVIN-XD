const { malvin } = require('../malvin');
const config = require('../settings');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, sleep, fetchJson, empiretourl } = require('../lib/functions');
const axios = require('axios');
const moment = require('moment-timezone');

let isFactEnabled = false;
let factTimer = null;
let initialTimeout = null;

const dailyThemes = {
    Monday: 'love',
    Tuesday: 'motivation',
    Wednesday: 'science',
    Thursday: 'joke',
    Friday: 'tips',
    Saturday: 'love',
    Sunday: 'motivation',
};

malvin({
    pattern: "dailyfact",
    desc: "Get a random fact of the day and control the daily fact feature.",
    react: "📚",
    category: "owner",
    use: ".dailyfact on/off",
    filename: __filename
}, async (conn, mek, m, { reply, args }) => {
    if (args[0] === "on") {
        if (isFactEnabled) return reply("❌ The daily fact feature is already enabled.");
        isFactEnabled = true;
        reply("✅ Daily fact is now enabled. I’ll send facts every day at 6 AM .");
        scheduleDailyFact(conn);
    } 
    else if (args[0] === "off") {
        if (!isFactEnabled) return reply("❌ The daily fact feature is already disabled.");
        clearInterval(factTimer);
        clearTimeout(initialTimeout);
        isFactEnabled = false;
        reply("❌ Daily fact feature is now disabled.");
    } 
    else {
        reply("❌ Please use `.dailyfact on` or `.dailyfact off` to control this feature.");
    }
});

async function sendDailyFact(conn) {
    try {
        const day = moment().tz('Africa/Nairobi').format('dddd');
        const theme = dailyThemes[day];
        const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=fr');
        const fact = res.data.text;

        const text = `📚 Here's a *${theme}* fact for your *${day}* morning:\n\n*${fact}*\n\n> _Powered by Malvin King_`;

        // Replace this with your broadcast logic (e.g., sending to owner, group, or subscribers)
        conn.sendMessage(config.OWNER_NUMBER + "@s.whatsapp.net", { text }, { quoted: null });

    } catch (err) {
        console.error("❌ Error sending daily fact:", err);
    }
}

function scheduleDailyFact(conn) {
    const now = moment().tz('Africa/Nairobi');
    let next6AM = moment().tz('Africa/Nairobi').set({ hour: 6, minute: 0, second: 0, millisecond: 0 });

    if (now.isAfter(next6AM)) next6AM.add(1, 'days');
    const delay = next6AM.diff(now);

    initialTimeout = setTimeout(() => {
        sendDailyFact(conn);
        factTimer = setInterval(() => sendDailyFact(conn), 24 * 60 * 60 * 1000); // Every 24 hours
    }, delay);
}
