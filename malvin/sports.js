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

// ==================== SEARCH ENDPOINTS ====================

// 1. Player Search
mxd(
    {
        pattern: "player",
        category: "sports",
        react: "⚽",
        aliases: ["footballplayer", "soccerplayer"],
        description: "Search for football players",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a player name\n\n*Example:* .player Messi");
        }

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/sports/player/search?apikey=${MalvinApiKey}&q=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.players?.length) {
                await react("❌");
                return reply("No players found.");
            }

            const players = data.data.players.slice(0, 5);
            const dateNow = Date.now();
            
            let message = `╭══〘〘 *PLAYER SEARCH* 〙〙═⊷
│↠⚽ ${fancy("search", "smallcaps")}: ${q}
│↠📊 ${fancy("found", "smallcaps")}: ${data.data.count}
╰═════════════════⊷

${players.map((p, i) => `${i + 1}. *${p.name}*\n   📍 ${p.position || "N/A"} | 🌍 ${p.nationality || "N/A"}\n   ⚽ ${p.team || "N/A"}`).join("\n\n")}`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `player_copy_${dateNow}`, text: "📋 Copy First Player" },
                ],
            }, { quoted: mrxd });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId || !selectedButtonId.includes(dateNow.toString())) return;
                if (messageData.key?.remoteJid !== from) return;

                if (selectedButtonId.startsWith("player_copy")) {
                    await react("📋");
                    await reply(`📋 *Player copied:*\n\`${players[0]?.name}\``, messageData);
                }
                
                Malvin.ev.off("messages.upsert", handleResponse);
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
            await react("✅");

        } catch (error) {
            console.error("Player search error:", error);
            await react("❌");
            reply("Failed to search players. Please try again.");
        }
    }
);

// 2. Team Search
mxd(
    {
        pattern: "team",
        category: "sports",
        react: "🏆",
        aliases: ["footballteam", "soccerteam", "club"],
        description: "Search for football teams/clubs",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a team name\n\n*Example:* .team Arsenal");
        }

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/sports/team/search?apikey=${MalvinApiKey}&q=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.teams?.length) {
                await react("❌");
                return reply("No teams found.");
            }

            const teams = data.data.teams.slice(0, 5);
            
            let message = `╭══〘〘 *TEAM SEARCH* 〙〙═⊷
│↠🏆 ${fancy("search", "smallcaps")}: ${q}
│↠📊 ${fancy("found", "smallcaps")}: ${data.data.count}
╰═════════════════⊷

${teams.map((t, i) => `${i + 1}. *${t.name}*\n   📛 ${t.shortName || "N/A"} | 🏟️ ${t.venue || "N/A"}`).join("\n\n")}`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `team_copy_${Date.now()}`, text: "📋 Copy First Team" },
                ],
            }, { quoted: mrxd });

            await react("✅");

        } catch (error) {
            console.error("Team search error:", error);
            await react("❌");
            reply("Failed to search teams. Please try again.");
        }
    }
);

// 3. Venue Search
mxd(
    {
        pattern: "venue",
        category: "sports",
        react: "🏟️",
        aliases: ["stadium", "ground"],
        description: "Search for football stadiums/venues",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide a team or venue name\n\n*Example:* .venue Emirates");
        }

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/sports/venue/search?apikey=${MalvinApiKey}&q=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.venues?.length) {
                await react("❌");
                return reply("No venues found.");
            }

            const venues = data.data.venues.slice(0, 5);
            
            let message = `╭══〘〘 *VENUE SEARCH* 〙〙═⊷
│↠🏟️ ${fancy("search", "smallcaps")}: ${q}
│↠📊 ${fancy("found", "smallcaps")}: ${data.data.count}
╰═════════════════⊷

${venues.map((v, i) => `${i + 1}. *${v.team}*\n   🏟️ ${v.venue}\n   📍 ${v.address || "N/A"}`).join("\n\n")}`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    {
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🗺️ View on Maps",
                            url: `https://maps.google.com/?q=${encodeURIComponent(venues[0]?.venue || "")}`,
                        }),
                    },
                ],
            }, { quoted: mrxd });

            await react("✅");

        } catch (error) {
            console.error("Venue search error:", error);
            await react("❌");
            reply("Failed to search venues. Please try again.");
        }
    }
);

