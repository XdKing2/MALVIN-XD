const { mxd } = require("../king");
const axios = require("axios");

// ==================== COUNTRY LOOKUP ====================
// NOTE: the old bulk list (.countries) and region search (.region) commands
// have been removed — the API no longer exposes a bulk/region endpoint.
// .countrycode has been merged into .country since it now accepts a name
// OR an ISO 2/3 letter code in the same "query" param.
mxd(
    {
        pattern: "country",
        category: "info",
        react: "🇺🇳",
        aliases: ["countryinfo", "cinfo", "countrycode", "ccode"],
        description: "Get detailed information about a country (name or ISO code)",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a country name or ISO code\n\n*Examples:*\n.country Zimbabwe\n.country Japan\n.country JP");
        }

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/info/country?apikey=${MalvinApiKey}&query=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Country not found. Please check the name/code and try again.");
            }

            const c = data.data;
            const message = `🇺🇳 *${c.name}*\n📍 *Region:* ${c.region || "N/A"}\n🏠 *Capital:* ${c.capital || "N/A"}\n👥 *Population:* ${c.population?.toLocaleString() || "N/A"}\n💰 *Currency:* ${c.currency || "N/A"}\n🗣️ *Languages:* ${c.languages?.join(", ") || "N/A"}\n🔢 *Code:* ${c.country_code || "N/A"}\n${c.description ? `\n📝 ${c.description.slice(0, 400)}${c.description.length > 400 ? "..." : ""}` : ""}${c.wikipedia_url ? `\n\n🔗 ${c.wikipedia_url}` : ""}`;

            if (c.flag_url) {
                await Malvin.sendMessage(from, { image: { url: c.flag_url }, caption: message }, { quoted: conText.mek });
            } else {
                await reply(message);
            }

            await react("✅");
        } catch (error) {
            console.error("Country error:", error);
            await react("❌");
            reply("Failed to fetch country info. Please try again.");
        }
    }
);

// ==================== IP LOOKUP ====================
mxd(
    {
        pattern: "ip",
        category: "info",
        react: "🌐",
        aliases: ["ipinfo", "iplookup", "ipaddress"],
        description: "Get information about an IP address (omit for your own)",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        try {
            await react("🔍");
            // The API auto-detects the caller's IP server-side when "ip" is omitted.
            const apiUrl = q
                ? `${MalvinTechApi}/info/ip?apikey=${MalvinApiKey}&ip=${encodeURIComponent(q)}`
                : `${MalvinTechApi}/info/ip?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to lookup IP address.");
            }

            const r = data.data;
            const message = `🌐 *IP Lookup*\n\n📡 *IP:* ${r.ip}\n📍 *Country:* ${r.country || "N/A"} ${r.flag_emoji || ""}\n🏙️ *Region:* ${r.region || "N/A"}\n🏠 *City:* ${r.city || "N/A"}\n📮 *Postal:* ${r.postal || "N/A"}\n🗺️ *Coordinates:* ${r.latitude || "N/A"}, ${r.longitude || "N/A"}\n⏰ *Timezone:* ${r.timezone || "N/A"}\n🔧 *ISP:* ${r.isp || "N/A"}\n🏢 *Org:* ${r.org || "N/A"}\n📡 *ASN:* ${r.asn || "N/A"}`;

            if (r.latitude && r.longitude) {
                await reply(message);
                await reply(`🗺️ *Location on Maps:* https://www.google.com/maps?q=${r.latitude},${r.longitude}`);
            } else {
                await reply(message);
            }

            await react("✅");
        } catch (error) {
            console.error("IP lookup error:", error);
            await react("❌");
            reply("Failed to lookup IP address. Please try again.");
        }
    }
);

mxd(
    {
        pattern: "myip",
        category: "info",
        react: "🌐",
        aliases: ["myipaddress", "ipme"],
        description: "Get your own public IP address info",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/info/ip?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to get your IP address.");
            }

            const r = data.data;
            await reply(`🌐 *Your IP Information*\n\n📡 *IP:* ${r.ip}\n📍 *Country:* ${r.country || "N/A"}\n🏙️ *City:* ${r.city || "N/A"}\n🔧 *ISP:* ${r.isp || "N/A"}`);
            await react("✅");
        } catch (error) {
            console.error("MyIP error:", error);
            await react("❌");
            reply("Failed to get your IP address.");
        }
    }
);

