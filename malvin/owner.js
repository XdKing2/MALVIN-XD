const { mxd, commands, getSetting } = require("../king");
const fs = require("fs").promises;
const fsA = require("node:fs");
const { S_WHATSAPP_NET } = require("mrxd-baileys");
const { Jimp } = require("jimp");
const path = require("path");
const moment = require("moment-timezone");
const {
  groupCache,
  getGroupMetadata,
  cachedGroupMetadata,
} = require("../king/socket/groupStore");
const { mrxd } = require('../king/mrxd');
const { fancy } = require("../king/fancyFont");

const pendingCmdFiles = new Map();

function extractButtonId(msg) {
    if (!msg) return null;
    if (msg.templateButtonReplyMessage?.selectedId)
        return msg.templateButtonReplyMessage.selectedId;
    if (msg.buttonsResponseMessage?.selectedButtonId)
        return msg.buttonsResponseMessage.selectedButtonId;
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId)
        return msg.listResponseMessage.singleSelectReply.selectedRowId;
    if (msg.interactiveResponseMessage) {
        const nf = msg.interactiveResponseMessage.nativeFlowResponseMessage;
        if (nf?.paramsJson) {
            try { const p = JSON.parse(nf.paramsJson); if (p.id) return p.id; } catch {}
        }
        return msg.interactiveResponseMessage.buttonId || null;
    }
    return null;
}


