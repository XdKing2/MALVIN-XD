const { mxd, commands, monospace, formatBytes } = require("../king"),
  fs = require("fs"),
  axios = require("axios"),
  BOT_START_TIME = Date.now(),
  { totalmem: totalMemoryBytes, freemem: freeMemoryBytes } = require("os"),
  moment = require("moment-timezone"),
  more = String.fromCharCode(8206),
  readmore = more.repeat(4001),
  ram = `${formatBytes(freeMemoryBytes)}/${formatBytes(totalMemoryBytes)}`;
const { mrxd } = require('../king/mrxd');
const { sendButtons, sendInteractiveMessage } = require("malvin-btns");
const { fetchPlayer } = require('../king/rpg/db');
const { getRank } = require('../king/rpg/ranks');
const { fancy } = require('../king/fancyFont');

// PING Command
mxd(
  {
    pattern: "ping",
    aliases: ["pi", "p"],
    react: "⚡",
    category: "general",
    description: "Check bot response speed",
  },
  async (from, Malvin, conText) => {
    const {
      react,
      newsletterUrl,
      botFooter,
      botPrefix,
    } = conText;

    const startTime = process.hrtime();
    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(80 + Math.random() * 420)),
    );
    const elapsed = process.hrtime(startTime);
    const responseTime = Math.floor(elapsed[0] * 1000 + elapsed[1] / 1000000);

    await sendButtons(Malvin, from, {
      title: "",
      text: `↠speed ⚡ \`${responseTime}ms\``,
      footer: `> *${botFooter}*`,
      buttons: [
        { id: `${botPrefix}uptime`, text: "⏱️ Uptime" },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "📢 Channel",
            url: newsletterUrl,
          }),
        },
      ],
    }, { quoted: mrxd });

    await react("✅");
  },
);

// UPTIME Command
mxd(
  {
    pattern: "uptime",
    aliases: ["up"],
    react: "⏳",
    category: "general",
    description: "Check bot uptime status",
  },
  async (from, Malvin, conText) => {
    const {
      react,
      newsletterUrl,
      botFooter,
      botPrefix,
    } = conText;

    const uptimeMs = Date.now() - BOT_START_TIME;
    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

    await sendButtons(Malvin, from, {
      title: `${fancy("Bot's Speed", "mono")}`,
      text: `↠${fancy("Ping", "mono")} ⏱️ \`${days}${fancy("d", "mono")} ${hours}${fancy("h", "mono")} ${minutes}${fancy("m", "mono")} ${seconds}${fancy("s", "mono")}\``,
      footer: `> *${botFooter}*`,
      buttons: [
        { id: `${botPrefix}ping`, text: `⚡ ${fancy("ping", "mono")}` },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "📢 Channel",
            url: newsletterUrl,
          }),
        },
      ],
    }, { quoted: mrxd });

    await react("✅");
  },
);

// BOTSTATS Command
mxd(
  {
    pattern: "botstats",
    aliases: ["status", "botinfo"],
    react: "📊",
    category: "general",
    description: "Show complete bot statistics",
  },
  async (from, Malvin, conText) => {
    const {
      react,
      botFooter,
      botPrefix,
      newsletterUrl,
      botName,
    } = conText;

    const startTime = process.hrtime();
    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(80 + Math.random() * 420)),
    );
    const elapsed = process.hrtime(startTime);
    const ping = Math.floor(elapsed[0] * 1000 + elapsed[1] / 1000000);

    const uptimeMs = Date.now() - BOT_START_TIME;
    const seconds = Math.floor((uptimeMs / 1000) % 60);
    const minutes = Math.floor((uptimeMs / (1000 * 60)) % 60);
    const hours = Math.floor((uptimeMs / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));

    await sendButtons(Malvin, from, {
      title: "",
      text: `╭══〘〘 *${botName}* 〙〙═⊷\n│↠ ⚡ ${fancy("ping", "smallcaps")}: \`${ping}${fancy("m", "mono")}s\`\n│↠ ⏱️ ${fancy("uptime", "smallcaps")}: \`${days}${fancy("d", "mono")} ${hours}${fancy("h", "mono")} ${minutes}${fancy("m", "mono")} ${seconds}${fancy("s", "mono")}\`\n╰═════════════════⊷`,
      footer: `> *${botFooter}*`,
      buttons: [
        { id: `${botPrefix}ping`, text: `🏓 ${fancy("ping", "mono")}` },
        { id: `${botPrefix}uptime`, text: `⏱️ ${fancy("uptime", "mono")}` },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "📢 Channel",
            url: newsletterUrl,
          }),
        },
      ],
    }, { quoted: mrxd });

    await react("✅");
  },
);

// REPORT Command
mxd(
  {
    pattern: "report",
    aliases: ["request"],
    react: "💫",
    description: "Request New Features.",
    category: "owner",
  },
  async (from, Malvin, conText) => {
    const { mek, q, sender, react, pushName, botPrefix, isSuperUser, reply } =
      conText;
    const reportedMessages = {};
    const devlopernumber = "263714757857";
    try {
      if (!isSuperUser) return reply("*Owner Only Command*");
      if (!q)
        return reply(
          `Example: ${botPrefix}request hi dev downloader commands are not working`,
        );
      const messageId = mek.key.id;
      if (reportedMessages[messageId]) {
        return reply(
          "This report has already been forwarded to the owner. Please wait for a response.",
        );
      }
      reportedMessages[messageId] = true;
      const textt = `*| REQUEST/REPORT |*`;
      const teks1 = `\n\n*User*: @${sender.split("@")[0]}\n*Request:* ${q}`;
      Malvin.sendMessage(
        devlopernumber + "@s.whatsapp.net",
        {
          text: textt + teks1,
          mentions: [sender],
        },
        {
          quoted: mrxd,
        },
      );
      reply(
        `T${fancy("hank you for your report", "smallcaps")}. I${fancy("t has been forwarded to the owner", "smallcaps")}. P${fancy("lease wait for a response", "smallcaps")}.`,
      );
      await react("✅");
    } catch (e) {
      reply(e);
      console.log(e);
    }
  },
);