// 4. Head-to-Head (Game Events)
mxd(
    {
        pattern: "h2h",
        category: "sports",
        react: "⚔️",
        aliases: ["headtohead", "matches", "fixture"],
        description: "Get head-to-head matches between two teams",
    },
    async (from, Malvin, conText) => {
        const { q, reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        if (!q) {
            await react("❌");
            return reply("Please provide two teams\n\n*Example:* .h2h Arsenal vs Chelsea");
        }

        if (!q.toLowerCase().includes("vs") && !q.toLowerCase().includes(" - ")) {
            await react("❌");
            return reply("Use format: Team1 vs Team2\n\n*Example:* .h2h Manchester United vs Liverpool");
        }

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/sports/events?apikey=${MalvinApiKey}&q=${encodeURIComponent(q)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data) {
                await react("❌");
                return reply("No matches found between these teams.");
            }

            const r = data.data;
            const matches = r.matches || [];
            const dateNow = Date.now();
            
            if (!matches.length) {
                await reply(`⚔️ *${r.teams?.team1} vs ${r.teams?.team2}*\n\nNo previous matches found.`);
            } else {
                const text = matches.slice(0, 5).map((m, i) => 
                    `${i + 1}. 📅 ${m.date}\n   🏆 ${m.competition}\n   ${m.homeTeam} ${m.score} ${m.awayTeam}\n   🏆 ${m.winner}`
                ).join("\n\n");
                
                let message = `╭══〘〘 *HEAD-TO-HEAD* 〙〙═⊷
│↠⚔️ ${r.teams?.team1} vs ${r.teams?.team2}
│↠📊 ${fancy("total", "smallcaps")}: ${r.total} ${fancy("matches", "smallcaps")}
╰═════════════════⊷

${text}`;

                await sendButtons(Malvin, from, {
                    title: botName,
                    text: message,
                    footer: `> *${botFooter}*`,
                    buttons: [
                        { id: `h2h_share_${dateNow}`, text: "📤 Share" },
                    ],
                }, { quoted: mrxd });
            }
            
            await react("✅");

        } catch (error) {
            console.error("H2H error:", error);
            await react("❌");
            reply("Failed to fetch matches. Please try again.");
        }
    }
);

// ==================== LIVESCORE ENDPOINTS ====================

// 5. LiveScore Updates
mxd(
    {
        pattern: "livescore",
        category: "sports",
        react: "🔴",
        aliases: ["livescores", "livefootball", "live"],
        description: "Get live football scores",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        try {
            await react("🔴");
            const apiUrl = `${MalvinTechApi}/sports/livescore?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("🔴 No live matches at the moment.");
                await react("✅");
                return;
            }

            const matches = data.data.matches;
            const dateNow = Date.now();
            const text = matches.slice(0, 10).map((m, i) => 
                `${i + 1}. 🏆 ${m.competition}\n   ${m.homeTeam} ${m.score} ${m.awayTeam}\n   ⏱️ ${m.minute}`
            ).join("\n\n");

            let message = `╭══〘〘 *LIVE SCORES* 〙〙═⊷
│↠🔴 ${fancy("live matches", "smallcaps")}: ${data.data.total}
╰═════════════════⊷

${text}`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `live_refresh_${dateNow}`, text: "🔄 Refresh" },
                ],
            }, { quoted: mrxd });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId || !selectedButtonId.includes(dateNow.toString())) return;
                if (messageData.key?.remoteJid !== from) return;

                if (selectedButtonId.startsWith("live_refresh")) {
                    await react("🔄");
                    const newData = await axios.get(apiUrl, { timeout: 15000 });
                    if (newData.data?.data?.matches?.length) {
                        const newText = newData.data.data.matches.slice(0, 10).map((m, i) => 
                            `${i + 1}. 🏆 ${m.competition}\n   ${m.homeTeam} ${m.score} ${m.awayTeam}\n   ⏱️ ${m.minute}`
                        ).join("\n\n");
                        await reply(`🔴 *LIVE SCORES (REFRESHED)*\n\n${newText}`, messageData);
                    }
                }
                
                Malvin.ev.off("messages.upsert", handleResponse);
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
            await react("✅");

        } catch (error) {
            console.error("Livescore error:", error);
            await react("❌");
            reply("Failed to fetch live scores. Please try again.");
        }
    }
);

// 6. LiveScore with Highlights
mxd(
    {
        pattern: "livehighlights",
        category: "sports",
        react: "🎥",
        aliases: ["highlights", "livescorehd"],
        description: "Get live scores with video highlights",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        try {
            await react("🔍");
            const apiUrl = `${MalvinTechApi}/sports/livescore/highlights?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("🎥 No live matches with highlights available.");
                await react("✅");
                return;
            }

            const matches = data.data.matches;
            const text = matches.map((m, i) => 
                `${i + 1}. 🏆 ${m.competition}\n   ${m.homeTeam} ${m.score} ${m.awayTeam}\n   ⏱️ ${m.minute}\n   🎥 ${m.hasHighlights ? "✅ Available" : "⏳ Coming soon"}`
            ).join("\n\n");

            let message = `╭══〘〘 *LIVE SCORES + HIGHLIGHTS* 〙〙═⊷
│↠🎥 ${fancy("live matches", "smallcaps")}: ${data.data.total}
╰═════════════════⊷

${text}`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `highlights_live_${Date.now()}`, text: "🔴 Live Scores" },
                ],
            }, { quoted: mrxd });

            await react("✅");

        } catch (error) {
            console.error("Live highlights error:", error);
            await react("❌");
            reply("Failed to fetch live highlights. Please try again.");
        }
    }
);