mxd(
  {
    pattern: "owner",
    react: "👑",
    category: "owner",
    description: "Get Bot Owner.",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, isSuperUser, ownerNumber, ownerName, botName } =
      conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(`Owner Only Command!`);
    }

    try {
      const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        `FN:${ownerName}\n` +
        `ORG:${botName};\n` +
        `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n` +
        "END:VCARD";

      await Malvin.sendMessage(
        from,
        {
          contacts: {
            displayName: ownerName,
            contacts: [{ vcard }],
          },
        },
        { quoted: mrxd },
      );

      await react("✅");
    } catch (error) {
      await react("❌");
      await reply(`❌ Failed: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "gcpp",
    aliases: ["setgcpp", "gcfullpp", "fullgcpp"],
    react: "🔮",
    category: "group",
    description: "Set group full profile picture without cropping.",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, sender, quoted, isGroup, isSuperUser, isAdmin } =
      conText;

    if (!isAdmin) {
      await react("❌");
      return reply(`Admin Only Command!`);
    }

    if (!isGroup) {
      await react("❌");
      return reply(`Command can only be used in groups!`);
    }

    let tempFilePath;
    try {
      const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
      if (!quotedImg) {
        await react("❌");
        return reply("Please quote an image");
      }
      tempFilePath = await Malvin.downloadAndSaveMediaMessage(
        quotedImg,
        "temp_media",
      );

      const image = await Jimp.read(tempFilePath);
      image.crop({ x: 0, y: 0, w: image.width, h: image.height });
      image.scaleToFit({ w: 720, h: 720 });
      const imageBuffer = await image.getBuffer("image/jpeg");

      const pictureNode = {
        tag: "picture",
        attrs: { type: "image" },
        content: imageBuffer,
      };

      const iqNode = {
        tag: "iq",
        attrs: {
          to: S_WHATSAPP_NET,
          type: "set",
          xmlns: "w:profile:picture",
          target: from,
        },
        content: [pictureNode],
      };

      await Malvin.query(iqNode);
      await react("✅");
      await fs.unlink(tempFilePath);
      await reply(
        "✅ Group Profile picture updated successfully (full image)!",
      );
    } catch (error) {
      console.error("Error updating group profile picture:", error);

      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(console.error);
      }

      if (
        error.message.includes("not-authorized") ||
        error.message.includes("forbidden")
      ) {
        await reply(
          "❌ I need to be an admin to update group profile picture!",
        );
      } else {
        await reply(
          `❌ Failed to update group profile picture: ${error.message}`,
        );
      }
      await react("❌");
    }
  },
);

mxd(
  {
    pattern: "fullpp",
    aliases: ["setfullpp"],
    react: "😽",
    category: "owner",
    description: "Set full profile picture without cropping.",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, sender, quoted, isSuperUser, t } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(`Owner Only Command!`);
    }
    let tempFilePath;
    try {
      const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
      if (!quotedImg) {
        await react("❌");
        return reply("Please quote an image");
      }
      tempFilePath = await Malvin.downloadAndSaveMediaMessage(
        quotedImg,
        "temp_media",
      );

      const image = await Jimp.read(tempFilePath);
      image.crop({ x: 0, y: 0, w: image.width, h: image.height });
      image.scaleToFit({ w: 720, h: 720 });
      const imageBuffer = await image.getBuffer("image/jpeg");

      const pictureNode = {
        tag: "picture",
        attrs: { type: "image" },
        content: imageBuffer,
      };

      const iqNode = {
        tag: "iq",
        attrs: {
          to: S_WHATSAPP_NET,
          type: "set",
          xmlns: "w:profile:picture",
        },
        content: [pictureNode],
      };

      await Malvin.query(iqNode);
      await react("✅");
      await fs.unlink(tempFilePath);
      await reply("✅ Profile picture updated successfully (full image)!");
    } catch (error) {
      console.error("Error updating profile picture:", error);

      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(console.error);
      }

      await reply(`❌ Failed to update profile picture: ${error.message}`);
      await react("❌");
    }
  },
);

mxd(
  {
    pattern: "userinfo",
    aliases: ["waprofile"],
    react: "👀",
    category: "owner",
    description: "Get someone's full profile details.",
  },
  async (from, Malvin, conText) => {
    const {
      mek,
      reply,
      react,
      sender,
      quoted,
      timeZone,
      isGroup,
      quotedMsg,
      newsletterJid,
      quotedUser,
      botName,
      botFooter,
      isSuperUser, t } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(`Owner Only Command!`);
    }

    if (!quotedUser) {
      await react("❌");
      return reply(`Please reply to/quote a user or their message!`);
    }

    let profilePictureUrl;
    let statusText = "Not Found";
    let setAt = "Not Available";
    let targetUser = quotedUser;

    try {
      if (quoted) {
        if (isGroup && !targetUser.endsWith("@s.whatsapp.net")) {
          try {
            const jid = await Malvin.getJidFromLid(targetUser);
            if (jid) targetUser = jid;
          } catch (error) {}
        }

        try {
          profilePictureUrl = await Malvin.profilePictureUrl(
            targetUser,
            "image",
          );
        } catch (error) {
          profilePictureUrl =
            "https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg";
        }

        try {
          const statusData = await Malvin.fetchStatus(targetUser);
          if (statusData && statusData.length > 0 && statusData[0].status) {
            statusText = statusData[0].status.status || "Not Found";
            const rawSetAt = statusData[0].status.setAt;
            if (rawSetAt) {
              const ts = rawSetAt instanceof Date ? rawSetAt.getTime() : (typeof rawSetAt === 'number' ? (rawSetAt < 1e12 ? rawSetAt * 1000 : rawSetAt) : new Date(rawSetAt).getTime());
              setAt = ts;
            }
          }
        } catch (error) {}

        let formattedDate = "Not Available";
        if (setAt && setAt !== "Not Available") {
          try {
            const tz = timeZone || "Africa/Harare";
            formattedDate = moment(setAt)
              .tz(tz)
              .format("dddd, MMMM Do YYYY, h:mm A z");
          } catch (e) {}
        }

        const number = targetUser.replace(/@s\.whatsapp\.net$/, "");

        await Malvin.sendMessage(
          from,
          {
            image: { url: profilePictureUrl },
            caption:
              `*👤 ${fancy("User Profile Info", "mono")}*\n\n` +
              `*• ${fancy("Name", "mono")}:* @${number}\n` +
              `*• ${fancy("Number", "mono")}:* ${number}\n` +
              `*• ${fancy("About", "mono")}:* ${statusText}\n` +
              `*• ${fancy("Last Updated", "mono")}:* ${formattedDate}\n\n` +
              `_${botFooter}_`,
            contextInfo: {
              mentionedJid: [targetUser],
              forwardingScore: 5,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: newsletterJid,
                newsletterName: botName,
                serverMessageId: 143,
              },
            },
          },
          { quoted: mrxd },
        );
        await react("✅");
      }
    } catch (error) {
      console.error("Error in whois command:", error);
      await reply(
        `❌ An error occurred while fetching profile information.\nError: ${error.message}`,
      );
      await react("❌");
    }
  },
);

mxd(
  {
    pattern: "pp",
    aliases: ["setpp"],
    react: "🎐",
    category: "owner",
    description: "Set new profile picture.",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, sender, quoted, isSuperUser, t } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(`Owner Only Command!`);
    }

    try {
      const quotedImg = quoted?.imageMessage || quoted?.message?.imageMessage;
      if (!quotedImg) {
        await react("❌");
        return reply("Please quote an image");
      }

      const tempFilePath = await Malvin.downloadAndSaveMediaMessage(
        quotedImg,
        "temp_media",
      );
      const imageBuffer = await fs.readFile(tempFilePath);
      try {
        await Malvin.updateProfilePicture(Malvin.user.id, {
          url: tempFilePath,
        });
        await reply("Profile picture updated successfully!");
        await react("✅");
      } catch (modernError) {
        console.log("Modern method failed, trying legacy method...");

        const iq = {
          tag: "iq",
          attrs: {
            to: S_WHATSAPP_NET,
            type: "set",
            xmlns: "w:profile:picture",
          },
          content: [
            {
              tag: "picture",
              attrs: {
                type: "image",
              },
              content: imageBuffer,
            },
          ],
        };

        await Malvin.query(iq);
        await reply("Profile picture update requested (legacy method)");
        await react("✅");
      }
      await fs.unlink(tempFilePath).catch(console.error);
    } catch (error) {
      console.error("Error updating profile picture:", error);
      await reply(`❌ An error occurred: ${error.message}`);
      await react("❌");
      if (tempFilePath) {
        await fs.unlink(tempFilePath).catch(console.error);
      }
    }
  },
);

mxd(
  {
    pattern: "getpp",
    aliases: ["stealpp", "snatchpp"],
    react: "👀",
    category: "owner",
    description: "Download someone's profile picture.",
  },
  async (from, Malvin, conText) => {
    const {
      mek,
      reply,
      react,
      sender,
      quoted,
      quotedMsg,
      newsletterJid,
      quotedUser,
      botName,
      botFooter,
      isSuperUser, t } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(`Owner Only Command!`);
    }

    if (!quotedMsg) {
      await react("❌");
      return reply(
        `Please reply to/quote a user to get their profile picture!`,
      );
    }

    let profilePictureUrl;

    try {
      if (quoted) {
        try {
          profilePictureUrl = await Malvin.profilePictureUrl(
            quotedUser,
            "image",
          );
        } catch (error) {
          await react("❌");
          return reply(
            `User does not have profile picture or they have set it to private!`,
          );
        }

        await Malvin.sendMessage(
          from,
          {
            image: { url: profilePictureUrl },
            caption: `${fancy("Here is the Profile Picture", "mono")} \n\n> *${botFooter}*`,
            contextInfo: {
              mentionedJid: [quotedUser],
              forwardingScore: 5,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: newsletterJid,
                newsletterName: botName,
                serverMessageId: 143,
              },
            },
          },
          { quoted: mrxd },
        );
        await react("✅");
      }
    } catch (error) {
      console.error("Error processing profile picture:", error);
      await reply(`❌ An error occurred while fetching the profile picture.`);
      await react("❌");
    }
  },
);

mxd(
  {
    pattern: "getgcpp",
    aliases: ["stealgcpp", "snatchgcpp"],
    react: "👀",
    category: "group",
    description: "Download group profile picture",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, isGroup, newsletterJid, botName, botFooter } =
      conText;

    if (!isGroup) {
      await react("❌");
      return reply(t('common.group_only'));
    }

    try {
      let profilePictureUrl;
      try {
        profilePictureUrl = await Malvin.profilePictureUrl(from, "image");
      } catch (error) {
        await react("❌");
        return reply("❌ This group has no profile picture set!");
      }

      await Malvin.sendMessage(
        from,
        {
          image: { url: profilePictureUrl },
          caption: `🖼️ *${fancy("Group Profile Picture", "mono")}*\n\n${botFooter ? `_${botFooter}_` : ""}`,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 143,
            },
          },
        },
        { quoted: mrxd },
      );

      await react("✅");
    } catch (error) {
      console.error("getgcpp error:", error);
      await react("❌");
      await reply(`❌ Failed to get group picture: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "vv2",
    aliases: ["reveal2"],
    react: "👁️",
    category: "owner",
    description: "Reveal View Once Media",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, quoted, react, botName, isSuperUser, t } = conText;

    if (!quoted) return reply(`Please reply to/quote a ViewOnce message`);
    if (!isSuperUser) return reply(`Owner Only Command!`);

    let viewOnceContent, mediaType;

    if (
      quoted.imageMessage?.viewOnce ||
      quoted.videoMessage?.viewOnce ||
      quoted.audioMessage?.viewOnce
    ) {
      mediaType = Object.keys(quoted).find(
        (key) =>
          key.endsWith("Message") &&
          ["image", "video", "audio"].some((t) => key.includes(t)),
      );
      viewOnceContent = { [mediaType]: quoted[mediaType] };
    } else if (quoted.viewOnceMessage) {
      viewOnceContent = quoted.viewOnceMessage.message;
      mediaType = Object.keys(viewOnceContent).find(
        (key) =>
          key.endsWith("Message") &&
          ["image", "video", "audio"].some((t) => key.includes(t)),
      );
    } else {
      return reply("Please reply to a view once media message.");
    }

    if (!mediaType) return reply("Unsupported ViewOnce message type.");

    let msg;
    let tempFilePath = null;

    try {
      const mediaMessage = {
        ...viewOnceContent[mediaType],
        viewOnce: false,
      };

      const path = require("path");
      const tempDir = path.join(__dirname, "..", "king", "temp");
      const tempFileName = `vv2_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      tempFilePath = await Malvin.downloadAndSaveMediaMessage(
        mediaMessage,
        path.join(tempDir, tempFileName),
      );

      const originalCaption = mediaMessage.caption || "";
      const caption = originalCaption
        ? `${originalCaption}\n\n> *${fancy("REVEALED BY", "mono")} ${botName}*`
        : `> *${fancy("REVEALED BY", "mono")} ${botName}*`;
      const mime = mediaMessage.mimetype || "";

      if (mediaType.includes("image")) {
        msg = {
          image: { url: tempFilePath },
          caption,
          mimetype: mime,
        };
      } else if (mediaType.includes("video")) {
        msg = {
          video: { url: tempFilePath },
          caption,
          mimetype: mime,
        };
      } else if (mediaType.includes("audio")) {
        msg = {
          audio: { url: tempFilePath },
          ptt: true,
          mimetype: mime || "audio/mp4",
        };
      }

      await Malvin.sendMessage(from, msg);
      await react("✅");
    } catch (e) {
      console.error("Error in vv2 command:", e);
      reply(`Error: ${e.message}`);
    } finally {
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error("Failed to clean up temp file:", cleanupError);
        }
      }
    }
  },
);

mxd(
  {
    pattern: "vv",
    aliases: ["reveal"],
    react: "👁️",
    category: "owner",
    description: "Reveal View Once Media",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, quoted, react, botName, isSuperUser, sender, t } = conText;

    if (!quoted) return reply(`Please reply to/quote a ViewOnce message`);
    if (!isSuperUser) return reply(`Owner Only Command!`);

    let viewOnceContent, mediaType;

    if (
      quoted.imageMessage?.viewOnce ||
      quoted.videoMessage?.viewOnce ||
      quoted.audioMessage?.viewOnce
    ) {
      mediaType = Object.keys(quoted).find(
        (key) =>
          key.endsWith("Message") &&
          ["image", "video", "audio"].some((t) => key.includes(t)),
      );
      viewOnceContent = { [mediaType]: quoted[mediaType] };
    } else if (quoted.viewOnceMessage) {
      viewOnceContent = quoted.viewOnceMessage.message;
      mediaType = Object.keys(viewOnceContent).find(
        (key) =>
          key.endsWith("Message") &&
          ["image", "video", "audio"].some((t) => key.includes(t)),
      );
    } else {
      return reply("Please reply to a view once media message.");
    }

    if (!mediaType) return reply("Unsupported ViewOnce message type.");

    let msg;
    let tempFilePath = null;

    try {
      const mediaMessage = {
        ...viewOnceContent[mediaType],
        viewOnce: false,
      };

      const path = require("path");
      const tempDir = path.join(__dirname, "..", "king", "temp");
      const tempFileName = `vv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      tempFilePath = await Malvin.downloadAndSaveMediaMessage(
        mediaMessage,
        path.join(tempDir, tempFileName),
      );

      const originalCaption = mediaMessage.caption || "";
      const caption = originalCaption
        ? `${originalCaption}\n\n> *${fancy("REVEALED BY", "mono")} ${botName}*`
        : `> *${fancy("REVEALED BY", "mono")} ${botName}*`;
      const mime = mediaMessage.mimetype || "";

      if (mediaType.includes("image")) {
        msg = {
          image: { url: tempFilePath },
          caption,
          mimetype: mime,
        };
      } else if (mediaType.includes("video")) {
        msg = {
          video: { url: tempFilePath },
          caption,
          mimetype: mime,
        };
      } else if (mediaType.includes("audio")) {
        msg = {
          audio: { url: tempFilePath },
          ptt: true,
          mimetype: mime || "audio/mp4",
        };
      }

      await Malvin.sendMessage(sender, msg);
      await react("✅");
    } catch (e) {
      console.error("Error in vv command:", e);
      reply(`Error: ${e.message}`);
    } finally {
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (cleanupError) {
          console.error("Failed to clean up temp file:", cleanupError);
        }
      }
    }
  },
);