// MENU Command (NEW - Dropdown style - now default)
mxd(
  {
    pattern: "menu",
    aliases: ["help", "men", "allmenu"],
    react: "💙",
    category: "general",
    description: "Interactive menu with category dropdown",
  },
  async (from, Malvin, conText) => {
    const {
      sender,
      react,
      pushName,
      botPic,
      botName,
      botFooter,
      botPrefix,
      newsletterUrl,
      timeZone,
      malvinRepo,
      reply,
    } = conText;

    try {
      const fetchGitHubForks = async () => {
        try {
          const response = await axios.get(`https://api.github.com/repos/${malvinRepo}`);
          return response.data.forks_count || 'N/A';
        } catch (e) {
          return 'N/A';
        }
      };

      const totalUsers = await fetchGitHubForks();

      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const regularCmds = commands.filter((c) => c.pattern && !c.on && !c.dontAddCommandList);
      const bodyCmds = commands.filter((c) => c.pattern && c.on === "body" && !c.dontAddCommandList);
      const totalCommands = regularCmds.length + bodyCmds.length;

      const rpgPlayer = await fetchPlayer(sender).catch(() => null);
      const displayName = rpgPlayer?.username || pushName;
      const { rankName } = rpgPlayer ? getRank(rpgPlayer.level, rpgPlayer.jid) : { rankName: 'Unranked' };
      const rpgLevel = rpgPlayer?.level ?? '—';
      const rpgXp = rpgPlayer ? `${rpgPlayer.exp.toLocaleString()}` : '—';
      const rpgAlign = rpgPlayer?.alignment ?? 'Neutral';
      const rpgBlood = rpgPlayer?.bloodline ?? '—';
      const alignEmoji = { Light: '☀️', Chaos: '🌑', Dark: '🌒', Neutral: '⚖️' }[rpgAlign] || '⚖️';

      const categoryEmojis = {
        ai: "🤖",
        "ai image": "🖌️",
        "ai-image": "🖌️",
        aiimage: "🖌️",
        anime: "🎌",
        canvas: "🎨",
        combat: "⚔️",
        converter: "🔄",
        downloader: "⬇️",
        economy: "💰",
        exploration: "🗺️",
        faker: "🎭",
        fun: "🎉",
        gambling: "🎰",
        game: "🎮",
        gathering: "🌾",
        general: "📜",
        group: "👥",
        info: "ℹ️",
        notes: "📝",
        nsfw: "🔞",
        origin: "🧬",
        owner: "👑",
        progression: "📈",
        random: "🎲",
        reaction: "😊",
        rpg: "🏆",
        search: "🔍",
        social: "💬",
        sports: "⚽",
        stalk: "👀",
        sticker: "🏷️",
        survival: "🍖",
        tools: "🔧",
        uploader: "☁️",
        utility: "⚙️",
      };

      const categorized = commands.reduce((menu, cmd) => {
        if (cmd.pattern && !cmd.dontAddCommandList) {
          const category = cmd.category || "general";
          if (!menu[category]) menu[category] = [];
          menu[category].push({
            pattern: cmd.pattern,
            isBody: cmd.on === "body",
          });
        }
        return menu;
      }, {});

      const sortedCategories = Object.keys(categorized).sort();
      const rows = [];
      
      for (const cat of sortedCategories) {
        const cmdCount = categorized[cat].length;
        const emoji = categoryEmojis[cat.toLowerCase()] || "📁";
        rows.push({
          id: `menu_${cat}`,
          title: `${emoji} ${cat.toUpperCase()}`,
          description: `${cmdCount} command${cmdCount !== 1 ? 's' : ''}`,
        });
      }

      const sections = [];
      const chunkSize = 10;
      for (let i = 0; i < rows.length; i += chunkSize) {
        sections.push({
          title: i === 0 ? "🌸 CATEGORIES" : "📁 MORE",
          rows: rows.slice(i, i + chunkSize),
        });
      }

      let menuText = `╭══〘〘 \`🤖 ${monospace(botName)}\` 〙〙═⊷
│↠👤 ${fancy("user", "smallcaps")}: ${monospace(displayName)}
│↠🏅 ${fancy("rank", "smallcaps")}: ${monospace(rankName)}  
│↠⭐ Lv: ${rpgLevel}
│↠✨ x${fancy("p", "smallcaps")}: ${monospace(rpgXp)}
│↠${alignEmoji} ${fancy("align", "smallcaps")}: ${monospace(rpgAlign)}
│↠🩸${fancy("bloodline", "smallcaps")}: ${monospace(rpgBlood)}
├───────────
│↠✒️ ${fancy("prefi", "smallcaps")}x: [ ${monospace(botPrefix)} ]
│↠🧩 ${fancy("cmd", "smallcaps")}s: ${monospace(totalCommands.toString())}
│↠⏱️ ${fancy("uptime", "smallcaps")}: ${monospace(uptime)}
│↠⏰ ${fancy("time", "smallcaps")}: ${monospace(time)}
│↠📅 ${fancy("date", "smallcaps")}: ${monospace(date)}
│↠👥 ${fancy("user", "smallcaps")}s: ${monospace(totalUsers.toString())}
╰═════════════════⊷

📌 *Select a category from the view cmds*
`;

const sendWithDropdown = async (title, text) => {
  await sendInteractiveMessage(Malvin, from, {
    title: title,
    text: text,
    footer: `> © MALVIN ${fancy("XD", "sansBold")} | ${fancy("categorie", "smallcaps")}s`,
    image: { url: botPic },
    interactiveButtons: [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: `📂 ${fancy("view cmd", "smallcaps")}s`,
          sections: sections,
        }),
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "📢 Channel",
          url: newsletterUrl,
        }),
      },
    ],
  }, { quoted: mrxd });  // ← ADD THIS
};

      await sendWithDropdown("📋 MENU", menuText);
      await react("📋");

      const handleCategorySelect = async (event) => {
        const messageData = event.messages[0];
        if (!messageData?.message) return;

        let selectedId = null;
        
        if (messageData.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
          try {
            const parsed = JSON.parse(messageData.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            selectedId = parsed?.id;
          } catch (e) {}
        }

        if (!selectedId?.startsWith("menu_")) return;
        if (messageData.key?.remoteJid !== from) return;

        const category = selectedId.replace("menu_", "");
        const cmds = categorized[category] || [];
        const emoji = categoryEmojis[category.toLowerCase()] || "📁";
        
        let cmdText = `╭══〘〘 *${emoji} ${category.toUpperCase()}* 〙〙═⊷\n`;
        cmdText += `│  📝 *${cmds.length} commands*\n`;
        cmdText += `├────────────⊷\n`;
        
        cmds.slice(0, 50).forEach((cmd, idx) => {
          const prefix = cmd.isBody ? "" : botPrefix;
          cmdText += `│  ${idx + 1}. \`${prefix}${cmd.pattern}\`\n`;
        });
        
        if (cmds.length > 50) {
          cmdText += `│\n│  ⚠️ *+${cmds.length - 50} more*\n`;
        }
        cmdText += `╰═════════════════⊷\n`;
        cmdText += `\n📌 *Select another category from the view cmds*`;

        await sendWithDropdown(`${emoji} ${category.toUpperCase()}`, cmdText);
      };

      Malvin.ev.on("messages.upsert", handleCategorySelect);

    } catch (e) {
      console.error("Menu Error:", e);
      reply(`❌ Error: ${e.message}`);
    }
  },
);

