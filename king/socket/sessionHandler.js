const { Boom } = require("@hapi/boom");
const { DisconnectReason } = require("mrxd-baileys");
const fs = require("fs-extra");
const path = require("path");
const { setupGroupCacheListeners } = require("./groupStore");

const RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 50;

let reconnectAttempts = 0;

const safeNewsletterFollow = async (Malvin, newsletterJid) => {
    if (!newsletterJid) return false;
    try {
        await Malvin.newsletterFollow(newsletterJid);
        // console.log(`✅ Followed Channel: ${newsletterJid}`);
        return true;
    } catch (error) {
        console.error(
            `❌ Channel follow failed for ${newsletterJid}:`,
            error.message,
        );
        return false;
    }
};

const safeGroupAcceptInvite = async (Malvin, groupJid) => {
    if (!groupJid) return false;
    try {
        await Malvin.groupAcceptInvite(groupJid);
        // console.log(`✅ Joined group: ${groupJid}`);
        return true;
    } catch (error) {
        switch (error.data) {
            case 409:
                console.log(`ℹ️ Already in group: ${groupJid}`);
                break;
            case 400:
                console.log(`⚠️ Invalid invite code for group: ${groupJid}`);
                break;
            case 403:
                console.log(`⚠️ No permission to join group: ${groupJid}`);
                break;
            default:
                console.error(
                    `❌ Group join failed for ${groupJid}:`,
                    error.message,
                );
        }
        return false;
    }
};

const setupConnectionHandler = (
    Malvin,
    sessionDir,
    startMalvin,
    callbacks = {},
) => {
    setupGroupCacheListeners(Malvin);

    Malvin.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "connecting") {
            console.log("🕗 Connecting Bot...");
            reconnectAttempts = 0;
        }

        if (connection === "open") {
            console.log("✅ Connection Instance is Online");
            reconnectAttempts = 0;

            if (callbacks.onOpen) {
                await callbacks.onOpen(Malvin);
            }
        }

        if (connection === "close") {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.log(`Connection closed due to: ${reason}`);

            const handleReconnect = () => {
                if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.error(
                        "Max reconnection attempts reached. Exiting...",
                    );
                    process.exit(1);
                }
                reconnectAttempts++;
                const delay = Math.min(
                    RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1),
                    300000,
                );
                console.log(
                    `🕗 Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`,
                );
                setTimeout(() => startMalvin(), delay);
            };

            switch (reason) {
                case DisconnectReason.badSession:
                    console.log(
                        "Bad session file, automatically deleted...please scan again",
                    );
                    try {
                        await fs.remove(sessionDir);
                    } catch (e) {
                        console.error("Failed to remove session:", e);
                    }
                    process.exit(1);
                    break;

                case DisconnectReason.connectionReplaced:
                    console.log(
                        "Connection replaced, another new session opened",
                    );
                    process.exit(1);
                    break;

                case DisconnectReason.loggedOut:
                    console.log(
                        "Device logged out, session file automatically deleted...please scan again",
                    );
                    try {
                        await fs.remove(sessionDir);
                    } catch (e) {
                        console.error("❌ Failed to remove session:", e);
                    }
                    process.exit(1);
                    break;

                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                case DisconnectReason.restartRequired:
                    console.log("🕗 Reconnecting...");
                    handleReconnect();
                    break;

                case DisconnectReason.timedOut:
                    console.log("Connection timed out, reconnecting...");
                    setTimeout(() => handleReconnect(), RECONNECT_DELAY * 2);
                    break;

                default:
                    console.log(
                        `Unknown disconnect reason: ${reason}, attempting reconnection...`,
                    );
                    handleReconnect();
            }
        }
    });
};

module.exports = {
    safeNewsletterFollow,
    safeGroupAcceptInvite,
    setupConnectionHandler,
    RECONNECT_DELAY,
    MAX_RECONNECT_ATTEMPTS,
};