// ==================== WEATHER ====================
// The weather API now takes coordinates, not a city name, so this first
// geocodes the city via /info/geocode, then fetches the forecast via
// /info/open-weather.
const WEATHER_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
};

mxd(
    {
        pattern: "weather",
        category: "info",
        react: "🌤️",
        aliases: ["weatherinfo", "climate", "temp"],
        description: "Get current weather and forecast for a city",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a city name\n\n*Examples:*\n.weather Harare\n.weather London\n.weather New York");
        }

        try {
            await react("🔍");

            const geoUrl = `${MalvinTechApi}/info/geocode?apikey=${MalvinApiKey}&q=${encodeURIComponent(q)}&count=1`;
            const { data: geoData } = await axios.get(geoUrl, { timeout: 15000 });

            const place = geoData?.data?.results?.[0];
            if (!geoData?.status || !place) {
                await react("❌");
                return reply("City not found. Please check the name and try again.");
            }

            const weatherUrl = `${MalvinTechApi}/info/open-weather?apikey=${MalvinApiKey}&lat=${place.latitude}&lon=${place.longitude}&days=3`;
            const { data: weatherData } = await axios.get(weatherUrl, { timeout: 15000 });

            if (!weatherData?.status || !weatherData?.data) {
                await react("❌");
                return reply("Failed to fetch weather for that location.");
            }

            const w = weatherData.data;
            const current = w.current;
            const daily = w.daily;
            const label = `${place.name}${place.admin1 ? `, ${place.admin1}` : ""}, ${place.country || ""}`.trim();

            let message = `🌤️ *Weather in ${label}*\n\n`;
            if (current) {
                message += `🌡️ *Temperature:* ${current.temperature}°C\n💨 *Wind:* ${current.windspeed} km/h\n☁️ *Condition:* ${WEATHER_CODES[current.weathercode] || "Unknown"}\n`;
            }
            if (daily?.time?.length) {
                message += `\n📅 *3-Day Forecast*\n`;
                for (let i = 0; i < Math.min(3, daily.time.length); i++) {
                    message += `\n${daily.time[i]}\n   📈 High: ${daily.temperature_2m_max[i]}°C | 📉 Low: ${daily.temperature_2m_min[i]}°C\n   ☔ Precipitation: ${daily.precipitation_sum[i]}mm\n   ☁️ ${WEATHER_CODES[daily.weathercode[i]] || "Unknown"}`;
                }
            }

            await reply(message);
            await react("✅");
        } catch (error) {
            console.error("Weather error:", error);
            await react("❌");
            reply("Failed to get weather. Please try again.");
        }
    }
);

// ==================== FUN FACTS / ADVICE / QUOTES / JOKES ====================
mxd(
    { pattern: "advice", category: "info", react: "💡", aliases: [], description: "Get a random piece of advice" },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("💡");
            const { data } = await axios.get(`${MalvinTechApi}/info/advice?apikey=${MalvinApiKey}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.advice) return reply("Failed to fetch advice.");
            await reply(`💡 *Advice*\n\n${data.data.advice}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch advice. Please try again.");
        }
    }
);

mxd(
    { pattern: "fact", category: "info", react: "📚", aliases: [], description: "Get a random fact" },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("📚");
            const { data } = await axios.get(`${MalvinTechApi}/info/fact?apikey=${MalvinApiKey}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.fact) return reply("Failed to fetch a fact.");
            await reply(`📚 *Random Fact*\n\n${data.data.fact}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch a fact. Please try again.");
        }
    }
);

mxd(
    { pattern: "uselessfact", category: "info", react: "🤷", aliases: ["randomfact"], description: "Get a useless fact" },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("🤷");
            const { data } = await axios.get(`${MalvinTechApi}/info/useless-fact?apikey=${MalvinApiKey}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.text) return reply("Failed to fetch a useless fact.");
            await reply(`🤷 *Useless Fact*\n\n${data.data.text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch a useless fact. Please try again.");
        }
    }
);

