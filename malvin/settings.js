const { mxd, commands } = require("../king/mxdcmds");
const {
  getSetting,
  setSetting,
  getAllSettings,
  resetSetting,
  resetAllSettings,
} = require("../king/database/settings");
const {
  getGroupSetting,
  setGroupSetting,
  getEnabledGroupSettings,
  resetAllGroupSettings,
  getAllGroupSettings,
} = require("../king/database/groupConfig");
const { getSudoNumbers, clearAllSudo } = require("../king/database/sudo");
const {
  getAllUsersNotes,
  deleteNoteById,
  updateNoteById,
  deleteAllNotes,
  NotesDB,
} = require("../king/database/notesDb");
const { fancy, STYLES, setGlobalStyle } = require("../king/fancyFont");

function parseBooleanInput(input) {
  if (!input) return null;
  const val = input.toLowerCase().trim();
  if (val === "on") return "true";
  if (val === "off") return "false";
  return val;
}

function formatBoolDisplay(val) {
  return val === "true" ? "ON" : "OFF";
}

function isSettingEnabled(val) {
  if (!val) return false;
  const v = String(val).toLowerCase().trim();
  return (
    v === "true" ||
    v === "on" ||
    v === "1" ||
    v === "yes" ||
    v === "warn" ||
    v === "kick" ||
    v === "delete"
  );
}

async function formatGroupsWithNames(jids, Malvin) {
  if (!jids || jids.length === 0) return "None";

  const groupInfos = await Promise.all(
    jids.map(async (jid) => {
      try {
        const metadata = await Malvin.groupMetadata(jid);
        const name = metadata?.subject || "Unknown";
        return `• ${name}`;
      } catch (e) {
        return `• ${jid}`;
      }
    }),
  );
  return groupInfos.join("\n");
}

