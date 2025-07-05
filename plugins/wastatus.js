const { malvin } = require("../malvin");

malvin({
  pattern: "post",
  alias: ["poststatus", "status", "story", "repost", "reshare"],
  react: '📝',
  desc: "Posts replied media to bot's status",
  category: "owner",
  filename: __filename
}, async (client, message, match, { from, isCreator }) => {
  try {
    if (!isCreator) {
      return await client.sendMessage(from, {
        text: "*📛 This is an owner-only command.*"
      }, { quoted: message });
    }

    const quotedMsg = message.quoted ? message.quoted : message;
    const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

    if (!mimeType) {
      return await client.sendMessage(message.chat, {
        text: "*Please reply to an image, video, or audio file.*"
      }, { quoted: message });
    }

    const buffer = await quotedMsg.download();
    const mtype = quotedMsg.mtype;
    const caption = quotedMsg.text || '';

    let statusContent = {};

    switch (mtype) {
      case "imageMessage":
        statusContent = {
          image: buffer,
          caption: caption
        };
        break;
      case "videoMessage":
        statusContent = {
          video: buffer,
          caption: caption
        };
        break;
      case "audioMessage":
        statusContent = {
          audio: buffer,
          mimetype: "audio/mp4",
          ptt: quotedMsg.ptt || false
        };
        break;
      default:
        return await client.sendMessage(message.chat, {
          text: "Only image, video, and audio files can be posted to status."
        }, { quoted: message });
    }

    await client.sendMessage("status@broadcast", statusContent);

    await client.sendMessage(message.chat, {
      text: "✅ Status Uploaded Successfully."
    }, { quoted: message });

  } catch (error) {
    console.error("Status Error:", error);
    await client.sendMessage(message.chat, {
      text: "❌ Failed to post status:\n" + error.message
    }, { quoted: message });
  }
});