mxd(
    { pattern: "joke", category: "info", react: "😂", aliases: [], description: "Get a random joke" },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("😂");
            const { data } = await axios.get(`${MalvinTechApi}/info/joke?apikey=${MalvinApiKey}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.full) return reply("Failed to fetch a joke.");
            await reply(`😂 *Joke*\n\n${data.data.setup}\n\n${data.data.punchline}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch a joke. Please try again.");
        }
    }
);

mxd(
    { pattern: "quote", category: "info", react: "💬", aliases: [], description: "Get a random inspirational quote" },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("💬");
            const { data } = await axios.get(`${MalvinTechApi}/info/quote?apikey=${MalvinApiKey}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.quote) return reply("Failed to fetch a quote.");
            await reply(`💬 *Quote*\n\n"${data.data.quote}"\n\n— ${data.data.author || "Unknown"}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch a quote. Please try again.");
        }
    }
);

// ==================== DICTIONARY ====================
mxd(
    { pattern: "define", category: "info", react: "📖", aliases: ["dictionary", "meaning"], description: "Look up a word's definition" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide a word\n\n*Example:* .define serendipity");
        }
        try {
            await react("🔍");
            const { data } = await axios.get(`${MalvinTechApi}/info/dictionary?apikey=${MalvinApiKey}&word=${encodeURIComponent(q)}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.meanings?.length) {
                await react("❌");
                return reply("Word not found in dictionary.");
            }
            const d = data.data;
            let message = `📖 *${d.word}*${d.phonetic ? ` [${d.phonetic}]` : ""}\n\n`;
            for (const m of d.meanings.slice(0, 3)) {
                message += `*${m.part_of_speech}*\n`;
                for (const def of m.definitions.slice(0, 2)) {
                    message += `• ${def.definition}${def.example ? `\n   _"${def.example}"_` : ""}\n`;
                }
                message += "\n";
            }
            await reply(message.trim());
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch definition. Please try again.");
        }
    }
);

// ==================== CURRENCY & CRYPTO ====================
mxd(
    { pattern: "currency", category: "info", react: "💱", aliases: ["convert", "exchangerate"], description: "Convert between currencies" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide currencies\n\n*Example:* .currency USD IDR 100");
        }
        const parts = q.trim().split(/\s+/);
        const from_ = (parts[0] || "").toUpperCase();
        const to = (parts[1] || "").toUpperCase();
        const amount = parts[2] || "1";
        if (!/^[A-Z]{3}$/.test(from_) || !/^[A-Z]{3}$/.test(to)) {
            await react("❌");
            return reply("Please use valid 3-letter currency codes\n\n*Example:* .currency USD IDR 100");
        }
        try {
            await react("💱");
            const { data } = await axios.get(`${MalvinTechApi}/info/currency?apikey=${MalvinApiKey}&from=${from_}&to=${to}&amount=${amount}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to convert currency. Please check the currency codes.");
            }
            const r = data.data;
            await reply(`💱 *Currency Conversion*\n\n${r.amount} ${r.from} = *${r.converted} ${r.to}*\n\n📊 Rate: 1 ${r.from} = ${r.rate} ${r.to}\n🕐 Updated: ${r.updated_at || "N/A"}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to convert currency. Please try again.");
        }
    }
);

mxd(
    { pattern: "crypto", category: "info", react: "🪙", aliases: ["cryptoprice", "coinprice"], description: "Get cryptocurrency prices" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        const coin = q ? q.trim().split(/\s+/)[0] : "bitcoin";
        const vs = (q && q.trim().split(/\s+/)[1]) || "usd";
        try {
            await react("🪙");
            const { data } = await axios.get(`${MalvinTechApi}/info/crypto-price?apikey=${MalvinApiKey}&coin=${encodeURIComponent(coin)}&vs=${encodeURIComponent(vs)}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.prices) {
                await react("❌");
                return reply("Failed to fetch crypto price. Check the coin ID (e.g. bitcoin, ethereum).");
            }
            const prices = data.data.prices;
            const vsUp = vs.toUpperCase();
            let message = `🪙 *Crypto Prices (${vsUp})*\n\n`;
            for (const [coinId, info] of Object.entries(prices)) {
                const price = info[vs];
                const change = info[`${vs}_24h_change`];
                message += `*${coinId}*\n💰 ${price?.toLocaleString() || "N/A"} ${vsUp}\n📈 24h: ${change ? change.toFixed(2) + "%" : "N/A"}\n\n`;
            }
            await reply(message.trim());
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch crypto price. Please try again.");
        }
    }
);

