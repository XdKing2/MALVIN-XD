const { malvin } = require("../malvin");

malvin({
  pattern: "caption",
  alias: ["cap", "recaption", "c"],
  react: '✏️',
  desc: "Add or change caption of media/document",
  category: "other",
  filename: __filename
}, async (client, message, match, { from }) => {
  try {
    if (!message.quoted) {
      return await client.sendMessage(from, {
        text: "*❗️ Please reply to a media message (image/video/document) to add caption!*\n\n*Usage:*\n- Reply to media with .caption [your text]\n- Or just .caption [text] to add caption to previous media"
      }, { quoted: message });
    }

    const quotedMsg = message.quoted;
    if (!quotedMsg || !quotedMsg.download) {
      return await client.sendMessage(from, {
        text: "❌ The quoted message is not valid media"
      }, { quoted: message });
    }

    const buffer = await quotedMsg.download();
    const mtype = quotedMsg.mtype;
    
    // Get the caption text (everything after the command)
    const cmdText = message.body.split(' ')[0].toLowerCase();
    const newCaption = message.body.slice(cmdText.length).trim();

    if (!buffer) {
      return await client.sendMessage(from, {
        text: "❌ Failed to download the media"
      }, { quoted: message });
    }

    // Create the base message content
    const messageContent = {
      caption: newCaption,
      mimetype: quotedMsg.mimetype
    };

    // Add the appropriate media property based on type
    switch (mtype) {
      case "imageMessage":
        messageContent.image = buffer;
        messageContent.mimetype = messageContent.mimetype || "image/jpeg";
        break;
      case "videoMessage":
        messageContent.video = buffer;
        messageContent.mimetype = messageContent.mimetype || "video/mp4";
        break;
      case "documentMessage":
        messageContent.document = buffer;
        messageContent.mimetype = messageContent.mimetype || "application/octet-stream";
        break;
      case "audioMessage":
        messageContent.audio = buffer;
        messageContent.mimetype = messageContent.mimetype || "audio/mp4";
        messageContent.ptt = quotedMsg.ptt || false;
        break;
      default:
        return await client.sendMessage(from, {
          text: "❌ Only image, video, document and audio messages can be recaptioned"
        }, { quoted: message });
    }

    // Send the message with media and caption
    await client.sendMessage(from, messageContent, { quoted: message });

  } catch (error) {
    console.error("Caption Error:", error);
    await client.sendMessage(from, {
      text: "❌ Error adding caption:\n" + (error.message || error.toString())
    }, { quoted: message });
  }
});
