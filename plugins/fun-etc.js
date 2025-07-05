const axios = require("axios");
const { malvin } = require("../malvin");
const { fetchGif, gifToVideo } = require("../lib/fetchGif");

malvin({
  pattern: "marige",
  alias: ["shadi", "marriage", "wedding"],
  desc: "Randomly pairs two users for marriage with a wedding GIF",
  react: "💍",
  category: "fun",
  filename: __filename
}, async (conn, mek, store, { isGroup, groupMetadata, reply, sender }) => {
  try {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups!");

    // Get all participants in the group
    const participants = groupMetadata.participants.map(user => user.id);

    // Filter out the sender and bot number
    const eligibleParticipants = participants.filter(id => id !== sender && !id.includes(conn.user.id.split('@')[0]));

    // If there are not enough participants, send an error message
    if (eligibleParticipants.length < 1) {
      return reply("❌ Not enough participants to perform a marriage!");
    }

    // Randomly select a participant for the pairing
    const randomIndex = Math.floor(Math.random() * eligibleParticipants.length);
    const randomPair = eligibleParticipants[randomIndex];

    // Fetch a wedding GIF using the Waifu API (can be changed for another source)
    const apiUrl = "https://api.waifu.pics/sfw/hug"; // Wedding-like GIF from API
    let res = await axios.get(apiUrl);
    let gifUrl = res.data.url;

    // Fetch the GIF and convert it to video
    let gifBuffer = await fetchGif(gifUrl);
    let videoBuffer = await gifToVideo(gifBuffer);

    // Create the marriage message
    const message = `💍 *Congrats !* 💒\n\n👰 @${sender.split("@")[0]} + 🤵 @${randomPair.split("@")[0]}\n\nMay you both live happily ever after! 💖\n\nPowered by Malvin XD`;

    // Send the marriage video message with the wedding GIF
    await conn.sendMessage(
      mek.chat,
      { 
        video: videoBuffer, 
        caption: message, 
        gifPlayback: true, 
        mentions: [sender, randomPair] 
      },
      { quoted: mek }
    );

  } catch (error) {
    console.error("❌ Error in .marige command:", error);
    reply(`❌ *Error in .marige command:*\n\`\`\`${error.message}\`\`\``);
  }
});