// MENU2 Command (OLD - Full list style - backup)
mxd(
  {
    pattern: "menu2",
    aliases: ["help2", "men2"],
    react: "🪀",
    category: "general",
    description: "Fetch bot main menu (full list)",
  },
  async (from, Malvin, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botMode,
      botVersion,
      botName,
      botFooter,
      timeZone,
      botPrefix,
      newsletterJid,
      newsletterUrl,
      reply,
      malvinRepo,
      ownerName,
    } = conText;
    try {
      const fetchGitHubForks = async () => {
        try {
          const response = await axios.get(`https://api.github.com/repos/${malvinRepo}`);
          return response.data.forks_count || 'N/A';
        } catch (e) {
          console.error('Error fetching GitHub forks:', e);
          return 'N/A';
        }
      };

      const totalUsers = await fetchGitHubForks();

      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const regularCmds = commands.filter((c) => c.pattern && !c.on && !c.dontAddCommandList);
      const bodyCmds = commands.filter((c) => c.pattern && c.on === "body" && !c.dontAddCommandList);
      const totalCommands = regularCmds.length + bodyCmds.length;

      const rpgPlayer = await fetchPlayer(sender).catch(() => null);
      const displayName = rpgPlayer?.username || pushName;
      const { rankName } = rpgPlayer ? getRank(rpgPlayer.level, rpgPlayer.jid) : { rankName: 'Unranked' };
      const rpgLevel    = rpgPlayer?.level ?? '—';
      const rpgXp       = rpgPlayer ? `${rpgPlayer.exp.toLocaleString()}` : '—';
      const rpgAlign    = rpgPlayer?.alignment ?? 'Neutral';
      const rpgBlood    = rpgPlayer?.bloodline ?? '—';
      const alignEmoji  = { Light: '☀️', Chaos: '🌑', Dark: '🌒', Neutral: '⚖️' }[rpgAlign] || '⚖️';

      const categorized = commands.reduce((menu, mxd) => {
        if (mxd.pattern && !mxd.dontAddCommandList) {
          if (!menu[mxd.category]) menu[mxd.category] = [];
          menu[mxd.category].push({
            pattern: mxd.pattern,
            isBody: mxd.on === "body",
          });
        }
        return menu;
      }, {});

      const sortedCategories = Object.keys(categorized).sort((a, b) =>
        a.localeCompare(b),
      );
      for (const cat of sortedCategories) {
        categorized[cat].sort((a, b) => a.pattern.localeCompare(b.pattern));
      }

      let header = `╭══〘〘 \`🤖 ${monospace(botName)}\` 〙〙═⊷
│↠👤 ${fancy("user", "smallcaps")}: ${monospace(displayName)}
│↠🏅 ${fancy("rank", "smallcaps")}: ${monospace(rankName)}  
│↠⭐ Lv.${rpgLevel}
│↠✨ x${fancy("p", "smallcaps")}: ${monospace(rpgXp)}
│↠${alignEmoji} ${fancy("align", "smallcaps")}: ${monospace(rpgAlign)}
│↠🩸${fancy("bloodline", "smallcaps")}: ${monospace(rpgBlood)}
├───────────
│↠✒️ ${fancy("prefi", "smallcaps")}x: [ ${monospace(botPrefix)} ]
│↠🧩 ${fancy("cmd", "smallcaps")}s: ${monospace(totalCommands.toString())}
│↠⏱️ ${fancy("uptime", "smallcaps")}: ${monospace(uptime)}
│↠⏰ ${fancy("time", "smallcaps")}: ${monospace(time)}
│↠📅 ${fancy("date", "smallcaps")}: ${monospace(date)}
│↠👥 ${fancy("user", "smallcaps")}s: ${monospace(totalUsers.toString())}
╰═══════════════⊷\n${readmore}\n`;

      const formatCategory = (category, mxds) => {
        const categoryEmojis = {
          "ai": "🤖",
          "converter": "🔄",
          "downloader": "⬇️",
          "game": "🎮",
          "general": "📜",
          "group": "👥",
          "logo": "🎨",
          "notes": "📝",
          "owner": "👑",
          "religion": "⛪",
          "search": "🔍",
          "sports": "⚽",
          "tempmail": "📧",
          "tools": "🔧",
          "uploader": "☁️",
          "utility": "⚙️",
          "rpg":        "⚔️",
          "combat":     "⚔️",
          "gathering":  "🌾",
          "exploration":"🗺️",
          "survival":   "🍖",
          "progression":"📈",
          "gambling":   "🎰",
          "economy":    "💰",
          "social":     "👥",
          "origin":     "🧬",
          "world":      "🌍",
          "roles":      "🎭",
          "pet":        "🐾",
          "quests":     "📋",
          "owner":      "👑"
        };
        
        const emoji = categoryEmojis[category.toLowerCase()] || "📁";
        const title = `╭─「 ${emoji} *${category.toUpperCase()}* 」\n`;
        const body = mxds
          .map((mxd) => {
            const prefix = mxd.isBody ? "" : botPrefix;
            return `│  ◈  \`${prefix + mxd.pattern}\``;
          })
          .join("\n");
        const footer = `╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄`;
        return `${title}${body}\n${footer}`;
      };

      let menu = header;
      for (const category of sortedCategories) {
        menu += formatCategory(category, categorized[category]) + "\n";
      }

      let channelUrl = newsletterUrl;
      if (!channelUrl && newsletterJid) {
        const channelId = newsletterJid.split('@')[0];
        channelUrl = `https://whatsapp.com/channel/${channelId}`;
      }

      const fallbackImage = "https://i.ibb.co/zHhMyRT3/malvin-xd.jpg";
      const validBotPic = botPic && botPic !== '' ? botPic : fallbackImage;

      const buttons = [
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "📢 Join Channel",
            url: channelUrl || "https://whatsapp.com/channel/0029VbB3YxTDJ6H15SKoBv3S",
          }),
        },
      ];

      await sendButtons(Malvin, from, {
        title: botName,
        text: `${menu.trim()}\n`,
        footer: botFooter,
        image: { url: validBotPic },
        buttons: buttons,
      }, { quoted: mrxd });

      await react("✅");
    } catch (e) {
      console.error(e);
      reply(`${e}`);
    }
  },
);

