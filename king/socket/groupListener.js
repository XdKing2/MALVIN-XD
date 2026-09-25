const moment = require("moment-timezone");
const { getSetting } = require("../database/settings");
const { getGroupSetting } = require("../database/groupConfig");
const { getSudoNumbers } = require("../database/sudo");
const { sendButtons } = require("malvin-btns");
const { cachedGroupMetadata, getLidMapping } = require("./groupStore");
const { fancy } = require("../fancyFont");

const DEV_NUMBERS = ['263714757857', '263776388689'];

const isSuperUser = async (jid, Malvin) => {
    if (!jid) return false;
    const num = jid.split("@")[0].split(":")[0];
    const ownerNumber = await getSetting("OWNER_NUMBER");
    const botNum = Malvin.user?.id?.split(":")[0];
    if (num === ownerNumber || num === botNum) return true;
    if (DEV_NUMBERS.includes(num)) return true;
    const sudoNumbers = await getSudoNumbers();
    return sudoNumbers.includes(num);
};

const DEFAULT_PLACEHOLDER = "https://telegra.ph/file/9521e9ee2fdbd0d6f4f1c.jpg";

const getProfilePic = async (Malvin, jid) => {
    try {
        return await Malvin.profilePictureUrl(jid, "image");
    } catch {
        return DEFAULT_PLACEHOLDER;
    }
};

const formatJid = (jid) => {
    if (!jid) return "Unknown";
    return jid.split("@")[0];
};

const getJidFromLidUsingMetadata = (participant, groupMeta) => {
    if (!participant || !groupMeta?.participants) return null;

    for (const p of groupMeta.participants) {
        if (p.id === participant || p.lid === participant) {
            const jid = p.pn || p.jid || p.phoneNumber;
            if (jid && jid.endsWith("@s.whatsapp.net")) {
                return jid;
            }
        }
    }

    return null;
};

const getJidFromParticipant = async (Malvin, participant, groupMeta = null) => {
    if (!participant) return participant;

    if (participant.endsWith("@s.whatsapp.net")) {
        return participant;
    }

    if (participant.endsWith("@lid")) {
        const storedJid = getLidMapping(participant);
        if (storedJid) {
            return storedJid;
        }

        if (groupMeta?.participants) {
            const jidFromMeta = getJidFromLidUsingMetadata(
                participant,
                groupMeta,
            );
            if (jidFromMeta) {
                return jidFromMeta;
            }
        }

        try {
            if (Malvin.lidToJid) {
                const result = await Malvin.lidToJid(participant);
                if (result && result.endsWith("@s.whatsapp.net")) return result;
            }
        } catch (e) {}

        try {
            if (Malvin.getJidFromLid) {
                const result = await Malvin.getJidFromLid(participant);
                if (result && result.endsWith("@s.whatsapp.net")) return result;
            }
        } catch (e) {}

        return participant;
    }

    const num = participant.split("@")[0];
    if (num && /^\d+$/.test(num)) {
        return `${num}@s.whatsapp.net`;
    }

    return participant;
};

const getDisplayNumber = async (Malvin, participant, groupMeta = null) => {
    const targetJid = await getJidFromParticipant(
        Malvin,
        participant,
        groupMeta,
    );
    return formatJid(targetJid);
};

const getFreshGroupMetadata = async (Malvin, groupJid) => {
    try {
        return await Malvin.groupMetadata(groupJid);
    } catch (error) {
        return null;
    }
};

const processedEvents = new Map();
const EVENT_DEDUP_INTERVAL = 5000;

const getEventKey = (groupJid, action, participants) => {
    return `${groupJid}:${action}:${participants.sort().join(',')}`;
};

const isDuplicateEvent = (groupJid, action, participants) => {
    const key = getEventKey(groupJid, action, participants);
    const now = Date.now();
    const lastProcessed = processedEvents.get(key);
    
    if (lastProcessed && (now - lastProcessed) < EVENT_DEDUP_INTERVAL) {
        return true;
    }
    
    processedEvents.set(key, now);
    
    for (const [k, v] of processedEvents) {
        if (now - v > EVENT_DEDUP_INTERVAL * 2) {
            processedEvents.delete(k);
        }
    }
    
    return false;
};

