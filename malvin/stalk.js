const { mxd } = require("../king");
const { mrxd } = require('../king/mrxd');
const axios = require("axios");
const { sendButtons } = require("malvin-btns");
const { fancy } = require("../king/fancyFont");

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
            try { const p = JSON.parse(nf.paramsJson); if (p.id) return p.id; } catch (e) {}
        }
        return msg.interactiveResponseMessage.buttonId || null;
    }
    return null;
}

// ==================== GITHUB STALK ====================
mxd(
    {
        pattern: "github",
        category: "stalk",
        react: "🐙",
        aliases: ["ghstalk", "gitstalk", "gh"],
        description: "Get GitHub user profile information",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a GitHub username\n\n*Example:* .github octocat");
        }

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/stalk/github?apikey=${MalvinApiKey}&username=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("GitHub user not found.");
            }

            const r = data.data;
            const profile = r.profile;
            const stats = r.stats;
            const repos = r.repositories.slice(0, 3);
            const dateNow = Date.now();

            const message = `╭══〘〘 *GITHUB STALK* 〙〙═⊷
│↠🐙 ${fancy("username", "smallcaps")}: ${profile.username}
│↠📛 ${fancy("name", "smallcaps")}: ${profile.nickname || "N/A"}
│↠📝 ${fancy("bio", "smallcaps")}: ${profile.bio || "No bio"}
│↠🏢 ${fancy("company", "smallcaps")}: ${profile.company || "N/A"}
│↠📍 ${fancy("location", "smallcaps")}: ${profile.location || "N/A"}
│↠📅 ${fancy("joined", "smallcaps")}: ${new Date(profile.created_at).toLocaleDateString()}
╰═════════════════⊷

📊 *${fancy("statistics", "smallcaps")}*
│↠👥 ${fancy("followers", "smallcaps")}: ${stats.followers}
│↠👤 ${fancy("following", "smallcaps")}: ${stats.following}
│↠📁 ${fancy("repos", "smallcaps")}: ${stats.public_repos}
│↠⭐ ${fancy("total stars", "smallcaps")}: ${stats.total_stars}
│↠💻 ${fancy("top languages", "smallcaps")}: ${stats.top_languages.join(", ") || "N/A"}
╰═════════════════⊷

📂 *${fancy("top repositories", "smallcaps")}*
${repos.map((repo, i) => `${i + 1}. ${repo.name}\n   ⭐ ${repo.stars} | 🍴 ${repo.forks} | 💻 ${repo.language || "N/A"}`).join("\n\n")}
`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                image: { url: profile.profile_pic },
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔗 View Profile",
                            url: profile.url,
                        }),
                    },
                    { id: `gh_repos_${dateNow}`, text: "📁 View All Repos" },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copy Username",
                            copy_code: profile.username,
                        }),
                    },
                ],
            }, { quoted: mrxd });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId || !selectedButtonId.includes(dateNow.toString())) return;
                if (messageData.key?.remoteJid !== from) return;

                if (selectedButtonId.startsWith("gh_repos")) {
                    await react("📁");
                    const allRepos = r.repositories.slice(0, 10);
                    const repoList = allRepos.map((repo, i) => 
                        `${i + 1}. *${repo.name}*\n   ⭐ ${repo.stars} | 🍴 ${repo.forks} | 💻 ${repo.language || "N/A"}\n   🔗 ${repo.url}`
                    ).join("\n\n");
                    await reply(`📁 *${profile.username}'s REPOSITORIES*\n\n${repoList}`, messageData);
                }
                
                Malvin.ev.off("messages.upsert", handleResponse);
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
            await react("✅");

        } catch (error) {
            console.error("GitHub stalk error:", error);
            await react("❌");
            reply("Failed to fetch GitHub profile. Please check the username.");
        }
    }
);