// ==================== TIME / DATE ====================
mxd(
    { pattern: "time", category: "info", react: "🕐", aliases: ["worldtime", "clock"], description: "Get current time in a timezone" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        const tz = q || "UTC";
        try {
            await react("🕐");
            const { data } = await axios.get(`${MalvinTechApi}/info/time?apikey=${MalvinApiKey}&tz=${encodeURIComponent(tz)}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Invalid timezone. Example: Asia/Jakarta, America/New_York, Europe/London");
            }
            const t = data.data;
            await reply(`🕐 *Time in ${t.timezone}*\n\n📅 ${t.date} (${t.weekday})\n⏰ ${t.time}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch time. Please provide a valid IANA timezone.");
        }
    }
);

mxd(
    { pattern: "moonphase", category: "info", react: "🌙", aliases: ["moon"], description: "Get the current moon phase" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("🌙");
            const apiUrl = q
                ? `${MalvinTechApi}/info/moon-phase?apikey=${MalvinApiKey}&date=${encodeURIComponent(q)}`
                : `${MalvinTechApi}/info/moon-phase?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to fetch moon phase.");
            }
            const m = data.data;
            await reply(`🌙 *Moon Phase — ${m.date}*\n\n🌗 *Phase:* ${m.name}\n💡 *Illumination:* ${(m.illumination * 100).toFixed(1)}%\n📅 *Age:* ${m.phase_age_days} days`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch moon phase. Please try again.");
        }
    }
);

// ==================== SPACE ====================
mxd(
    { pattern: "iss", category: "info", react: "🛰️", aliases: ["isslocation", "spacestation"], description: "Get the ISS's current location" },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("🛰️");
            const { data } = await axios.get(`${MalvinTechApi}/info/iss-location?apikey=${MalvinApiKey}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to fetch ISS location.");
            }
            const r = data.data;
            await reply(`🛰️ *ISS Location*\n\n📍 Lat: ${r.latitude} | Lon: ${r.longitude}\n📏 Altitude: ${r.altitude_km} km\n💨 Velocity: ${r.velocity_kmh} km/h\n👁️ Visibility: ${r.visibility}\n\n🗺️ ${r.google_maps}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch ISS location. Please try again.");
        }
    }
);

mxd(
    { pattern: "astronauts", category: "info", react: "👨‍🚀", aliases: ["spacepeople", "whoisinspace"], description: "See who's currently in space" },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("👨‍🚀");
            const { data } = await axios.get(`${MalvinTechApi}/info/space-people?apikey=${MalvinApiKey}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.people?.length) {
                await react("❌");
                return reply("Failed to fetch astronaut data.");
            }
            const r = data.data;
            const list = r.people.slice(0, 15).map((p, i) => `${i + 1}. ${p.name} (${p.craft})`).join("\n");
            await reply(`👨‍🚀 *People Currently in Space*\n\n👥 Total: ${r.total}\n\n${list}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch astronaut data. Please try again.");
        }
    }
);

// ==================== HOLIDAYS & UNIVERSITY ====================
mxd(
    { pattern: "holidays", category: "info", react: "🎉", aliases: ["publicholidays"], description: "Get public holidays for a country" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide a 2-letter country code\n\n*Example:* .holidays US 2025");
        }
        const parts = q.trim().split(/\s+/);
        const country = parts[0].toUpperCase();
        const year = parts[1] || new Date().getFullYear();
        if (!/^[A-Z]{2}$/.test(country)) {
            await react("❌");
            return reply("Country code must be 2 letters (e.g. US, GB, ID)");
        }
        try {
            await react("🎉");
            const { data } = await axios.get(`${MalvinTechApi}/info/holidays?apikey=${MalvinApiKey}&country=${country}&year=${year}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.holidays?.length) {
                await react("❌");
                return reply("No holidays found for that country/year.");
            }
            const r = data.data;
            const list = r.holidays.slice(0, 20).map(h => `📅 ${h.date} — *${h.local_name}*${h.english_name !== h.local_name ? ` (${h.english_name})` : ""}`).join("\n");
            await reply(`🎉 *Public Holidays — ${r.country} ${r.year}*\n📊 Total: ${r.total}\n\n${list}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch holidays. Please try again.");
        }
    }
);

mxd(
    { pattern: "university", category: "info", react: "🎓", aliases: ["uni", "universitysearch"], description: "Search universities by name or country" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide a university or country name\n\n*Example:* .university harvard");
        }
        try {
            await react("🎓");
            const { data } = await axios.get(`${MalvinTechApi}/info/university?apikey=${MalvinApiKey}&name=${encodeURIComponent(q)}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.universities?.length) {
                await react("❌");
                return reply("No universities found.");
            }
            const r = data.data;
            const list = r.universities.slice(0, 10).map((u, i) => `${i + 1}. *${u.name}*\n   🌍 ${u.country}\n   🔗 ${u.website || "N/A"}`).join("\n\n");
            await reply(`🎓 *University Search: ${q}*\n📊 Found: ${r.results}\n\n${list}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to search universities. Please try again.");
        }
    }
);

// ==================== QR CODE & AVATAR ====================
mxd(
    { pattern: "qr", category: "info", react: "🔳", aliases: ["qrcode"], description: "Generate a QR code" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, mek } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide text/URL to encode\n\n*Example:* .qr https://example.com");
        }
        try {
            await react("🔳");
            const { data } = await axios.get(`${MalvinTechApi}/info/qr-api?apikey=${MalvinApiKey}&text=${encodeURIComponent(q)}&size=300`, { timeout: 15000 });
            if (!data?.status || !data?.data?.url) {
                await react("❌");
                return reply("Failed to generate QR code.");
            }
            await Malvin.sendMessage(from, { image: { url: data.data.url }, caption: `🔳 *QR Code*\n\n${q}` }, { quoted: mek });
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to generate QR code. Please try again.");
        }
    }
);

mxd(
    { pattern: "avatar", category: "info", react: "🧑‍🎨", aliases: ["randomavatar", "genavatar"], description: "Generate a random or seeded avatar" },
    async (from, Malvin, conText) => {
        const { q, react, MalvinTechApi, MalvinApiKey, mek } = conText;
        const seed = q || Math.random().toString(36).slice(2, 10);
        try {
            await react("🧑‍🎨");
            const { data } = await axios.get(`${MalvinTechApi}/info/avatar?apikey=${MalvinApiKey}&seed=${encodeURIComponent(seed)}&format=png`, { timeout: 15000 });
            if (!data?.status || !data?.data?.url) {
                await react("❌");
                return;
            }
            await Malvin.sendMessage(from, { image: { url: data.data.url }, caption: `🧑‍🎨 *Avatar*\n\n🌱 Seed: ${data.data.seed}\n🎨 Style: ${data.data.style}` }, { quoted: mek });
            await react("✅");
        } catch (error) {
            await react("❌");
        }
    }
);

// ==================== ANIMAL FACTS ====================
mxd(
    { pattern: "dogfacts", category: "info", react: "🐶", aliases: ["dogfact"], description: "Get random dog facts" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        const count = q ? Math.min(5, parseInt(q) || 1) : 1;
        try {
            await react("🐶");
            const { data } = await axios.get(`${MalvinTechApi}/info/dog-facts?apikey=${MalvinApiKey}&count=${count}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.facts?.length) {
                await react("❌");
                return reply("Failed to fetch dog facts.");
            }
            await reply(`🐶 *Dog Facts*\n\n${data.data.facts.map((f, i) => `${i + 1}. ${f}`).join("\n\n")}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch dog facts. Please try again.");
        }
    }
);

mxd(
    { pattern: "catfacts", category: "info", react: "🐱", aliases: ["catfact"], description: "Get random cat facts" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        const count = q ? Math.min(5, parseInt(q) || 1) : 1;
        try {
            await react("🐱");
            const { data } = await axios.get(`${MalvinTechApi}/info/cat-facts?apikey=${MalvinApiKey}&count=${count}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to fetch cat facts.");
            }
            const r = data.data;
            const text = r.facts ? r.facts.map((f, i) => `${i + 1}. ${f}`).join("\n\n") : r.fact;
            await reply(`🐱 *Cat Fact${r.facts ? "s" : ""}*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch cat facts. Please try again.");
        }
    }
);

// ==================== ZODIAC ====================
mxd(
    { pattern: "zodiac", category: "info", react: "♈", aliases: ["horoscope"], description: "Get your zodiac sign from birth month/day" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide month and day\n\n*Example:* .zodiac 7 15");
        }
        const [month, day] = q.trim().split(/\s+/).map(Number);
        if (!month || !day) {
            await react("❌");
            return reply("Please provide a valid month and day\n\n*Example:* .zodiac 7 15");
        }
        try {
            await react("♈");
            const { data } = await axios.get(`${MalvinTechApi}/info/zodiac?apikey=${MalvinApiKey}&month=${month}&day=${day}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Invalid date. Month must be 1-12, day 1-31.");
            }
            const z = data.data;
            await reply(`♈ *Zodiac Sign*\n\n🌟 *Sign:* ${z.sign} ${z.symbol}\n🔥 *Element:* ${z.element}\n📅 *Date Range:* ${z.date_range}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch zodiac sign. Please try again.");
        }
    }
);

mxd(
    { pattern: "chinesezodiac", category: "info", react: "🐉", aliases: ["cnzodiac"], description: "Get your Chinese zodiac from birth year" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        const year = parseInt(q);
        if (!year || year < 1900 || year > 2100) {
            await react("❌");
            return reply("Please provide a valid birth year (1900-2100)\n\n*Example:* .chinesezodiac 1995");
        }
        try {
            await react("🐉");
            const { data } = await axios.get(`${MalvinTechApi}/info/chinese-zodiac?apikey=${MalvinApiKey}&year=${year}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to fetch Chinese zodiac.");
            }
            const z = data.data;
            await reply(`🐉 *Chinese Zodiac — ${year}*\n\n🐾 *Animal:* ${z.animal}\n⚡ *Element:* ${z.element}\n✨ ${z.stem_branch}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Chinese zodiac. Please try again.");
        }
    }
);

// ==================== AGE CALCULATOR ====================
mxd(
    { pattern: "age", category: "info", react: "🎂", aliases: ["agecalc"], description: "Calculate age from birth date" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide a birth date (YYYY-MM-DD)\n\n*Example:* .age 1995-05-15");
        }
        const birth = q.trim().split(/\s+/)[0];
        try {
            await react("🎂");
            const { data } = await axios.get(`${MalvinTechApi}/info/age?apikey=${MalvinApiKey}&birth=${encodeURIComponent(birth)}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Invalid date format. Please use YYYY-MM-DD.");
            }
            const r = data.data.age;
            await reply(`🎂 *Age Calculator*\n\n🎈 *Age:* ${r.years} years, ${r.months} months, ${r.days} days\n📊 *Total Days:* ${r.total_days.toLocaleString()}\n📆 *Total Weeks:* ${r.total_weeks.toLocaleString()}\n🎉 *Next Birthday:* ${r.next_birthday?.date} (in ${r.next_birthday?.days_until} days)`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to calculate age. Please try again.");
        }
    }
);

