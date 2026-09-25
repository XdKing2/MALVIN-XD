/**
 * malvin/crypto.js
 * Crypto & Finance Commands — Malvin-XD Bot
 */

const { mxd } = require('../king');
const axios = require('axios');
const { mrxd } = require('../king/mrxd');

// ── .crypto — Crypto price ────────────────────────────────────────────────────
mxd(
    {
        pattern:     'crypto',
        aliases:     ['coin', 'cryptoprice', 'coinprice'],
        category:    'info',
        react:       '💹',
        description: 'Get crypto price — .crypto bitcoin',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.crypto <coin>*\nExample: *.crypto bitcoin*');
        try {
            await react('💹');
            const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(q.toLowerCase())}&vs_currencies=usd,btc&include_24hr_change=true&include_market_cap=true`);
            const data = res.data[q.toLowerCase()];
            if (!data) return reply(`❌ Coin *${q}* not found. Try: bitcoin, ethereum, solana, bnb`);
            const change = data.usd_24h_change?.toFixed(2);
            const arrow  = change >= 0 ? '📈' : '📉';
            await reply(`💹 *${q.toUpperCase()}*\n\n💵 Price: *$${data.usd?.toLocaleString()}*\n₿ BTC: *${data.btc}*\n${arrow} 24h: *${change}%*\n💰 Market Cap: *$${(data.usd_market_cap / 1e9).toFixed(2)}B*`);
        } catch(e) {
            await reply('❌ Failed to fetch crypto price.');
        }
    }
);

// ── .topcrypto — Top 10 cryptos ───────────────────────────────────────────────
mxd(
    {
        pattern:     'topcrypto',
        aliases:     ['topcoins', 'cryptotop', 'top10crypto'],
        category:    'info',
        react:       '📊',
        description: 'View top 10 cryptocurrencies',
    },
    async (from, Malvin, conText) => {
        const { reply, react } = conText;
        try {
            await react('📊');
            const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false');
            const coins = res.data;
            const medals = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
            let text = '📊 *TOP 10 CRYPTOCURRENCIES*\n\n';
            coins.forEach((coin, i) => {
                const change = coin.price_change_percentage_24h?.toFixed(2);
                const arrow  = change >= 0 ? '📈' : '📉';
                text += `${medals[i]} *${coin.name}* (${coin.symbol.toUpperCase()})\n   $${coin.current_price?.toLocaleString()} ${arrow} ${change}%\n\n`;
            });
            await reply(text);
        } catch(e) {
            await reply('❌ Failed to fetch crypto data.');
        }
    }
);

// ── .cryptoconv — Crypto converter ────────────────────────────────────────────
mxd(
    {
        pattern:     'cryptoconv',
        aliases:     ['coinconvert', 'cryptocalc', 'btcusd'],
        category:    'info',
        react:       '🔄',
        description: 'Convert crypto to USD — .cryptoconv 0.5 bitcoin',
    },
    async (from, Malvin, conText) => {
        const { reply, react, args } = conText;
        if (!args[0] || !args[1]) return reply('❌ Usage: *.cryptoconv <amount> <coin>*\nExample: *.cryptoconv 0.5 bitcoin*');
        try {
            await react('🔄');
            const amount = parseFloat(args[0]);
            const coin   = args[1].toLowerCase();
            const res    = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
            const price  = res.data[coin]?.usd;
            if (!price) return reply(`❌ Coin *${coin}* not found.`);
            const total = (amount * price).toLocaleString();
            await reply(`🔄 *Crypto Converter*\n\n${amount} *${coin.toUpperCase()}* = *$${total} USD*\n\n1 ${coin.toUpperCase()} = $${price.toLocaleString()}`);
        } catch(e) {
            await reply('❌ Conversion failed.');
        }
    }
);

// ── .news — Latest news ───────────────────────────────────────────────────────
mxd(
    {
        pattern:     'news',
        aliases:     ['latestnews', 'headlines', 'breakingnews'],
        category:    'info',
        react:       '📰',
        description: 'Get latest news headlines — .news [topic]',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        try {
            await react('📰');
            const topic = q || 'technology';
            const res   = await axios.get(`https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&lang=en&max=5&apikey=demo`);

            if (!res.data?.articles?.length) {
                // Fallback without API key
                const fallback = await axios.get(`https://newsapi.org/v2/top-headlines?language=en&pageSize=5&q=${encodeURIComponent(topic)}`).catch(() => null);
                if (!fallback?.data?.articles?.length) return reply(`📰 News unavailable. Try again later.`);
            }

            const articles = res.data?.articles || [];
            let text = `📰 *Latest ${topic.toUpperCase()} News*\n\n`;
            articles.slice(0, 5).forEach((a, i) => {
                text += `*${i+1}.* ${a.title}\n📅 ${new Date(a.publishedAt).toLocaleDateString()}\n🔗 ${a.url}\n\n`;
            });
            await reply(text);
        } catch(e) {
            await reply('❌ Failed to fetch news. Try again later.');
        }
    }
);

// ── .stock — Stock price ──────────────────────────────────────────────────────
mxd(
    {
        pattern:     'stock',
        aliases:     ['stockprice', 'shares', 'stockinfo'],
        category:    'info',
        react:       '📈',
        description: 'Get stock price — .stock AAPL',
    },
    async (from, Malvin, conText) => {
        const { reply, react, q } = conText;
        if (!q) return reply('❌ Usage: *.stock <ticker>*\nExample: *.stock AAPL* (Apple)\nCommon: AAPL, GOOGL, MSFT, TSLA, AMZN');
        try {
            await react('📈');
            const symbol = q.toUpperCase();
            const res    = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
            const meta   = res.data?.chart?.result?.[0]?.meta;
            if (!meta) return reply(`❌ Stock *${symbol}* not found.`);

            const price  = meta.regularMarketPrice;
            const prev   = meta.previousClose;
            const change = ((price - prev) / prev * 100).toFixed(2);
            const arrow  = change >= 0 ? '📈' : '📉';

            await reply(`📈 *${meta.shortName || symbol}* (${symbol})\n\n💵 Price: *$${price?.toFixed(2)}*\n${arrow} Change: *${change}%*\n📊 Prev Close: *$${prev?.toFixed(2)}*\n💹 Market: *${meta.exchangeName}*`);
        } catch(e) {
            await reply('❌ Failed to fetch stock data. Market may be closed.');
        }
    }
);

// ── .currency — Currency converter ────────────────────────────────────────────
mxd(
    {
        pattern:     'currency',
        aliases:     ['currencyconv', 'forex', 'exchangerate'],
        category:    'info',
        react:       '💱',
        description: 'Convert currency — .currency 100 USD EUR',
    },
    async (from, Malvin, conText) => {
        const { reply, react, args } = conText;
        if (!args[0] || !args[1] || !args[2]) return reply('❌ Usage: *.currency <amount> <from> <to>*\nExample: *.currency 100 USD EUR*');
        try {
            await react('💱');
            const amount = parseFloat(args[0]);
            const from_c = args[1].toUpperCase();
            const to_c   = args[2].toUpperCase();
            const res    = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from_c}`);
            const rate   = res.data?.rates?.[to_c];
            if (!rate) return reply(`❌ Cannot convert *${from_c}* to *${to_c}*.`);
            const result = (amount * rate).toFixed(2);
            await reply(`💱 *Currency Converter*\n\n${amount} *${from_c}* = *${result} ${to_c}*\n\n1 ${from_c} = ${rate.toFixed(4)} ${to_c}`);
        } catch(e) {
            await reply('❌ Failed to fetch exchange rates.');
        }
    }
);
