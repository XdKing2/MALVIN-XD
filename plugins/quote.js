const axios = require("axios");
const { malvin } = require("../malvin");

malvin({
  pattern: "quote",
  alias: ["quotes", "motivate"],
  desc: "Get a random inspiring quote.",
  category: "fun",
  react: "💬",
  filename: __filename
}, async (conn, m, store, { from, reply }) => {
  try {
    const res = await axios.get("https://api.quotable.io/random");
    const { content, author } = res.data;

    const formatted = `
┌───「 💭 𝗜𝗡𝗦𝗣𝗜𝗥𝗔𝗧𝗜𝗢𝗡 」───
│
│  📜 *"${content}"*
│  — ${author || "Unknown"}
│
└─🧠 Powered by *Malvin King*
    `.trim();

    reply(formatted);
  } catch (e) {
    console.error("❌ Quote Fetch Error:", e.message);
    reply("⚠️ Failed to get a quote. Please try again later.");
  }
});