// ==================== PREMIER LEAGUE COMMANDS ====================

// Premier League Standings
mxd(
    {
        pattern: "epltable",
        category: "sports",
        react: "📊",
        aliases: ["eplstandings", "premierleaguetable"],
        description: "Premier League standings/table",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📊");
            const apiUrl = `${MalvinTechApi}/sports/epl/standings?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.standings?.length) {
                await reply("📊 No standings available for Premier League");
                await react("✅");
                return;
            }

            const standings = data.data.standings.slice(0, 10);
            const text = standings.map(t => 
                `${t.position}. *${t.team}* - ${t.points} pts (P:${t.played} W:${t.won} D:${t.draw} L:${t.lost} GD:${t.goalDifference})`
            ).join("\n");

            let message = `╭══〘〘 *PREMIER LEAGUE STANDINGS* 〙〙═⊷
${standings.map(t => `│↠${t.position}. ${t.team} - ${t.points} pts`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `epl_topscorers_${Date.now()}`, text: "⚽ Top Scorers" },
                    { id: `epl_upcoming_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            const handleResponse = async (event) => {
                const messageData = event.messages[0];
                if (!messageData.message) return;

                const selectedButtonId = extractButtonId(messageData.message);
                if (!selectedButtonId) return;
                if (messageData.key?.remoteJid !== from) return;

                if (selectedButtonId.includes("epl_topscorers")) {
                    await react("⚽");
                    const scorersData = await axios.get(`${MalvinTechApi}/sports/epl/topscorers?apikey=${MalvinApiKey}&limit=10`, { timeout: 15000 });
                    if (scorersData.data?.status && scorersData.data?.data?.topScorers?.length) {
                        const scorersText = scorersData.data.data.topScorers.map(s => `${s.rank}. ${s.player} (${s.team}) - ${s.goals} goals`).join("\n");
                        await reply(`⚽ *PREMIER LEAGUE TOP SCORERS*\n\n${scorersText}`, messageData);
                    }
                } else if (selectedButtonId.includes("epl_upcoming")) {
                    await react("📅");
                    const upcomingData = await axios.get(`${MalvinTechApi}/sports/epl/upcoming?apikey=${MalvinApiKey}`, { timeout: 15000 });
                    if (upcomingData.data?.status && upcomingData.data?.data?.matches?.length) {
                        const upcomingText = upcomingData.data.data.matches.slice(0, 10).map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");
                        await reply(`📅 *PREMIER LEAGUE UPCOMING MATCHES*\n\n${upcomingText}`, messageData);
                    }
                }
                
                Malvin.ev.off("messages.upsert", handleResponse);
            };

            Malvin.ev.on("messages.upsert", handleResponse);
            setTimeout(() => Malvin.ev.off("messages.upsert", handleResponse), 300000);
            await react("✅");
        } catch (error) {
            console.error("EPL standings error:", error);
            await react("❌");
            reply("Failed to fetch Premier League standings.");
        }
    }
);

// Premier League Top Scorers
mxd(
    {
        pattern: "epltopscorers",
        category: "sports",
        react: "⚽",
        aliases: ["eplscorers", "premierleaguescorers"],
        description: "Premier League top scorers",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("⚽");
            const apiUrl = `${MalvinTechApi}/sports/epl/topscorers?apikey=${MalvinApiKey}&limit=10`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.topScorers?.length) {
                await reply("⚽ No top scorers data for Premier League");
                await react("✅");
                return;
            }

            const scorers = data.data.topScorers;
            const text = scorers.map(s => `${s.rank}. *${s.player}* (${s.team}) - ${s.goals} goals`).join("\n");

            let message = `╭══〘〘 *PREMIER LEAGUE TOP SCORERS* 〙〙═⊷
${scorers.map(s => `│↠${s.rank}. ${s.player} - ${s.goals} goals (${s.team})`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `epl_table_${Date.now()}`, text: "📊 Standings" },
                    { id: `epl_upcoming2_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Premier League top scorers.");
        }
    }
);

// Premier League Upcoming Matches
mxd(
    {
        pattern: "eplupcoming",
        category: "sports",
        react: "📅",
        aliases: ["eplfixtures", "premierleaguefixtures"],
        description: "Premier League upcoming matches",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📅");
            const apiUrl = `${MalvinTechApi}/sports/epl/upcoming?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("📅 No upcoming matches in Premier League");
                await react("✅");
                return;
            }

            const matches = data.data.matches.slice(0, 10);
            const text = matches.map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");

            let message = `╭══〘〘 *PREMIER LEAGUE UPCOMING MATCHES* 〙〙═⊷
${matches.map((m, i) => `│↠${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (${m.date})`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `epl_table2_${Date.now()}`, text: "📊 Standings" },
                    { id: `epl_topscorers2_${Date.now()}`, text: "⚽ Top Scorers" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Premier League matches.");
        }
    }
);

// ==================== BUNDESLIGA COMMANDS ====================

mxd(
    {
        pattern: "bundesligatable",
        category: "sports",
        react: "📊",
        aliases: ["bundesligastandings"],
        description: "Bundesliga standings/table",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📊");
            const apiUrl = `${MalvinTechApi}/sports/bundesliga/standings?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.standings?.length) {
                await reply("📊 No standings available for Bundesliga");
                await react("✅");
                return;
            }

            const standings = data.data.standings.slice(0, 10);
            const text = standings.map(t => `${t.position}. *${t.team}* - ${t.points} pts`).join("\n");

            let message = `╭══〘〘 *BUNDESLIGA STANDINGS* 〙〙═⊷
${standings.map(t => `│↠${t.position}. ${t.team} - ${t.points} pts`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `bundesliga_topscorers_${Date.now()}`, text: "⚽ Top Scorers" },
                    { id: `bundesliga_upcoming_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Bundesliga standings.");
        }
    }
);

mxd(
    {
        pattern: "bundesligatopscorers",
        category: "sports",
        react: "⚽",
        aliases: ["bundesligascorers"],
        description: "Bundesliga top scorers",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("⚽");
            const apiUrl = `${MalvinTechApi}/sports/bundesliga/topscorers?apikey=${MalvinApiKey}&limit=10`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.topScorers?.length) {
                await reply("⚽ No top scorers data for Bundesliga");
                await react("✅");
                return;
            }

            const scorers = data.data.topScorers;
            const text = scorers.map(s => `${s.rank}. *${s.player}* (${s.team}) - ${s.goals} goals`).join("\n");

            await reply(`⚽ 🇩🇪 *BUNDESLIGA TOP SCORERS*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Bundesliga top scorers.");
        }
    }
);

mxd(
    {
        pattern: "bundesligaupcoming",
        category: "sports",
        react: "📅",
        aliases: ["bundesligafixtures"],
        description: "Bundesliga upcoming matches",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("📅");
            const apiUrl = `${MalvinTechApi}/sports/bundesliga/upcoming?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("📅 No upcoming matches in Bundesliga");
                await react("✅");
                return;
            }

            const matches = data.data.matches.slice(0, 10);
            const text = matches.map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");

            await reply(`📅 🇩🇪 *BUNDESLIGA UPCOMING MATCHES*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Bundesliga matches.");
        }
    }
);

// ==================== LA LIGA COMMANDS ====================

mxd(
    {
        pattern: "laligatable",
        category: "sports",
        react: "📊",
        aliases: ["laligastandings"],
        description: "La Liga standings/table",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📊");
            const apiUrl = `${MalvinTechApi}/sports/laliga/standings?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.standings?.length) {
                await reply("📊 No standings available for La Liga");
                await react("✅");
                return;
            }

            const standings = data.data.standings.slice(0, 10);
            const text = standings.map(t => `${t.position}. *${t.team}* - ${t.points} pts`).join("\n");

            let message = `╭══〘〘 *LA LIGA STANDINGS* 〙〙═⊷
${standings.map(t => `│↠${t.position}. ${t.team} - ${t.points} pts`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `laliga_topscorers_${Date.now()}`, text: "⚽ Top Scorers" },
                    { id: `laliga_upcoming_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch La Liga standings.");
        }
    }
);