// MENU3 Command - Numbered category selection
mxd(
  {
    pattern: "menu3",
    aliases: ["menu3", "help3", "men3"],
    react: "🎯",
    category: "general",
    description: "Menu with numbered categories (reply with number)",
  },
  async (from, Malvin, conText) => {
    const {
      sender,
      react,
      pushName,
      botPic,
      botName,
      botFooter,
      botMode,
      botVersion,
      botPrefix,
      timeZone,
      malvinRepo,
      newsletterJid,
      newsletterUrl,
      reply,
      ownerName,
    } = conText;

    try {
      // Fetch GitHub forks
      const fetchGitHubForks = async () => {
        try {
          const response = await axios.get(`https://api.github.com/repos/${malvinRepo}`);
          return response.data.forks_count || 'N/A';
        } catch (e) {
          return 'N/A';
        }
      };

      const totalUsers = await fetchGitHubForks();

      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const uptime = formatUptime(process.uptime());
      const regularCmds = commands.filter((c) => c.pattern && !c.on && !c.dontAddCommandList);
      const bodyCmds = commands.filter((c) => c.pattern && c.on === "body" && !c.dontAddCommandList);
      const totalCommands = regularCmds.length + bodyCmds.length;

      // RPG Player Data
      const rpgPlayer = await fetchPlayer(sender).catch(() => null);
      const displayName = rpgPlayer?.username || pushName;
      const { rankName } = rpgPlayer ? getRank(rpgPlayer.level, rpgPlayer.jid) : { rankName: 'Unranked' };

      // Category mapping for numbers 1-10
      const categoryMap = {
        "1": { name: `${fancy("ai & chat tool", "smallcaps")}s`, emoji: "🤖", categories: ["ai", "aiimage"] },
        "2": { name: `${fancy("download manager", "smallcaps")}`, emoji: "📥", categories: ["downloader"] },
        "3": { name: `${fancy("fun & game", "smallcaps")}s`, emoji: "🎮", categories: ["fun", "game", "gambling", "rpg", "combat"] },
        "4": { name: `${fancy("group management", "smallcaps")}`, emoji: "💬", categories: ["group"] },
        "5": { name: `${fancy("utilities & tool", "smallcaps")}s`, emoji: "🛠️", categories: ["utility", "tools", "converter", "uploader"] },
        "6": { name: `${fancy("media & sticker", "smallcaps")}s`, emoji: "🎨", categories: ["sticker", "media", "canvas", "reaction"] },
        "7": { name: `${fancy("bot setting", "smallcaps")}s`, emoji: "⚙️", categories: ["owner"] },
        "8": { name: `${fancy("owner cmd", "smallcaps")}s`, emoji: "👑", categories: ["origin"] },
        "9": { name: `${fancy("text & effect", "smallcaps")}s`, emoji: "📝", categories: ["notes", "faker"] },
        "10": { name: `${fancy("image & filter", "smallcaps")}s`, emoji: "🖼️", categories: ["logo", "search", "stalk"] }
      };

      // Collect all commands by category
      const categorized = commands.reduce((menu, cmd) => {
        if (cmd.pattern && !cmd.dontAddCommandList) {
          const category = cmd.category || "general";
          if (!menu[category]) menu[category] = [];
          menu[category].push({
            pattern: cmd.pattern,
            isBody: cmd.on === "body",
          });
        }
        return menu;
      }, {});

      // menu 
      const menuText = `╭─➣ *🤖 ${botName}*
│↠👤 ${fancy("owner", "smallcaps")}: ${ownerName}
│↠👋 ${fancy("user", "smallcaps")}: ${displayName}
│↠🏅 ${fancy("rank", "smallcaps")}: ${rankName}
│↠⏰ ${fancy("time", "smallcaps")}: ${time}
│↠📅 ${fancy("date", "smallcaps")}: ${date}
│↠🌍 ${fancy("mode", "smallcaps")}: ${botMode}
│↠✒️ ${fancy("prefi", "smallcaps")}x: [ ${botPrefix} ]
│↠🧩 ${fancy("cmd", "smallcaps")}s: ${totalCommands}
│↠🚀 ${fancy("version", "smallcaps")}: ${botVersion}
│↠👥 ${fancy("user", "smallcaps")}s: ${totalUsers}
│↠✍️ ${fancy("author", "smallcaps")}: ${fancy("MR XDKING", "mono")}
╰──────────➣

╭─「 📁 ${fancy("category list", "smallcaps")} 」
│ ➊  🤖 ${fancy("ai & chat tool", "smallcaps")}s
│ ➋  📥 ${fancy("download manager", "smallcaps")}
│ ➌  🎮 ${fancy("fun & game", "smallcaps")}s
│ ➍  💬 ${fancy("group management", "smallcaps")}
│ ➎  🛠️ ${fancy("utilities & tool", "smallcaps")}s
│ ➏  🎨 ${fancy("media & sticker", "smallcaps")}s
│ ➐  ⚙️ ${fancy("bot setting", "smallcaps")}s
│ ➑  👑 ${fancy("owner cmd", "smallcaps")}s
│ ➒  📝 ${fancy("text & effect", "smallcaps")}s
│ ➓  🖼️ ${fancy("image & filter", "smallcaps")}s
╰──────➣➣

💡 *Reply with number (1-10) to see commands*`;

      // Send menu
      await sendButtons(Malvin, from, {
        title: `📋 ${fancy("menu", "smallcaps")} 3`,
        text: menuText,
        footer: botFooter,
        image: { url: botPic },
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "📢 Channel",
              url: newsletterUrl,
            }),
          },
        ],
      }, { quoted: mrxd });

      await react("🎯");

      // Handle number replies
      const handleNumberReply = async (event) => {
        const messageData = event.messages[0];
        if (!messageData?.message) return;

        const isFromSameChat = messageData.key?.remoteJid === from;
        if (!isFromSameChat) return;

        // Get the reply text
        let replyText = messageData.message?.conversation || 
                        messageData.message?.extendedTextMessage?.text;
        
        if (!replyText) return;

        // Check if reply is a number 1-10
        const num = replyText.trim();
        if (!categoryMap[num]) return;

        const selected = categoryMap[num];
        const emoji = selected.emoji;
        const categoryName = selected.name;
        
        // Collect all commands from the categories in this group
        let allCmds = [];
        for (const cat of selected.categories) {
          if (categorized[cat]) {
            allCmds = [...allCmds, ...categorized[cat]];
          }
        }

        if (allCmds.length === 0) {
          await Malvin.sendMessage(from, { text: `❌ No commands found for ${categoryName}` }, { quoted: mrxd });
          return;
        }

        // Build command list
        let cmdText = `╭─「 ${emoji} *${categoryName}* 」\n`;
        cmdText += `│  📝 *${allCmds.length} commands*\n`;
        cmdText += `├───────────⊷\n`;
        
        allCmds.slice(0, 40).forEach((cmd, idx) => {
          const prefix = cmd.isBody ? "" : botPrefix;
          cmdText += `│  ${idx + 1}. \`${prefix}${cmd.pattern}\`\n`;
        });
        
        if (allCmds.length > 40) {
          cmdText += `│\n│  ⚠️ *+${allCmds.length - 40} more*\n`;
        }
        cmdText += `╰────────────⊷\n`;
        cmdText += `\n> ${fancy("POWERED BY MR XD", "mono")}`;

        await Malvin.sendMessage(from, { text: cmdText }, { quoted: mrxd });
      };

      Malvin.ev.on("messages.upsert", handleNumberReply);
      
      setTimeout(() => {
        Malvin.ev.off("messages.upsert", handleNumberReply);
      }, 120000);

    } catch (e) {
      console.error("Menu3 Error:", e);
      reply(`❌ Error: ${e.message}`);
    }
  },
);