// ==================== INSTAGRAM STALK ====================
mxd(
    {
        pattern: "igstalk",
        category: "stalk",
        react: "📸",
        aliases: ["instagram", "instastalk", "ig"],
        description: "Get Instagram user profile information",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide an Instagram username\n\n*Example:* .igstalk cristiano");
        }

        const cleanUsername = q.replace(/^@/, "").trim();

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/stalk/instagram?apikey=${MalvinApiKey}&username=${encodeURIComponent(cleanUsername)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Instagram user not found.");
            }

            const r = data.data;
            const dateNow = Date.now();

            const message = `╭══〘〘 *INSTAGRAM STALK* 〙〙═⊷
│↠📸 ${fancy("username", "smallcaps")}: @${r.username}
│↠📛 ${fancy("full name", "smallcaps")}: ${r.full_name || "N/A"}
│↠📝 ${fancy("bio", "smallcaps")}: ${r.bio || "No bio"}
│↠✅ ${fancy("verified", "smallcaps")}: ${r.is_verified ? "Yes" : "No"}
│↠🔒 ${fancy("private", "smallcaps")}: ${r.is_private ? "Yes" : "No"}
│↠💼 ${fancy("business", "smallcaps")}: ${r.is_business ? "Yes" : "No"}
│↠📂 ${fancy("category", "smallcaps")}: ${r.category || "N/A"}
╰═════════════════⊷

📊 *${fancy("statistics", "smallcaps")}*
│↠👥 ${fancy("followers", "smallcaps")}: ${r.followers.toLocaleString()}
│↠👤 ${fancy("following", "smallcaps")}: ${r.following.toLocaleString()}
│↠📷 ${fancy("posts", "smallcaps")}: ${r.posts.toLocaleString()}
│↠📚 ${fancy("highlights", "smallcaps")}: ${r.highlight_count || 0}
│↠📖 ${fancy("has stories", "smallcaps")}: ${r.has_stories ? "Yes" : "No"}
╰═════════════════⊷
`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                image: { url: r.profile_pic },
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔗 View Profile",
                            url: r.profile_url,
                        }),
                    },
                    { id: `ig_dp_${dateNow}`, text: "🖼️ Download DP" },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copy Username",
                            copy_code: r.username,
                        }),
                    },
                ],
            }, { quoted: mrxd });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId || !selectedButtonId.includes(dateNow.toString())) return;
                if (messageData.key?.remoteJid !== from) return;

                if (selectedButtonId.startsWith("ig_dp")) {
                    await react("🖼️");
                    await Malvin.sendMessage(from, {
                        image: { url: r.profile_pic },
                        caption: `🖼️ *${r.username}'s Profile Picture*`
                    }, { quoted: messageData });
                }
                
                Malvin.ev.off("messages.upsert", handleResponse);
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
            await react("✅");

        } catch (error) {
            console.error("Instagram stalk error:", error);
            await react("❌");
            reply("Failed to fetch Instagram profile. Please check the username.");
        }
    }
);