mxd(
    {
        pattern: "laligatopscorers",
        category: "sports",
        react: "⚽",
        aliases: ["laligascorers"],
        description: "La Liga top scorers",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("⚽");
            const apiUrl = `${MalvinTechApi}/sports/laliga/topscorers?apikey=${MalvinApiKey}&limit=10`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.topScorers?.length) {
                await reply("⚽ No top scorers data for La Liga");
                await react("✅");
                return;
            }

            const scorers = data.data.topScorers;
            const text = scorers.map(s => `${s.rank}. *${s.player}* (${s.team}) - ${s.goals} goals`).join("\n");

            await reply(`⚽ 🇪🇸 *LA LIGA TOP SCORERS*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch La Liga top scorers.");
        }
    }
);

mxd(
    {
        pattern: "laligaupcoming",
        category: "sports",
        react: "📅",
        aliases: ["laligafixtures"],
        description: "La Liga upcoming matches",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("📅");
            const apiUrl = `${MalvinTechApi}/sports/laliga/upcoming?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("📅 No upcoming matches in La Liga");
                await react("✅");
                return;
            }

            const matches = data.data.matches.slice(0, 10);
            const text = matches.map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");

            await reply(`📅 🇪🇸 *LA LIGA UPCOMING MATCHES*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch La Liga matches.");
        }
    }
);

// ==================== SERIE A COMMANDS ====================

mxd(
    {
        pattern: "serieatable",
        category: "sports",
        react: "📊",
        aliases: ["serieastandings"],
        description: "Serie A standings/table",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📊");
            const apiUrl = `${MalvinTechApi}/sports/seriea/standings?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.standings?.length) {
                await reply("📊 No standings available for Serie A");
                await react("✅");
                return;
            }

            const standings = data.data.standings.slice(0, 10);
            const text = standings.map(t => `${t.position}. *${t.team}* - ${t.points} pts`).join("\n");

            let message = `╭══〘〘 *SERIE A STANDINGS* 〙〙═⊷
${standings.map(t => `│↠${t.position}. ${t.team} - ${t.points} pts`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `seriea_topscorers_${Date.now()}`, text: "⚽ Top Scorers" },
                    { id: `seriea_upcoming_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Serie A standings.");
        }
    }
);