mxd(
  {
    pattern: "settings",
    aliases: ["botsettings", "setting", "botsetting", "allsettings"],
    react: "⚙️",
    category: "owner",
    description: "View all bot settings",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) {
      await react("❌");
      return reply(t("common.owner_only"));
    }
    try {
      const settings = await getAllSettings();
      const sudoList = await getSudoNumbers();
      const enabledGroupSettings = await getEnabledGroupSettings();

      let msg = t("settings.display_header");

      const keys = Object.keys(settings).sort();
      for (const key of keys) {
        const val = settings[key] || "Not Set";
        const displayVal = val.length > 40 ? val.substring(0, 40) + "..." : val;
        msg += `▸ *${key}:* ${displayVal}\n`;
      }

      msg += t("settings.sudo_users", { list: sudoList.length > 0 ? sudoList.join(", ") : t("settings.none") });

      msg += t("settings.group_settings_header");

      const [
        welcomeGroups,
        goodbyeGroups,
        eventsGroups,
        antilinkGroups,
        antibadGroups,
        antigroupmentionGroups,
      ] = await Promise.all([
        formatGroupsWithNames(enabledGroupSettings.WELCOME_MESSAGE, Malvin),
        formatGroupsWithNames(enabledGroupSettings.GOODBYE_MESSAGE, Malvin),
        formatGroupsWithNames(enabledGroupSettings.GROUP_EVENTS, Malvin),
        formatGroupsWithNames(enabledGroupSettings.ANTILINK, Malvin),
        formatGroupsWithNames(enabledGroupSettings.ANTIBAD, Malvin),
        formatGroupsWithNames(enabledGroupSettings.ANTIGROUPMENTION, Malvin),
      ]);

      msg += t("settings.welcome_label", { groups: welcomeGroups });
      msg += t("settings.goodbye_label", { groups: goodbyeGroups });
      msg += t("settings.events_label", { groups: eventsGroups });
      msg += t("settings.antilink_label", { groups: antilinkGroups });
      msg += t("settings.antibad_label", { groups: antibadGroups });
      msg += t("settings.antigroupmention_label", { groups: antigroupmentionGroups });

      await reply(msg);
      await react("✅");
    } catch (error) {
      console.error("settings error:", error);
      await react("❌");
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setprefix",
    aliases: ["prefix", "botprefix", "changeprefix"],
    react: "⚙️",
    category: "owner",
    description: "Set bot prefix",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    if (!q) return reply(t("settings.provide_value_example", { item: "prefix", example: ".setprefix !" }));
    try {
      const current = await getSetting("PREFIX");
      if (current === q.trim()) {
        return reply(t("settings.already_set", { setting: "Prefix", value: q.trim() }));
      }
      await setSetting("PREFIX", q.trim());
      await react("✅");
      await reply(t("settings.set_success", { setting: "Prefix", value: q.trim() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setbotname",
    aliases: ["botname", "namebot", "changename"],
    react: "⚙️",
    category: "owner",
    description: "Set bot name",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    if (!q) return reply(t("settings.provide_value", { item: "bot name" }));
    try {
      const current = await getSetting("BOT_NAME");
      if (current === q.trim()) {
        return reply(t("settings.already_set", { setting: "Bot name", value: q.trim() }));
      }
      await setSetting("BOT_NAME", q.trim());
      await react("✅");
      await reply(`_✅ B${fancy("ot", "mono")} n${fancy("ame set t", "mono")}o: *${q.trim()}*_`);
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setownername",
    aliases: ["ownername", "myname"],
    react: "⚙️",
    category: "owner",
    description: "Set owner name",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    if (!q) return reply(t("settings.provide_value", { item: "owner name" }));
    try {
      const current = await getSetting("OWNER_NAME");
      if (current === q.trim()) {
        return reply(t("settings.already_set", { setting: "Owner name", value: q.trim() }));
      }
      await setSetting("OWNER_NAME", q.trim());
      await react("✅");
      await reply(t("settings.set_success", { setting: "Owner name", value: q.trim() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setownernumber",
    aliases: ["ownernumber", "ownernum", "mynumber"],
    react: "⚙️",
    category: "owner",
    description: "Set owner number",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    if (!q) return reply(t("settings.provide_value", { item: "owner number" }));
    try {
      const num = q.replace(/\D/g, "");
      const current = await getSetting("OWNER_NUMBER");
      if (current === num) {
        return reply(t("settings.already_set", { setting: "Owner number", value: num }));
      }
      await setSetting("OWNER_NUMBER", num);
      await react("✅");
      await reply(t("settings.set_success", { setting: "Owner number", value: num }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setfooter",
    aliases: ["footer", "botfooter"],
    react: "⚙️",
    category: "owner",
    description: "Set bot footer",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    if (!q) return reply(t("settings.provide_value", { item: "footer text" }));
    try {
      const current = await getSetting("FOOTER");
      if (current === q.trim()) {
        return reply(t("settings.already_set", { setting: "Footer", value: q.trim() }));
      }
      await setSetting("FOOTER", q.trim());
      await react("✅");
      await reply(t("settings.set_success", { setting: "Footer", value: q.trim() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setcaption",
    aliases: ["caption", "botcaption"],
    react: "⚙️",
    category: "owner",
    description: "Set bot caption",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    if (!q) return reply(t("settings.provide_value", { item: "caption" }));
    try {
      const current = await getSetting("CAPTION");
      if (current === q.trim()) {
        return reply(t("settings.already_set", { setting: "Caption", value: q.trim() }));
      }
      await setSetting("CAPTION", q.trim());
      await react("✅");
      await reply(t("settings.set_success", { setting: "Caption", value: q.trim() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setfont",
    aliases: ["font", "fontstyle", "botfont"],
    react: "🔤",
    category: "owner",
    description: "Change the fancy text style used across every bot message",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser } = conText;
    if (!isSuperUser) return reply("_🚫 Owner only command._");

    const arg = (q || "").trim().toLowerCase();

    if (!arg || arg === "list") {
      const preview = STYLES.map((s) => `• *${s}* — ${fancy("Malvin XD", s)}`).join("\n");
      return reply(
        `🔤 *Font Style*\n\n${preview}\n\n` +
          `Use: \`.setfont <style>\` to apply one everywhere, or \`.setfont reset\` to go back to each message's own default style.`,
      );
    }

    if (arg === "reset" || arg === "off" || arg === "default") {
      try {
        await setSetting("FONT_STYLE", "");
        setGlobalStyle(null);
        await react("✅");
        return reply("✅ Font style reset — messages use their own default style again.");
      } catch (error) {
        return reply(`❌ Error: ${error.message}`);
      }
    }

    const match = STYLES.find((s) => s.toLowerCase() === arg);
    if (!match) {
      return reply(
        `❌ Unknown style "${q}". Valid styles: ${STYLES.join(", ")}\n\nRun \`.setfont\` with no argument to preview each one.`,
      );
    }

    try {
      await setSetting("FONT_STYLE", match);
      setGlobalStyle(match);
      await react("✅");
      await reply(`✅ Font style set to *${match}* — ${fancy("every message now looks like this", match)}.`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "setbotpic",
    aliases: ["botpic", "botimage", "setbotimage"],
    react: "⚙️",
    category: "owner",
    description: "Set bot picture URL",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    if (!q) return reply(t("settings.provide_value", { item: "image URL" }));
    try {
      const current = await getSetting("BOT_PIC");
      if (current === q.trim()) {
        return reply(t("settings.botpic_already"));
      }
      await setSetting("BOT_PIC", q.trim());
      await react("✅");
      await reply(t("settings.botpic_updated"));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setmode",
    aliases: ["mode", "botmode", "changemode"],
    react: "⚙️",
    category: "owner",
    description: "Set bot mode (public/private)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const mode = q?.toLowerCase();
    if (!mode || !["public", "private"].includes(mode)) {
      return reply(t("settings.specify_options", { options: "public or private" }));
    }
    try {
      const current = await getSetting("MODE");
      if (current === mode) {
        return reply(t("settings.already_set", { setting: "Bot mode", value: mode }));
      }
      await setSetting("MODE", mode);
      await react("✅");
      await reply(t("settings.set_success", { setting: "Bot mode", value: mode }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "timezone",
    aliases: ["timezone", "tz", "settz"],
    react: "⚙️",
    category: "owner",
    description: "Set bot timezone",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    if (!q)
      return reply(t("settings.provide_value_example", { item: "timezone", example: ".timezone Africa/Harare" }));
    try {
      const current = await getSetting("TIME_ZONE");
      if (current === q.trim()) {
        return reply(t("settings.already_set", { setting: "Timezone", value: q.trim() }));
      }
      await setSetting("TIME_ZONE", q.trim());
      await react("✅");
      await reply(t("settings.set_success", { setting: "Timezone", value: q.trim() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "dmpresence",
    aliases: ["setdmpresence", "chatpresence", "inboxpresence"],
    react: "⚙️",
    category: "owner",
    description: "Set DM presence (online/offline/typing/recording)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const valid = ["online", "offline", "typing", "recording"];
    if (!q || !valid.includes(q.toLowerCase())) {
      return reply(t("settings.specify_options", { options: valid.join(", ") }));
    }
    try {
      const current = await getSetting("DM_PRESENCE");
      if (current === q.toLowerCase()) {
        return reply(t("settings.already_set", { setting: "DM presence", value: q.toLowerCase() }));
      }
      await setSetting("DM_PRESENCE", q.toLowerCase());
      await react("✅");
      await reply(t("settings.set_success", { setting: "DM presence", value: q.toLowerCase() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setgcpresence",
    aliases: ["gcpresence", "grouppresence", "grppresence"],
    react: "⚙️",
    category: "owner",
    description: "Set group presence (online/offline/typing/recording)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const valid = ["online", "offline", "typing", "recording"];
    if (!q || !valid.includes(q.toLowerCase())) {
      return reply(t("settings.specify_options", { options: valid.join(", ") }));
    }
    try {
      const current = await getSetting("GC_PRESENCE");
      if (current === q.toLowerCase()) {
        return reply(t("settings.already_set", { setting: "Group presence", value: q.toLowerCase() }));
      }
      await setSetting("GC_PRESENCE", q.toLowerCase());
      await react("✅");
      await reply(t("settings.set_success", { setting: "Group presence", value: q.toLowerCase() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setchatbot",
    aliases: ["chatbot", "ai", "setai"],
    react: "⚙️",
    category: "owner",
    description: "Set chatbot (on/off/audio)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const valid = ["true", "false", "audio"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(t("settings.specify_options", { options: "on, off, or audio" }));
    }
    try {
      const current = await getSetting("CHATBOT");
      if (current === value) {
        const display =
          value === "true" ? "ON" : value === "false" ? "OFF" : value;
        return reply(t("settings.already_set", { setting: "Chatbot", value: display }));
      }
      await setSetting("CHATBOT", value);
      await react("✅");
      await reply(
        t("settings.set_success", { setting: "Chatbot", value: value === "true" ? "ON" : value === "false" ? "OFF" : value }),
      );
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "aimode",
    aliases: ["chatbotmode", "setchatbotmode"],
    react: "⚙️",
    category: "owner",
    description: "Set chatbot mode (inbox/groups/allchats)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const valid = ["inbox", "groups", "allchats"];
    if (!q || !valid.includes(q.toLowerCase())) {
      return reply(t("settings.specify_options", { options: valid.join(", ") }));
    }
    try {
      const current = await getSetting("CHATBOT_MODE");
      if (current === q.toLowerCase()) {
        return reply(t("settings.already_set", { setting: "Chatbot mode", value: q.toLowerCase() }));
      }
      await setSetting("CHATBOT_MODE", q.toLowerCase());
      await react("✅");
      await reply(t("settings.set_success", { setting: "Chatbot mode", value: q.toLowerCase() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setstartmsg",
    aliases: ["startmsg", "startingmessage", "startmessage"],
    react: "⚙️",
    category: "owner",
    description: "Set starting message (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(t("settings.specify_options", { options: "on or off" }));
    }
    try {
      const current = await getSetting("STARTING_MESSAGE");
      if (current === value) {
        return reply(t("settings.already_set", { setting: "Starting message", value: formatBoolDisplay(value) }));
      }
      await setSetting("STARTING_MESSAGE", value);
      await react("✅");
      await reply(t("settings.set_success", { setting: "Starting message", value: formatBoolDisplay(value) }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setantidelete",
    aliases: ["antidelete", "antidel"],
    react: "⚙️",
    category: "owner",
    description: "Set antidelete (inchat/indm/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const valid = ["inchat", "indm", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(t("settings.specify_options", { options: "inchat, indm or off" }));
    }
    try {
      const current = await getSetting("ANTIDELETE");
      if (current === value) {
        const displayVal = value === "false" ? "OFF" : value.toUpperCase();
        return reply(t("settings.already_set", { setting: "Antidelete", value: displayVal }));
      }
      await setSetting("ANTIDELETE", value);
      await react("✅");
      const displayVal = value === "false" ? "OFF" : value.toUpperCase();
      await reply(t("settings.set_success", { setting: "Antidelete", value: displayVal }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setantiedit",
    aliases: ["antiedit"],
    react: "⚙️",
    category: "owner",
    description: "Set anti-edit (on/off/indm/inchat)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const valid = ["on", "off", "indm", "inchat"];
    const value = (q || "").trim().toLowerCase();
    if (!value || !valid.includes(value)) {
      return reply(t("settings.antiedit_options"));
    }
    try {
      const current = await getSetting("ANTI_EDIT");
      if (current === value) {
        return reply(t("settings.already_set", { setting: "Anti-edit", value }));
      }
      await setSetting("ANTI_EDIT", value);
      await react("✅");
      await reply(t("settings.set_success", { setting: "Anti-edit", value }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setwelcome",
    aliases: ["welcome", "welcomemsg"],
    react: "⚙️",
    category: "group",
    description: "Set welcome message for this group (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(t("settings.specify_options", { options: "on or off" }));
    }
    try {
      const current = await getGroupSetting(from, "WELCOME_MESSAGE");
      if (current === value) {
        return reply(t("settings.already_set", { setting: "Welcome message for this group", value: formatBoolDisplay(value) }));
      }
      await setGroupSetting(from, "WELCOME_MESSAGE", value);
      await react("✅");
      await reply(t("settings.set_success", { setting: "Welcome message for this group", value: formatBoolDisplay(value) }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setgoodbye",
    aliases: ["goodbye", "goodbyemsg", "bye"],
    react: "⚙️",
    category: "group",
    description: "Set goodbye message for this group (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(t("settings.specify_options", { options: "on or off" }));
    }
    try {
      const current = await getGroupSetting(from, "GOODBYE_MESSAGE");
      if (current === value) {
        return reply(t("settings.already_set", { setting: "Goodbye message for this group", value: formatBoolDisplay(value) }));
      }
      await setGroupSetting(from, "GOODBYE_MESSAGE", value);
      await react("✅");
      await reply(t("settings.set_success", { setting: "Goodbye message for this group", value: formatBoolDisplay(value) }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "welcomemsg",
    aliases: ["setwelcomemsg", "welcomemessage", "setwelcometext"],
    react: "⚙️",
    category: "group",
    description: "Set custom welcome message for this group",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, botPrefix, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    if (!q || !q.trim()) {
      const current = await getGroupSetting(from, "WELCOME_MESSAGE_TEXT");
      if (current && current.trim()) {
        return reply(t("settings.custom_msg_current", { type: "welcome", current, prefix: botPrefix, cmd: "welcomemessage" }));
      }
      return reply(t("settings.custom_msg_provide", { type: "welcome", prefix: botPrefix, cmd: "welcomemessage", example: "Thank you for joining! Please follow the rules." }));
    }

    try {
      if (q.toLowerCase().trim() === "clear") {
        await setGroupSetting(from, "WELCOME_MESSAGE_TEXT", "");
        await react("✅");
        return reply(t("settings.custom_msg_cleared", { type: "welcome" }));
      }

      const currentWelcome = await getGroupSetting(from, "WELCOME_MESSAGE_TEXT");
      if (currentWelcome && currentWelcome.trim() === q.trim()) {
        return reply(t("settings.custom_msg_already", { type: "Welcome" }));
      }

      await setGroupSetting(from, "WELCOME_MESSAGE_TEXT", q.trim());
      await react("✅");
      await reply(t("settings.custom_msg_set", { type: "Welcome", text: q.trim() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "goodbyemsg",
    aliases: ["setgoodbyemsg", "goodbyemessage", "setgoodbyetext", "byemsg"],
    react: "⚙️",
    category: "group",
    description: "Set custom goodbye message for this group",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, botPrefix, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    if (!q || !q.trim()) {
      const current = await getGroupSetting(from, "GOODBYE_MESSAGE_TEXT");
      if (current && current.trim()) {
        return reply(t("settings.custom_msg_current", { type: "goodbye", current, prefix: botPrefix, cmd: "goodbyemessage" }));
      }
      return reply(t("settings.custom_msg_provide", { type: "goodbye", prefix: botPrefix, cmd: "goodbyemessage", example: "Thank you for staying with us. Take care!" }));
    }

    try {
      if (q.toLowerCase().trim() === "clear") {
        await setGroupSetting(from, "GOODBYE_MESSAGE_TEXT", "");
        await react("✅");
        return reply(t("settings.custom_msg_cleared", { type: "goodbye" }));
      }

      const currentGoodbye = await getGroupSetting(from, "GOODBYE_MESSAGE_TEXT");
      if (currentGoodbye && currentGoodbye.trim() === q.trim()) {
        return reply(t("settings.custom_msg_already", { type: "Goodbye" }));
      }

      await setGroupSetting(from, "GOODBYE_MESSAGE_TEXT", q.trim());
      await react("✅");
      await reply(t("settings.custom_msg_set", { type: "Goodbye", text: q.trim() }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setanticall",
    aliases: ["anticall", "blockcall"],
    react: "⚙️",
    category: "owner",
    description: "Set anticall (on/off/block/decline)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t("common.owner_only"));
    const valid = ["true", "block", "false", "decline"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(t("settings.specify_options", { options: "on, off, block or decline" }));
    }
    try {
      const current = await getSetting("ANTICALL");
      if (current === value) {
        const displayVal =
          value === "true"
            ? "ON"
            : value === "false"
              ? "OFF"
              : value.toUpperCase();
        return reply(t("settings.already_set", { setting: "Anticall", value: displayVal }));
      }
      await setSetting("ANTICALL", value);
      await react("✅");
      const displayVal =
        value === "true"
          ? "ON"
          : value === "false"
            ? "OFF"
            : value.toUpperCase();
      await reply(t("settings.set_success", { setting: "Anticall", value: displayVal }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setantilink",
    aliases: ["antilink"],
    react: "⚙️",
    category: "group",
    description: "Set antilink for this group (on/warn/delete/kick/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    const input = (q || "").toLowerCase().trim();
    const modeMap = {
      on: "delete",
      off: "false",
      true: "delete",
      false: "false",
      delete: "delete",
      kick: "kick",
      warn: "warn",
    };

    const value = modeMap[input];
    if (!value) {
      const warnCount = await getGroupSetting(from, "ANTILINK_WARN_COUNT");
      return reply(t("settings.moderation_options", {
        deleteDesc: "Delete links (no kick)",
        warnCount,
        kickDesc: "Delete link & immediately kick user",
        feature: "antilink",
      }));
    }

    try {
      const current = await getGroupSetting(from, "ANTILINK");
      if (current === value) {
        const displayVal = value === "false" ? "OFF" : value.toUpperCase();
        return reply(t("settings.moderation_status", { feature: "Antilink", value: displayVal }));
      }
      await setGroupSetting(from, "ANTILINK", value);
      await react("✅");
      const displayVal = value === "false" ? "OFF" : value.toUpperCase();
      let msg = t("settings.moderation_set", { feature: "Antilink", value: displayVal });
      if (value === "warn") {
        const warnCount = await getGroupSetting(from, "ANTILINK_WARN_COUNT");
        msg += t("settings.moderation_kick_after", { count: warnCount });
      }
      await reply(msg);
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "antilinkwarn",
    aliases: ["setwarncount", "warncount", "antilinkwarncount", "warnlimit"],
    react: "⚙️",
    category: "group",
    description: "Set antilink warning count before kick (default 5)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, botPrefix, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    const count = parseInt(q);
    if (!q) {
      const current =
        (await getGroupSetting(from, "ANTILINK_WARN_COUNT")) || "5";
      return reply(t("settings.warncount_current", { count: current, prefix: botPrefix, cmd: "antilinkwarn" }));
    }

    if (isNaN(count) || count < 1 || count > 10) {
      return reply(t("settings.warncount_range"));
    }

    try {
      const currentWarnCount = (await getGroupSetting(from, "ANTILINK_WARN_COUNT")) || "5";
      if (currentWarnCount === count.toString()) {
        return reply(t("settings.warncount_already", { feature: "Antilink", count }));
      }
      await setGroupSetting(from, "ANTILINK_WARN_COUNT", count.toString());
      await react("✅");
      await reply(t("settings.warncount_set", { feature: "Antilink", count }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setantibad",
    aliases: ["antibad", "antibadwords", "badwordfilter"],
    react: "⚙️",
    category: "group",
    description: "Set anti-badwords for this group (on/warn/delete/kick/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    const input = (q || "").toLowerCase().trim();
    const modeMap = {
      on: "delete",
      off: "false",
      true: "delete",
      false: "false",
      delete: "delete",
      kick: "kick",
      warn: "warn",
    };

    const value = modeMap[input];
    if (!value) {
      const warnCount = await getGroupSetting(from, "ANTIBAD_WARN_COUNT");
      const { getBadWords } = require("../king/database/groupConfig");
      const badWords = await getBadWords(from);
      let msg = t("settings.moderation_options", {
        deleteDesc: "Delete bad word messages",
        warnCount,
        kickDesc: "Delete & immediately kick user",
        feature: "anti-badwords",
      });
      msg += t("settings.antibad_current_words", {
        count: badWords.length,
        words: badWords.length > 0 ? badWords.slice(0, 10).join(", ") + (badWords.length > 10 ? "..." : "") : t("settings.none_set"),
      });
      return reply(msg);
    }

    try {
      const current = await getGroupSetting(from, "ANTIBAD");
      if (current === value) {
        const displayVal = value === "false" ? "OFF" : value.toUpperCase();
        return reply(t("settings.moderation_status", { feature: "Anti-badwords", value: displayVal }));
      }
      await setGroupSetting(from, "ANTIBAD", value);
      await react("✅");
      const displayVal = value === "false" ? "OFF" : value.toUpperCase();
      let msg = t("settings.moderation_set", { feature: "Anti-BadWords", value: displayVal });
      if (value === "warn") {
        const warnCount = await getGroupSetting(from, "ANTIBAD_WARN_COUNT");
        msg += t("settings.moderation_kick_after", { count: warnCount });
      }
      if (value !== "false") {
        msg += t("settings.antibad_add_hint");
      }
      await reply(msg);
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "antibadwarn",
    aliases: ["badwarncount", "antibadwarncount", "setbadwarn"],
    react: "⚙️",
    category: "group",
    description: "Set anti-badwords warning count before kick (default 5)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, botPrefix, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    const count = parseInt(q);
    if (!q) {
      const current =
        (await getGroupSetting(from, "ANTIBAD_WARN_COUNT")) || "5";
      return reply(t("settings.warncount_current", { count: current, prefix: botPrefix, cmd: "antibadwarn" }));
    }

    if (isNaN(count) || count < 1 || count > 10) {
      return reply(t("settings.warncount_range"));
    }

    try {
      const currentBadCount = (await getGroupSetting(from, "ANTIBAD_WARN_COUNT")) || "5";
      if (currentBadCount === count.toString()) {
        return reply(t("settings.warncount_already", { feature: "Anti-badwords", count }));
      }
      await setGroupSetting(from, "ANTIBAD_WARN_COUNT", count.toString());
      await react("✅");
      await reply(t("settings.warncount_set", { feature: "Anti-badwords", count }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "setantinsfw",
    aliases: ["antinsfw", "antiporn", "nsfwfilter"],
    react: "🔞",
    category: "group",
    description: "Set anti-NSFW image detection for this group (on/warn/delete/kick/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    const input = (q || "").toLowerCase().trim();
    const modeMap = {
      on: "delete",
      off: "false",
      true: "delete",
      false: "false",
      delete: "delete",
      kick: "kick",
      warn: "warn",
    };

    const value = modeMap[input];
    if (!value) {
      const warnCount = await getGroupSetting(from, "ANTINSFW_WARN_COUNT");
      let msg = t("settings.moderation_options", {
        deleteDesc: "Delete explicit images",
        warnCount,
        kickDesc: "Delete & immediately kick user",
        feature: "anti-NSFW",
      });
      msg += t("settings.antinsfw_note");
      return reply(msg);
    }

    try {
      const current = await getGroupSetting(from, "ANTINSFW");
      if (current === value) {
        const displayVal = value === "false" ? "OFF" : value.toUpperCase();
        return reply(t("settings.moderation_status", { feature: "Anti-NSFW", value: displayVal }));
      }
      await setGroupSetting(from, "ANTINSFW", value);
      await react("✅");
      const displayVal = value === "false" ? "OFF" : value.toUpperCase();
      let msg = t("settings.moderation_set", { feature: "Anti-NSFW", value: displayVal });
      if (value === "warn") {
        const warnCount = await getGroupSetting(from, "ANTINSFW_WARN_COUNT");
        msg += t("settings.moderation_kick_after", { count: warnCount });
      }
      await reply(msg);
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "antinsfwwarn",
    aliases: ["nsfwwarncount", "antinsfwwarncount", "setnsfwwarn"],
    react: "⚙️",
    category: "group",
    description: "Set anti-NSFW warning count before kick (default 3)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, botPrefix, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    const count = parseInt(q);
    if (!q) {
      const current =
        (await getGroupSetting(from, "ANTINSFW_WARN_COUNT")) || "3";
      return reply(t("settings.warncount_current", { count: current, prefix: botPrefix, cmd: "antinsfwwarn" }));
    }

    if (isNaN(count) || count < 1 || count > 10) {
      return reply(t("settings.warncount_range"));
    }

    try {
      const currentNsfwCount = (await getGroupSetting(from, "ANTINSFW_WARN_COUNT")) || "3";
      if (currentNsfwCount === count.toString()) {
        return reply(t("settings.warncount_already", { feature: "Anti-NSFW", count }));
      }
      await setGroupSetting(from, "ANTINSFW_WARN_COUNT", count.toString());
      await react("✅");
      await reply(t("settings.warncount_set", { feature: "Anti-NSFW", count }));
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

mxd(
  {
    pattern: "badwords",
    aliases: ["setbadwords", "badword", "profanity"],
    react: "🚫",
    category: "group",
    description:
      "Manage bad words list. Usage: .badwords add/remove/list/clear/default",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, args, t } = conText;
    if (!isGroup) return reply(t("common.group_only"));
    if (!isSuperUser && !isAdmin) return reply(t("common.admin_only"));

    const {
      getBadWords,
      addBadWord,
      removeBadWord,
      clearBadWords,
      initializeDefaultBadWords,
      DEFAULT_BAD_WORDS,
    } = require("../king/database/groupConfig");

    const action = (args[0] || "").toLowerCase();
    const words = args.slice(1);

    if (
      !action ||
      ![
        "add",
        "remove",
        "del",
        "delete",
        "list",
        "clear",
        "reset",
        "default",
        "defaults",
      ].includes(action)
    ) {
      const badWords = await getBadWords(from);
      const list = badWords.length > 0
        ? badWords
            .slice(0, 15)
            .map((w, i) => `${i + 1}. ${w}`)
            .join("\n") +
          (badWords.length > 15 ? t("badwords.and_more", { count: badWords.length - 15 }) : "")
        : t("badwords.no_words");
      return reply(t("badwords.menu", { defaultCount: DEFAULT_BAD_WORDS.length, count: badWords.length, list }));
    }

    try {
      if (action === "add") {
        if (words.length === 0) {
          return reply(t("badwords.provide_add", { prefix: conText.botPrefix }));
        }

        let added = 0;
        for (const word of words) {
          if (word.length >= 2) {
            await addBadWord(from, word);
            added++;
          }
        }

        await react("✅");
        await reply(t("badwords.added", { count: added }));
      } else if (["remove", "del", "delete"].includes(action)) {
        if (words.length === 0) {
          return reply(t("badwords.provide_remove", { prefix: conText.botPrefix }));
        }

        let removed = 0;
        for (const word of words) {
          const success = await removeBadWord(from, word);
          if (success) removed++;
        }

        await react("✅");
        await reply(t("badwords.removed", { count: removed }));
      } else if (action === "list") {
        const badWords = await getBadWords(from);
        if (badWords.length === 0) {
          return reply(t("badwords.none_for_group"));
        }

        const chunks = [];
        for (let i = 0; i < badWords.length; i += 20) {
          chunks.push(badWords.slice(i, i + 20));
        }

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const startIdx = i * 20;
          let msg =
            i === 0
              ? t("badwords.list_title", { count: badWords.length })
              : t("badwords.list_continued");
          msg += chunk
            .map((w, idx) => `${startIdx + idx + 1}. ${w}`)
            .join("\n");
          await Malvin.sendMessage(from, { text: msg });
        }
        await react("✅");
      } else if (["clear", "reset"].includes(action)) {
        await clearBadWords(from);
        await react("✅");
        await reply(t("badwords.cleared"));
      } else if (["default", "defaults"].includes(action)) {
        const added = await initializeDefaultBadWords(from);
        await react("✅");
        const total = await getBadWords(from);
        await reply(t("badwords.defaults_loaded", { added, total: total.length }));
      }
    } catch (error) {
      await reply(t("common.error_generic", { error: error.message }));
    }
  },
);

function parseBooleanInput(input) {
  if (!input) return null;
  const val = input.toLowerCase().trim();
  if (val === "on") return "true";
  if (val === "off") return "false";
  return val;
}

function formatBoolDisplay(val) {
  return val === "true" ? "ON" : "OFF";
}

function isSettingEnabled(val) {
  if (!val) return false;
  const v = String(val).toLowerCase().trim();
  return (
    v === "true" ||
    v === "on" ||
    v === "1" ||
    v === "yes" ||
    v === "warn" ||
    v === "kick" ||
    v === "delete"
  );
}

mxd(
  {
    pattern: "statuslike",
    aliases: ["autolikestatus", "autostatuslike", "autolike", "likestatus"],
    react: "⚙️",
    category: "owner",
    description: "Set auto like status (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(`❌ Please specify: on or off`);
    }
    try {
      const current = await getSetting("AUTO_LIKE_STATUS");
      if (current === value) {
        return reply(
          `⚠️ Auto like status is already: *${formatBoolDisplay(value)}*`,
        );
      }
      await setSetting("AUTO_LIKE_STATUS", value);
      await react("✅");
      await reply(`✅ Auto like status set to: *${formatBoolDisplay(value)}*\n\n⚠️ Note: Auto like only works when auto view (*autoreadstatus*) is also *ON*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "autoreadstatus",
    aliases: [ "readstatus", "viewstatus"],
    react: "⚙️",
    category: "owner",
    description: "Set auto read status (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(`❌ Please specify: on or off`);
    }
    try {
      const current = await getSetting("AUTO_READ_STATUS");
      if (current === value) {
        return reply(
          `⚠️ Auto read status is already: *${formatBoolDisplay(value)}*`,
        );
      }
      await setSetting("AUTO_READ_STATUS", value);
      await react("✅");
      await reply(`✅ Auto read status set to: *${formatBoolDisplay(value)}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "statusemojis",
    aliases: ["likeemojis"],
    react: "⚙️",
    category: "owner",
    description: "Set status like emojis (comma separated)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!q)
      return reply(
        "❌ Please provide emojis separated by commas!\nExample: .statusemojis 💚,💙,🩵",
      );
    try {
      const current = await getSetting("STATUS_LIKE_EMOJIS");
      if (current === q.trim()) {
        return reply(`⚠️ Status emojis are already set to: *${q.trim()}*`);
      }
      await setSetting("STATUS_LIKE_EMOJIS", q.trim());
      await react("✅");
      await reply(`✅ Status emojis set to: *${q.trim()}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "statusreply",
    aliases: ["statusreplytext", "setstatusreplytext"],
    react: "⚙️",
    category: "owner",
    description: "Set status reply text",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!q) return reply("❌ Please provide reply text!");
    try {
      const current = await getSetting("STATUS_REPLY_TEXT");
      if (current === q.trim()) {
        return reply(`⚠️ Status reply text is already set to this value!`);
      }
      await setSetting("STATUS_REPLY_TEXT", q.trim());
      await react("✅");
      await reply(`✅ Status reply text updated!`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "autoreact",
    aliases: ["react"],
    react: "⚙️",
    category: "owner",
    description: "Set auto react mode (on/all/dm/groups/commands/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));

    const input = (q || "").toLowerCase().trim();
    const validModes = ["on", "all", "dm", "groups", "commands", "off"];

    if (!input || !validModes.includes(input)) {
      return reply(
        `❌ Please specify a valid mode:\n• *on/all* - React to all messages\n• *dm* - React to private chats only\n• *groups* - React to group messages only\n• *commands* - React to bot commands only\n• *off* - Disable auto react`,
      );
    }

    const value = input === "on" ? "all" : input;

    try {
      const current = await getSetting("AUTO_REACT");
      if (current === value) {
        return reply(
          `⚠️ Auto react is already set to: *${value.toUpperCase()}*`,
        );
      }
      await setSetting("AUTO_REACT", value);
      await react("✅");
      await reply(`✅ Auto react set to: *${value.toUpperCase()}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "setautoreply",
    aliases: ["autoreply"],
    react: "⚙️",
    category: "owner",
    description: "Set auto reply (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(`❌ Please specify: on or off`);
    }
    try {
      const current = await getSetting("AUTO_REPLY");
      if (current === value) {
        return reply(`⚠️ Auto reply is already: *${formatBoolDisplay(value)}*`);
      }
      await setSetting("AUTO_REPLY", value);
      await react("✅");
      await reply(`✅ Auto reply set to: *${formatBoolDisplay(value)}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "autobio",
    aliases: ["setautobio", "bio"],
    react: "⚙️",
    category: "owner",
    description: "Set auto bio (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(`❌ Please specify: on or off`);
    }
    try {
      const current = await getSetting("AUTO_BIO");
      if (current === value) {
        return reply(`⚠️ Auto bio is already: *${formatBoolDisplay(value)}*`);
      }
      await setSetting("AUTO_BIO", value);
      await react("✅");
      await reply(`✅ Auto bio set to: *${formatBoolDisplay(value)}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "autoblock",
    aliases: ["setautoblock", "blockcountry"],
    react: "⚙️",
    category: "owner",
    description:
      "Set auto block country codes (comma separated or empty to disable)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    try {
      const value = q ? q.trim() : "";
      const current = await getSetting("AUTO_BLOCK");
      if (current === value) {
        if (value) {
          return reply(`⚠️ Auto block is already set to: *${value}*`);
        } else {
          return reply(`⚠️ Auto block is already disabled!`);
        }
      }
      await setSetting("AUTO_BLOCK", value);
      await react("✅");
      if (value) {
        await reply(`✅ Auto block set for country codes: *${value}*`);
      } else {
        await reply(`✅ Auto block disabled`);
      }
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "autoread",
    aliases: ["setautoread", "readmessages"],
    react: "⚙️",
    category: "owner",
    description: "Set auto read messages mode (on/all/dm/groups/commands/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));

    const input = (q || "").toLowerCase().trim();
    const validModes = ["on", "all", "dm", "groups", "commands", "off"];

    if (!input || !validModes.includes(input)) {
      return reply(
        `❌ Please specify a valid mode:\n• *on/all* - Read all messages\n• *dm* - Read private chats only\n• *groups* - Read group messages only\n• *commands* - Read bot commands only\n• *off* - Disable auto read`,
      );
    }

    const value = input === "on" ? "all" : input;

    try {
      const current = await getSetting("AUTO_READ_MESSAGES");
      if (current === value) {
        return reply(
          `⚠️ Auto read messages is already set to: *${value.toUpperCase()}*`,
        );
      }
      await setSetting("AUTO_READ_MESSAGES", value);
      await react("✅");
      await reply(`✅ Auto read messages set to: *${value.toUpperCase()}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);


mxd(
  {
    pattern: "gcjid",
    aliases: ["setgcjid", "groupjid", "supportgc"],
    react: "⚙️",
    category: "owner",
    description: "Set group chat JID/invite code",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!q) return reply("❌ Please provide a group JID or invite code!");
    try {
      const current = await getSetting("GC_JID");
      if (current === q.trim()) {
        return reply(`⚠️ Group JID is already set to this value!`);
      }
      await setSetting("GC_JID", q.trim());
      await react("✅");
      await reply(`✅ Group JID set!`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "setpackname",
    aliases: ["packname", "stickerpack", "stickername"],
    react: "⚙️",
    category: "owner",
    description: "Set sticker pack name",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!q) return reply("❌ Please provide a pack name!");
    try {
      const current = await getSetting("PACK_NAME");
      if (current === q.trim()) {
        return reply(`⚠️ Pack name is already set to: *${q.trim()}*`);
      }
      await setSetting("PACK_NAME", q.trim());
      await react("✅");
      await reply(`✅ Pack name set to: *${q.trim()}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "setpackauthor",
    aliases: ["packauthor", "stickerauthor"],
    react: "⚙️",
    category: "owner",
    description: "Set sticker pack author",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!q) return reply("❌ Please provide a pack author!");
    try {
      const current = await getSetting("PACK_AUTHOR");
      if (current === q.trim()) {
        return reply(`⚠️ Pack author is already set to: *${q.trim()}*`);
      }
      await setSetting("PACK_AUTHOR", q.trim());
      await react("✅");
      await reply(`✅ Pack author set to: *${q.trim()}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "getsetting",
    aliases: ["getconfig", "viewsetting"],
    react: "⚙️",
    category: "owner",
    description: "Get a specific setting value",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!q)
      return reply(
        "❌ Please provide a setting key!\nExample: .getsetting PREFIX",
      );
    try {
      const value = await getSetting(q.toUpperCase().trim());
      await react("✅");
      await reply(`⚙️ *${q.toUpperCase()}:* ${value || "Not Set"}`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "setsetting",
    aliases: ["setconfig", "config"],
    react: "⚙️",
    category: "owner",
    description: "Set any setting (key value)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!q || !q.includes(" ")) {
      return reply(
        "❌ Please provide key and value!\nExample: .setsetting PREFIX !",
      );
    }
    try {
      const parts = q.split(" ");
      const key = parts[0].toUpperCase();
      const value = parts.slice(1).join(" ");
      const current = await getSetting(key);
      if (current === value) {
        return reply(`⚠️ *${key}* is already set to: *${value}*`);
      }
      await setSetting(key, value);
      await react("✅");
      await reply(`✅ *${key}* set to: *${value}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "resetsetting",
    aliases: ["resetconfig", "defaultsetting"],
    react: "⚙️",
    category: "owner",
    description: "Reset a setting to default",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    if (!q) return reply("❌ Please provide a setting key to reset!");
    try {
      const defaultValue = await resetSetting(q.toUpperCase().trim());
      await react("✅");
      await reply(
        `✅ *${q.toUpperCase()}* reset to default: *${defaultValue || "Not Set"}*`,
      );
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "resetallsettings",
    aliases: ["resetsettings", "resetall", "defaultsettings"],
    react: "⚙️",
    category: "owner",
    description: "Reset all settings to defaults",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    try {
      await resetAllSettings();
      await react("✅");
      await reply(`✅ All settings have been reset to defaults!`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "setautoreplystatus",
    aliases: ["autoreplystatus", "replystatusauto"],
    react: "⚙️",
    category: "owner",
    description: "Set auto reply to status (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(`❌ Please specify: on or off`);
    }
    try {
      const current = await getSetting("AUTO_REPLY_STATUS");
      if (current === value) {
        return reply(
          `⚠️ Auto reply status is already: *${formatBoolDisplay(value)}*`,
        );
      }
      await setSetting("AUTO_REPLY_STATUS", value);
      await react("✅");
      await reply(`✅ Auto reply status set to: *${formatBoolDisplay(value)}*\n\n⚠️ Note: Auto reply to status only works when auto view (*autoreadstatus*) is also *ON*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "setpmpermit",
    aliases: ["pmpermit"],
    react: "⚙️",
    category: "owner",
    description: "Set PM permit (on/off)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(`❌ Please specify: on or off`);
    }
    try {
      const current = await getSetting("PM_PERMIT");
      if (current === value) {
        return reply(`⚠️ PM Permit is already: *${formatBoolDisplay(value)}*`);
      }
      await setSetting("PM_PERMIT", value);
      await react("✅");
      await reply(`✅ PM Permit set to: *${formatBoolDisplay(value)}*`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "setgroupevents",
    aliases: ["groupevents", "gcevents", "setgcevents", "events"],
    react: "⚙️",
    category: "group",
    description:
      "Set group events notifications for this group (on/off) - promotes/demotes",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, isGroup, isAdmin, t } = conText;
    if (!isGroup) return reply(t('common.group_only'));
    if (!isSuperUser && !isAdmin) return reply(t('common.admin_only'));
    const valid = ["true", "false"];
    const value = parseBooleanInput(q);
    if (!value || !valid.includes(value)) {
      return reply(`❌ Please specify: on or off`);
    }
    try {
      const current = await getGroupSetting(from, "GROUP_EVENTS");
      if (current === value) {
        return reply(
          `⚠️ Group events for this group is already: *${formatBoolDisplay(value)}*`,
        );
      }
      await setGroupSetting(from, "GROUP_EVENTS", value);
      await react("✅");
      await reply(
        `✅ Group events for this group: *${formatBoolDisplay(value)}*`,
      );
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "resetsudo",
    aliases: ["deleteallsudos", "resetsudos", "clearsudo", "clearsudos"],
    react: "🗑️",
    category: "owner",
    description: "Remove all sudo numbers from database",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));
    try {
      const sudoList = await getSudoNumbers();
      if (sudoList.length === 0) {
        return reply("⚠️ No sudo numbers to remove.");
      }
      const count = await clearAllSudo();
      await react("✅");
      await reply(`✅ Removed *${count}* sudo number(s) from database.`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "gcsettings",
    aliases: ["groupsettings", "gcset", "groupset", "gsettings"],
    react: "⚙️",
    category: "group",
    description: "View all settings for this group",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isAdmin, isSuperAdmin, isGroup, groupName, t } = conText;
    if (!isGroup) return reply(t('common.group_only'));
    if (!isAdmin && !isSuperAdmin) return reply("❌ Admin Only Command!");

    try {
      const {
        getBadWords,
        DEFAULT_BAD_WORDS,
      } = require("../king/database/groupConfig");
      const settings = await getAllGroupSettings(from);

      const welcomeStatus = isSettingEnabled(settings.WELCOME_MESSAGE)
        ? "ON"
        : "OFF";
      const goodbyeStatus = isSettingEnabled(settings.GOODBYE_MESSAGE)
        ? "ON"
        : "OFF";
      const eventsStatus = isSettingEnabled(settings.GROUP_EVENTS)
        ? "ON"
        : "OFF";
      const antilinkStatus = isSettingEnabled(settings.ANTILINK) ? "ON" : "OFF";
      const antibadStatus = isSettingEnabled(settings.ANTIBAD) ? "ON" : "OFF";

      const antiGcMentionRaw = settings.ANTIGROUPMENTION || "off";
      let antiGcMentionStatus = "OFF";
      let antiGcMentionAction = "";
      if (isSettingEnabled(antiGcMentionRaw)) {
        antiGcMentionStatus = "ON";
        if (antiGcMentionRaw === "kick") {
          antiGcMentionAction = "kick";
        } else {
          antiGcMentionAction = "warn";
        }
      }

      const badWords = await getBadWords(from);
      const defaultBadWordsSet = new Set(
        DEFAULT_BAD_WORDS.map((w) => w.toLowerCase()),
      );
      const isUsingDefault =
        badWords.length === DEFAULT_BAD_WORDS.length &&
        badWords.every((w) => defaultBadWordsSet.has(w.toLowerCase()));
      let badWordsDisplay = "None";
      if (badWords.length > 0) {
        if (isUsingDefault) {
          badWordsDisplay = "Default list";
        } else {
          const displayWords = badWords.slice(0, 5).join(", ");
          badWordsDisplay =
            badWords.length > 5
              ? `${displayWords}... (+${badWords.length - 5} more)`
              : displayWords;
        }
      }

      const welcomeText = settings.WELCOME_MESSAGE_TEXT || "Default";
      const goodbyeText = settings.GOODBYE_MESSAGE_TEXT || "Default";

      let msg = `╭━━━━━━━━━━━╮\n`;
      msg += `│ ⚙️ *GROUP SETTINGS*\n`;
      msg += `├━━━━━━━━━━━┤\n`;
      msg += `│ 📍 *${groupName || "This Group"}*\n`;
      msg += `├━━━━━━━━━━━┤\n`;
      msg += `│\n`;
      msg += `│ 👋 *Welcome:* ${welcomeStatus}\n`;
      msg += `│ 👋 *Goodbye:* ${goodbyeStatus}\n`;
      msg += `│ 📢 *Events:* ${eventsStatus}\n`;
      msg += `│\n`;
      msg += `├━━━━━━━━━━━┤\n`;
      msg += `│ 🛡️ *PROTECTION*\n`;
      msg += `├━━━━━━━━━━━┤\n`;
      msg += `│\n`;
      const antilinkRaw = settings.ANTILINK || "off";
      let antilinkAction = "delete";
      if (antilinkRaw === "warn") antilinkAction = "warn";
      else if (antilinkRaw === "kick") antilinkAction = "kick";

      msg += `│ 🔗 *Antilink:* ${antilinkStatus}\n`;
      if (antilinkStatus === "ON") {
        msg += `│ └ Action: ${antilinkAction}\n`;
        if (antilinkAction === "warn") {
          msg += `│ └ Warns: ${settings.ANTILINK_WARN_COUNT}\n`;
        }
      }
      msg += `│\n`;
      msg += `│ 🚫 *Antibad:* ${antibadStatus}\n`;
      msg += `│ └ Warns: ${settings.ANTIBAD_WARN_COUNT}\n`;
      msg += `│ └ Words: ${badWordsDisplay}\n`;
      msg += `│\n`;
      msg += `│ 📢 *Anti-Status-Mention:* ${antiGcMentionStatus}\n`;
      if (antiGcMentionStatus === "ON") {
        msg += `│ └ Action: ${antiGcMentionAction}\n`;
        if (antiGcMentionAction === "warn") {
          msg += `│ └ Warn Limit: ${settings.ANTIGROUPMENTION_WARN_COUNT || 3}\n`;
        }
      }
      msg += `│\n`;
      msg += `├━━━━━━━━━━━┤\n`;
      msg += `│ 💬 *MESSAGES*\n`;
      msg += `├━━━━━━━━━━━┤\n`;
      msg += `│\n`;
      msg += `│ *Welcome Msg:*\n`;
      msg += `│ ${welcomeText.length > 50 ? welcomeText.substring(0, 50) + "..." : welcomeText}\n`;
      msg += `│\n`;
      msg += `│ *Goodbye Msg:*\n`;
      msg += `│ ${goodbyeText.length > 50 ? goodbyeText.substring(0, 50) + "..." : goodbyeText}\n`;
      msg += `│\n`;
      msg += `╰━━━━━━━━━━━╯\n`;
      msg += `\n_Use .setwelcome, .setgoodbye, .setantilink, etc to modify_`;

      await react("✅");
      await reply(msg);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "resetgroup",
    aliases: ["resetgroupsettings", "cleargroupsettings", "resetgc", "cleargc"],
    react: "🗑️",
    category: "group",
    description:
      "Reset all settings for this group (welcome, goodbye, antilink, etc.)",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, isGroup, t } = conText;
    if (!isGroup) return reply(t('common.group_only'));
    if (!isSuperUser) return reply(t('common.owner_only'));
    try {
      await resetAllGroupSettings(from);
      await react("✅");
      await reply(
        `✅ All settings for this group have been reset to defaults.\n\n*Cleared:*\n▸ Welcome message\n▸ Goodbye message\n▸ Group events\n▸ Antilink\n▸ Antilink warnings`,
      );
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "resetdb",
    aliases: [
      "resetdatabase",
      "wipedatabase",
      "wipedb",
      "factoryreset",
      "flushdb",
      "flushdatabase",
    ],
    react: "⚠️",
    category: "owner",
    description:
      "Reset entire database to defaults (bot settings, sudo, group settings)",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) return reply(t('common.owner_only'));

    if (q !== "confirm") {
      return reply(
        `⚠️ *WARNING: This will reset EVERYTHING!*\n\n*Will be cleared:*\n▸ All bot settings\n▸ All sudo numbers\n▸ All group settings\n▸ All antilink warnings\n\nTo confirm, type: *.resetdb confirm*`,
      );
    }

    try {
      await resetAllSettings();
      await clearAllSudo();
      const {
        GroupSettingsDB,
        AntilinkWarningsDB,
      } = require("../king/database/groupConfig");
      await GroupSettingsDB.destroy({ where: {} });
      await AntilinkWarningsDB.destroy({ where: {} });
      await react("✅");
      await reply(
        `✅ Database has been completely reset to defaults.\n\nAll settings, sudo numbers, and group configurations have been cleared.`,
      );
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "allnotes",
    aliases: ["viewnotes", "usernotes", "allnotesdb"],
    react: "📋",
    category: "owner",
    description: "View all users' notes (owner only)",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, t } = conText;
    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    try {
      const allNotes = await getAllUsersNotes();

      if (allNotes.length === 0) {
        return reply("📭 No notes in the database.");
      }

      const groupedByUser = {};
      for (const note of allNotes) {
        if (!groupedByUser[note.userJid]) {
          groupedByUser[note.userJid] = [];
        }
        groupedByUser[note.userJid].push(note);
      }

      let text = `📋 *ALL USER NOTES*\n\n`;
      text += `Total: ${allNotes.length} notes from ${Object.keys(groupedByUser).length} users\n\n`;

      for (const [userJid, notes] of Object.entries(groupedByUser)) {
        const userName = userJid.split("@")[0];
        text += `👤 *@${userName}* (${notes.length} notes)\n`;
        for (const note of notes) {
          const preview =
            note.content.length > 30
              ? note.content.substring(0, 30) + "..."
              : note.content;
          text += `  ID:${note.id} #${note.noteNumber} - ${preview}\n`;
        }
        text += `\n`;
      }

      text += `_Use .admindelnote <id> to delete a note_\n`;
      text += `_Use .adminupdatenote <id> <text> to update_\n`;
      text += `_Use .adminclearnotes <number> to clear user notes_`;

      await reply(text);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "admindelnote",
    aliases: ["deletenotebyid", "rmnotebyid", "admindeletenote"],
    react: "🗑️",
    category: "owner",
    description: "Delete any note by ID (owner only)",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, q, t } = conText;
    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    if (!q || isNaN(parseInt(q))) {
      return reply("❌ Provide a note ID.\n\nUsage: .admindelnote <id>");
    }

    try {
      const noteId = parseInt(q);
      const deleted = await deleteNoteById(noteId);

      if (!deleted) {
        return reply(`❌ Note with ID ${noteId} not found.`);
      }

      await react("✅");
      return reply(`✅ Note ID ${noteId} deleted!`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "adminupdatenote",
    aliases: ["editnotebyid", "updatenotebyid", "admineditnote"],
    react: "✏️",
    category: "owner",
    description: "Update any note by ID (owner only)",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, q, t } = conText;
    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    if (!q || q.trim() === "") {
      return reply(
        "❌ Provide note ID and new content.\n\nUsage: .adminupdatenote <id> <new text>",
      );
    }

    try {
      const parts = q.trim().split(/\s+/);
      const noteId = parseInt(parts[0]);

      if (isNaN(noteId)) {
        return reply(
          "❌ First argument must be a note ID.\n\nUsage: .adminupdatenote <id> <new text>",
        );
      }

      const newContent = parts.slice(1).join(" ");
      if (!newContent) {
        return reply(
          "❌ Provide new content.\n\nUsage: .adminupdatenote <id> <new text>",
        );
      }

      const note = await updateNoteById(noteId, newContent);

      if (!note) {
        return reply(`❌ Note with ID ${noteId} not found.`);
      }

      await react("✅");
      return reply(`✅ Note ID ${noteId} updated!\n\n📝 "${note.content}"`);
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

mxd(
  {
    pattern: "adminclearnotes",
    aliases: ["clearusernotes", "deleteusernotes", "adminrmallnotes"],
    react: "🗑️",
    category: "owner",
    description: "Delete all notes for a specific user (owner only)",
  },
  async (from, Malvin, conText) => {
    const { reply, react, isSuperUser, q, t } = conText;
    if (!isSuperUser) {
      await react("❌");
      return reply(t('common.owner_only'));
    }

    if (!q || q.trim() === "") {
      return reply(
        "❌ Provide user number.\n\nUsage: .adminclearnotes <number>",
      );
    }

    try {
      let userNumber = q.trim().replace(/[^0-9]/g, "");
      const userJid = userNumber + "@s.whatsapp.net";

      const count = await deleteAllNotes(userJid);

      if (count === 0) {
        return reply(`📭 No notes found for ${userNumber}.`);
      }

      await react("✅");
      return reply(
        `✅ Deleted ${count} note${count > 1 ? "s" : ""} for ${userNumber}!`,
      );
    } catch (error) {
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

module.exports = {};