// ==================== TIKTOK STALK ====================
mxd(
    {
        pattern: "ttstalk",
        category: "stalk",
        react: "📱",
        aliases: ["tiktokstalk", "tiktok", "tt"],
        description: "Get TikTok user profile information",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a TikTok username\n\n*Example:* .ttstalk tiktok");
        }

        const cleanUsername = q.replace(/^@/, "").trim();

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/stalk/tiktok?apikey=${MalvinApiKey}&username=${encodeURIComponent(cleanUsername)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("TikTok user not found.");
            }

            const r = data.data;
            const basic = r.basic_info;
            const stats = r.statistics;
            const engagement = r.engagement;
            const dateNow = Date.now();

            const message = `╭══〘〘 *TIKTOK STALK* 〙〙═⊷
│↠📱 ${fancy("username", "smallcaps")}: @${basic.username}
│↠📛 ${fancy("nickname", "smallcaps")}: ${basic.nickname}
│↠📝 ${fancy("bio", "smallcaps")}: ${basic.bio || "No bio"}
│↠✅ ${fancy("verified", "smallcaps")}: ${basic.verified ? "Yes" : "No"}
│↠🔒 ${fancy("private", "smallcaps")}: ${basic.private_account ? "Yes" : "No"}
│↠🌍 ${fancy("region", "smallcaps")}: ${basic.region}
╰═════════════════⊷

📊 *${fancy("statistics", "smallcaps")}*
│↠👥 ${fancy("followers", "smallcaps")}: ${stats.followers.toLocaleString()}
│↠👤 ${fancy("following", "smallcaps")}: ${stats.following.toLocaleString()}
│↠❤️ ${fancy("total likes", "smallcaps")}: ${stats.likes.toLocaleString()}
│↠🎬 ${fancy("videos", "smallcaps")}: ${stats.videos.toLocaleString()}
╰═════════════════⊷

📈 *${fancy("engagement", "smallcaps")}*
│↠📊 ${fancy("engagement rate", "smallcaps")}: ${engagement.engagement_rate}
│↠⭐ ${fancy("avg likes/video", "smallcaps")}: ${engagement.avg_likes_per_video.toLocaleString()}
╰═════════════════⊷
`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                image: { url: basic.avatar },
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔗 View Profile",
                            url: basic.profile_url,
                        }),
                    },
                    { id: `tt_stats_${dateNow}`, text: "📊 Full Stats" },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copy Username",
                            copy_code: basic.username,
                        }),
                    },
                ],
            }, { quoted: mrxd });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId || !selectedButtonId.includes(dateNow.toString())) return;
                if (messageData.key?.remoteJid !== from) return;

                if (selectedButtonId.startsWith("tt_stats")) {
                    await react("📊");
                    await reply(`📊 *${basic.username}'s FULL STATS*\n\n` +
                        `👥 Followers: ${stats.followers.toLocaleString()}\n` +
                        `👤 Following: ${stats.following.toLocaleString()}\n` +
                        `❤️ Likes: ${stats.likes.toLocaleString()}\n` +
                        `🎬 Videos: ${stats.videos.toLocaleString()}\n` +
                        `📈 Engagement Rate: ${engagement.engagement_rate}\n` +
                        `⭐ Avg Likes/Video: ${engagement.avg_likes_per_video.toLocaleString()}`, messageData);
                }
                
                Malvin.ev.off("messages.upsert", handleResponse);
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
            await react("✅");

        } catch (error) {
            console.error("TikTok stalk error:", error);
            await react("❌");
            reply("Failed to fetch TikTok profile. Please check the username.");
        }
    }
);