mxd(
    {
        pattern: "serieatopscorers",
        category: "sports",
        react: "⚽",
        aliases: ["serieascorers"],
        description: "Serie A top scorers",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("⚽");
            const apiUrl = `${MalvinTechApi}/sports/seriea/topscorers?apikey=${MalvinApiKey}&limit=10`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.topScorers?.length) {
                await reply("⚽ No top scorers data for Serie A");
                await react("✅");
                return;
            }

            const scorers = data.data.topScorers;
            const text = scorers.map(s => `${s.rank}. *${s.player}* (${s.team}) - ${s.goals} goals`).join("\n");

            await reply(`⚽ 🇮🇹 *SERIE A TOP SCORERS*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Serie A top scorers.");
        }
    }
);

mxd(
    {
        pattern: "serieaupcoming",
        category: "sports",
        react: "📅",
        aliases: ["serieafixtures"],
        description: "Serie A upcoming matches",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("📅");
            const apiUrl = `${MalvinTechApi}/sports/seriea/upcoming?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("📅 No upcoming matches in Serie A");
                await react("✅");
                return;
            }

            const matches = data.data.matches.slice(0, 10);
            const text = matches.map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");

            await reply(`📅 🇮🇹 *SERIE A UPCOMING MATCHES*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Serie A matches.");
        }
    }
);

// ==================== LIGUE 1 COMMANDS ====================

mxd(
    {
        pattern: "ligue1table",
        category: "sports",
        react: "📊",
        aliases: ["ligue1standings"],
        description: "Ligue 1 standings/table",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📊");
            const apiUrl = `${MalvinTechApi}/sports/ligue1/standings?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.standings?.length) {
                await reply("📊 No standings available for Ligue 1");
                await react("✅");
                return;
            }

            const standings = data.data.standings.slice(0, 10);
            const text = standings.map(t => `${t.position}. *${t.team}* - ${t.points} pts`).join("\n");

            let message = `╭══〘〘 *LIGUE 1 STANDINGS* 〙〙═⊷
${standings.map(t => `│↠${t.position}. ${t.team} - ${t.points} pts`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `ligue1_topscorers_${Date.now()}`, text: "⚽ Top Scorers" },
                    { id: `ligue1_upcoming_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Ligue 1 standings.");
        }
    }
);