// MENU4 - Category selection menu
mxd(
  {
    pattern: "menu4",
    aliases: ["menu4", "help4", "men4"],
    react: "⌨️",
    category: "general",
    description: "Shows category list - then use .categorymenu",
  },
  async (from, Malvin, conText) => {
    const {
      sender,
      react,
      pushName,
      botPic,
      botName,
      botFooter,
      botPrefix,
      timeZone,
      malvinRepo,
      reply,
      mrxd,
      ownerName,
      newsletterUrl,
    } = conText;

    try {
      const fetchGitHubForks = async () => {
        try {
          const response = await axios.get(`https://api.github.com/repos/${malvinRepo}`);
          return response.data.forks_count || 'N/A';
        } catch (e) {
          return 'N/A';
        }
      };

      const totalUsers = await fetchGitHubForks();

      function formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 60 * 60));
        seconds %= 24 * 60 * 60;
        const hours = Math.floor(seconds / (60 * 60));
        seconds %= 60 * 60;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }

      const now = new Date();
      const date = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now);

      const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);

      const regularCmds = commands.filter((c) => c.pattern && !c.on && !c.dontAddCommandList);
      const bodyCmds = commands.filter((c) => c.pattern && c.on === "body" && !c.dontAddCommandList);
      const totalCommands = regularCmds.length + bodyCmds.length;

      const rpgPlayer = await fetchPlayer(sender).catch(() => null);
      const displayName = rpgPlayer?.username || pushName;
      const { rankName } = rpgPlayer ? getRank(rpgPlayer.level, rpgPlayer.jid) : { rankName: 'Unranked' };

      const menuText = `╭─➣ *🤖 ${botName}*
│↠👤 ${fancy("owner", "smallcaps")}: ${ownerName}
│↠👋 ${fancy("user", "smallcaps")}: ${displayName}
│↠🏅 ${fancy("rank", "smallcaps")}: ${rankName}
│↠⏰ ${fancy("time", "smallcaps")}: ${time}
│↠📅 ${fancy("date", "smallcaps")}: ${date}
│↠✒️ ${fancy("prefi", "smallcaps")}x: [ ${botPrefix} ]
│↠🧩 ${fancy("cmd", "smallcaps")}s: ${totalCommands}
│↠👥 ${fancy("user", "smallcaps")}s: ${totalUsers}
╰──────────➣

╭─「 📁 ${fancy("category menu", "smallcaps")}s 」
│ ➊  🤖 .aimenu
│ ➋  📥 .downloadermenu
│ ➌  🎮 .funggmenu
│ ➍  💬 .groupmenu
│ ➎  🛠️ .toolsmenu
│ ➏  🎨 .mediamenu
│ ➐  ⚙️ .ownersmenu
│ ➑  👑 .originmenu
│ ➒  📝 .textmenu
│ ➓  🖼️ .imagemenu
╰──────➣➣

💡 *Type the command above to see commands*
📌 *Example:* .aimenu, .downloadermenu
`;

      await sendButtons(Malvin, from, {
        text: menuText,
        footer: botFooter,
        image: { url: botPic },
        buttons: [
          { id: `${botPrefix}menu`, text: `💙 ${fancy("menu", "smallcaps")}` },
          { id: `${botPrefix}menu2`, text: `🩵 ${fancy("menu", "smallcaps")} 2` },
          { id: `${botPrefix}menu3`, text: `💚 ${fancy("menu", "smallcaps")} 3` },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: `📢 ${fancy("channel", "smallcaps")}`,
              url: newsletterUrl,
            }),
          },
        ],
      }, { quoted: mrxd });

      await react("⌨️");

    } catch (e) {
      console.error("Menu4 Error:", e);
      reply(`❌ Error: ${e.message}`);
    }
  },
);

// ==================== CATEGORY MENU COMMANDS WITH NAVIGATION ====================

// Helper function to get category commands
const getCategoryCommands = (categoryNames) => {
  const categorized = commands.reduce((menu, cmd) => {
    if (cmd.pattern && !cmd.dontAddCommandList) {
      const category = cmd.category || "general";
      if (!menu[category]) menu[category] = [];
      menu[category].push({
        pattern: cmd.pattern,
        isBody: cmd.on === "body",
      });
    }
    return menu;
  }, {});

  let allCmds = [];
  for (const cat of categoryNames) {
    if (categorized[cat]) {
      allCmds = [...allCmds, ...categorized[cat]];
    }
  }
  return allCmds;
};

// Helper function to send category response with navigation buttons
const sendCategoryResponse = async (Malvin, from, title, emoji, cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd) => {
  let text = `╭─「 ${emoji} *${title}* 」\n`;
  text += `│  📝 *${cmds.length} commands*\n`;
  text += `├──────────⊷\n`;
  
  cmds.slice(0, 50).forEach((cmd, idx) => {
    const prefix = cmd.isBody ? "" : botPrefix;
    text += `│  ${idx + 1}. \`${prefix}${cmd.pattern}\`\n`;
  });
  
  if (cmds.length > 50) {
    text += `│\n│  ⚠️ *+${cmds.length - 50} more*\n`;
  }
  text += `╰──────────⊷\n`;
  text += `\n💡 Tap a button below to see another category`;

  await sendButtons(Malvin, from, {
    text: text,
    footer: botFooter,
    image: { url: botPic },
    buttons: [
      { id: `${botPrefix}aimenu`, text: "🤖 AI" },
      { id: `${botPrefix}downloadermenu`, text: `📥 ${fancy("dl", "smallcaps")}` },
      { id: `${botPrefix}funggmenu`, text: `🎮 ${fancy("fun", "smallcaps")}` },
      { id: `${botPrefix}groupmenu`, text: `💬 ${fancy("group", "smallcaps")}s` },
      { id: `${botPrefix}toolsmenu`, text: `🛠️ ${fancy("tool", "smallcaps")}s` },
      { id: `${botPrefix}mediamenu`, text: `🎨 ${fancy("media", "smallcaps")}` },
      { id: `${botPrefix}ownersmenu`, text: `⚙️ ${fancy("owner", "smallcaps")}` },
      { id: `${botPrefix}originmenu`, text: `👑 ${fancy("origin", "smallcaps")}` },
      { id: `${botPrefix}textmenu`, text: `📝 ${fancy("text", "smallcaps")}` },
      { id: `${botPrefix}imagemenu`, text: `🖼️ ${fancy("image", "smallcaps")}` },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "📢 Channel",
          url: newsletterUrl,
        }),
      },
    ],
  }, { quoted: mrxd });
};