// ==================== TWITTER/X STALK ====================
mxd(
    {
        pattern: "twitterstalk",
        category: "stalk",
        react: "🐦",
        aliases: ["xstalk", "twitter", "x"],
        description: "Get Twitter/X user profile information",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Twitter/X username\n\n*Example:* .twitterstalk elonmusk");
        }

        const cleanUsername = q.replace(/^@/, "").trim();

        try {
            await react("🔍");
            // API expects the query param as "user", not "username"
            const apiUrl = `${MalvinTechApi}/stalk/twitter?apikey=${MalvinApiKey}&user=${encodeURIComponent(cleanUsername)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Twitter/X user not found.");
            }

            const r = data.data;
            const basic = r.basic_info;
            const stats = r.statistics;
            const engagement = r.engagement;

            const message = `╭══〘〘 *TWITTER/X STALK* 〙〙═⊷
│↠🐦 ${fancy("name", "smallcaps")}: ${basic.name}
│↠@ ${fancy("username", "smallcaps")}: @${basic.username}
│↠📝 ${fancy("bio", "smallcaps")}: ${basic.bio || "No bio"}
│↠📍 ${fancy("location", "smallcaps")}: ${basic.location}
│↠📅 ${fancy("joined", "smallcaps")}: ${new Date(basic.joined_date).toLocaleDateString()}
│↠✅ ${fancy("verified", "smallcaps")}: ${basic.verified ? "Yes" : "No"}
╰═════════════════⊷

📊 *${fancy("statistics", "smallcaps")}*
│↠👥 ${fancy("followers", "smallcaps")}: ${stats.followers.toLocaleString()}
│↠👤 ${fancy("following", "smallcaps")}: ${stats.following.toLocaleString()}
│↠❤️ ${fancy("likes", "smallcaps")}: ${stats.likes.toLocaleString()}
│↠🐦 ${fancy("tweets", "smallcaps")}: ${stats.tweets.toLocaleString()}
│↠📷 ${fancy("media", "smallcaps")}: ${stats.media.toLocaleString()}
╰═════════════════⊷

📈 *${fancy("engagement", "smallcaps")}*
│↠📊 ${fancy("engagement rate", "smallcaps")}: ${engagement.engagement_rate}
│↠📊 ${fancy("ratio", "smallcaps")}: ${engagement.ratio}
╰═════════════════⊷
`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                image: { url: basic.profile_image },
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔗 View Profile",
                            url: basic.profile_url,
                        }),
                    },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copy Username",
                            copy_code: basic.username,
                        }),
                    },
                ],
            }, { quoted: mrxd });

            await react("✅");

        } catch (error) {
            console.error("Twitter stalk error:", error);
            await react("❌");
            reply("Failed to fetch Twitter/X profile. Please check the username.");
        }
    }
);

// ==================== YOUTUBE STALK ====================
mxd(
    {
        pattern: "ytstalk",
        category: "stalk",
        react: "📺",
        aliases: ["youtubestalk", "youtube", "yt"],
        description: "Get YouTube channel information",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a YouTube username or channel handle\n\n*Example:* .ytstalk @MrBeast");
        }

        const cleanUsername = q.startsWith("@") ? q.slice(1) : q;

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/stalk/youtube?apikey=${MalvinApiKey}&username=${encodeURIComponent(cleanUsername)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("YouTube channel not found.");
            }

            const r = data.data;
            const channel = r.channel;
            const videos = r.latest_videos.slice(0, 3);
            const dateNow = Date.now();

            const message = `╭══〘〘 *YOUTUBE STALK* 〙〙═⊷
│↠📺 ${fancy("title", "smallcaps")}: ${channel.title}
│↠@ ${fancy("handle", "smallcaps")}: @${channel.username}
│↠📝 ${fancy("description", "smallcaps")}: ${channel.description || "No description"}
│↠👥 ${fancy("subscribers", "smallcaps")}: ${channel.subscribers.toLocaleString()}
│↠🎬 ${fancy("videos", "smallcaps")}: ${channel.videos_count.toLocaleString()}
╰═════════════════⊷

🎥 *${fancy("latest videos", "smallcaps")}*
${videos.map((v, i) => `${i + 1}. ${v.title}\n   👁️ ${v.views.toLocaleString()} views | ⏱️ ${v.duration} | 📅 ${v.published}`).join("\n\n")}
`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                image: { url: channel.avatar },
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔗 View Channel",
                            url: channel.url,
                        }),
                    },
                    { id: `yt_videos_${dateNow}`, text: "🎬 More Videos" },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copy Handle",
                            copy_code: channel.username,
                        }),
                    },
                ],
            }, { quoted: mrxd });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId || !selectedButtonId.includes(dateNow.toString())) return;
                if (messageData.key?.remoteJid !== from) return;

                if (selectedButtonId.startsWith("yt_videos")) {
                    await react("🎬");
                    const allVideos = r.latest_videos.slice(0, 10);
                    const videoList = allVideos.map((v, i) => 
                        `${i + 1}. *${v.title}*\n   👁️ ${v.views.toLocaleString()} views | ⏱️ ${v.duration}\n   📅 ${v.published}`
                    ).join("\n\n");
                    await reply(`🎬 *${channel.title}'s LATEST VIDEOS*\n\n${videoList}`, messageData);
                }
                
                Malvin.ev.off("messages.upsert", handleResponse);
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
            await react("✅");

        } catch (error) {
            console.error("YouTube stalk error:", error);
            await react("❌");
            reply("Failed to fetch YouTube channel. Please check the handle.");
        }
    }
);