mxd(
    {
        pattern: "ligue1topscorers",
        category: "sports",
        react: "⚽",
        aliases: ["ligue1scorers"],
        description: "Ligue 1 top scorers",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("⚽");
            const apiUrl = `${MalvinTechApi}/sports/ligue1/topscorers?apikey=${MalvinApiKey}&limit=10`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.topScorers?.length) {
                await reply("⚽ No top scorers data for Ligue 1");
                await react("✅");
                return;
            }

            const scorers = data.data.topScorers;
            const text = scorers.map(s => `${s.rank}. *${s.player}* (${s.team}) - ${s.goals} goals`).join("\n");

            await reply(`⚽ 🇫🇷 *LIGUE 1 TOP SCORERS*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Ligue 1 top scorers.");
        }
    }
);

mxd(
    {
        pattern: "ligue1upcoming",
        category: "sports",
        react: "📅",
        aliases: ["ligue1fixtures"],
        description: "Ligue 1 upcoming matches",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("📅");
            const apiUrl = `${MalvinTechApi}/sports/ligue1/upcoming?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("📅 No upcoming matches in Ligue 1");
                await react("✅");
                return;
            }

            const matches = data.data.matches.slice(0, 10);
            const text = matches.map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");

            await reply(`📅 🇫🇷 *LIGUE 1 UPCOMING MATCHES*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Ligue 1 matches.");
        }
    }
);

// ==================== UEFA CHAMPIONS LEAGUE COMMANDS ====================

mxd(
    {
        pattern: "ucltable",
        category: "sports",
        react: "📊",
        aliases: ["uclstandings", "championsleaguetable"],
        description: "UEFA Champions League standings",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📊");
            const apiUrl = `${MalvinTechApi}/sports/ucl/standings?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.standings?.length) {
                await reply("📊 No standings available for Champions League");
                await react("✅");
                return;
            }

            const standings = data.data.standings.slice(0, 10);
            const text = standings.map(t => `${t.position}. *${t.team}* - ${t.points} pts`).join("\n");

            let message = `╭══〘〘 *UEFA CHAMPIONS LEAGUE STANDINGS* 〙〙═⊷
${standings.map(t => `│↠${t.position}. ${t.team} - ${t.points} pts`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `ucl_topscorers_${Date.now()}`, text: "⚽ Top Scorers" },
                    { id: `ucl_upcoming_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Champions League standings.");
        }
    }
);

mxd(
    {
        pattern: "ucltopscorers",
        category: "sports",
        react: "⚽",
        aliases: ["uclscorers", "championsleaguescorers"],
        description: "UEFA Champions League top scorers",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("⚽");
            const apiUrl = `${MalvinTechApi}/sports/ucl/topscorers?apikey=${MalvinApiKey}&limit=10`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.topScorers?.length) {
                await reply("⚽ No top scorers data for Champions League");
                await react("✅");
                return;
            }

            const scorers = data.data.topScorers;
            const text = scorers.map(s => `${s.rank}. *${s.player}* (${s.team}) - ${s.goals} goals`).join("\n");

            await reply(`⚽ 🏆 *UEFA CHAMPIONS LEAGUE TOP SCORERS*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Champions League top scorers.");
        }
    }
);

mxd(
    {
        pattern: "uclupcoming",
        category: "sports",
        react: "📅",
        aliases: ["uclfixtures", "championsleaguefixtures"],
        description: "UEFA Champions League upcoming matches",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("📅");
            const apiUrl = `${MalvinTechApi}/sports/ucl/upcoming?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("📅 No upcoming matches in Champions League");
                await react("✅");
                return;
            }

            const matches = data.data.matches.slice(0, 10);
            const text = matches.map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");

            await reply(`📅 🏆 *UEFA CHAMPIONS LEAGUE UPCOMING MATCHES*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch Champions League matches.");
        }
    }
);

// ==================== UEFA EUROPEAN CHAMPIONSHIP COMMANDS ====================

mxd(
    {
        pattern: "eurostable",
        category: "sports",
        react: "📊",
        aliases: ["eurosstandings", "eurochampionship"],
        description: "UEFA European Championship standings",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📊");
            const apiUrl = `${MalvinTechApi}/sports/euros/standings?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.standings?.length) {
                await reply("📊 No standings available for European Championship");
                await react("✅");
                return;
            }

            const standings = data.data.standings.slice(0, 10);
            const text = standings.map(t => `${t.position}. *${t.team}* - ${t.points} pts`).join("\n");

            let message = `╭══〘〘 *UEFA EUROPEAN CHAMPIONSHIP STANDINGS* 〙〙═⊷
${standings.map(t => `│↠${t.position}. ${t.team} - ${t.points} pts`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `euros_topscorers_${Date.now()}`, text: "⚽ Top Scorers" },
                    { id: `euros_upcoming_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch European Championship standings.");
        }
    }
);

