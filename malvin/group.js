const { mxd, getGroupMetadata, getLidMapping } = require("../king");
const { mrxd } = require('../king/mrxd');
const { getGroupSetting, setGroupSetting } = require("../king/database/groupConfig");
const { fancy } = require("../king/fancyFont");

mxd(
  {
    pattern: "unmute",
    react: "⏳",
    aliases: ["open", "groupopen", "gcopen", "adminonly", "adminsonly"],
    category: "group",
    description: "Open Group Chat.",
  },
  async (from, Malvin, conText) => {
    const { reply, isAdmin, isSuperAdmin, isGroup, isBotAdmin, mek, sender, t } =
    conText;

    if (!isGroup) {
      return reply(t('common.group_only'));
    }

    if (!isBotAdmin) {
      const userNumber = sender.split("@")[0];
      return reply(t('group.bot_not_admin_tag', { user: userNumber }), {
        mentions: [`${userNumber}@s.whatsapp.net`],
      });
    }

    if (!isAdmin && !isSuperAdmin) {
      const userNumber = sender.split("@")[0];
      return reply(t('group.user_not_admin_tag', { user: userNumber }), {
        mentions: [`${userNumber}@s.whatsapp.net`],
      });
    }

    try {
      await Malvin.groupSettingUpdate(from, "not_announcement");
      const userNumber = sender.split("@")[0];
      return reply(t('group.unmuted_success', { user: userNumber }), {
        mentions: [`${userNumber}@s.whatsapp.net`],
      });
    } catch (error) {
      console.error("Unmute error:", error);
      return reply(t('group.unmute_failed', { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "mute",
    react: "⏳",
    aliases: ["close", "groupmute", "gcmute", "gcclose"],
    category: "group",
    description: "Close Group Chat",
  },
  async (from, Malvin, conText) => {
    const { reply, isAdmin, isSuperAdmin, isGroup, isBotAdmin, mek, sender, t } =
    conText;

    if (!isGroup) {
      return reply(t('common.group_only'));
    }

    if (!isBotAdmin) {
      const userNumber = sender.split("@")[0];
      return reply(t('group.bot_not_admin_tag', { user: userNumber }), {
        mentions: [`${userNumber}@s.whatsapp.net`],
      });
    }

    if (!isAdmin && !isSuperAdmin) {
      const userNumber = sender.split("@")[0];
      return reply(t('group.user_not_admin_tag', { user: userNumber }), {
        mentions: [`${userNumber}@s.whatsapp.net`],
      });
    }

    try {
      await Malvin.groupSettingUpdate(from, "announcement");
      const userNumber = sender.split("@")[0];
      return reply(t('group.muted_success', { user: userNumber }), {
        mentions: [`${userNumber}@s.whatsapp.net`],
      });
    } catch (error) {
      console.error("Mute error:", error);
      return reply(t('group.mute_failed', { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "met",
    react: "⚡",
    category: "general",
    description: "Check group metadata",
  },
  async (from, Malvin, conText) => {
    const { mek, react, newsletterJid, botName, t } = conText;
    try {
      const gInfo = await getGroupMetadata(Malvin, from);

      const formatJid = (jid) => {
        if (!jid) return "N/A";
        const cleanJid = `@${jid.split("@")[0]}`;
        return cleanJid;
      };

      const superAdmins = [];
      const admins = [];
      const members = [];

      gInfo.participants.forEach((p) => {
        const formattedJid = formatJid(p.phoneNumber || p.pn || p.jid);
        if (p.admin === "superadmin") {
          superAdmins.push(`• ${formattedJid} - 👑 Super Admin`);
        } else if (p.admin === "admin") {
          admins.push(`• ${formattedJid} - 👮 Admin`);
        } else {
          members.push(`• ${formattedJid} - 👤 Member`);
        }
      });

      const allParticipants = [...superAdmins, ...admins, ...members].join(
        "\n",
      );

      const allAdmins = [
        ...superAdmins.map((s) => s.replace(" - 👑 Super Admin", "")),
        ...admins.map((a) => a.replace(" - 👮 Admin", "")),
      ];

      const metadataText = `
📌 *${fancy("GROUP METADATA", "mono")}* 📌

🔹 *${fancy("ID", "mono")}:* ${gInfo.id}
🔹 *${fancy("Subject", "mono")}:* ${gInfo.subject || "None"}
🔹 *${fancy("Subject Owner", "mono")}:* ${formatJid(gInfo.subjectOwnerPn || gInfo.subjectOwnerJid)}
🔹 *${fancy("Subject Changed", "mono")}:* ${new Date(gInfo.subjectTime * 1000).toLocaleString()}
🔹 *${fancy("Owner", "mono")}:* ${formatJid(gInfo.ownerPn || gInfo.ownerJid)}
🔹 *${fancy("Creation Date", "mono")}:* ${new Date(gInfo.creation * 1000).toLocaleString()}
🔹 *${fancy("Members", "mono")}:* ${gInfo.size} participants
🔹 *${fancy("Desc", "mono")}:* ${gInfo.desc || "None"}
🔹 *${fancy("Desc Owner", "mono")}:* ${formatJid(gInfo.descOwnerPn || gInfo.descOwnerJid)}
🔹 *${fancy("Desc Changed", "mono")}:* ${new Date(gInfo.descTime * 1000).toLocaleString()}

👑 *${fancy("ADMINS", "mono")} (${superAdmins.length + admins.length})*
${allAdmins.join("\n") || fancy("N/A", "mono")}

👥 *${fancy("MEMBERS", "mono")} (${gInfo.participants.length})*
${allParticipants}

ℹ️ *${fancy("GROUP SETTINGS", "mono")}*
• ${fancy("RESTRICTIONS", "mono")}: ${gInfo.restrict ? "✅" : "❌"}
• ${fancy("Anouncement", "mono")}: ${gInfo.announce ? "✅" : "❌"}
• ${fancy("Join Aproval", "mono")}: ${gInfo.joinApprovalMode ? "✅" : "❌"}
• ${fancy("Member Add", "mono")}: ${gInfo.memberAddMode ? "✅" : "❌"}
• ${fancy("Community", "mono")}: ${gInfo.isCommunity ? "✅" : "❌"}
    `.trim();

      await Malvin.sendMessage(
        from,
        {
          text: metadataText,
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
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("Error in metadata command:", error);
      await react("❌");
      await Malvin.sendMessage(
        from,
        { text: "Failed to fetch group metadata." },
        { quoted: mrxd },
      );
    }
  },
);

mxd(
  {
    pattern: "demote",
    react: "👑",
    category: "group",
    description: "Demote a user from being an admin.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      quotedUser,
      superUser,
      isSuperAdmin,
      isAdmin,
      isGroup,
      isBotAdmin,
      q,
      mentionedJid,
      groupAdmins,
      groupMetadata,
      t,
    } = conText;
    const { getLidMapping } = require("../king/socket/groupStore");

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    const convertLidToJid = async (lid) => {
      if (!lid || !lid.includes("@lid")) return lid;
      const cached = getLidMapping(lid);
      if (cached) return cached;
      try {
        const result = await Malvin.getJidFromLid(lid);
        if (result) return result;
      } catch (e) {}
      return lid;
    };

    let targetJid = null;

    if (mentionedJid && mentionedJid.length > 0) {
      targetJid = await convertLidToJid(mentionedJid[0]);
    } else if (quotedUser) {
      targetJid = await convertLidToJid(quotedUser);
    } else if (q) {
      const num = q.replace(/[^0-9]/g, "");
      if (num.length >= 10) {
        targetJid = num + "@s.whatsapp.net";
      }
    }

    if (!targetJid || targetJid.includes("@lid")) {
      if (
        targetJid &&
        targetJid.includes("@lid") &&
        groupMetadata?.participants
      ) {
        const lidNum = targetJid.split("@")[0];
        const found = groupMetadata.participants.find(
          (p) =>
            p.lid?.split("@")[0] === lidNum || p.id?.split("@")[0] === lidNum,
        );
        if (found?.id) targetJid = found.id;
        else if (found?.pn) targetJid = found.pn + "@s.whatsapp.net";
      }
    }

    if (!targetJid || targetJid.includes("@lid")) {
      await react("❌");
      return reply(
        "❌ Could not identify user. Please provide their number directly.\nExample: .demote 263712345678",
      );
    }

    if (!targetJid.includes("@")) targetJid += "@s.whatsapp.net";

    const { isSuperUser } = require("../king/database/sudo");
    const targetNum = targetJid.split("@")[0];
    const isTargetSuperUser = await isSuperUser(targetJid, Malvin);
    
    const standardizedSuperUsers = superUser.map((u) => u.split("@")[0]);
    if (isTargetSuperUser || standardizedSuperUsers.includes(targetNum)) {
      await react("❌");
      return reply("❌ I cannot demote a superuser!");
    }

    const groupSuperAdmins = conText.groupSuperAdmins || [];
    const adminNums = groupAdmins.map((a) => a.split("@")[0]);
    const superAdminNums = groupSuperAdmins.map((a) => a.split("@")[0]);
    const allAdminNums = [...adminNums, ...superAdminNums];

    let isTargetAdmin = allAdminNums.includes(targetNum);
    let isSuperAdminTarget = superAdminNums.includes(targetNum);

    if (groupMetadata?.participants) {
      const participant = groupMetadata.participants.find((p) => {
        const pNum = (p.id || p.pn || p.phoneNumber || "").split("@")[0];
        const pPn = (p.pn || "").split("@")[0];
        return pNum === targetNum || pPn === targetNum;
      });
      if (participant?.admin) {
        isTargetAdmin = true;
        if (participant.admin === "superadmin") isSuperAdminTarget = true;
      }
    }

    if (!isTargetAdmin) {
      return reply(`❌ @${targetNum} is not an admin.`, {
        mentions: [targetJid],
        contextInfo: { mentionedJid: [targetJid] },
      });
    }

    if (isSuperAdminTarget) {
      return reply(
        `❌ @${targetNum} is the group owner and cannot be demoted.`,
        {
          mentions: [targetJid],
          contextInfo: { mentionedJid: [targetJid] },
        },
      );
    }

    try {
      await Malvin.groupParticipantsUpdate(from, [targetJid], "demote");
      await react("✅");
      await reply(`👑 @${targetNum} is no longer an admin.`, {
        mentions: [targetJid],
        contextInfo: { mentionedJid: [targetJid] },
      });
    } catch (error) {
      await react("❌");
      if (
        error.message?.includes("403") ||
        error.message?.toLowerCase().includes("forbidden")
      ) {
        await reply(
          `❌ Cannot demote @${targetNum}. They may be a group owner or have higher privileges.`,
          {
            mentions: [targetJid],
          },
        );
      } else {
        await reply(`❌ Failed to demote: ${error.message}`);
      }
    }
  },
);

mxd(
  {
    pattern: "promote",
    aliases: ["toadmin"],
    react: "👑",
    category: "group",
    description: "Promote a user to admin.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      quotedUser,
      isSuperAdmin,
      isAdmin,
      isGroup,
      isBotAdmin,
      q,
      mentionedJid,
      groupAdmins,
      groupSuperAdmins,
      groupMetadata,
      t,
    } = conText;
    const { getLidMapping } = require("../king/socket/groupStore");

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    const convertLidToJid = async (lid) => {
      if (!lid || !lid.includes("@lid")) return lid;
      const cached = getLidMapping(lid);
      if (cached) return cached;
      try {
        const result = await Malvin.getJidFromLid(lid);
        if (result) return result;
      } catch (e) {}
      return lid;
    };

    let targetJid = null;

    if (mentionedJid && mentionedJid.length > 0) {
      targetJid = await convertLidToJid(mentionedJid[0]);
    } else if (quotedUser) {
      targetJid = await convertLidToJid(quotedUser);
    } else if (q) {
      const num = q.replace(/[^0-9]/g, "");
      if (num.length >= 10) {
        targetJid = num + "@s.whatsapp.net";
      }
    }

    if (!targetJid || targetJid.includes("@lid")) {
      if (
        targetJid &&
        targetJid.includes("@lid") &&
        groupMetadata?.participants
      ) {
        const lidNum = targetJid.split("@")[0];
        const found = groupMetadata.participants.find(
          (p) =>
            p.lid?.split("@")[0] === lidNum || p.id?.split("@")[0] === lidNum,
        );
        if (found?.id) targetJid = found.id;
        else if (found?.pn) targetJid = found.pn + "@s.whatsapp.net";
      }
    }

    if (!targetJid || targetJid.includes("@lid")) {
      await react("❌");
      return reply(
        "❌ Could not identify user. Please provide their number directly.\nExample: .promote 263712345678",
      );
    }

    if (!targetJid.includes("@")) targetJid += "@s.whatsapp.net";

    const targetNum = targetJid.split("@")[0];
    const adminNums = groupAdmins
      ? groupAdmins.map((a) => a.split("@")[0])
      : [];
    const superAdminNums = groupSuperAdmins
      ? groupSuperAdmins.map((a) => a.split("@")[0])
      : [];
    const allAdminNums = [...adminNums, ...superAdminNums];

    let isAlreadyAdmin = allAdminNums.includes(targetNum);
    let isSuperAdminTarget = superAdminNums.includes(targetNum);

    if (groupMetadata?.participants) {
      const participant = groupMetadata.participants.find((p) => {
        const pNum = (p.id || p.pn || p.phoneNumber || "").split("@")[0];
        const pPn = (p.pn || "").split("@")[0];
        return pNum === targetNum || pPn === targetNum;
      });
      if (participant?.admin) {
        isAlreadyAdmin = true;
        if (participant.admin === "superadmin") isSuperAdminTarget = true;
      }
    }

    if (isSuperAdminTarget) {
      return reply(
        `❌ @${targetNum} is the group owner and is already an admin.`,
        {
          mentions: [targetJid],
          contextInfo: { mentionedJid: [targetJid] },
        },
      );
    }

    if (isAlreadyAdmin) {
      return reply(`❌ @${targetNum} is already an admin.`, {
        mentions: [targetJid],
        contextInfo: { mentionedJid: [targetJid] },
      });
    }

    try {
      await Malvin.groupParticipantsUpdate(from, [targetJid], "promote");
      await react("✅");
      await reply(`👑 @${targetNum} is now an admin.`, {
        mentions: [targetJid],
        contextInfo: { mentionedJid: [targetJid] },
      });
    } catch (error) {
      await react("❌");
      if (
        error.message?.includes("403") ||
        error.message?.toLowerCase().includes("forbidden")
      ) {
        await reply(
          `❌ Cannot promote @${targetNum}. They may not be a group member.`,
          {
            mentions: [targetJid],
          },
        );
      } else {
        await reply(`❌ Failed to promote: ${error.message}`);
      }
    }
  },
);

mxd(
  {
    pattern: "kick",
    aliases: ["remove"],
    react: "🚫",
    category: "group",
    description: "Remove a user from the group.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      quotedUser,
      superUser,
      isSuperAdmin,
      isAdmin,
      isGroup,
      isBotAdmin,
      q,
      mentionedJid,
      groupMetadata,
      t,
    } = conText;
    const { getLidMapping } = require("../king/socket/groupStore");

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    const convertLidToJid = async (lid) => {
      if (!lid || !lid.includes("@lid")) return lid;
      const cached = getLidMapping(lid);
      if (cached) return cached;
      try {
        const result = await Malvin.getJidFromLid(lid);
        if (result) return result;
      } catch (e) {}
      return lid;
    };

    let targetJid = null;

    if (mentionedJid && mentionedJid.length > 0) {
      targetJid = await convertLidToJid(mentionedJid[0]);
    } else if (quotedUser) {
      targetJid = await convertLidToJid(quotedUser);
    } else if (q) {
      const num = q.replace(/[^0-9]/g, "");
      if (num.length >= 10) {
        targetJid = num + "@s.whatsapp.net";
      }
    }

    if (!targetJid || targetJid.includes("@lid")) {
      if (
        targetJid &&
        targetJid.includes("@lid") &&
        groupMetadata?.participants
      ) {
        const lidNum = targetJid.split("@")[0];
        const found = groupMetadata.participants.find(
          (p) =>
            p.lid?.split("@")[0] === lidNum || p.id?.split("@")[0] === lidNum,
        );
        if (found?.id) targetJid = found.id;
        else if (found?.pn) targetJid = found.pn + "@s.whatsapp.net";
      }
    }

    if (!targetJid || targetJid.includes("@lid")) {
      await react("❌");
      return reply(
        "❌ Could not identify user. Please provide their number directly.\nExample: .kick 263712345678",
      );
    }

    if (!targetJid.includes("@")) targetJid += "@s.whatsapp.net";

    const targetNum = targetJid.split("@")[0];
    const standardizedSuperUsers = superUser.map((u) => u.split("@")[0]);
    if (standardizedSuperUsers.includes(targetNum)) {
      await react("❌");
      return reply("❌ I cannot kick my creator!");
    }

    const botJid = Malvin.user?.id?.split(":")[0] + "@s.whatsapp.net";
    if (targetJid.toLowerCase() === botJid.toLowerCase()) {
      await react("❌");
      return reply("❌ I cannot kick myself!");
    }

    const groupSuperAdmins = conText.groupSuperAdmins || [];
    const superAdminNums = groupSuperAdmins.map((a) => a.split("@")[0]);
    let isSuperAdminTarget = superAdminNums.includes(targetNum);

    if (groupMetadata?.participants) {
      const participant = groupMetadata.participants.find((p) => {
        const pNum = (p.id || p.pn || p.phoneNumber || "").split("@")[0];
        const pPn = (p.pn || "").split("@")[0];
        return pNum === targetNum || pPn === targetNum;
      });
      if (participant?.admin === "superadmin") isSuperAdminTarget = true;
    }

    if (isSuperAdminTarget) {
      await react("❌");
      return reply(
        `❌ @${targetNum} is the group owner and cannot be kicked.`,
        {
          mentions: [targetJid],
          contextInfo: { mentionedJid: [targetJid] },
        },
      );
    }

    try {
      await Malvin.groupParticipantsUpdate(from, [targetJid], "remove");
      await react("✅");
      await reply(`🚫 @${targetNum} has been removed from the group.`, {
        mentions: [targetJid],
        contextInfo: { mentionedJid: [targetJid] },
      });
    } catch (error) {
      await react("❌");
      if (
        error.message?.includes("403") ||
        error.message?.toLowerCase().includes("forbidden")
      ) {
        await reply(
          `❌ Cannot kick @${targetNum}. They may be an admin or not in the group.`,
          {
            mentions: [targetJid],
          },
        );
      } else {
        await reply(`❌ Failed to remove user: ${error.message}`);
      }
    }
  },
);

mxd(
  {
    pattern: "add",
    aliases: ["invite"],
    react: "➕",
    category: "group",
    description: "Add a user to the group.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      isSuperAdmin,
      isAdmin,
      isGroup,
      isBotAdmin,
      q,
      groupMetadata,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    if (!q) {
      await react("❌");
      return reply(
        "❌ Please provide the number to add.\nExample: .add 263712345678",
      );
    }

    const num = q.replace(/[^0-9]/g, "");
    if (num.length < 10) {
      await react("❌");
      return reply(
        "❌ Invalid number format. Please provide a valid phone number.",
      );
    }

    const targetJid = num + "@s.whatsapp.net";

    try {
      const [result] = await Malvin.onWhatsApp(num);
      if (!result || !result.exists) {
        await react("❌");
        return reply(`❌ The number ${num} is not registered on WhatsApp.`);
      }
    } catch (err) {
      await react("⚠️");
      return reply(
        `⚠️ Could not verify if ${num} is on WhatsApp. Please try again.`,
      );
    }

    if (groupMetadata?.participants) {
      const alreadyInGroup = groupMetadata.participants.find((p) => {
        const pNum = (p.id || p.pn || p.phoneNumber || "").split("@")[0];
        return pNum === num;
      });
      if (alreadyInGroup) {
        await react("❌");
        return reply(`❌ @${num} is already in this group.`, {
          mentions: [targetJid],
          contextInfo: { mentionedJid: [targetJid] },
        });
      }
    }

    try {
      const result = await Malvin.groupParticipantsUpdate(
        from,
        [targetJid],
        "add",
      );
      const status = result[0]?.status;

      if (status === "403") {
        const meta = await Malvin.groupMetadata(from);
        const groupName = meta.subject;
        const inviteCode = await Malvin.groupInviteCode(from);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

        await Malvin.sendMessage(targetJid, {
          text: `👋 Hello! You've been invited to join *${groupName}*\n\n🔗 *Invite Link:* ${inviteLink}\n\n_Click the link above to join the group._`,
        });

        await react("⚠️");
        await reply(
          `⚠️ @${num} has privacy settings that prevent adding them directly. An invite link has been sent to their DM.`,
          {
            mentions: [targetJid],
            contextInfo: { mentionedJid: [targetJid] },
          },
        );
      } else if (status === "408") {
        await react("❌");
        await reply(
          `❌ @${num} has left this group recently and cannot be added yet.`,
          {
            mentions: [targetJid],
            contextInfo: { mentionedJid: [targetJid] },
          },
        );
      } else if (status === "409") {
        await react("❌");
        await reply(`❌ @${num} is already in this group.`, {
          mentions: [targetJid],
          contextInfo: { mentionedJid: [targetJid] },
        });
      } else {
        await react("✅");
        await reply(`✅ @${num} has been added to the group.`, {
          mentions: [targetJid],
          contextInfo: { mentionedJid: [targetJid] },
        });
      }
    } catch (error) {
      await react("❌");
      await reply(`❌ Failed to add user: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "link",
    aliases: ["gclink", "grouplink", "invitelink"],
    react: "🔗",
    category: "group",
    description: "Get the group invite link.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      isAdmin,
      isSuperAdmin,
      isGroup,
      isBotAdmin,
      mek,
      botName,
      newsletterJid,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    try {
      const meta = await Malvin.groupMetadata(from);
      const groupName = meta.subject;
      const participantCount = meta.participants.length;
      const adminCount = meta.participants.filter(
        (p) => p.admin === "admin" || p.admin === "superadmin",
      ).length;

      const inviteCode = await Malvin.groupInviteCode(from);
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

      const linkText =
        `*🔗 ${fancy("Group Invite Link", "mono")}*\n\n` +
        `*${fancy("Group", "mono")}:* ${groupName}\n` +
        `*${fancy("Members", "mono")}:* ${participantCount}\n` +
        `*${fancy("Admins", "mono")}:* ${adminCount}\n\n` +
        `*${fancy("Link", "mono")}:* ${inviteLink}`;

      await Malvin.sendMessage(
        from,
        {
          text: linkText,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 0,
            },
          },
        },
        { quoted: mrxd },
      );

      await react("✅");
    } catch (error) {
      await react("❌");
      await reply(`❌ Failed to get invite link: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "newgroup",
    aliases: ["newgc", "creategroup", "creategroup"],
    react: "🆕",
    category: "group",
    description: "Create a new group with the bot as admin.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isSuperUser,
      q,
      mek,
      botName,
      newsletterJid,
      t,
    } = conText;

    if (!isSuperUser) return reply("❌ Owner Only Command!");

    if (!q || !q.trim()) {
      await react("❌");
      return reply(
        "❌ Please provide a group name.\nExample: .newgroup malvin xd",
      );
    }

    const groupName = q.trim();

    try {
      const group = await Malvin.groupCreate(groupName, [sender]);

      const inviteCode = await Malvin.groupInviteCode(group.id);
      const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

      const successText =
        `*🆕 Group Created Successfully!*\n\n` +
        `*Group Name:* ${groupName}\n` +
        `*Group ID:* ${group.id}\n\n` +
        `*Invite Link:* ${inviteLink}`;

      await Malvin.sendMessage(
        from,
        {
          text: successText,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 0,
            },
          },
        },
        { quoted: mek },
      );

      await react("✅");
    } catch (error) {
      await react("❌");
      await reply(`❌ Failed to create group: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "killgc",
    aliases: ["terminategc", "destroygc", "nukegc"],
    react: "💀",
    category: "group",
    description: "Terminate group - removes all members and bot leaves.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isSuperUser,
      isGroup,
      isBotAdmin,
      isAdmin,
      isSuperAdmin,
      mek,
      botName,
      newsletterJid,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isSuperUser) return reply("❌ Owner Only Command!");
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    try {
      await Malvin.sendMessage(
        from,
        {
          text: `⚠️ *WARNING* ⚠️\n\n💀 *Group will be terminated now...*\n\n_All members will be removed._\n\n⚠️ _Using this command frequently might lead to WhatsApp bans._`,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 0,
            },
          },
        },
        { quoted: mek },
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const meta = await Malvin.groupMetadata(from);
      const participants = meta.participants;
      const botJid = Malvin.user?.id?.split(":")[0] + "@s.whatsapp.net";

      const membersToRemove = participants
        .filter((p) => p.id !== botJid && p.id !== sender)
        .map((p) => p.id);

      if (membersToRemove.length > 0) {
        await Malvin.groupParticipantsUpdate(from, membersToRemove, "remove");
      }

      await Malvin.groupLeave(from);
    } catch (error) {
      await react("❌");
      await reply(`❌ Failed to terminate group: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "accept",
    aliases: ["approve"],
    react: "✅",
    category: "group",
    description: "Accept a pending join request. Usage: .accept 263712345678",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isGroup,
      isBotAdmin,
      isAdmin,
      isSuperAdmin,
      args,
      botPrefix,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    if (!args[0])
      return reply(
        `❌ Please provide a phone number.\n\n*Usage:* ${botPrefix}accept 263712345678`,
      );

    try {
      const number = args[0].replace(/[^0-9]/g, "");
      const userJid = `${number}@s.whatsapp.net`;

      await Malvin.groupRequestParticipantsUpdate(from, [userJid], "approve");

      await react("✅");
      return reply(`✅ Successfully approved @${number}'s join request!`, {
        mentions: [userJid],
      });
    } catch (error) {
      await react("❌");
      if (
        error.message?.includes("not-found") ||
        error.message?.includes("item-not-found")
      ) {
        return reply("❌ No pending join request found for this number.");
      }
      return reply(`❌ Failed to accept request: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "reject",
    aliases: ["decline"],
    react: "❌",
    category: "group",
    description: "Reject a pending join request. Usage: .reject 263712345678",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isGroup,
      isBotAdmin,
      isAdmin,
      isSuperAdmin,
      args,
      botPrefix,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    if (!args[0])
      return reply(
        `❌ Please provide a phone number.\n\n*Usage:* ${botPrefix}reject 263712345678`,
      );

    try {
      const number = args[0].replace(/[^0-9]/g, "");
      const userJid = `${number}@s.whatsapp.net`;

      await Malvin.groupRequestParticipantsUpdate(from, [userJid], "reject");

      await react("✅");
      return reply(`✅ Successfully rejected @${number}'s join request!`, {
        mentions: [userJid],
      });
    } catch (error) {
      await react("❌");
      if (
        error.message?.includes("not-found") ||
        error.message?.includes("item-not-found")
      ) {
        return reply("❌ No pending join request found for this number.");
      }
      return reply(`❌ Failed to reject request: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "acceptall",
    aliases: ["approveall"],
    react: "✅",
    category: "group",
    description: "Accept all pending join requests in the group.",
  },
  async (from, Malvin, conText) => {
    const { reply, react, sender, isGroup, isBotAdmin, isAdmin, isSuperAdmin, t } =
    conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    try {
      const pendingRequests = await Malvin.groupRequestParticipantsList(from);

      if (!pendingRequests || pendingRequests.length === 0) {
        return reply("📭 No pending join requests in this group.");
      }

      const jids = pendingRequests.map((r) => r.jid);
      await Malvin.groupRequestParticipantsUpdate(from, jids, "approve");

      await react("✅");
      return reply(
        `✅ Successfully approved *${jids.length}* pending join request(s)!`,
      );
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to accept all requests: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "rejectall",
    aliases: ["declineall"],
    react: "❌",
    category: "group",
    description: "Reject all pending join requests in the group.",
  },
  async (from, Malvin, conText) => {
    const { reply, react, sender, isGroup, isBotAdmin, isAdmin, isSuperAdmin, t } =
    conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    try {
      const pendingRequests = await Malvin.groupRequestParticipantsList(from);

      if (!pendingRequests || pendingRequests.length === 0) {
        return reply("📭 No pending join requests in this group.");
      }

      const jids = pendingRequests.map((r) => r.jid);
      await Malvin.groupRequestParticipantsUpdate(from, jids, "reject");

      await react("✅");
      return reply(
        `✅ Successfully rejected *${jids.length}* pending join request(s)!`,
      );
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to reject all requests: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "online",
    aliases: ["listonline", "whos online", "whosonline"],
    react: "🟢",
    category: "group",
    description: "List members who are currently online in the group.",
  },
  async (from, Malvin, conText) => {
    const { reply, react, sender, isGroup, mek, botName, newsletterJid, t } =
    conText;

    if (!isGroup) return reply(t('common.group_only'));

    try {
      await reply("🔍 Checking online members... Please wait...");

      const groupMeta = await Malvin.groupMetadata(from);
      const participants = groupMeta.participants;

      const onlineMembers = [];
      const presenceData = new Map();

      const presenceHandler = (update) => {
        const chatJid = update.id;
        if (update.presences) {
          for (const [jid, presence] of Object.entries(update.presences)) {
            presenceData.set(jid, presence);
            const numOnly = jid.split("@")[0];
            presenceData.set(numOnly, presence);
          }
        }
      };

      Malvin.ev.on("presence.update", presenceHandler);

      try {
        const batchSize = 5;
        for (let i = 0; i < participants.length; i += batchSize) {
          const batch = participants.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (p) => {
              const jid = p.id || p.jid;
              try {
                await Malvin.presenceSubscribe(jid);
              } catch (e) {}
            }),
          );
          await new Promise((r) => setTimeout(r, 500));
        }

        await new Promise((r) => setTimeout(r, 2000));

        for (const p of participants) {
          const participantId = p.id || p.jid;
          const numOnly = participantId.split("@")[0];

          let presence =
            presenceData.get(participantId) || presenceData.get(numOnly);

          if (!presence && p.pn) {
            presence =
              presenceData.get(p.pn) || presenceData.get(p.pn.split("@")[0]);
          }

          if (
            presence?.lastKnownPresence === "composing" ||
            presence?.lastKnownPresence === "recording" ||
            presence?.lastKnownPresence === "available"
          ) {
            let displayJid = participantId;
            if (participantId.endsWith("@lid")) {
              const cachedJid = getLidMapping(participantId);
              if (cachedJid) {
                displayJid = cachedJid;
              } else if (p.pn) {
                displayJid = p.pn;
              }
            }
            const number = displayJid.split("@")[0];
            const name = p.notify || p.name || number;
            onlineMembers.push({ jid: displayJid, name, number });
          }
        }
      } finally {
        Malvin.ev.off("presence.update", presenceHandler);
      }

      if (onlineMembers.length === 0) {
        await react("😴");
        return reply(
          "😴 No members are currently typing or recording.\n\n_Note: This only detects active typing/recording presence._",
        );
      }

      const mentions = onlineMembers.map((m) => m.jid);
      const memberList = onlineMembers
        .map((m, i) => `${i + 1}. @${m.name}`)
        .join("\n");

      const message =
        `🟢 *ACTIVE MEMBERS (Typing/Recording)*\n\n` +
        `📊 *${onlineMembers.length}* of *${participants.length}* members active\n\n` +
        `${memberList}\n\n` +
        `_Note: Only shows members currently typing or recording._`;

      await react("✅");
      await Malvin.sendMessage(
        from,
        {
          text: message,
          mentions: mentions,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 0,
            },
          },
        },
        { quoted: mek },
      );
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to check online members: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "resetlink",
    aliases: [
      "resetgclink",
      "revoke",
      "resetgrouplink",
      "revokelink",
      "newlink",
    ],
    react: "🔄",
    category: "group",
    description: "Reset the group invite link and get a new one.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      isGroup,
      isBotAdmin,
      isAdmin,
      isSuperAdmin,
      mek,
      botName,
      newsletterJid,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    try {
      await Malvin.groupRevokeInvite(from);

      const newInviteCode = await Malvin.groupInviteCode(from);
      const newLink = `https://chat.whatsapp.com/${newInviteCode}`;

      const groupMeta = await Malvin.groupMetadata(from);
      const groupName = groupMeta.subject;
      const totalMembers = groupMeta.participants.length;
      const totalAdmins = groupMeta.participants.filter(
        (p) => p.admin === "admin" || p.admin === "superadmin",
      ).length;

      const message =
        `🔄 *GROUP LINK RESET*\n\n` +
        `📛 *Group:* ${groupName}\n` +
        `👥 *Total Members:* ${totalMembers}\n` +
        `👑 *Total Admins:* ${totalAdmins}\n\n` +
        `🔗 *New Link:*\n${newLink}\n\n` +
        `_The old invite link has been revoked._`;

      await react("✅");
      await Malvin.sendMessage(
        from,
        {
          text: message,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 0,
            },
          },
        },
        { quoted: mek },
      );
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to reset group link: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "left",
    aliases: ["leave", "exitgroup", "exitgc"],
    react: "👋",
    category: "group",
    description: "Bot leaves the group. Owner only.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isGroup,
      isSuperUser,
      mek,
      botName,
      newsletterJid,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isSuperUser) return reply("❌ Owner Only Command!");

    try {
      await Malvin.sendMessage(
        from,
        {
          text: `👋 *Goodbye!*\n\n_${botName} is leaving this group..._`,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 0,
            },
          },
        },
        { quoted: mek },
      );

      await new Promise((r) => setTimeout(r, 1000));
      await Malvin.groupLeave(from);
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to leave group: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "listrequests",
    aliases: ["joinrequests", "listjoinrequests", "pendingrequests"],
    react: "📋",
    category: "group",
    description: "List all pending join requests in the group.",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isGroup,
      isBotAdmin,
      isAdmin,
      isSuperAdmin,
      mek,
      botName,
      newsletterJid,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    try {
      const pendingRequests = await Malvin.groupRequestParticipantsList(from);

      if (!pendingRequests || pendingRequests.length === 0) {
        await react("📭");
        return reply("📭 No pending join requests in this group.");
      }

      const resolvedJids = await Promise.all(
        pendingRequests.map(async (r) => {
          let jid = r.jid;
          if (jid.endsWith("@lid")) {
            const cachedJid = getLidMapping(jid);
            if (cachedJid) {
              jid = cachedJid;
            } else if (Malvin.getJidFromLid) {
              try {
                const resolved = await Malvin.getJidFromLid(jid);
                if (resolved) jid = resolved;
              } catch {}
            }
          }
          return jid;
        }),
      );

      const requestList = resolvedJids
        .map((jid, i) => {
          const number = jid.split("@")[0];
          return `${i + 1}. @${number}`;
        })
        .join("\n");

      const mentions = resolvedJids;

      const message =
        `📋 *PENDING JOIN REQUESTS*\n\n` +
        `📊 Total: *${pendingRequests.length}* request(s)\n\n` +
        `${requestList}\n\n` +
        `_Use .accept <number> or .acceptall to approve_\n` +
        `_Use .reject <number> or .rejectall to decline_`;

      await react("✅");
      await Malvin.sendMessage(
        from,
        {
          text: message,
          mentions: mentions,
          contextInfo: {
            forwardingScore: 5,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: newsletterJid,
              newsletterName: botName,
              serverMessageId: 0,
            },
          },
        },
        { quoted: mrxd },
      );
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to list requests: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "togroupstatus",
    aliases: ["groupstatus", "statusgroup", "togcstatus"],
    react: "📢",
    category: "group",
    description: "Send text or quoted media to group status. Superuser only.",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, isGroup, q, quoted, quotedMsg, mek, formatAudio, formatVideo, botPrefix, t } = conText;
    const { downloadMediaMessage } = require("mrxd-baileys");

    if (!isGroup) return reply("❌ Group only command!");
    if (!isSuperUser) return reply("❌ Owner Only Command!");

    if (!q && !quotedMsg) {
      return reply(
        `📌 *Usage:*\n` +
          `• ${botPrefix}togroupstatus <text>\n` +
          `• Reply to image/video/audio with ${botPrefix}togroupstatus <caption>\n` +
          `• Or just ${botPrefix}togroupstatus to forward quoted media`,
      );
    }

    try {
      let statusPayload = {};

      if (quotedMsg) {
        if (quoted?.imageMessage) {
          const caption = q || quoted.imageMessage.caption || "";
          const buffer = await downloadMediaMessage(
            { message: quotedMsg },
            "buffer",
            {},
          );
          statusPayload = { 
            image: buffer,
            mimetype: "image/jpeg"
          };
          if (caption) statusPayload.caption = caption;
        } else if (quoted?.videoMessage) {
          const caption = q || quoted.videoMessage.caption || "";
          let buffer = await downloadMediaMessage(
            { message: quotedMsg },
            "buffer",
            {},
          );
          buffer = await formatVideo(buffer);
          statusPayload = { 
            video: buffer,
            mimetype: "video/mp4"
          };
          if (caption) statusPayload.caption = caption;
        } else if (quoted?.audioMessage) {
          let buffer = await downloadMediaMessage(
            { message: quotedMsg },
            "buffer",
            {},
          );
          buffer = await formatAudio(buffer);
          statusPayload = { 
            audio: buffer,
            mimetype: "audio/mp4",
            ptt: true
          };
        } else if (quoted?.conversation || quoted?.extendedTextMessage?.text) {
          statusPayload.text = quoted.conversation || quoted.extendedTextMessage.text;
        } else {
          return reply("❌ Unsupported media type for group status.");
        }

        if (q && !statusPayload.caption && !statusPayload.text) {
          statusPayload.caption = q;
        }
      } else {
        statusPayload.text = q;
      }

      await Malvin.MalvinStatus.sendGroupStatus(from, statusPayload);
      await react("✅");
    } catch (error) {
      console.error("togroupstatus error:", error);
      await react("❌");
      return reply(`❌ Error sending group status: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "groupname",
    aliases: [
      "gcname",
      "setgcname",
      "setgroupname",
      "gcsubject",
      "setgcsubject",
    ],
    react: "✏️",
    category: "group",
    description: "Change group name/subject. Usage: .groupname New Group Name",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isGroup,
      isBotAdmin,
      isAdmin,
      isSuperAdmin,
      q,
      botPrefix,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    if (!q)
      return reply(
        `❌ Please provide a new group name.\n\n*Usage:* ${botPrefix}groupname New Group Name`,
      );

    try {
      await Malvin.groupUpdateSubject(from, q);
      await react("✅");
      return reply(`✅ Group name changed to: *${q}*`);
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to change group name: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "gcdesc",
    aliases: [
      "groupdesc",
      "setgcdesc",
      "setgroupdesc",
      "description",
      "setdescription",
    ],
    react: "📝",
    category: "group",
    description: "Change group description. Usage: .gcdesc New Description",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      sender,
      isGroup,
      isBotAdmin,
      isAdmin,
      isSuperAdmin,
      q,
      botPrefix,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    if (!q)
      return reply(
        `❌ Please provide a new group description.\n\n*Usage:* ${botPrefix}gcdesc New Description Here`,
      );

    try {
      await Malvin.groupUpdateDescription(from, q);
      await react("✅");
      return reply(`✅ Group description updated successfully!`);
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to change group description: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "everyone",
    react: "📢",
    aliases: ["tag", "all", "mention"],
    category: "group",
    description: "Tag everyone in the group with custom message",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      isAdmin,
      isSuperAdmin,
      isGroup,
      mek,
      q,
      participants,
      sender,
      botName,
      newsletterJid,
      t,
    } = conText;

    if (!isGroup) {
      return reply("❌ This command can only be used in groups!");
    }

    if (!isAdmin && !isSuperAdmin) {
      const userNumber = sender.split("@")[0];
      return reply(`@${userNumber} Only group admins can use this command!`, {
        mentions: [`${userNumber}@s.whatsapp.net`],
      });
    }

    const subject = q || "everyone";
    const mentionedJids = participants
      .map((p) => {
        const jid =
          typeof p === "string"
            ? p
            : p.id || p.jid || p.pn || p.phoneNumber || "";
        if (!jid) return null;
        return jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
      })
      .filter(Boolean);

    try {
      await Malvin.sendMessage(
        from,
        {
          text: `@${from}`,
          contextInfo: {
            mentionedJid: mentionedJids,
            groupMentions: [
              {
                groupJid: from,
                groupSubject: subject,
              },
            ],
            forwardingScore: 1,
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
    } catch (error) {
      console.error("Tag custom error:", error);
      return reply(`❌ Failed to tag custom: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "hidetag",
    react: "📢",
    aliases: ["htag", "hidden", "hidtag"],
    category: "group",
    description: "Send a message that secretly tags everyone",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      isAdmin,
      isSuperAdmin,
      isGroup,
      mek,
      q,
      participants,
      sender,
      quotedMsg,
      botName,
      newsletterJid,
      botPrefix,
      t,
    } = conText;

    if (!isGroup) {
      return reply("❌ This command can only be used in groups!");
    }

    if (!isAdmin && !isSuperAdmin) {
      const userNumber = sender.split("@")[0];
      return reply(`@${userNumber} Only group admins can use this command!`, {
        mentions: [`${userNumber}@s.whatsapp.net`],
      });
    }

    let text = q;
    if (!text && quotedMsg) {
      text =
        quotedMsg.conversation ||
        quotedMsg.extendedTextMessage?.text ||
        quotedMsg.imageMessage?.caption ||
        quotedMsg.videoMessage?.caption ||
        "";
    }

    if (!text) {
      return reply(
        `❌ Please provide a message or reply to one.\n\n*Usage:* ${botPrefix}hidetag Your message here`,
      );
    }

    const mentionedJids = participants
      .map((p) => {
        const jid =
          typeof p === "string"
            ? p
            : p.id || p.jid || p.pn || p.phoneNumber || "";
        if (!jid) return null;
        return jid.includes("@") ? jid : `${jid}@s.whatsapp.net`;
      })
      .filter(Boolean);

    try {
      await Malvin.sendMessage(
        from,
        {
          text: text,
          contextInfo: {
            mentionedJid: mentionedJids,
            forwardingScore: 1,
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
    } catch (error) {
      console.error("Hidetag error:", error);
      return reply(`❌ Failed to send hidden tag: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "antigcmention",
    aliases: [
      "antigroupmention",
      "antimentiongroup",
      "antigcstatusmention",
      "antistatusmention",
    ],
    react: "🛡️",
    category: "group",
    description:
      "Toggle anti-group-mention protection. Modes: on/warn (default), kick, off",
  },
  async (from, Malvin, conText) => {
    const {
      reply,
      react,
      isGroup,
      isBotAdmin,
      isAdmin,
      isSuperAdmin,
      q,
      mek,
      botName,
      botPrefix,
      t,
    } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    try {
      const currentSetting = await getGroupSetting(from, "ANTIGROUPMENTION");
      const arg = q?.toLowerCase()?.trim();

      if (!arg) {
        const status =
          currentSetting === "false" || currentSetting === "off"
            ? "OFF"
            : `ON (${currentSetting})`;
        return reply(
          `🛡️ *Anti-Group-Mention Status*\n\nCurrent: *${status}*\n\n*Usage:*\n• ${botPrefix}antigroupmention on - Enable with warnings\n• ${botPrefix}antigroupmention warn - Enable with warnings\n• ${botPrefix}antigroupmention delete - Delete message only\n• ${botPrefix}antigroupmention kick - Kick immediately\n• ${botPrefix}antigroupmention off - Disable`,
        );
      }

      let newValue;
      let message;

      if (arg === "on" || arg === "true" || arg === "warn") {
        newValue = "warn";
        message = `✅ Anti-Group-Mention *ENABLED* with warnings!\n\nUsers who mention this group in their status will be warned and kicked after reaching the warn limit.`;
      } else if (arg === "delete") {
        newValue = "delete";
        message = `✅ Anti-Group-Mention *ENABLED* with delete!\n\nMessages mentioning this group in status will be deleted with a warning. No kick action.`;
      } else if (arg === "kick") {
        newValue = "kick";
        message = `✅ Anti-Group-Mention *ENABLED* with immediate kick!\n\nUsers who mention this group in their status will be kicked immediately.`;
      } else if (arg === "off" || arg === "false") {
        newValue = "false";
        message = `❌ Anti-Group-Mention *DISABLED*!`;
      } else {
        return reply(`❌ Invalid option. Use: on, warn, delete, kick, or off`);
      }

      await setGroupSetting(from, "ANTIGROUPMENTION", newValue);
      await react("✅");
      return reply(message);
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to update setting: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "antigcwarnlimit",
    aliases: [
      "antigcmentionwarnlimit",
      "setantigroupmentionwarn",
      "antigroupmentionwarnlimit",
      "setantigcmentionwarnlimit",
    ],
    react: "⚙️",
    category: "group",
    description: "Set the warning limit for anti-group-mention before kicking",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isGroup, isBotAdmin, isAdmin, isSuperAdmin, q, mek, botPrefix, t } =
    conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin)
      return reply(t('common.admin_only'));

    try {
      const currentLimit = await getGroupSetting(
        from,
        "ANTIGROUPMENTION_WARN_COUNT",
      );

      if (!q || !q.trim()) {
        return reply(
          `⚙️ *Anti-Group-Mention Warn Limit*\n\nCurrent: *${currentLimit || 3}* warnings\n\n*Usage:* ${botPrefix}antigcwarnlimit <number>\n*Example:* ${botPrefix}antigcwarnlimit 5`,
        );
      }

      const newLimit = parseInt(q.trim());
      if (isNaN(newLimit) || newLimit < 1 || newLimit > 50) {
        return reply(`❌ Please provide a valid number between 1 and 50`);
      }

      await setGroupSetting(
        from,
        "ANTIGROUPMENTION_WARN_COUNT",
        String(newLimit),
      );
      await react("✅");
      return reply(
        `✅ Anti-Group-Mention warn limit set to *${newLimit}*!\n\nUsers will be kicked after ${newLimit} warnings.`,
      );
    } catch (error) {
      await react("❌");
      return reply(`❌ Failed to update warn limit: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "tagall",
    react: "📢",
    aliases: ["mentionall"],
    category: "group",
    description: "Tag all group members with optional message",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isAdmin, isSuperAdmin, isGroup, isSuperUser, mek, sender, q, botName, t } = conText;

    if (!isGroup) {
      return reply(t('common.group_only'));
    }

    if (!isAdmin && !isSuperAdmin && !isSuperUser) {
      return reply("❌ Admin/Owner Only Command!");
    }

    try {
      const meta = await Malvin.groupMetadata(from);
      const participants = meta.participants;

      const superAdmins = [];
      const admins = [];
      const members = [];

      for (let p of participants) {
        if (p.admin === "superadmin") {
          superAdmins.push(p.id);
        } else if (p.admin === "admin") {
          admins.push(p.id);
        } else {
          members.push(p.id);
        }
      }

      const sortedParticipants = [...superAdmins, ...admins, ...members];
      let mentions = sortedParticipants;

      let text = `*${botName} TAGALL*\n\n`;
      
      if (q && q.trim()) {
        text += `*Message:* ${q.trim()}\n\n`;
      }
      
      text += `*Tagged By:* @${sender.split('@')[0]}\n\n`;
      text += `*Tagged Members:*\n`;

      for (let id of superAdmins) {
        text += `👑 @${id.split('@')[0]}\n`;
      }
      for (let id of admins) {
        text += `👮 @${id.split('@')[0]}\n`;
      }
      for (let id of members) {
        text += `👤 @${id.split('@')[0]}\n`;
      }

      mentions.push(sender);

      await Malvin.sendMessage(from, {
        text: text.trim(),
        mentions
      }, { quoted: mrxd });

      await react("✅");
    } catch (error) {
      console.error("Tagall error:", error);
      return reply(`❌ Failed to tag all: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "tagadmins",
    react: "👮",
    aliases: ["taggcadmins", "taggroupadmins"],
    category: "group",
    description: "Tag all group admins with optional message",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isAdmin, isSuperAdmin, isGroup, isSuperUser, mek, sender, q, botName, t } = conText;

    if (!isGroup) {
      return reply(t('common.group_only'));
    }

    if (!isAdmin && !isSuperAdmin && !isSuperUser) {
      return reply("❌ Admin/Owner Only Command!");
    }

    try {
      const meta = await Malvin.groupMetadata(from);
      const participants = meta.participants;

      const superAdmins = [];
      const admins = [];

      for (let p of participants) {
        if (p.admin === "superadmin") {
          superAdmins.push(p.id);
        } else if (p.admin === "admin") {
          admins.push(p.id);
        }
      }

      const allAdmins = [...superAdmins, ...admins];
      
      if (allAdmins.length === 0) {
        return reply("❌ No admins found in this group!");
      }

      let mentions = [...allAdmins, sender];

      let text = `*${botName} TAG ADMINS*\n\n`;
      
      if (q && q.trim()) {
        text += `*Message:* ${q.trim()}\n\n`;
      }
      
      text += `*Tagged By:* @${sender.split('@')[0]}\n\n`;
      text += `*Tagged Admins:*\n`;

      for (let id of superAdmins) {
        text += `👑 @${id.split('@')[0]}\n`;
      }
      for (let id of admins) {
        text += `👮 @${id.split('@')[0]}\n`;
      }

      await Malvin.sendMessage(from, {
        text: text.trim(),
        mentions
      }, { quoted: mrxd });

      await react("✅");
    } catch (error) {
      console.error("Tagadmins error:", error);
      return reply(`❌ Failed to tag admins: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "antipromote",
    react: "🛡️",
    category: "group",
    description: "Toggle anti-promote protection. Demotes both promoter and promoted user.",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isGroup, isBotAdmin, isAdmin, isSuperAdmin, args, botPrefix, t } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin) return reply(t('common.admin_only'));

    const action = args[0]?.toLowerCase();
    const rawCurrent = await getGroupSetting(from, "ANTIPROMOTE");
    const current = rawCurrent === "true" ? "true" : "false";
    
    if (!action || !["on", "off"].includes(action)) {
      return reply(`🛡️ *Anti-Promote Protection*\n\nCurrent: ${current === "true" ? "ON ✅" : "OFF ❌"}\n\n*Usage:*\n${botPrefix}antipromote on - Enable\n${botPrefix}antipromote off - Disable\n\n_When enabled, if someone promotes another user, both will be demoted._`);
    }

    const value = action === "on" ? "true" : "false";
    if (current === value) {
      return reply(`⚠️ Anti-Promote is already ${action === "on" ? "ON" : "OFF"}!`);
    }
    
    await setGroupSetting(from, "ANTIPROMOTE", value);
    await react("✅");
    return reply(`✅ Anti-Promote is now ${action === "on" ? "ON" : "OFF"} for this group.`);
  },
);

mxd(
  {
    pattern: "antidemote",
    react: "🛡️",
    category: "group",
    description: "Toggle anti-demote protection. Demotes demoter and re-promotes demoted user.",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isGroup, isBotAdmin, isAdmin, isSuperAdmin, args, botPrefix, t } = conText;

    if (!isGroup) return reply(t('common.group_only'));
    if (!isBotAdmin) return reply(t('group.bot_not_admin'));
    if (!isAdmin && !isSuperAdmin) return reply(t('common.admin_only'));

    const action = args[0]?.toLowerCase();
    const rawCurrent = await getGroupSetting(from, "ANTIDEMOTE");
    const current = rawCurrent === "true" ? "true" : "false";
    
    if (!action || !["on", "off"].includes(action)) {
      return reply(`🛡️ *Anti-Demote Protection*\n\nCurrent: ${current === "true" ? "ON ✅" : "OFF ❌"}\n\n*Usage:*\n${botPrefix}antidemote on - Enable\n${botPrefix}antidemote off - Disable\n\n_When enabled, if someone demotes an admin, the demoter gets demoted and the demoted user is re-promoted._`);
    }

    const value = action === "on" ? "true" : "false";
    if (current === value) {
      return reply(`⚠️ Anti-Demote is already ${action === "on" ? "ON" : "OFF"}!`);
    }
    
    await setGroupSetting(from, "ANTIDEMOTE", value);
    await react("✅");
    return reply(`✅ Anti-Demote is now ${action === "on" ? "ON" : "OFF"} for this group.`);
  },
);

// ─── .economy — Toggle economy mode for group ─────────────────────────────────
mxd(
    {
        pattern:     'economy',
        aliases:     ['econ', 'econmode'],
        category:    'group',
        react:       '💰',
        description: 'Toggle economy mode for this group',
    },
    async (from, Malvin, conText) => {
        const { reply, react, isAdmin, isSuperAdmin, isSuperUser, isGroup, sender, t } = conText;
        const { toggleEconomy, isEconomyEnabled, TIER_COSTS } = require('../king/rpg/economyGate');
        const { buildBox } = require('../king/rpg/db');

        if (!isGroup) return reply('❌ Groups only command.');
        if (!isAdmin && !isSuperAdmin && !isSuperUser)
            return reply('❌ Admins only.');

        const current = await isEconomyEnabled(from);
        const newState = !current;
        await toggleEconomy(from, newState);

        await react(newState ? '✅' : '🔴');
        await reply(
            buildBox(`💰 ECONOMY MODE ${newState ? 'ENABLED' : 'DISABLED'}`, [
                `${newState ? '✅' : '🔴'} Economy: *${newState ? 'ON' : 'OFF'}*`,
                `  ───────`,
                newState ? `  Users must spend Gold to use commands.` : `  Commands are now free in this group.`,
                newState ? `  ───────` : null,
                newState ? `  🆓 Free: ALL RPG cmds, group, menu` : null,
                newState ? `  💰 Cheap (${TIER_COSTS.cheap}g): search, tools, games` : null,
                newState ? `  💰💰 Mid (${TIER_COSTS.mid}g): AI, downloaders, fun` : null,
                newState ? `  💰💰💰 Expensive (${TIER_COSTS.expensive}g): canvas, stickers` : null,
            ].filter(Boolean))
        );
    }
);

// ─── .econcheck — Check economy status & costs ────────────────────────────────
mxd(
    {
        pattern:     'econcheck',
        aliases:     ['econstatus', 'econinfo'],
        category:    'group',
        react:       '📊',
        description: 'Check economy mode status for this group',
    },
    async (from, Malvin, conText) => {
        const { reply, react, isGroup, sender, botId, t } = conText;
        const { isEconomyEnabled, getCommandCost, TIER_COSTS } = require('../king/rpg/economyGate');
        const { fetchPlayer, getPlayer, buildBox } = require('../king/rpg/db');

        if (!isGroup) return reply('❌ Groups only command.');

        const enabled = await isEconomyEnabled(from);
        await getPlayer(sender, botId);
        const player = await fetchPlayer(sender);
        const balance = player?.gold || 0;

        await react('📊');
        await reply(
            buildBox('📊 ECONOMY STATUS', [
                `  Group Economy: *${enabled ? '✅ ON' : '🔴 OFF'}*`,
                `  ───────`,
                `  💰 Your Gold: *${balance.toLocaleString()}*`,
                `  ───────`,
                `  🆓 Free: ALL RPG cmds, group, menu`,
                `  💰 Cheap: ${TIER_COSTS.cheap}g — search, tools, games`,
                `  💰💰 Mid: ${TIER_COSTS.mid}g — AI, downloaders, fun`,
                `  💰💰💰 Expensive: ${TIER_COSTS.expensive}g — canvas, stickers`,
            ])
        );
    }
);
