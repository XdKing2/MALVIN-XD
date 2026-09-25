const { mxd } = require("../king");
const { sendGame } = require("../king/lib/games");
const { sendButtons } = require("malvin-btns");
const { mrxd } = require("../king/mrxd");

const ARCADE_GAMES = {
    snake: "🐍 Snake",
    car: "🚗 Car Dodge",
    dino: "🦖 Dino Run",
    runner: "🏃 Endless Runner",
    flappy: "🐦 Flappy",
    space: "🚀 Space Shooter",
    zombie: "🧟 Zombie Survival",
    fruit: "🍎 Fruit Catcher",
    coin: "🪙 Coin Collector",
    pong: "🏓 Pong",
    breakout: "🧱 Breakout",
    tetris: "🧱 Block Stacker",
    "2048": "🔢 2048",
    memory: "🧠 Memory Cards",
    mines: "💣 Minesweeper",
    aim: "🎯 Aim Challenge",
    archery: "🏹 Archery",
    treasure: "💰 Treasure Hunt",
};

const arcadeMenu = `════〘 🎮 ᴀʀᴄᴀᴅᴇ 〙════⊷
┃✦│ .snake
┃✦│ .car
┃✦│ .dino
┃✦│ .runner
┃✦│ .flappy
┃✦│ .space
┃✦│ .zombie
┃✦│ .fruit
┃✦│ .coin
┃✦│ .pong
┃✦│ .breakout
┃✦│ .tetris
┃✦│ .2048
┃✦│ .memory
┃✦│ .mines
┃✦│ .aim
┃✦│ .archery
┃✦│ .treasure
┃✦╰─────────`;

mxd({
    pattern: "arcade",
    aliases: ["arcadegames", "arcadegame"],
    react: "🎮",
    category: "game",
    description: "Show the Arcade games menu",
}, async (from, Malvin, conText) => {
    const footer = conText?.botFooter || "Malvin-XD • Arcade";
    return await sendButtons(Malvin, from, {
        text: arcadeMenu,
        footer,
        buttons: [
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🚗 Car", id: ".car" }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🐍 Snake", id: ".snake" }) },
            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🎮 More Games", id: ".arcade" }) },
        ],
    }, { quoted: mrxd });
});

for (const [pattern, title] of Object.entries(ARCADE_GAMES)) {
    mxd({
        pattern,
        react: "🎮",
        category: "game",
        description: `Play ${title}`,
    }, async (from, Malvin) => {
        try {
            await sendGame(Malvin, from, null, pattern);
        } catch (error) {
            console.error(`[ARCADE:${pattern}]`, error);
            await Malvin.sendMessage(from, {
                text: `❌ Unable to start ${title} right now.`,
            });
        }
    });
}