// ==================== BORED / ACTIVITY ====================
mxd(
    { pattern: "bored", category: "info", react: "🎲", aliases: ["activity", "imbored"], description: "Get a random activity idea" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("🎲");
            const apiUrl = q
                ? `${MalvinTechApi}/info/bored?apikey=${MalvinApiKey}&type=${encodeURIComponent(q)}`
                : `${MalvinTechApi}/info/bored?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Failed to fetch an activity.");
            }
            const a = data.data;
            await reply(`🎲 *Bored? Try this:*\n\n${a.activity}\n\n📂 Type: ${a.type || "N/A"}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch an activity. Please try again.");
        }
    }
);

// ==================== DEVELOPER TOOLS ====================
mxd(
    { pattern: "npm", category: "info", react: "📦", aliases: ["npmsearch", "npmpackage"], description: "Look up an npm package" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide a package name\n\n*Example:* .npm axios");
        }
        try {
            await react("🔍");
            const { data } = await axios.get(`${MalvinTechApi}/info/npm?apikey=${MalvinApiKey}&name=${encodeURIComponent(q)}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Package not found.");
            }
            const p = data.data;
            await reply(`📦 *${p.name}*\n\n📝 ${p.description || "No description"}\n🏷️ *Version:* ${p.latest_version}\n📜 *License:* ${p.license || "N/A"}\n👥 *Maintainers:* ${p.maintainers?.join(", ") || "N/A"}\n🔗 ${p.npm_url}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to look up package. Please try again.");
        }
    }
);