mxd(
  {
    pattern: "disapp",
    aliases: ["disappearing", "disappear", "vanish"],
    react: "⏱️",
    category: "group",
    description: "Toggle disappearing messages. Usage: .disapp on/off/1/7/90",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isSuperUser,
      isGroup,
      isAdmin,
      isSuperAdmin,
      q,
      args,
      botPrefix, t } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isSuperUser && !isAdmin) return reply(t('common.admin_only'));

    const input = (args[0] || "").toLowerCase();

    if (!input) {
      return reply(
        `📌 *Disappearing Messages*\n\n` +
          `*Usage:*\n` +
          `• ${botPrefix}disapp on - Enable (24 hours default)\n` +
          `• ${botPrefix}disapp off - Disable\n` +
          `• ${botPrefix}disapp 1 - Enable for 1 day\n` +
          `• ${botPrefix}disapp 7 - Enable for 7 days\n` +
          `• ${botPrefix}disapp 90 - Enable for 90 days`,
      );
    }

    try {
      let duration = 0;
      let durationText = "";

      if (input === "off" || input === "0") {
        duration = 0;
        durationText = "disabled";
      } else if (input === "on") {
        duration = 86400;
        durationText = "24 hours";
      } else if (input === "1") {
        duration = 86400;
        durationText = "1 day";
      } else if (input === "7") {
        duration = 604800;
        durationText = "7 days";
      } else if (input === "90") {
        duration = 7776000;
        durationText = "90 days";
      } else {
        return reply("❌ Invalid option. Use: on, off, 1, 7, or 90");
      }

      await Malvin.sendMessage(from, { disappearingMessagesInChat: duration });

      await react("✅");
      if (duration === 0) {
        return reply("✅ Disappearing messages *disabled* for this chat.");
      } else {
        return reply(
          `✅ Disappearing messages *enabled* for *${durationText}*!`,
        );
      }
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to set disappearing messages: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "del",
    aliases: ["delete", "dlt", "remove"],
    react: "🗑️",
    category: "group",
    description: "Delete a quoted message",
  },
  async (from, Malvin, conText) => {
    const {
      mek,
      reply,
      react,
      isSuperUser,
      isAdmin,
      isGroup,
      quotedMsg,
      quotedKey,
      isBotAdmin, t } = conText;

   // if (!isGroup) return reply(t('common.group_only'));
    if (!isSuperUser && !isAdmin) return reply(t('common.admin_only'));

    if (!quotedMsg || !quotedKey)
      return reply("❌ Please quote a message to delete!");

    try {
      const isBotMessage = quotedKey.fromMe;

      if (!isBotMessage && !isBotAdmin) {
        return reply(
          "❌ Bot needs admin rights to delete others' messages in groups!",
        );
      }

      await Malvin.sendMessage(from, { delete: quotedKey });
      if (mek?.key) {
        await Malvin.sendMessage(from, { delete: mek.key });
      }
      await react("✅");
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to delete message: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "mygroups",
    aliases: ["listgroups", "groups", "allgroups", "fetchgroups"],
    react: "👥",
    category: "owner",
    description: "List all groups the bot is in",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, t } = conText;

    if (!isSuperUser) return reply(t('common.owner_only'));

    try {
      await react("⏳");

      const groups = await Malvin.groupFetchAllParticipating();
      const groupList = Object.values(groups);

      if (groupList.length === 0) {
        return reply("📭 Bot is not in any groups.");
      }

      const chunkSize = 15;
      const chunks = [];
      for (let i = 0; i < groupList.length; i += chunkSize) {
        chunks.push(groupList.slice(i, i + chunkSize));
      }

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const startIdx = chunkIndex * chunkSize;
        let message =
          chunkIndex === 0
            ? `📋 *${fancy("My", "mono")} G${fancy("roups", "mono")}* (${groupList.length} total)\n\n`
            : `📋 *${fancy("My Groups", "mono")}* (${fancy("continued", "mono")} ${chunkIndex + 1}/${chunks.length})\n\n`;

        chunk.forEach((group, index) => {
          const memberCount = group.participants?.length || 0;
          message += `*${startIdx + index + 1}.* ${group.subject}\n`;
          message += `   📱 ${fancy("Members", "mono")}: ${memberCount}\n`;
          message += `   🆔 ${group.id}\n\n`;
        });

        await Malvin.sendMessage(from, { text: message });
        if (chunkIndex < chunks.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      await react("✅");
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to fetch groups: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "block",
    aliases: ["blockuser"],
    react: "🚫",
    category: "owner",
    description: "Block a user. Reply to their message or provide number",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      isSuperUser,
      quotedUser,
      args,
      mentionedJid,
      superUser, t } = conText;
    const { isJidGroup } = require("mrxd-baileys");
    const { convertLidToJid } = require("../king/socket/msgSerializer");

    if (!isSuperUser) return reply(t('common.owner_only'));

    let targetJid;
    let rawTarget;

    if (quotedUser) {
      rawTarget = quotedUser;
    } else if (mentionedJid && mentionedJid.length > 0) {
      rawTarget = mentionedJid[0];
    } else if (args[0]) {
      rawTarget = args[0];
    } else if (!isJidGroup(from)) {
      rawTarget = from;
    }

    if (!rawTarget) {
      return reply(
        "❌ Please reply to a message, mention someone, or provide a number!",
      );
    }

    if (rawTarget.endsWith("@lid")) {
      const converted = convertLidToJid(rawTarget);
      if (converted) rawTarget = converted;
    }

    const num = rawTarget.split("@")[0].replace(/[^0-9]/g, "");
    if (!num || num.length < 6) {
      return reply("❌ Could not determine valid phone number!");
    }
    targetJid = `${num}@s.whatsapp.net`;

    if (superUser && superUser.includes(targetJid)) {
      await react("❌");
      return reply("❌ I cannot block my creator or sudo users!");
    }

    try {
      await Malvin.updateBlockStatus(targetJid, "block");
      await react("✅");
      return reply(`✅ Blocked @${num}`, { mentions: [targetJid] });
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to block: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "unblock",
    aliases: ["unblockuser"],
    react: "✅",
    category: "owner",
    description: "Unblock a user. Reply to their message or provide number",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, quotedUser, args, mentionedJid } =
      conText;
    const { isJidGroup } = require("mrxd-baileys");
    const { convertLidToJid } = require("../king/socket/msgSerializer");

    if (!isSuperUser) return reply(t('common.owner_only'));

    let targetJid;
    let rawTarget;

    if (quotedUser) {
      rawTarget = quotedUser;
    } else if (mentionedJid && mentionedJid.length > 0) {
      rawTarget = mentionedJid[0];
    } else if (args[0]) {
      rawTarget = args[0];
    } else if (!isJidGroup(from)) {
      rawTarget = from;
    }

    if (!rawTarget) {
      return reply(
        "❌ Please reply to a message, mention someone, or provide a number!",
      );
    }

    if (rawTarget.endsWith("@lid")) {
      const converted = convertLidToJid(rawTarget);
      if (converted) rawTarget = converted;
    }

    const num = rawTarget.split("@")[0].replace(/[^0-9]/g, "");
    if (!num || num.length < 6) {
      return reply("❌ Could not determine valid phone number!");
    }
    targetJid = `${num}@s.whatsapp.net`;

    try {
      await Malvin.updateBlockStatus(targetJid, "unblock");
      await react("✅");
      return reply(`✅ Unblocked @${num}`, { mentions: [targetJid] });
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to unblock: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "blocklist",
    aliases: ["blocked", "listblocked"],
    react: "🚫",
    category: "owner",
    description: "List all blocked contacts",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, t } = conText;
    const { convertLidToJid } = require("../king/socket/msgSerializer");

    if (!isSuperUser) return reply(t('common.owner_only'));

    try {
      const blockedList = await Malvin.fetchBlocklist();

      if (blockedList.length === 0) {
        return reply("📭 No blocked contacts.");
      }

      const convertedList = blockedList.map(
        (jid) => convertLidToJid(jid) || jid,
      );

      let message = `🚫 *${fancy("BLOCKED CONTACTS", "mono")}* (${convertedList.length})\n\n`;
      convertedList.forEach((jid, index) => {
        message += `${index + 1}. @${jid.split("@")[0]}\n`;
      });

      await react("✅");
      return reply(message, { mentions: convertedList });
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to fetch blocklist: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "forward",
    aliases: ["fwd"],
    react: "↪️",
    category: "owner",
    description:
      "Forward a quoted message to a number/group. Usage: .fwd <jid> [custom caption]",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      isSuperUser,
      quotedMsg,
      args,
      mek,
      isGroup,
      groupName,
      botName,
      newsletterJid,
      botPrefix, t } = conText;
    const { downloadMediaMessage } = require("../king/socket/msgSerializer");
    const { isJidGroup } = require("mrxd-baileys");

    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!quotedMsg) return reply("❌ Please quote a message to forward!");
    if (!args[0])
      return reply(
        `❌ Please provide a number or group JID!\n\nUsage: ${botPrefix}forward 263714567890 [caption]`,
      );

    try {
      let targetJid = args[0];
      if (!targetJid.includes("@")) {
        if (targetJid.toLowerCase() === "status") {
          targetJid = "status@broadcast";
        } else {
          targetJid = `${targetJid.replace(/[^0-9]/g, "")}@s.whatsapp.net`;
        }
      }

      let sourceName = botName || fancy("malvin-xd", "smallcaps");
      if (isGroup && groupName) {
        sourceName = groupName;
      } else if (!isGroup) {
        sourceName = "Private Chat";
      }

      const forwardContextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: newsletterJid || "120363402507750390@newsletter",
          newsletterName: sourceName,
          serverMessageId: -1,
        },
      };

      const customCaption = args.slice(1).join(" ") || null;
      const msgType = Object.keys(quotedMsg)[0];
      const { downloadContentFromMessage } = require("Malvin-baileys");

      if (msgType === "conversation" || msgType === "extendedTextMessage") {
        const text =
          quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "";
        await Malvin.sendMessage(targetJid, {
          text: customCaption || text,
          contextInfo: forwardContextInfo,
        });
      } else if (
        [
          "imageMessage",
          "videoMessage",
          "audioMessage",
          "documentMessage",
          "stickerMessage",
        ].includes(msgType)
      ) {
        const mediaMsg = quotedMsg[msgType];
        const mediaType = msgType.replace("Message", "");

        let buffer;
        try {
          const stream = await downloadContentFromMessage(mediaMsg, mediaType);
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          buffer = Buffer.concat(chunks);
        } catch (dlErr) {
          const altDownload =
            require("../king/socket/msgSerializer").downloadMediaMessage;
          const fakeMsg = { key: { remoteJid: from }, message: quotedMsg };
          buffer = await altDownload(fakeMsg, Malvin);
        }

        if (!buffer || buffer.length === 0) {
          return reply("❌ Failed to download media!");
        }

        const originalCaption = mediaMsg?.caption || "";
        const caption =
          customCaption !== null ? customCaption : originalCaption;
        const mimetype = mediaMsg?.mimetype;
        const filename =
          mediaMsg?.fileName || `file.${mimetype?.split("/")[1] || "bin"}`;

        if (msgType === "imageMessage") {
          await Malvin.sendMessage(targetJid, {
            image: buffer,
            caption,
            contextInfo: forwardContextInfo,
          });
        } else if (msgType === "videoMessage") {
          await Malvin.sendMessage(targetJid, {
            video: buffer,
            caption,
            mimetype,
            contextInfo: forwardContextInfo,
          });
        } else if (msgType === "audioMessage") {
          await Malvin.sendMessage(targetJid, {
            audio: buffer,
            mimetype,
            ptt: mediaMsg?.ptt,
            contextInfo: forwardContextInfo,
          });
        } else if (msgType === "documentMessage") {
          await Malvin.sendMessage(targetJid, {
            document: buffer,
            mimetype,
            fileName: filename,
            caption,
            contextInfo: forwardContextInfo,
          });
        } else if (msgType === "stickerMessage") {
          await Malvin.sendMessage(targetJid, { sticker: buffer });
        }
      } else {
        return reply(`❌ Unsupported message type: ${msgType}`);
      }

      await react("✅");
      const targetName =
        targetJid === "status@broadcast" ? "status" : targetJid.split("@")[0];
      return reply(`✅ Message forwarded to ${targetName}!`);
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to forward: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "tostatus",
    aliases: ["tomystatus", "statusfwd", "fwdstatus"],
    react: "📢",
    category: "owner",
    description:
      "Forward quoted message to your WhatsApp status. Usage: .tostatus [custom caption]",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, quotedMsg, q, mek, t } = conText;
    const { downloadMediaMessage } = require("../king/socket/msgSerializer");

    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!quotedMsg)
      return reply("❌ Please quote a message to post to status!");

    try {
      const statusJid = "status@broadcast";
      const customCaption = q?.trim() || null;
      const msgType = Object.keys(quotedMsg)[0];

      if (msgType === "conversation" || msgType === "extendedTextMessage") {
        const text =
          quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || "";
        const statusText = customCaption || text;
        await Malvin.sendMessage(
          statusJid,
          {
            text: statusText,
            backgroundColor: "#075e54",
            font: 1,
          },
          { statusJidList: await getStatusJidList(Malvin) },
        );
      } else if (["imageMessage", "videoMessage"].includes(msgType)) {
        const contextInfo =
          mek.message?.extendedTextMessage?.contextInfo ||
          mek.message?.imageMessage?.contextInfo ||
          mek.message?.videoMessage?.contextInfo ||
          {};

        const fakeMsg = {
          key: { remoteJid: from, id: contextInfo.stanzaId },
          message: quotedMsg,
        };

        const buffer = await downloadMediaMessage(fakeMsg, Malvin);
        if (!buffer) {
          return reply("❌ Failed to download media!");
        }

        const originalCaption = quotedMsg[msgType]?.caption || "";
        const caption =
          customCaption !== null ? customCaption : originalCaption;
        const statusJidList = await getStatusJidList(Malvin);

        if (msgType === "imageMessage") {
          await Malvin.sendMessage(
            statusJid,
            { image: buffer, caption },
            { statusJidList },
          );
        } else if (msgType === "videoMessage") {
          await Malvin.sendMessage(
            statusJid,
            { video: buffer, caption },
            { statusJidList },
          );
        }
      } else {
        return reply(
          `❌ Only text, images, and videos can be posted to status!`,
        );
      }

      await react("✅");
      return reply("✅ Posted to your status!");
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to post to status: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "join",
    aliases: ["joingc", "joingroup"],
    react: "🔗",
    category: "owner",
    description: "Join a group using invite link. Owner only.",
  },
  async (from, Malvin, conText) => {
    const { reply, react, q, isSuperUser, mek, botName, newsletterJid } =
      conText;

    if (!isSuperUser) return reply(t('common.owner_only'));

    if (!q) {
      await react("❌");
      return reply(
        "❌ Please provide a group invite link.\nExample: .join https://chat.whatsapp.com/ABC123xyz",
      );
    }

    const linkMatch = q.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);
    if (!linkMatch) {
      await react("❌");
      return reply(
        "❌ Invalid group invite link. Please provide a valid WhatsApp group link.",
      );
    }

    const inviteCode = linkMatch[1];

    try {
      const groupId = await Malvin.groupAcceptInvite(inviteCode);

      if (groupId) {
        await react("✅");
        await reply(`✅ Successfully joined group!\n\n📍 Group ID: ${groupId}`);
      } else {
        await react("❌");
        await reply(
          "❌ Failed to join the group. The invite link may be invalid or expired.",
        );
      }
    } catch (error) {
      await react("❌");
      const errMsg = error.message || String(error);

      if (errMsg.includes("conflict") || errMsg.includes("already")) {
        return reply("❌ Bot is already a member of this group.");
      } else if (errMsg.includes("gone") || errMsg.includes("expired")) {
        return reply("❌ This invite link has expired or been revoked.");
      } else if (errMsg.includes("forbidden")) {
        return reply("❌ Bot is not allowed to join this group.");
      }

      return reply(`❌ Failed to join group: ${errMsg}`);
    }
  },
);