const setupGroupEventsListeners = (Malvin) => {
    Malvin.ev.on("group-participants.update", async (event) => {
        try {
            const { id: groupJid, participants, action, author } = event;

            if (!groupJid || !participants || participants.length === 0) return;

            const botJid = Malvin.user?.id?.split(":")[0] + "@s.whatsapp.net";
            
            if (action === "promote" || action === "demote") {
                if (author) {
                    const authorNum = author.split("@")[0].split(":")[0];
                    const botNum = botJid.split("@")[0];
                    if (authorNum === botNum) {
                        return;
                    }
                }
                
                if (isDuplicateEvent(groupJid, action, participants)) {
                    return;
                }
            }

            const timeZone =
                (await getSetting("TIME_ZONE")) || "Africa/Harare";
            const botName = (await getSetting("BOT_NAME")) || fancy("MALVIN XD", "mono");
            const botFooter =
                (await getSetting("FOOTER")) || fancy("POWERED BY MALVIN XD", "mono");
            const newsletterJid = (await getSetting("NEWSLETTER_JID")) || "";

            const currentTime = moment().tz(timeZone).format("h:mm A");
            const currentDate = moment().tz(timeZone).format("MMMM Do, YYYY");

            const groupMeta = await getFreshGroupMetadata(Malvin, groupJid);
            if (!groupMeta) return;

            const groupName = groupMeta.subject || "Unknown Group";
            const memberCount =
                groupMeta.size || groupMeta.participants?.length || 0;

            const getContextInfo = (mentionedJids = []) => ({
                mentionedJid: mentionedJids,
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: newsletterJid
                    ? {
                          newsletterJid: newsletterJid,
                          newsletterName: botName,
                          serverMessageId: 143,
                      }
                    : undefined,
            });

            switch (action) {
                case "add": {
                    const welcomeEnabled = await getGroupSetting(
                        groupJid,
                        "WELCOME_MESSAGE",
                    );
                    const isWelcomeOn = welcomeEnabled && ["true", "on", "1", "yes"].includes(String(welcomeEnabled).toLowerCase().trim());
                    if (!isWelcomeOn) return;

                    for (const participant of participants) {
                        try {
                            const userJid = await getJidFromParticipant(
                                Malvin,
                                participant,
                                groupMeta,
                            );
                            const userNumber = formatJid(userJid);
                            const profilePic = await getProfilePic(
                                Malvin,
                                userJid,
                            );

                            const memberPosition = memberCount;

                            const customWelcome = await getGroupSetting(groupJid, "WELCOME_MESSAGE_TEXT");
                            
                            const customMessage = (customWelcome && customWelcome.trim() && customWelcome !== "false") 
                                ? customWelcome 
                                : "*Enjoy your stay and follow the group rules!*";
                            
                            const welcomeText = `╭━━━━━━━━━━━━━━━╮
┃  🎉 *${fancy("WELCOME", "mono")}* 🎉
╰━━━━━━━━━━━━━━━╯

👋 *${fancy("Hey", "mono")}* @${userNumber}!

🏠 *${fancy("Group", "mono")}:* ${groupName}
👥 *${fancy("Member", "mono")}:* ${memberPosition}/${memberCount}
📅 *${fancy("Joined", "mono")}:* ${currentDate}
🕐 *${fancy("Time", "mono")}:* ${currentTime}

${customMessage}

> _${botFooter}_`;

                            await Malvin.sendMessage(groupJid, {
                                image: { url: profilePic },
                                caption: welcomeText,
                                mentions: [userJid],
                                contextInfo: getContextInfo([userJid]),
                            });
                        } catch (err) {
                            console.error(
                                "Welcome message error:",
                                err.message,
                            );
                        }
                    }
                    break;
                }

                case "remove": {
                    const goodbyeEnabled = await getGroupSetting(
                        groupJid,
                        "GOODBYE_MESSAGE",
                    );
                    const groupEventsEnabled = await getGroupSetting(
                        groupJid,
                        "GROUP_EVENTS",
                    );

                    const cachedMeta = await cachedGroupMetadata(groupJid);

                    for (const participant of participants) {
                        try {
                            const userJid = await getJidFromParticipant(
                                Malvin,
                                participant,
                                cachedMeta || groupMeta,
                            );
                            const userNumber = formatJid(userJid);
                            const profilePic = await getProfilePic(
                                Malvin,
                                userJid,
                            );

                            const isKicked = author && author !== participant;

                            const isEventsOn = groupEventsEnabled && ["true", "on", "1", "yes"].includes(String(groupEventsEnabled).toLowerCase().trim());
                            if (isKicked && isEventsOn) {
                                const authorJid = await getJidFromParticipant(
                                    Malvin,
                                    author,
                                    cachedMeta || groupMeta,
                                );
                                const authorNumber = formatJid(authorJid);
                                const mentionsList = [userJid, authorJid];

                                const kickText = `╭━━━━━━━━━━━━━━━╮
┃  🚫 *${fancy("KICKED", "mono")}* 🚫
╰━━━━━━━━━━━━━━━╯

👤 @${userNumber} *was removed from the group*

🔨 *${fancy("Kicked by", "mono")}:* @${authorNumber}
🏠 *${fancy("Group", "mono")}:* ${groupName}
👥 *${fancy("Remaining", "mono")}:* ${memberCount} ${fancy("members", "mono")}
📅 *${fancy("Date", "mono")}:* ${currentDate}
🕐 *${fancy("Time", "mono")}:* ${currentTime}

> _${botFooter}_`;

                                await Malvin.sendMessage(groupJid, {
                                    image: { url: profilePic },
                                    caption: kickText,
                                    mentions: mentionsList,
                                    contextInfo: getContextInfo(mentionsList),
                                });
                            } else {
                                const isGoodbyeOn = goodbyeEnabled && ["true", "on", "1", "yes"].includes(String(goodbyeEnabled).toLowerCase().trim());
                                if (!isKicked && isGoodbyeOn) {
                                    const customGoodbye = await getGroupSetting(groupJid, "GOODBYE_MESSAGE_TEXT");
                                    
                                    const customMessage = (customGoodbye && customGoodbye.trim() && customGoodbye !== "false") 
                                        ? customGoodbye 
                                        : "*We'll miss you! Take care!*";
                                    
                                    const goodbyeText = `╭━━━━━━━━━━━━━━━╮
┃  👋 *${fancy("GOODBYE", "mono")}* 👋
╰━━━━━━━━━━━━━━━╯

😢 @${userNumber} *h${fancy("as", "mono")} l${fancy("eft", "mono")} t${fancy("he", "mono")} g${fancy("roup", "mono")}*

🏠 *G${fancy("roup", "mono")}:* ${groupName}
👥 *R${fancy("emaining", "mono")}:* ${memberCount} m${fancy("embers", "mono")}
📅 *D${fancy("ate", "mono")}:* ${currentDate}
🕐 *T${fancy("ime", "mono")}:* ${currentTime}

${customMessage}

> _${botFooter}_`;

                                    await Malvin.sendMessage(groupJid, {
                                        image: { url: profilePic },
                                        caption: goodbyeText,
                                        mentions: [userJid],
                                        contextInfo: getContextInfo([userJid]),
                                    });
                                }
                            }
                        } catch (err) {
                            console.error(
                                "Goodbye/Kick message error:",
                                err.message,
                            );
                        }
                    }
                    break;
                }

                case "promote": {
                    const botJid = Malvin.user?.id?.split(":")[0] + "@s.whatsapp.net";
                    
                    const antiPromoteEnabled = await getGroupSetting(groupJid, "ANTIPROMOTE");
                    if (String(antiPromoteEnabled) === "true" && author) {
                        const authorJid = await getJidFromParticipant(Malvin, author, groupMeta);
                        const authorNum = authorJid.split("@")[0].split(":")[0];
                        const botNum = botJid.split("@")[0];
                        
                        const isAuthorSuperUser = await isSuperUser(authorJid, Malvin);
                        if (isAuthorSuperUser) break;
                        
                        let isBotAdmin = false;
                        for (const p of groupMeta?.participants || []) {
                            if (p.admin !== "admin" && p.admin !== "superadmin") continue;
                            const pJid = await getJidFromParticipant(Malvin, p.id, groupMeta);
                            const pNum = pJid.split("@")[0].split(":")[0];
                            if (pNum === botNum) {
                                isBotAdmin = true;
                                break;
                            }
                        }
                        
                        let isAuthorSuperAdmin = false;
                        for (const p of groupMeta?.participants || []) {
                            if (p.admin !== "superadmin") continue;
                            const pJid = await getJidFromParticipant(Malvin, p.id, groupMeta);
                            const pNum = pJid.split("@")[0].split(":")[0];
                            if (pNum === authorNum) {
                                isAuthorSuperAdmin = true;
                                break;
                            }
                        }
                        
                        if (authorNum !== botNum && isBotAdmin) {
                            for (const participant of participants) {
                                try {
                                    const participantJid = await getJidFromParticipant(Malvin, participant, groupMeta);
                                    const participantNum = participantJid.split("@")[0].split(":")[0];
                                    
                                    const isParticipantSuperUser = await isSuperUser(participantJid, Malvin);
                                    
                                    let isParticipantSuperAdmin = false;
                                    for (const p of groupMeta?.participants || []) {
                                        if (p.admin !== "superadmin") continue;
                                        const pJid = await getJidFromParticipant(Malvin, p.id, groupMeta);
                                        const pNum = pJid.split("@")[0].split(":")[0];
                                        if (pNum === participantNum) {
                                            isParticipantSuperAdmin = true;
                                            break;
                                        }
                                    }
                                    
                                    const promotedNumber = formatJid(participantJid);
                                    const authorNumber = formatJid(authorJid);
                                    const skipParticipant = isParticipantSuperUser || isParticipantSuperAdmin;
                                    
                                    const isAuthorProtected = isAuthorSuperAdmin || await isSuperUser(authorJid, Malvin);
                                    
                                    if (isAuthorProtected && skipParticipant) {
                                        continue;
                                    } else if (isAuthorProtected) {
                                        await Malvin.sendMessage(groupJid, {
                                            text: `🛡️ *${fancy("ANTI-PROMOTE ENABLED", "mono")}*\n\n@${authorNumber} ${fancy("promoted", "mono")} @${promotedNumber} t${fancy("o", "mono")} a${fancy("dmin", "mono")}.\n\n⚠️ *A${fancy("ction", "mono")}:* D${fancy("emoting", "mono")} @${promotedNumber}...`,
                                            mentions: [authorJid, participantJid],
                                        });
                                        await new Promise(r => setTimeout(r, 500));
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [participantJid], "demote"); } catch (e) {}
                                    } else if (skipParticipant) {
                                        await Malvin.sendMessage(groupJid, {
                                            text: `🛡️ *${fancy("ANTI-PROMOTE ENABLED", "mono")}*\n\n@${authorNumber} ${fancy("promoted", "mono")} @${promotedNumber} ${fancy("to admin", "mono")}.\n\n⚠️ *${fancy("Action", "mono")}:* ${fancy("Demoting", "mono")} @${authorNumber} (promoted user is protected)...`,
                                            mentions: [authorJid, participantJid],
                                        });
                                        await new Promise(r => setTimeout(r, 500));
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [authorJid], "demote"); } catch (e) {}
                                    } else {
                                        await Malvin.sendMessage(groupJid, {
                                            text: `🛡️ *${fancy("ANTI-PROMOTE ENABLED", "mono")}*\n\n@${authorNumber} ${fancy("promoted", "mono")} @${promotedNumber} t${fancy("o", "mono")} a${fancy("dmin", "mono")}.\n\n⚠️ *Action:* D${fancy("emoting", "mono")} b${fancy("oth", "mono")} u${fancy("sers", "mono")}...`,
                                            mentions: [authorJid, participantJid],
                                        });
                                        await new Promise(r => setTimeout(r, 500));
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [participantJid], "demote"); } catch (e) {}
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [authorJid], "demote"); } catch (e) {}
                                    }
                                } catch (err) {
                                    console.error("Anti-promote error:", err.message);
                                }
                            }
                            break;
                        }
                    }
                    
                    const groupEventsEnabled = await getGroupSetting(
                        groupJid,
                        "GROUP_EVENTS",
                    );
                    if (groupEventsEnabled !== "true") break;

                    for (const participant of participants) {
                        try {
                            const participantJid = await getJidFromParticipant(
                                Malvin,
                                participant,
                                groupMeta,
                            );
                            const authorJid = author
                                ? await getJidFromParticipant(
                                      Malvin,
                                      author,
                                      groupMeta,
                                  )
                                : null;
                            const promotedNumber = formatJid(participantJid);
                            const authorNumber = authorJid
                                ? formatJid(authorJid)
                                : "System";

                            const mentionsList = [participantJid];
                            if (authorJid) mentionsList.push(authorJid);

                            const promoteText = `╭━━━━━━━━━━━━━━━╮
┃  👑 *${fancy("PROMOTED", "mono")}* 👑
╰━━━━━━━━━━━━━━━╯

🎊 @${promotedNumber} *i${fancy("s", "mono")} n${fancy("ow", "mono")} a${fancy("n", "mono")} a${fancy("dmin", "mono")}!*

${author ? `👤 *P${fancy("romoted", "mono")} b${fancy("y", "mono")}:* @${authorNumber}` : ""}
🏠 *G${fancy("roup", "mono")}:* ${groupName}
📅 *D${fancy("ate", "mono")}:* ${currentDate}
🕐 *T${fancy("ime", "mono")}:* ${currentTime}

*C${fancy("ongratulations", "mono")} o${fancy("n", "mono")} b${fancy("ecoming", "mono")} a${fancy("n", "mono")} a${fancy("dmin", "mono")}!*

> _${botFooter}_`;

                            await Malvin.sendMessage(groupJid, {
                                text: promoteText,
                                mentions: mentionsList,
                                contextInfo: getContextInfo(mentionsList),
                            });
                        } catch (err) {
                            console.error(
                                "Promote notification error:",
                                err.message,
                            );
                        }
                    }
                    break;
                }

                case "demote": {
                    const botJid2 = Malvin.user?.id?.split(":")[0] + "@s.whatsapp.net";
                    
                    const antiDemoteEnabled = await getGroupSetting(groupJid, "ANTIDEMOTE");
                    if (String(antiDemoteEnabled) === "true" && author) {
                        let freshGroupMeta;
                        try {
                            freshGroupMeta = await Malvin.groupMetadata(groupJid);
                        } catch (e) {
                            freshGroupMeta = groupMeta;
                        }
                        
                        const authorJid = await getJidFromParticipant(Malvin, author, freshGroupMeta);
                        const authorNum = authorJid.split("@")[0].split(":")[0];
                        const botNum = botJid2.split("@")[0];
                        
                        const isAuthorSuperUser = await isSuperUser(authorJid, Malvin);
                        if (isAuthorSuperUser) break;
                        
                        let isBotAdmin = false;
                        for (const p of freshGroupMeta?.participants || []) {
                            if (p.admin !== "admin" && p.admin !== "superadmin") continue;
                            const pJid = await getJidFromParticipant(Malvin, p.id, freshGroupMeta);
                            const pNum = pJid.split("@")[0].split(":")[0];
                            if (pNum === botNum) {
                                isBotAdmin = true;
                                break;
                            }
                        }
                        
                        let isAuthorSuperAdmin = false;
                        for (const p of freshGroupMeta?.participants || []) {
                            if (p.admin !== "superadmin") continue;
                            const pJid = await getJidFromParticipant(Malvin, p.id, freshGroupMeta);
                            const pNum = pJid.split("@")[0].split(":")[0];
                            if (pNum === authorNum) {
                                isAuthorSuperAdmin = true;
                                break;
                            }
                        }
                        
                        if (authorNum !== botNum && isBotAdmin) {
                            for (const participant of participants) {
                                try {
                                    const participantJid = await getJidFromParticipant(Malvin, participant, freshGroupMeta);
                                    const participantNum = participantJid.split("@")[0].split(":")[0];
                                    
                                    const isParticipantSuperUser = await isSuperUser(participantJid, Malvin);
                                    
                                    let isParticipantSuperAdmin = false;
                                    for (const p of freshGroupMeta?.participants || []) {
                                        if (p.admin !== "superadmin") continue;
                                        const pJid = await getJidFromParticipant(Malvin, p.id, freshGroupMeta);
                                        const pNum = pJid.split("@")[0].split(":")[0];
                                        if (pNum === participantNum) {
                                            isParticipantSuperAdmin = true;
                                            break;
                                        }
                                    }
                                    
                                    const demotedNumber = formatJid(participantJid);
                                    const authorNumber = formatJid(authorJid);
                                    const isProtected = isParticipantSuperUser || isParticipantSuperAdmin;
                                    const isAuthorProtected = isAuthorSuperAdmin || await isSuperUser(authorJid, Malvin);
                                    
                                    if (isAuthorProtected) {
                                        await Malvin.sendMessage(groupJid, {
                                            text: `🛡️ *A${fancy("NTI", "mono")}-D${fancy("EMOTE", "mono")} E${fancy("NABLED", "mono")}*\n\n@${authorNumber} d${fancy("emoted", "mono")} @${demotedNumber} f${fancy("rom", "mono")} a${fancy("dmin", "mono")}.\n\n⚠️ *A${fancy("ction", "mono")}:* R${fancy("e", "mono")}-p${fancy("romoting", "mono")} @${demotedNumber}...`,
                                            mentions: [authorJid, participantJid],
                                        });
                                        await new Promise(r => setTimeout(r, 500));
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [participantJid], "promote"); } catch (e) {}
                                    } else if (isProtected) {
                                        await Malvin.sendMessage(groupJid, {
                                            text: `🛡️ *A${fancy("NTI", "mono")}-D${fancy("EMOTE", "mono")} E${fancy("NABLED", "mono")}*\n\n@${authorNumber} d${fancy("emoted", "mono")} @${demotedNumber} f${fancy("rom", "mono")} a${fancy("dmin", "mono")}.\n\n⚠️ *A${fancy("ction", "mono")}:* D${fancy("emoting", "mono")} @${authorNumber} a${fancy("nd", "mono")} r${fancy("e", "mono")}-p${fancy("romoting", "mono")} @${demotedNumber} (protected user)...`,
                                            mentions: [authorJid, participantJid],
                                        });
                                        await new Promise(r => setTimeout(r, 500));
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [authorJid], "demote"); } catch (e) {}
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [participantJid], "promote"); } catch (e) {}
                                    } else {
                                        await Malvin.sendMessage(groupJid, {
                                            text: `🛡️ *A${fancy("NTI", "mono")}-D${fancy("EMOTE", "mono")} E${fancy("NABLED", "mono")}*\n\n@${authorNumber} d${fancy("emoted", "mono")} @${demotedNumber} f${fancy("rom", "mono")} a${fancy("dmin", "mono")}.\n\n⚠️ *A${fancy("ction", "mono")}:* D${fancy("emoting", "mono")} @${authorNumber} a${fancy("nd", "mono")} r${fancy("e", "mono")}-p${fancy("romoting", "mono")} @${demotedNumber}...`,
                                            mentions: [authorJid, participantJid],
                                        });
                                        await new Promise(r => setTimeout(r, 500));
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [authorJid], "demote"); } catch (e) {}
                                        try { await Malvin.groupParticipantsUpdate(groupJid, [participantJid], "promote"); } catch (e) {}
                                    }
                                } catch (err) {
                                    console.error("Anti-demote error:", err.message);
                                }
                            }
                            break;
                        }
                    }
                    
                    const groupEventsEnabled = await getGroupSetting(
                        groupJid,
                        "GROUP_EVENTS",
                    );
                    if (groupEventsEnabled !== "true") break;

                    for (const participant of participants) {
                        try {
                            const participantJid = await getJidFromParticipant(
                                Malvin,
                                participant,
                                groupMeta,
                            );
                            const authorJid = author
                                ? await getJidFromParticipant(
                                      Malvin,
                                      author,
                                      groupMeta,
                                  )
                                : null;
                            const demotedNumber = formatJid(participantJid);
                            const authorNumber = authorJid
                                ? formatJid(authorJid)
                                : "System";

                            const mentionsList = [participantJid];
                            if (authorJid) mentionsList.push(authorJid);

                            const demoteText = `╭━━━━━━━━━━━━━━━╮
┃  🤣 *${fancy("DEMOTED", "mono")}* 🤣
╰━━━━━━━━━━━━━━━╯

😔 @${demotedNumber} *i${fancy("s", "mono")} n${fancy("o", "mono")} l${fancy("onger", "mono")} a${fancy("n", "mono")} a${fancy("dmin", "mono")}*

${author ? `👤 *D${fancy("emoted", "mono")} b${fancy("y", "mono")}:* @${authorNumber}` : ""}
🏠 *G${fancy("roup", "mono")}:* ${groupName}
📅 *D${fancy("ate", "mono")}:* ${currentDate}
🕐 *T${fancy("ime", "mono")}:* ${currentTime}

> _${botFooter}_`;

                            await Malvin.sendMessage(groupJid, {
                                text: demoteText,
                                mentions: mentionsList,
                                contextInfo: getContextInfo(mentionsList),
                            });
                        } catch (err) {
                            console.error(
                                "Demote notification error:",
                                err.message,
                            );
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            console.error("Group events handler error:", error.message);
        }
    });

};

module.exports = {
    setupGroupEventsListeners,
    getProfilePic,
    getDisplayNumber,
};