mxd(
    { pattern: "httpstatus", category: "info", react: "🔢", aliases: ["httpcode"], description: "Look up an HTTP status code" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide an HTTP status code\n\n*Example:* .httpstatus 404");
        }
        try {
            await react("🔢");
            const { data } = await axios.get(`${MalvinTechApi}/info/http-status?apikey=${MalvinApiKey}&code=${encodeURIComponent(q)}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Status code not found.");
            }
            const s = data.data;
            await reply(`🔢 *HTTP ${s.code}*\n\n📛 ${s.name || s.message || ""}\n📝 ${s.description || ""}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to look up status code. Please try again.");
        }
    }
);

// ==================== POKEMON ====================
mxd(
    { pattern: "pokemon", category: "info", react: "⚡", aliases: ["pokedex"], description: "Get info about a Pokemon" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, mek } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide a Pokemon name or ID\n\n*Example:* .pokemon pikachu");
        }
        try {
            await react("🔍");
            const { data } = await axios.get(`${MalvinTechApi}/info/pokemon?apikey=${MalvinApiKey}&name=${encodeURIComponent(q.toLowerCase())}`, { timeout: 15000 });
            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Pokemon not found.");
            }
            const p = data.data;
            const message = `⚡ *#${p.id} ${p.name.toUpperCase()}*\n\n📏 *Height:* ${p.height_m}m\n⚖️ *Weight:* ${p.weight_kg}kg\n✨ *Base XP:* ${p.base_experience}\n🏷️ *Types:* ${p.types.join(", ")}\n\n📊 *Stats*\n${p.stats.map(s => `• ${s.name}: ${s.value}`).join("\n")}\n\n✨ *Abilities:* ${p.abilities.map(a => a.name + (a.hidden ? " (hidden)" : "")).join(", ")}`;

            const img = p.official_artwork || p.sprite;
            if (img) {
                await Malvin.sendMessage(from, { image: { url: img }, caption: message }, { quoted: mek });
            } else {
                await reply(message);
            }
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Pokemon. Please try again.");
        }
    }
);