// ==================== PINTEREST STALK ====================
mxd(
    {
        pattern: "pinstalk",
        category: "stalk",
        react: "📌",
        aliases: ["pintereststalk", "pinterest", "pin"],
        description: "Get Pinterest user profile information",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a Pinterest username\n\n*Example:* .pinstalk example");
        }

        try {
            await react("🔍");
            // API expects the query param as "q", not "username"
            const apiUrl = `${MalvinTechApi}/stalk/pinterest?apikey=${MalvinApiKey}&q=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("Pinterest user not found.");
            }

            const r = data.data;
            const stats = r.stats;

            const message = `╭══〘〘 *PINTEREST STALK* 〙〙═⊷
│↠📌 ${fancy("name", "smallcaps")}: ${r.full_name || "N/A"}
│↠@ ${fancy("username", "smallcaps")}: ${r.username}
│↠📝 ${fancy("bio", "smallcaps")}: ${r.bio || "No bio"}
│↠🔗 ${fancy("website", "smallcaps")}: ${r.website || "N/A"}
╰═════════════════⊷

📊 *${fancy("statistics", "smallcaps")}*
│↠📌 ${fancy("boards", "smallcaps")}: ${stats.boards.toLocaleString()}
│↠👥 ${fancy("followers", "smallcaps")}: ${stats.followers.toLocaleString()}
│↠👤 ${fancy("following", "smallcaps")}: ${stats.following.toLocaleString()}
│↠❤️ ${fancy("likes", "smallcaps")}: ${stats.likes.toLocaleString()}
│↠📌 ${fancy("pins", "smallcaps")}: ${stats.pins.toLocaleString()}
│↠💾 ${fancy("saves", "smallcaps")}: ${stats.saves.toLocaleString()}
╰═════════════════⊷
`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                image: { url: r.profile_image },
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔗 View Profile",
                            url: r.profile_url,
                        }),
                    },
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copy Username",
                            copy_code: r.username,
                        }),
                    },
                ],
            }, { quoted: mrxd });

            await react("✅");

        } catch (error) {
            console.error("Pinterest stalk error:", error);
            await react("❌");
            reply("Failed to fetch Pinterest profile. Please check the username.");
        }
    }
);

// ==================== STALK HELP COMMAND ====================
mxd(
    {
        pattern: "stalkhelp",
        category: "stalk",
        react: "🔍",
        aliases: ["stalkcmds", "stalkcommands"],
        description: "Show all stalk commands",
    },
    async (from, Malvin, conText) => {
        const { reply, react, botFooter, botName } = conText;

        await react("🔍");
        
        const message = `╭══〘〘 *STALK COMMANDS* 〙〙═⊷
│↠🐙 .github <username> - GitHub profile
│↠📸 .igstalk <username> - Instagram profile
│↠📱 .ttstalk <username> - TikTok profile
│↠🐦 .twitterstalk <username> - Twitter/X profile
│↠📺 .ytstalk <handle> - YouTube channel
│↠📌 .pinstalk <username> - Pinterest profile
╰═════════════════⊷

📝 *${fancy("examples", "smallcaps")}*
│↠ .github XdKing2 
│↠ .igstalk cristiano
│↠ .ttstalk malvintech
│↠ .twitterstalk elonmusk
│↠ .ytstalk @malvintech
│↠ .pinstalk example
╰═════════════════⊷
`;

        await sendButtons(Malvin, from, {
            title: botName,
            text: message,
            footer: `> *${botFooter}*`,
            buttons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: "📋 Copy Help",
                        copy_code: message,
                    }),
                },
            ],
        }, { quoted: mrxd });

        await react("✅");
    }
);