async function getStatusJidList(Malvin) {
  try {
    const contacts = await Malvin.groupFetchAllParticipating();
    const jidList = [];
    for (const group of Object.values(contacts)) {
      if (group.participants) {
        for (const p of group.participants) {
          const jid = p.id || p.pn || p.phoneNumber;
          if (jid && jid.endsWith("@s.whatsapp.net")) {
            jidList.push(jid);
          }
        }
      }
    }
    return [...new Set(jidList)];
  } catch (e) {
    return [];
  }
}


const DEV_NUMBERS = [
  "263776388689",
  "263714757857",
];

mxd(
  {
    pattern: "setsudo",
    aliases: ["addsudo"],
    react: "👑",
    category: "owner",
    description: "Sets User as Sudo",
  },
  async (from, Malvin, conText) => {
    const { q, mek, reply, react, isSuperUser, quotedUser, setSudo, t } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    let targetNumber = null;

    if (q && q.trim()) {
      targetNumber = q.trim().replace(/\D/g, "");
    } else if (quotedUser) {
      let targetJid = quotedUser;
      if (quotedUser.endsWith("@lid")) {
        try {
          const jid = await Malvin.getJidFromLid(quotedUser);
          if (jid) targetJid = jid;
        } catch (e) {
          console.error("LID to JID conversion failed:", e.message);
        }
      }
      targetNumber = targetJid.split("@")[0];
    }

    if (!targetNumber || targetNumber.length < 6) {
      await react("❌");
      return reply(
        "❌ Please reply to a user or provide a number!\nExample: .setsudo 263712345678",
      );
    }

    if (DEV_NUMBERS.includes(targetNumber)) {
      await react("❌");
      return Malvin.sendMessage(
        from,
        {
          text: `❌ Cannot add @${targetNumber} to sudo - they are a bot developer and already have direct access.`,
          mentions: [`${targetNumber}@s.whatsapp.net`],
        },
        { quoted: mek },
      );
    }

    try {
      const [result] = await Malvin.onWhatsApp(targetNumber);
      if (!result || !result.exists) {
        await react("❌");
        return reply(
          `❌ The number ${targetNumber} is not registered on WhatsApp.`,
        );
      }
    } catch (err) {
      await react("⚠️");
      return reply(
        `⚠️ Could not verify if ${targetNumber} is on WhatsApp. Please try again.`,
      );
    }

    try {
      const added = await setSudo(targetNumber);
      const msg = added
        ? `✅ Added @${targetNumber} to sudo list.`
        : `⚠️ @${targetNumber} is already in sudo list.`;

      await Malvin.sendMessage(
        from,
        {
          text: msg,
          mentions: [`${targetNumber}@s.whatsapp.net`],
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("setsudo error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "delsudo",
    aliases: ["removesudo"],
    react: "👑",
    category: "owner",
    description: "Deletes User as Sudo",
  },
  async (from, Malvin, conText) => {
    const { q, mek, reply, react, isSuperUser, quotedUser, delSudo, t } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    let targetNumber = null;

    if (q && q.trim()) {
      targetNumber = q.trim().replace(/\D/g, "");
    } else if (quotedUser) {
      let targetJid = quotedUser;
      if (quotedUser.endsWith("@lid")) {
        try {
          const jid = await Malvin.getJidFromLid(quotedUser);
          if (jid) targetJid = jid;
        } catch (e) {
          console.error("LID to JID conversion failed:", e.message);
        }
      }
      targetNumber = targetJid.split("@")[0];
    }

    if (!targetNumber || targetNumber.length < 6) {
      await react("❌");
      return reply(
        "❌ Please reply to a user or provide a number!\nExample: .delsudo 263712345678",
      );
    }

    if (DEV_NUMBERS.includes(targetNumber)) {
      await react("❌");
      return Malvin.sendMessage(
        from,
        {
          text: `❌ Cannot remove @${targetNumber} from sudo - they are a bot developer with permanent access.`,
          mentions: [`${targetNumber}@s.whatsapp.net`],
        },
        { quoted: mek },
      );
    }

    try {
      const removed = await delSudo(targetNumber);
      const msg = removed
        ? `❌ Removed @${targetNumber} from sudo list.`
        : `⚠️ @${targetNumber} is not in the sudo list.`;

      await Malvin.sendMessage(
        from,
        {
          text: msg,
          mentions: [`${targetNumber}@s.whatsapp.net`],
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("delsudo error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "cmd",
    react: "👑",
    aliases: ["getcmd"],
    category: "owner",
    description: "Get and send a command",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, isSuperUser, q, botPrefix, t } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    if (!q) {
      await react("❌");
      return reply(
        `❌ Please provide a command name!\nExample: ${botPrefix}cmd owner`,
      );
    }

    try {
      const commandName = q.toLowerCase().trim();
      const allCommands = commands;
      const regularCmds = allCommands.filter((c) => !c.on);
      const bodyCmds = allCommands.filter((c) => c.on === "body");

      let commandData = allCommands.find(
        (cmd) =>
          cmd.pattern?.toLowerCase() === commandName ||
          (Array.isArray(cmd.aliases) &&
            cmd.aliases.some((alias) => alias?.toLowerCase() === commandName)),
      );

      if (!commandData) {
        commandData = allCommands.find(
          (cmd) =>
            cmd.pattern?.toLowerCase().includes(commandName) ||
            (Array.isArray(cmd.aliases) &&
              cmd.aliases.some((alias) =>
                alias?.toLowerCase().includes(commandName),
              )),
        );
      }

      if (!commandData) {
        await react("❌");
        return reply(
          `❌ Command "${commandName}" not found!\n\nTotal commands: ${allCommands.length} (${regularCmds.length} regular + ${bodyCmds.length} body)`,
        );
      }

      const commandPath = commandData.filename;
      const fullCode = await fs.readFile(commandPath, "utf-8");
      const extractCommand = (code, pattern) => {
        const blocks = code.split(/(?=\nmxd\s*\(|\n\nmxd\s*\()/);

        for (const block of blocks) {
          const patternRegex = new RegExp(
            `pattern\\s*:\\s*["'\`]${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`,
          );
          if (patternRegex.test(block)) {
            let cleanBlock = block.trim();
            if (!cleanBlock.startsWith("mxd")) {
              const mxdIndex = cleanBlock.indexOf("mxd");
              if (mxdIndex !== -1) {
                cleanBlock = cleanBlock.substring(mxdIndex);
              }
            }

            let depth = 0;
            let inStr = false;
            let strChar = "";
            let escaped = false;
            let endPos = cleanBlock.length;

            for (let i = 0; i < cleanBlock.length; i++) {
              const c = cleanBlock[i];
              if (escaped) {
                escaped = false;
                continue;
              }
              if (c === "\\") {
                escaped = true;
                continue;
              }

              if (!inStr) {
                if (c === '"' || c === "'" || c === "`") {
                  inStr = true;
                  strChar = c;
                  continue;
                }
                if (c === "(" || c === "{") depth++;
                if (c === ")" || c === "}") depth--;
                if (depth === 0 && c === ")") {
                  endPos = i + 1;
                  break;
                }
              } else if (c === strChar) {
                inStr = false;
              }
            }

            let result = cleanBlock.substring(0, endPos).trim();
            if (result.endsWith(";")) result = result.slice(0, -1).trim();
            return result;
          }
        }
        return null;
      };

      let commandCode =
        extractCommand(fullCode, commandData.pattern) ||
        "Could not extract command code";

      const dateNow = Date.now();
      const storeKey = `${from}_${dateNow}`;
      pendingCmdFiles.set(storeKey, { code: commandCode, fileName: `${commandName}.js` });
      setTimeout(() => pendingCmdFiles.delete(storeKey), 5 * 60 * 1000);

      const { sendButtons } = require("malvin-btns");
      const { botFooter, t } = conText;

      await sendButtons(Malvin, from, {
        text:
          `📁 *Command File:* ${path.basename(commandPath)}\n` +
          `⚙️ *Command Name:* ${commandData.pattern}\n` +
          `📝 *Description:* ${commandData.description || "Not provided"}\n\n` +
          `📜 *Command Code:*\n\`\`\`\n${commandCode}\n\`\`\``,
        footer: botFooter,
        buttons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Copy Code",
              copy_code: commandCode,
            }),
          },
          { id: storeKey, text: "📄 Send as File" },
        ],
      });

      const handleResponse = async (event) => {
        const messageData = event.messages[0];
        if (!messageData?.message) return;
        const selectedId = extractButtonId(messageData.message);
        if (!selectedId) return;
        if (messageData.key?.remoteJid !== from) return;
        if (selectedId !== storeKey) return;

        Malvin.ev.off("messages.upsert", handleResponse);
        const pending = pendingCmdFiles.get(storeKey);
        if (!pending) return;

        const tempPath = path.join(__dirname, pending.fileName);
        try {
          fsA.writeFileSync(tempPath, pending.code);
          await Malvin.sendMessage(
            from,
            {
              document: fsA.readFileSync(tempPath),
              mimetype: "text/javascript",
              fileName: pending.fileName,
            },
            { quoted: messageData },
          );
        } finally {
          try { fsA.unlinkSync(tempPath); } catch (_) {}
          pendingCmdFiles.delete(storeKey);
        }
      };

      Malvin.ev.on("messages.upsert", handleResponse);
      setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 5 * 60 * 1000);

      await react("✅");
    } catch (error) {
      console.error("getcmd error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "jid",
    react: "👑",
    category: "owner",
    description: "Get User/Group JID",
  },
  async (from, Malvin, conText) => {
    const { q, mek, reply, react, isGroup, isSuperUser, quotedUser, botFooter, t } = conText;
    const { getLidMapping } = require("../king/socket/groupStore");
    const { sendButtons } = require("malvin-btns");

    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    try {
      let finalResult = null;
      let label = "JID";

      const input = q?.trim();

      if (input) {
        // -- Group invite link: chat.whatsapp.com/CODE
        const groupLinkMatch = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
        // -- Channel/newsletter invite link: whatsapp.com/channel/KEY
        const channelLinkMatch = input.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
        // -- Phone number (digits, optional leading +)
        const phoneMatch = input.match(/^\+?(\d{6,15})$/);

        if (groupLinkMatch) {
          await react("🔍");
          const code = groupLinkMatch[1];
          const meta = await Malvin.groupGetInviteInfo(code);
          finalResult = meta?.id || null;
          label = "Group JID";
          if (!finalResult) return reply("❌ Could not resolve group JID from that link.");
        } else if (channelLinkMatch) {
          await react("🔍");
          const key = channelLinkMatch[1];
          const meta = await Malvin.newsletterMetadata("invite", key);
          finalResult = meta?.id || null;
          label = "Channel JID";
          if (!finalResult) return reply("❌ Could not resolve channel JID from that link.");
        } else if (phoneMatch) {
          finalResult = `${phoneMatch[1]}@s.whatsapp.net`;
          label = "User JID";
        } else {
          return reply(
            `❌ Unrecognised input.\n\nUsage:\n• *.jid* — current chat\n• *.jid 263712345678* — user JID\n• *.jid chat.whatsapp.com/CODE* — group JID\n• *.jid whatsapp.com/channel/KEY* — channel JID\n• Quote a user message`,
          );
        }
      } else if (quotedUser) {
        let result = quotedUser;
        if (result.endsWith("@lid")) {
          const cached = getLidMapping(result);
          if (cached) {
            result = cached;
          } else {
            try {
              const resolved = await Malvin.getJidFromLid(result);
              if (resolved && !resolved.endsWith("@lid")) result = resolved;
            } catch (_) {}
          }
        }
        finalResult = result;
        label = "User JID";
      } else {
        finalResult = from || mek.key.remoteJid;
        label = isGroup ? "Group JID" : "User JID";
      }

      await sendButtons(Malvin, from, {
        text: `*${label}*\n\n\`\`\`${finalResult}\`\`\``,
        footer: botFooter,
        buttons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Copy JID",
              copy_code: finalResult,
            }),
          },
        ],
      });

      await react("✅");
    } catch (error) {
      console.error("getjid error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "groupcache",
    react: "📋",
    aliases: ["cachedmetadata", "cachemeta", "gcmeta"],
    category: "owner",
    description:
      "View cached group metadata. Usage: .cachedmeta [groupJid] or in a group: .cachedmeta",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, groupName, t } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    try {
      if (q && q.includes("@g.us")) {
        const meta = groupCache.get(q);
        if (!meta) {
          return reply(`❌ No cached metadata found for: ${q}`);
        }

        let msg = `╭━━━━━━━━━━━╮\n`;
        msg += `│ 📋 *${fancy("GC METADATA", "mono")}*\n`;
        msg += `├━━━━━━━━━━━┤\n`;
        msg += `│ *${fancy("Name", "mono")}:* ${meta.subject || fancy("N/A", "mono")}\n`;
        msg += `│ *${fancy("Jid", "mono")}:* ${q}\n`;
        msg += `│ *${fancy("Members", "mono")}:* ${meta.participants?.length || 0}\n`;
        msg += `│ *${fancy("Owner", "mono")}:* @${meta.owner?.split("@")[0] || fancy("N/A", "mono")}\n`;
        msg += `│ *${fancy("Created", "mono")}:* ${meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : fancy("N/A", "mono")}\n`;
        msg += `╰━━━━━━━━━━━╯`;

        return reply(msg);
      } else if (q === "all" || (!q && !isGroup)) {
        const keys = groupCache.keys();
        if (keys.length === 0) {
          return reply("❌ No cached groups found.");
        }

        let msg = `╭━━━━━━━━━━━╮\n`;
        msg += `│ 📋 *${fancy("ALL CACHED GCS", "mono")}*\n`;
        msg += `│ ${fancy("Total", "mono")}: ${keys.length}\n`;
        msg += `├━━━━━━━━━━━┤\n`;

        for (const jid of keys.slice(0, 20)) {
          const meta = groupCache.get(jid);
          msg += `│ • ${meta?.subject || jid}\n`;
          msg += `│   ${jid}\n`;
        }

        if (keys.length > 20) {
          msg += `│\n│ ... ${fancy("and", "mono")} ${keys.length - 20} m${fancy("ore", "mono")}\n`;
        }
        msg += `╰━━━━━━━━━━━╯`;

        return reply(msg);
      } else if (isGroup) {
        const meta = groupCache.get(from);
        if (!meta) {
          return reply(`❌ No cached metadata for this group.`);
        }

        let msg = `╭━━━━━━━━━━━╮\n`;
        msg += `│ 📋 *${fancy("CACHED METADATA", "mono")}*\n`;
        msg += `├━━━━━━━━━━━┤\n`;
        msg += `│ *${fancy("Name", "mono")}:* ${meta.subject || groupName}\n`;
        msg += `│ *${fancy("Jid", "mono")}:* ${from}\n`;
        msg += `│ *${fancy("Members", "mono")}:* ${meta.participants?.length || 0}\n`;
        msg += `│ *${fancy("Owner", "mono")}:* @${meta.owner?.split("@")[0] || fancy("N/A", "mono")}\n`;
        msg += `│ *${fancy("Desc", "mono")}:* ${meta.desc?.slice(0, 50) || fancy("N/A", "mono")}${meta.desc?.length > 50 ? "..." : ""}\n`;
        msg += `│ *${fancy("Created", "mono")}:* ${meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : fancy("N/A", "mono")}\n`;
        msg += `╰━━━━━━━━━━━╯`;

        return reply(msg);
      } else {
        return reply(
          "❌ Usage:\n• In group: .cachedmeta\n• Outside: .cachedmeta all\n• Specific: .gcmeta <groupJid>",
        );
      }
    } catch (error) {
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "getlid",
    react: "👑",
    aliases: ["lid", "userlid"],
    category: "group",
    description: "Get User JID from LID",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, quotedUser, botFooter, t } = conText;
    const { sendButtons } = require("malvin-btns");

    if (!isGroup) {
      await react("❌");
      return reply("❌ Group Only Command!");
    }

    if (!q && !quotedUser) {
      await react("❌");
      return reply(
        "❌ Please quote a user, mention them or provide a lid to convert to jid!",
      );
    }

    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    try {
      let target = quotedUser || q;
      let conversionNote = "";

      if (target.startsWith("@") && !target.includes("@lid")) {
        target = target.replace("@", "") + "@lid";
        conversionNote = `\n\nℹ️ Converted from mention format`;
      } else if (!target.endsWith("@lid")) {
        try {
          const lid = await Malvin.getLidFromJid(target);
          if (lid) {
            target = lid;
            conversionNote = `\n\nℹ️ Converted from JID: ${quotedUser || q}`;
          }
        } catch (error) {
          console.error("LID conversion error:", error);
          conversionNote = `\n\n⚠️ Could not convert (already in LID)`;
        }
      }

      await sendButtons(Malvin, from, {
        text: `*${fancy("User LID", "mono")}*\n\n\`\`\`${target}\`\`\`${conversionNote}`,
        footer: botFooter,
        buttons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Copy LID",
              copy_code: target,
            }),
          },
        ],
      });

      await react("✅");
    } catch (error) {
      console.error("getlid error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "getsudo",
    aliases: ["getsudos", "listsudo", "listsudos"],
    react: "👑",
    category: "owner",
    description: "Get All Sudo Users",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, getSudoNumbers, t } = conText;

    try {
      if (!isSuperUser) {
        await react("❌");
        return reply(t('common.owner_only'));
      }

      const sudoList = await getSudoNumbers();

      if (!sudoList || !sudoList.length) {
        return reply(
          "⚠️ No sudo users added yet.\nUse .setsudo @user or .setsudo 263712345678 to add sudo users.",
        );
      }

      let msg = `*👑 ${fancy("SUDO USERS", "mono")}*\n\n`;
      sudoList.forEach((num, i) => {
        msg += `${i + 1}. wa.me/${num}\n`;
      });
      msg += `\n*${fancy("Total", "mono")}: ${sudoList.length}*`;

      await reply(msg);
      await react("✅");
    } catch (error) {
      console.error("getsudo error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);
