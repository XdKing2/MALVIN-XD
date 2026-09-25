const { mxd, copyFolderSync } = require("../king");
const { mrxd } = require("../king/mrxd");
const {
    getLidMapping,
    getGroupMetadata,
} = require("../king/socket/groupStore");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

// ==================== UPDATE ====================

mxd(
    {
        pattern: "update",
        alias: ["updatenow", "updt", "sync", "update now"],
        react: "🆕",
        desc: "Update the bot to the latest version.",
        category: "owner",
        filename: __filename,
    },
    async (from, Malvin, conText) => {
        const {
            q,
            mek,
            react,
            reply,
            isSuperUser,
            setCommitHash,
            getCommitHash,
            malvinRepo,
        } = conText;

        if (!isSuperUser) {
            await react("❌");
            return reply("❌ Owner Only Command!");
        }

        try {
            await reply("🔍 Checking for New Updates...");

            const { data: commitData } = await axios.get(
                `https://api.github.com/repos/${malvinRepo}/commits/main`,
            );
            const latestCommitHash = commitData.sha;

            const currentHash = await getCommitHash();

            if (latestCommitHash === currentHash) {
                return reply("✅ Your Bot is Already on the Latest Version!");
            }

            const authorName = commitData.commit.author.name;
            const authorEmail = commitData.commit.author.email;
            const commitDate = new Date(
                commitData.commit.author.date,
            ).toLocaleString();
            const commitMessage = commitData.commit.message;

            await reply(
                `🔄 Updating Bot...\n\n*Commit Details:*\n👤 Author: ${authorName} (${authorEmail})\n📅 Date: ${commitDate}\n💬 Message: ${commitMessage}`,
            );

            const zipPath = path.join(__dirname, "..", "MALVIN-XD-main.zip"); // Replace this  with your bot name and branch if you're cloning
            const { data: zipData } = await axios.get(
                `https://github.com/${malvinRepo}/archive/main.zip`,
                { responseType: "arraybuffer" },
            );
            fs.writeFileSync(zipPath, zipData);

            const extractPath = path.join(__dirname, "..", "latest");
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);

            const sourcePath = path.join(extractPath, "MALVIN-XD-main"); // Replace this  with your bot name and branch if you're cloning
            const destinationPath = path.join(__dirname, "..");

            const excludeList = [
                ".env",
                "king/database/database.db",
                "king/session/session.db",
            ];

            copyFolderSync(sourcePath, destinationPath, excludeList);
            await setCommitHash(latestCommitHash);

            fs.unlinkSync(zipPath);
            fs.rmSync(extractPath, { recursive: true, force: true });

            await reply("✅ Update Complete! Bot is Restarting...");

            setTimeout(() => {
                process.exit(0);
            }, 2000);
        } catch (error) {
            console.error("Update error:", error);
            return reply(
                "❌ Update Failed. Please try by Redeploying Manually.",
            );
        }
    },
);

// ==================== WHATSAPP (onwa / vcf) ====================

function getUserName(jid) {
    return jid.split("@")[0];
}

function normalizeUserJid(jid) {
    if (!jid || typeof jid !== "string") return "";

    if (jid.endsWith("@lid")) {
        const mapped = getLidMapping(jid);
        if (mapped) return mapped;
    }

    let normalized = jid.split(":")[0].split("/")[0];
    if (!normalized.includes("@")) {
        normalized += "@s.whatsapp.net";
    }

    if (normalized.endsWith("@lid")) {
        const mapped = getLidMapping(normalized);
        if (mapped) return mapped;
    }

    return normalized;
}

mxd(
    {
        pattern: "onwa",
        aliases: ["onwhatsapp", "checkwa", "checknumber"],
        react: "🔍",
        category: "utility",
        description: "Check if a phone number is registered on WhatsApp",
    },
    async (from, Malvin, conText) => {
        const { sender, mek, reply, react, q, botPrefix, t } = conText;

        if (!q || q.trim() === "") {
            await react("❌");
            return reply(t("wa.provide_number", { prefix: botPrefix }));
        }

        const num = q.trim().replace(/[^0-9]/g, "");

        if (num.length < 7 || num.length > 15) {
            await react("❌");
            return reply(t("wa.invalid_format", { prefix: botPrefix }));
        }

        await react("⏳");

        try {
            const [result] = await Malvin.onWhatsApp(num);

            if (result && result.exists) {
                await react("✅");
                return reply(t("wa.found", { number: num, jid: result.jid }));
            } else {
                await react("❌");
                return reply(t("wa.not_found", { number: num }));
            }
        } catch (err) {
            await react("⚠️");
            return reply(t("wa.verify_error", { number: num, error: err.message }));
        }
    },
);

mxd(
    {
        pattern: "vcf",
        aliases: ["contacts", "savecontact", "scontact", "savecontacts"],
        react: "📇",
        category: "group",
        description: "Export all group participants as VCF contact file",
        isGroup: true,
    },
    async (from, Malvin, conText) => {
        const { sender, mek, reply, react, t } = conText;

        await react("⏳");

        try {
            const groupMetadata = await getGroupMetadata(Malvin, from);
            const participants = groupMetadata?.participants || [];
            const groupName = groupMetadata?.subject || "Group";

            if (participants.length === 0) {
                await react("❌");
                return reply(t("vcf.no_participants"));
            }

            let vcfContent = "";
            let index = 1;

            for (const member of participants) {
                const jid = member.jid || member.pn || member.id;
                if (!jid || typeof jid !== "string") continue;

                const phoneJid = jid.includes("@s.whatsapp.net")
                    ? jid
                    : normalizeUserJid(jid);
                if (!phoneJid || !phoneJid.includes("@s.whatsapp.net"))
                    continue;

                const id = phoneJid.split("@")[0];
                vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:[${index++}] +${id}\nTEL;type=CELL;type=VOICE;waid=${id}:+${id}\nEND:VCARD\n`;
            }

            const count = index - 1;

            if (count === 0) {
                await react("❌");
                return reply(t("vcf.no_valid_contacts"));
            }

            const fileName = `${groupName}.vcf`;

            await Malvin.sendMessage(
                from,
                {
                    document: Buffer.from(vcfContent.trim(), "utf-8"),
                    mimetype: "text/vcard",
                    fileName: fileName,
                    caption: t("vcf.caption", { groupName, count }),
                },
                { quoted: mrxd },
            );

            await react("✅");
        } catch (err) {
            await react("❌");
            return reply(t("vcf.export_failed", { error: err.message }));
        }
    },
);