// ==================== XKCD COMIC ====================
mxd(
    { pattern: "xkcd", category: "info", react: "😄", aliases: ["comic"], description: "Get an xkcd comic (latest, by ID, or random)" },
    async (from, Malvin, conText) => {
        const { q, react, MalvinTechApi, MalvinApiKey, mek } = conText;
        try {
            await react("😄");
            let apiUrl = `${MalvinTechApi}/info/xkcd?apikey=${MalvinApiKey}`;
            if (q && q.trim().toLowerCase() === "random") apiUrl += "&random=true";
            else if (q && /^\d+$/.test(q.trim())) apiUrl += `&id=${q.trim()}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });
            if (!data?.status || !data?.data?.img) {
                await react("❌");
                return;
            }
            const c = data.data;
            await Malvin.sendMessage(from, { image: { url: c.img }, caption: `😄 *xkcd #${c.id}: ${c.title}*\n\n_${c.description}_\n\n🔗 ${c.link}` }, { quoted: mek });
            await react("✅");
        } catch (error) {
            await react("❌");
        }
    }
);

// ==================== TECH / NEWS ====================
mxd(
    { pattern: "hackernews", category: "info", react: "📰", aliases: ["hn", "hackernewstop"], description: "Get top Hacker News stories" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        const limit = q ? Math.min(15, parseInt(q) || 5) : 5;
        try {
            await react("📰");
            const { data } = await axios.get(`${MalvinTechApi}/info/hackernews?apikey=${MalvinApiKey}&limit=${limit}`, { timeout: 15000 });
            if (!data?.status || !data?.data?.stories?.length) {
                await react("❌");
                return reply("Failed to fetch Hacker News stories.");
            }
            const list = data.data.stories.map((s, i) => `${i + 1}. *${s.title}*\n   📈 ${s.score} pts | 💬 ${s.comments} comments\n   🔗 ${s.url}`).join("\n\n");
            await reply(`📰 *Hacker News — Top Stories*\n\n${list}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Hacker News. Please try again.");
        }
    }
);

// ==================== NAME-BASED DEMOGRAPHICS ====================
mxd(
    { pattern: "namestats", category: "info", react: "🔮", aliases: ["nameinfo", "predictname"], description: "Predict age, gender & nationality from a first name" },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey } = conText;
        if (!q) {
            await react("❌");
            return reply("Please provide a first name\n\n*Example:* .namestats alex");
        }
        const name = q.trim().split(/\s+/)[0];
        try {
            await react("🔮");
            const [ageRes, genderRes, natRes] = await Promise.all([
                axios.get(`${MalvinTechApi}/info/agify?apikey=${MalvinApiKey}&name=${encodeURIComponent(name)}`, { timeout: 15000 }).catch(() => null),
                axios.get(`${MalvinTechApi}/info/genderize?apikey=${MalvinApiKey}&name=${encodeURIComponent(name)}`, { timeout: 15000 }).catch(() => null),
                axios.get(`${MalvinTechApi}/info/nationalize?apikey=${MalvinApiKey}&name=${encodeURIComponent(name)}`, { timeout: 15000 }).catch(() => null),
            ]);

            const age = ageRes?.data?.data;
            const gender = genderRes?.data?.data;
            const nat = natRes?.data?.data;

            let message = `🔮 *Name Analysis: ${name}*\n\n`;
            if (age?.age) message += `🎂 *Predicted Age:* ${age.age} (based on ${age.count?.toLocaleString() || 0} records)\n`;
            if (gender?.gender) message += `⚧️ *Predicted Gender:* ${gender.gender} (${((gender.probability || 0) * 100).toFixed(0)}% confidence)\n`;
            if (nat?.countries?.length) {
                message += `\n🌍 *Likely Nationalities:*\n${nat.countries.slice(0, 5).map(c => `• ${c.country_id}: ${c.probability_percent}`).join("\n")}`;
            }

            await reply(message);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to analyze name. Please try again.");
        }
    }
);

// ==================== INFO HELP COMMAND ====================
mxd(
    {
        pattern: "infohelp",
        category: "info",
        react: "ℹ️",
        aliases: ["infocmds", "infocommands"],
        description: "Show all info commands",
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;
        await react("ℹ️");

        const message = `╭══〘〘 *INFO COMMANDS* 〙〙═⊷
│↠🇺🇳 .country <name/code>
│↠🌐 .ip [address]
│↠🌐 .myip
│↠🌤️ .weather <city>
╰═════════════════⊷

━━ *FUN* ━━
│↠💡 .advice
│↠📚 .fact
│↠🤷 .uselessfact
│↠😂 .joke
│↠💬 .quote
│↠🐶 .dogfacts [count]
│↠🐱 .catfacts [count]
│↠😄 .xkcd [id/random]
╰═════════════════⊷

━━ *LANGUAGE & FINANCE* ━━
│↠📖 .define <word>
│↠💱 .currency <from> <to> [amount]
│↠🪙 .crypto [coin] [vs]
╰═════════════════⊷

━━ *TIME & SPACE* ━━
│↠🕐 .time [timezone]
│↠🌙 .moonphase [date]
│↠🛰️ .iss
│↠👨‍🚀 .astronauts
╰═════════════════⊷

━━ *LOOKUP TOOLS* ━━
│↠🎉 .holidays <country> [year]
│↠🎓 .university <name>
│↠🔳 .qr <text>
│↠🧑‍🎨 .avatar [seed]
│↠📦 .npm <package>
│↠🔢 .httpstatus <code>
╰═════════════════⊷

━━ *FUN CALCULATORS* ━━
│↠♈ .zodiac <month> <day>
│↠🐉 .chinesezodiac <year>
│↠🎂 .age <birthdate>
│↠🎲 .bored [type]
│↠⚡ .pokemon <name>
│↠🔮 .namestats <name>
╰═════════════════⊷

━━ *NEWS* ━━
│↠📰 .hackernews [limit]
╰═════════════════⊷`;

        await reply(message);
        await react("✅");
    }
);