mxd(
    {
        pattern: "eurostopscorers",
        category: "sports",
        react: "⚽",
        aliases: ["euros scorers"],
        description: "UEFA European Championship top scorers",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("⚽");
            const apiUrl = `${MalvinTechApi}/sports/euros/topscorers?apikey=${MalvinApiKey}&limit=10`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.topScorers?.length) {
                await reply("⚽ No top scorers data for European Championship");
                await react("✅");
                return;
            }

            const scorers = data.data.topScorers;
            const text = scorers.map(s => `${s.rank}. *${s.player}* (${s.team}) - ${s.goals} goals`).join("\n");

            await reply(`⚽ 🇪🇺 *UEFA EUROPEAN CHAMPIONSHIP TOP SCORERS*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch European Championship top scorers.");
        }
    }
);

mxd(
    {
        pattern: "eurosupcoming",
        category: "sports",
        react: "📅",
        aliases: ["euros fixtures"],
        description: "UEFA European Championship upcoming matches",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("📅");
            const apiUrl = `${MalvinTechApi}/sports/euros/upcoming?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("📅 No upcoming matches in European Championship");
                await react("✅");
                return;
            }

            const matches = data.data.matches.slice(0, 10);
            const text = matches.map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");

            await reply(`📅 🇪🇺 *UEFA EUROPEAN CHAMPIONSHIP UPCOMING MATCHES*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch European Championship matches.");
        }
    }
);

// ==================== FIFA WORLD CUP COMMANDS ====================

mxd(
    {
        pattern: "fifatable",
        category: "sports",
        react: "📊",
        aliases: ["worldcuptable", "fifaworldcup"],
        description: "FIFA World Cup standings",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;
        try {
            await react("📊");
            const apiUrl = `${MalvinTechApi}/sports/fifa/standings?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.standings?.length) {
                await reply("📊 No standings available for World Cup");
                await react("✅");
                return;
            }

            const standings = data.data.standings.slice(0, 10);
            const text = standings.map(t => `${t.position}. *${t.team}* - ${t.points} pts`).join("\n");

            let message = `╭══〘〘 *FIFA WORLD CUP STANDINGS* 〙〙═⊷
${standings.map(t => `│↠${t.position}. ${t.team} - ${t.points} pts`).join("\n")}
╰═════════════════⊷`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `fifa_topscorers_${Date.now()}`, text: "⚽ Top Scorers" },
                    { id: `fifa_upcoming_${Date.now()}`, text: "📅 Upcoming" },
                ],
            }, { quoted: mrxd });

            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch World Cup standings.");
        }
    }
);

mxd(
    {
        pattern: "fifatopscorers",
        category: "sports",
        react: "⚽",
        aliases: ["worldcupscorers"],
        description: "FIFA World Cup top scorers",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("⚽");
            const apiUrl = `${MalvinTechApi}/sports/fifa/topscorers?apikey=${MalvinApiKey}&limit=10`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.topScorers?.length) {
                await reply("⚽ No top scorers data for World Cup");
                await react("✅");
                return;
            }

            const scorers = data.data.topScorers;
            const text = scorers.map(s => `${s.rank}. *${s.player}* (${s.team}) - ${s.goals} goals`).join("\n");

            await reply(`⚽ 🌍 *FIFA WORLD CUP TOP SCORERS*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch World Cup top scorers.");
        }
    }
);

mxd(
    {
        pattern: "fifaupcoming",
        category: "sports",
        react: "📅",
        aliases: ["worldcupfixtures"],
        description: "FIFA World Cup upcoming matches",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey } = conText;
        try {
            await react("📅");
            const apiUrl = `${MalvinTechApi}/sports/fifa/upcoming?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.matches?.length) {
                await reply("📅 No upcoming matches in World Cup");
                await react("✅");
                return;
            }

            const matches = data.data.matches.slice(0, 10);
            const text = matches.map((m, i) => `${i + 1}. 📅 ${m.date}\n   ${m.homeTeam} vs ${m.awayTeam}`).join("\n\n");

            await reply(`📅 🌍 *FIFA WORLD CUP UPCOMING MATCHES*\n\n${text}`);
            await react("✅");
        } catch (error) {
            await react("❌");
            reply("Failed to fetch World Cup matches.");
        }
    }
);