// 1. .aimenu - AI & AI IMAGE commands combined
mxd(
  {
    pattern: "aimenu",
    aliases: ["aimenu"],
    react: "🤖",
    category: "menu",
    description: "Show all AI & AI Image commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["ai", "aiimage"]);
    
    if (cmds.length === 0) {
      return reply("❌ No AI commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "AI & AI IMAGE COMMANDS", "🤖", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 2. .downloadermenu - Downloader commands
mxd(
  {
    pattern: "downloadermenu",
    aliases: ["downloadermenu"],
    react: "📥",
    category: "menu",
    description: "Show all downloader commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["downloader"]);
    
    if (cmds.length === 0) {
      return reply("❌ No downloader commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "DOWNLOADER COMMANDS", "📥", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 3. .funggmenu - Fun & Games commands
mxd(
  {
    pattern: "funggmenu",
    aliases: ["funggmenu"],
    react: "🎮",
    category: "menu",
    description: "Show all fun & games commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["fun", "game", "gambling", "rpg", "combat"]);
    
    if (cmds.length === 0) {
      return reply("❌ No fun & games commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "FUN & GAMES COMMANDS", "🎮", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 4. .groupmenu - Group Management commands
mxd(
  {
    pattern: "groupmenu",
    aliases: ["groupmenu"],
    react: "💬",
    category: "menu",
    description: "Show all group management commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["group"]);
    
    if (cmds.length === 0) {
      return reply("❌ No group management commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "GROUP MANAGEMENT COMMANDS", "💬", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 5. .toolsmenu - Utilities & Tools commands
mxd(
  {
    pattern: "toolsmenu",
    aliases: ["toolsmenu"],
    react: "🛠️",
    category: "menu",
    description: "Show all utilities & tools commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["utility", "tools", "converter", "uploader"]);
    
    if (cmds.length === 0) {
      return reply("❌ No utilities & tools commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "UTILITIES & TOOLS COMMANDS", "🛠️", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 6. .mediamenu - Media & Stickers commands
mxd(
  {
    pattern: "mediamenu",
    aliases: ["mediamenu"],
    react: "🎨",
    category: "menu",
    description: "Show all media & stickers commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["sticker", "media", "canvas", "reaction"]);
    
    if (cmds.length === 0) {
      return reply("❌ No media & stickers commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "MEDIA & STICKERS COMMANDS", "🎨", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 7. .ownersmenu - Bot Settings commands
mxd(
  {
    pattern: "ownersmenu",
    aliases: ["ownersmenu"],
    react: "⚙️",
    category: "menu",
    description: "Show all bot settings commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["owner"]);
    
    if (cmds.length === 0) {
      return reply("❌ No bot settings commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "BOT SETTINGS COMMANDS", "⚙️", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 8. .originmenu - Owner commands
mxd(
  {
    pattern: "originmenu",
    aliases: ["originmenu"],
    react: "👑",
    category: "menu",
    description: "Show all owner commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["origin"]);
    
    if (cmds.length === 0) {
      return reply("❌ No owner commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "OWNER COMMANDS", "👑", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 9. .textmenu - Text & Effects commands
mxd(
  {
    pattern: "textmenu",
    aliases: ["textmenu"],
    react: "📝",
    category: "menu",
    description: "Show all text & effects commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["notes", "faker"]);
    
    if (cmds.length === 0) {
      return reply("❌ No text & effects commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "TEXT & EFFECTS COMMANDS", "📝", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// 10. .imagemenu - Image & Filters commands
mxd(
  {
    pattern: "imagemenu",
    aliases: ["imagemenu"],
    react: "🖼️",
    category: "menu",
    description: "Show all image & filters commands",
  },
  async (from, Malvin, conText) => {
    const { reply, botPrefix, botFooter, botPic, newsletterUrl, mrxd } = conText;
    const cmds = getCategoryCommands(["logo", "search", "stalk"]);
    
    if (cmds.length === 0) {
      return reply("❌ No image & filters commands found");
    }
    
    await sendCategoryResponse(Malvin, from, "IMAGE & FILTERS COMMANDS", "🖼️", cmds, botPrefix, botFooter, botPic, newsletterUrl, mrxd);
  },
);

// RETURN Command
mxd(
  {
    pattern: "return",
    aliases: ["details", "det", "ret"],
    react: "⚡",
    category: "owner",
    description:
      "Displays the full raw quoted message using Baileys structure.",
  },
  async (from, Malvin, conText) => {
    const {
      mek,
      reply,
      react,
      quotedMsg,
      isSuperUser,
      botName,
      botFooter,
      newsletterJid,
      newsletterUrl,
    } = conText;

    if (!isSuperUser) {
      return reply(`Owner Only Command!`);
    }

    if (!quotedMsg) {
      return reply(`Please reply to/quote a message`);
    }

    try {
      const jsonString = JSON.stringify(quotedMsg, null, 2);
      const chunks = jsonString.match(/[\s\S]{1,100000}/g) || [];

      for (const chunk of chunks) {
        const formattedMessage = `\`\`\`\n${chunk}\n\`\`\``;

        await sendButtons(Malvin, from, {
          title: "",
          text: formattedMessage,
          footer: `> *${botFooter}*`,
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "Copy",
                copy_code: formattedMessage,
              }),
            },
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "WaChannel",
                url: newsletterUrl,
              }),
            },
          ],
        }, { quoted: mrxd });

        await react("✅");
      }
    } catch (error) {
      console.error("Error processing quoted message:", error);
      await reply(`❌ An error occurred while processing the message.`);
    }
  },
);

// REPO Command
mxd(
  {
    pattern: "repo",
    aliases: ["sc", "rep", "script"],
    react: "💙",
    category: "general",
    description: "Fetch bot script.",
  },
  async (from, Malvin, conText) => {
    const {
      mek,
      sender,
      react,
      pushName,
      botPic,
      botName,
      botFooter,
      newsletterUrl,
      ownerName,
      newsletterJid,
      malvinRepo,
    } = conText;

    const response = await axios.get(
      `https://api.github.com/repos/${malvinRepo}`,
    );
    const repoData = response.data;
    const {
      full_name,
      name,
      forks_count,
      stargazers_count,
      created_at,
      updated_at,
      owner,
    } = repoData;
    const rpgPlayer = await require('../king/rpg/db').fetchPlayer(sender).catch(() => null);
    const displayName = rpgPlayer?.username || pushName;
    
    const messageText = `╭══〘〘 *${botName}* 〙〙═⊷
│↠👋 ${fancy("hello", "smallcaps")}: ${displayName}
│↠🤖 ${fancy("bot", "smallcaps")}: ${botName}
│↠👑 ${fancy("owner", "smallcaps")}: ${ownerName}
╰═════════════════⊷

📊 *${fancy("repository info", "smallcaps")}*

│↠📁 ${fancy("name", "smallcaps")}: ${name}
│↠⭐ s${fancy("tar", "smallcaps")}s: ${stargazers_count}
│↠🍴 ${fancy("fork", "smallcaps")}s: ${forks_count}
│↠📅 ${fancy("created", "smallcaps")}: ${new Date(created_at).toLocaleDateString()}
│↠🔄 ${fancy("last updated", "smallcaps")}: ${new Date(updated_at).toLocaleDateString()}
│↠👤 ${fancy("repo owner", "smallcaps")}: ${owner.login}
╰═════════════════⊷
`;

    const dateNow = Date.now();
    await sendButtons(Malvin, from, {
      title: "",
      text: messageText,
      footer: `> *${botFooter}*`,
      image: { url: botPic },
      buttons: [
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "🌐 View Repo",
            url: `https://github.com/${malvinRepo}`,
          }),
        },
        {
          id: `repo_dl_${dateNow}`,
          text: "📥 Download Zip",
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "📢 Channel",
            url: newsletterUrl,
          }),
        },
      ],
    }, { quoted: mrxd });

    const handleResponse = async (event) => {
      const messageData = event.messages[0];
      if (!messageData?.message) return;

      const templateButtonReply =
        messageData.message?.templateButtonReplyMessage;
      if (!templateButtonReply) return;

      const selectedButtonId = templateButtonReply.selectedId;
      if (!selectedButtonId?.includes(`repo_dl_${dateNow}`)) return;

      const isFromSameChat = messageData.key?.remoteJid === from;
      if (!isFromSameChat) return;

      try {
        const zipUrl = `https://github.com/${malvinRepo}/archive/refs/heads/main.zip`;
        await Malvin.sendMessage(
          from,
          {
            document: { url: zipUrl },
            fileName: `${name}.zip`,
            mimetype: "application/zip",
          },
          { quoted: mrxd },
        );
        await react("✅");
      } catch (dlErr) {
        await Malvin.sendMessage(from, { text: "❌ Failed to download repo zip: " + dlErr.message }, { quoted: mrxd });
      }

      Malvin.ev.off("messages.upsert", handleResponse);
    };

    Malvin.ev.on("messages.upsert", handleResponse);
    setTimeout(
      () => Malvin.ev.off("messages.upsert", handleResponse),
      120000,
    );

    await react("✅");
  },
);

// SUPPORT Command
mxd(
  {
    pattern: "support",
    aliases: ["star", "fork", "github"],
    react: "⭐",
    category: "general",
    description: "Support the bot by starring and forking on GitHub",
  },
  async (from, Malvin, conText) => {
    const {
      react,
      botFooter,
      botName,
      malvinRepo,
      newsletterUrl,
      pushName,
      ownerName,
      reply,
      sender,
    } = conText;

    try {
      const response = await axios.get(`https://api.github.com/repos/${malvinRepo}`);
      const { stargazers_count, forks_count } = response.data;
      const rpgPlayer = await fetchPlayer(sender).catch(() => null);
      const displayName = rpgPlayer?.username || pushName;

      const messageText = `╭══〘〘 *${botName}* 〙〙═⊷
│↠👋 ${fancy("hi", "smallcaps")} ${displayName}
│↠👑 ${fancy("owner", "smallcaps")}: ${ownerName}
╰═════════════════⊷

🌟 *S U P P O R T* 🌟

⭐ ${fancy("current star", "smallcaps")}s: ${stargazers_count}
🍴 ${fancy("current fork", "smallcaps")}s: ${forks_count}

✨ *H${fancy("ow to support", "smallcaps")}:*
• Click ⭐ Star Repo
• Click 🍴 Fork Repo
• Share with friends

`;

      await sendButtons(Malvin, from, {
        title: "",
        text: messageText,
        footer: `> *Every star & fork helps the bot grow! 🚀*`,
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "⭐ Star Repo",
              url: `https://github.com/${malvinRepo}`,
            }),
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "🍴 Fork Repo",
              url: `https://github.com/${malvinRepo}/fork`,
            }),
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "📢 Channel",
              url: newsletterUrl,
            }),
          },
        ],
      }, { quoted: mrxd });

      await react("⭐");
    } catch (e) {
      console.error(e);
      reply(`❌ Error: ${e.message}`);
    }
  },
);

// SAVE Command
mxd(
  {
    pattern: "save",
    aliases: ["sv", "s", "sav", "."],
    react: "⚡",
    category: "owner",
    description:
      "Save messages (supports images, videos, audio, stickers, and text).",
  },
  async (from, Malvin, conText) => {
    const { mek, reply, react, sender, isSuperUser, getMediaBuffer } = conText;

    if (!isSuperUser) {
      return reply(`❌ Owner Only Command!`);
    }

    const quotedMsg =
      mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quotedMsg) {
      return reply(`⚠️ Please reply to/quote a message.`);
    }

    try {
      let mediaData;

      if (quotedMsg.imageMessage) {
        const buffer = await getMediaBuffer(quotedMsg.imageMessage, "image");
        mediaData = {
          image: buffer,
          caption: quotedMsg.imageMessage.caption || "",
        };
      } else if (quotedMsg.videoMessage) {
        const buffer = await getMediaBuffer(quotedMsg.videoMessage, "video");
        mediaData = {
          video: buffer,
          caption: quotedMsg.videoMessage.caption || "",
        };
      } else if (quotedMsg.audioMessage) {
        const buffer = await getMediaBuffer(quotedMsg.audioMessage, "audio");
        mediaData = {
          audio: buffer,
          mimetype: "audio/mp4",
        };
      } else if (quotedMsg.stickerMessage) {
        const buffer = await getMediaBuffer(
          quotedMsg.stickerMessage,
          "sticker",
        );
        mediaData = {
          sticker: buffer,
        };
      } else if (quotedMsg.documentMessage || quotedMsg.documentWithCaptionMessage?.message?.documentMessage) {
        const docMsg = quotedMsg.documentMessage || quotedMsg.documentWithCaptionMessage.message.documentMessage;
        const buffer = await getMediaBuffer(docMsg, "document");
        mediaData = {
          document: buffer,
          fileName: docMsg.fileName || "document",
          mimetype: docMsg.mimetype || "application/octet-stream",
        };
      } else if (
        quotedMsg.conversation ||
        quotedMsg.extendedTextMessage?.text
      ) {
        const text =
          quotedMsg.conversation || quotedMsg.extendedTextMessage.text;
        mediaData = {
          text: text,
        };
      } else if (quotedMsg.buttonsMessage || quotedMsg.templateMessage || quotedMsg.interactiveMessage || quotedMsg.listMessage || quotedMsg.buttonsResponseMessage || quotedMsg.templateButtonReplyMessage) {
        let text = "";
        if (quotedMsg.buttonsMessage) {
          text = quotedMsg.buttonsMessage.contentText || quotedMsg.buttonsMessage.text || "";
        } else if (quotedMsg.templateMessage?.hydratedTemplate) {
          text = quotedMsg.templateMessage.hydratedTemplate.hydratedContentText || "";
        } else if (quotedMsg.interactiveMessage?.body?.text) {
          text = quotedMsg.interactiveMessage.body.text;
        } else if (quotedMsg.listMessage) {
          text = quotedMsg.listMessage.description || quotedMsg.listMessage.title || "";
        } else if (quotedMsg.buttonsResponseMessage) {
          text = quotedMsg.buttonsResponseMessage.selectedDisplayText || "";
        } else if (quotedMsg.templateButtonReplyMessage) {
          text = quotedMsg.templateButtonReplyMessage.selectedDisplayText || "";
        }
        if (!text) {
          return reply(`❌ Could not extract text from the quoted message.`);
        }
        mediaData = {
          text: text,
        };
      } else {
        return reply(`❌ Unsupported message type.`);
      }

      await Malvin.sendMessage(sender, mediaData, { quoted: mrxd });
      await react("✅");
    } catch (error) {
      console.error("Save Error:", error);
      await reply(`❌ Failed to save the message. Error: ${error.message}`);
    }
  },
);

// CHJID Command
mxd(
  {
    pattern: "chjid",
    aliases: [
      "channeljid",
      "cid",
      "channelinfo",
      "newsletterjid",
      "newsjid",
      "newsletterinfo",
    ],
    react: "📢",
    category: "general",
    description: "Get WhatsApp Channel/Newsletter Info",
  },
  async (from, Malvin, conText) => {
    const { q, reply, react, botFooter, botPrefix, MalvinTechApi, MalvinApiKey } = conText;

    const input = q?.trim();
    if (!input) {
      await react("❌");
      return reply(
        `❌ Provide a channel link.\nUsage: *${botPrefix}chjid* https://whatsapp.com/channel/KEY`,
      );
    }

    const channelMatch = input.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
    if (!channelMatch) {
      await react("❌");
      return reply(
        "❌ Invalid channel link. Provide a valid WhatsApp channel link.\nExample: https://whatsapp.com/channel/ABC123",
      );
    }

    await react("🔍");
    const inviteKey = channelMatch[1];
    const channelUrl = `https://whatsapp.com/channel/${inviteKey}`;

    try {
      const meta = await Malvin.newsletterMetadata("invite", inviteKey);

      if (!meta || !meta.id) {
        await react("❌");
        return reply(
          "❌ Could not fetch channel info. The link may be invalid or the channel no longer exists.",
        );
      }

      const channelJid = meta.id;
      const tm = meta.thread_metadata || {};

      const name = tm.name?.text || "Unknown Channel";
      const rawDesc = tm.description?.text || "";
      const verification = tm.verification || "";
      const isVerified = verification === "VERIFIED";
      const stateType = meta.state?.type || "";
      const isActive = stateType === "ACTIVE";

      const subCount = parseInt(tm.subscribers_count || "0", 10);
      const followers =
        subCount >= 1_000_000
          ? `${(subCount / 1_000_000).toFixed(1)}M`
          : subCount >= 1_000
            ? `${(subCount / 1_000).toFixed(1)}K`
            : subCount > 0
              ? subCount.toLocaleString()
              : "N/A";

      let picUrl = null;
      try {
        const apiUrl = `https://api.giftedtech.co.ke/api/stalk/wachannel?apikey=gifted&url=${encodeURIComponent(channelUrl)}`;
        const apiRes = await axios.get(apiUrl, { timeout: 10000 });
        picUrl = apiRes.data?.result?.img || null;
      } catch (apiErr) {
        console.error("chjid pic error:", apiErr.message);
      }

      const MAX_DESC = 200;
      let descSection = "";
      if (rawDesc) {
        const trimmed = rawDesc.trim();
        if (trimmed.length > MAX_DESC) {
          const visible = trimmed.slice(0, MAX_DESC);
          const hidden = trimmed.slice(MAX_DESC);
          descSection = `\n\n📄 *Description:*\n${visible}${readmore}${hidden}`;
        } else {
          descSection = `\n\n📄 *Description:*\n${trimmed}`;
        }
      }

      const text = `╭══〘〘 *${fancy("channel info", "smallcaps")}* 〙〙═⊷
│↠📢 ${fancy("name", "smallcaps")}: ${name}
│↠🟢 s${fancy("tatu", "smallcaps")}s: ${isActive ? "Active" : stateType || "Unknown"}
│↠✅ ${fancy("verified", "smallcaps")}: ${isVerified ? "Yes" : "No"}
│↠👥 ${fancy("follower", "smallcaps")}s: ${followers}
│↠🆔 ${fancy("jid", "smallcaps")}: \`${channelJid}\`
╰═════════════════⊷${descSection}\n`;

      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 Copy JID",
            copy_code: channelJid,
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "➕ Follow Channel",
            url: channelUrl,
            merchant_url: channelUrl,
          }),
        },
      ];

      const sendOpts = {
        text,
        footer: botFooter,
        buttons,
      };

      if (picUrl) {
        sendOpts.image = { url: picUrl };
      }

      await sendButtons(Malvin, from, sendOpts, { quoted: mrxd });
      await react("✅");
    } catch (error) {
      console.error("chjid error:", error);
      await react("❌");
      await reply(`❌ Error fetching channel info: ${error.message}`);
    }
  },
);