// ==================== BETTING ODDS ====================
mxd(
    {
        pattern: "odds",
        category: "sports",
        react: "🎲",
        aliases: ["betting", "bettingodds", "footballodds"],
        description: "Get football betting odds",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        try {
            await react("🎲");
            const apiUrl = `${MalvinTechApi}/sports/betting/odds?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.tips?.length) {
                await reply("🎲 No betting odds available at the moment.");
                await react("✅");
                return;
            }

            const tips = data.data.tips.slice(0, 5);
            const dateNow = Date.now();
            const text = tips.map((t, i) => 
                `${i + 1}. *${t.event}*\n   📅 ${t.commenceTime || t.date || "N/A"}\n   📊 Bookmakers: ${t.bookmakers || "Check odds"}`
            ).join("\n\n");

            let message = `╭══〘〘 *BETTING ODDS* 〙〙═⊷
│↠🎲 ${fancy("source", "smallcaps")}: ${data.data.source}
╰═════════════════⊷

${text}`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `odds_refresh_${dateNow}`, text: "🔄 Refresh" },
                ],
            }, { quoted: mrxd });

            await react("✅");

        } catch (error) {
            console.error("Odds error:", error);
            await react("❌");
            reply("Failed to fetch betting odds. Please try again.");
        }
    }
);

// ==================== FOOTBALL NEWS ====================
mxd(
    {
        pattern: "footballnews",
        category: "sports",
        react: "📰",
        aliases: ["soccernews", "fnews"],
        description: "Get latest football news",
    },
    async (from, Malvin, conText) => {
        const { reply, react, MalvinTechApi, MalvinApiKey, botName, botFooter } = conText;

        try {
            await react("📰");
            const apiUrl = `${MalvinTechApi}/sports/news?apikey=${MalvinApiKey}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            if (!data?.status || !data?.data?.articles?.length) {
                await reply("📰 No football news available.");
                await react("✅");
                return;
            }

            const articles = data.data.articles.slice(0, 5);
            const dateNow = Date.now();
            const text = articles.map((a, i) => 
                `${i + 1}. *${a.title}*\n   📝 ${a.description?.substring(0, 80) || "No description"}...\n   📅 ${new Date(a.pubDate).toLocaleDateString()}`
            ).join("\n\n");

            let message = `╭══〘〘 *FOOTBALL NEWS* 〙〙═⊷
│↠📰 ${fancy("source", "smallcaps")}: ${data.data.source}
╰═════════════════⊷

${text}`;

            await sendButtons(Malvin, from, {
                title: botName,
                text: message,
                footer: `> *${botFooter}*`,
                buttons: [
                    { id: `news_refresh_${dateNow}`, text: "🔄 Refresh" },
                ],
            }, { quoted: mrxd });

            await react("✅");

        } catch (error) {
            console.error("Football news error:", error);
            await react("❌");
            reply("Failed to fetch football news. Please try again.");
        }
    }
);

// ==================== HELP COMMAND ====================
mxd(
    {
        pattern: "sportshelp",
        category: "sports",
        react: "⚽",
        aliases: ["footballhelp", "soccerhelp"],
        description: "Show all sports/football commands",
    },
    async (from, Malvin, conText) => {
        const { reply, react, botName, botFooter } = conText;

        await react("⚽");
        
        const message = `╭══〘〘 *SPORTS COMMANDS* 〙〙═⊷
│↠⚽ .player <name> - Search players
│↠🏆 .team <name> - Search teams
│↠🏟️ .venue <name> - Search stadiums
│↠⚔️ .h2h Team1 vs Team2 - Head-to-head
│↠🔴 .livescore - Live scores
│↠🎥 .livehighlights - Live scores + highlights
╰═════════════════⊷

━━ *LEAGUE STANDINGS* ━━
│↠🏴󠁧󠁢󠁥󠁮󠁧󠁿 .epltable - Premier League
│↠🇩🇪 .bundesligatable - Bundesliga
│↠🇪🇸 .laligatable - La Liga
│↠🇮🇹 .serieatable - Serie A
│↠🇫🇷 .ligue1table - Ligue 1
│↠🏆 .ucltable - Champions League
│↠🇪🇺 .eurostable - European Championship
│↠🌍 .fifatable - World Cup
╰═════════════════⊷

━━ *LEAGUE TOP SCORERS* ━━
│↠⚽ .epltopscorers - Premier League
│↠⚽ .bundesligatopscorers - Bundesliga
│↠⚽ .laligatopscorers - La Liga
│↠⚽ .serieatopscorers - Serie A
│↠⚽ .ligue1topscorers - Ligue 1
│↠⚽ .ucltopscorers - Champions League
│↠⚽ .eurostopscorers - European Championship
│↠⚽ .fifatopscorers - World Cup
╰═════════════════⊷

━━ *LEAGUE UPCOMING* ━━
│↠📅 .eplupcoming - Premier League
│↠📅 .bundesligaupcoming - Bundesliga
│↠📅 .laligaupcoming - La Liga
│↠📅 .serieaupcoming - Serie A
│↠📅 .ligue1upcoming - Ligue 1
│↠📅 .uclupcoming - Champions League
│↠📅 .eurosupcoming - European Championship
│↠📅 .fifaupcoming - World Cup
╰═════════════════⊷

━━ *OTHER* ━━
│↠🎲 .odds - Betting odds
│↠📰 .footballnews - Latest news
╰═════════════════⊷

> *${botFooter}*`;

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
