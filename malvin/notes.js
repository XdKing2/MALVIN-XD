const { mxd } = require("../king");
const {
    initNotesDB,
    addNote,
    getNote,
    getAllNotes,
    updateNote,
    deleteNote,
    deleteAllNotes,
} = require("../king/database/notesDb");
const { getContextInfo } = require("../king/msgContext");
const { sendButtons } = require("malvin-btns");

const more = String.fromCharCode(8206);
const readmore = more.repeat(4001);

initNotesDB();

function getUserName(jid) {
    return jid.split("@")[0];
}

mxd(
    {
        pattern: "notes",
        react: "📝",
        category: "notes",
        description: "Show all notes commands",
    },
    async (from, Malvin, conText) => {
        const { botPrefix, t } = conText;
        const helpText = t("notes.help_text", { prefix: botPrefix });

        return await Malvin.sendMessage(from, {
            text: helpText,
            contextInfo: await getContextInfo(),
        });
    },
);

mxd(
    {
        pattern: "addnote",
        aliases: ["newnote", "makenote", "createnote"],
        react: "📝",
        category: "notes",
        description: "Add a new note",
    },
    async (from, Malvin, conText) => {
        const { sender, args, quoted, botPrefix, t } = conText;

        let noteContent = args.join(" ").trim();

        if (!noteContent && quoted) {
            const quotedMsg = quoted.message || quoted;
            if (quotedMsg.conversation) {
                noteContent = quotedMsg.conversation;
            } else if (quotedMsg.extendedTextMessage?.text) {
                noteContent = quotedMsg.extendedTextMessage.text;
            } else if (quotedMsg.imageMessage?.caption) {
                noteContent = quotedMsg.imageMessage.caption;
            } else if (quotedMsg.videoMessage?.caption) {
                noteContent = quotedMsg.videoMessage.caption;
            }
        }

        if (!noteContent) {
            return await Malvin.sendMessage(from, {
                text: t("notes.provide_content", { user: getUserName(sender), prefix: botPrefix }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        const note = await addNote(sender, noteContent);
        const preview = note.content.length > 30 ? note.content.slice(0, 30) + "..." : note.content;
        return await Malvin.sendMessage(from, {
            text: t("notes.saved", { user: getUserName(sender), number: note.noteNumber, preview }),
            contextInfo: await getContextInfo([sender]),
        });
    },
);

mxd(
    {
        pattern: "getnote",
        aliases: ["listnote", "viewnote", "shownote"],
        react: "📄",
        category: "notes",
        description: "Get a specific note by number",
    },
    async (from, Malvin, conText) => {
        const { sender, q, botPrefix, botFooter, t } = conText;

        if (!q || isNaN(parseInt(q))) {
            return await Malvin.sendMessage(from, {
                text: t("notes.provide_number", { user: getUserName(sender), prefix: botPrefix }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        const noteNumber = parseInt(q);
        const note = await getNote(sender, noteNumber);

        if (!note) {
            return await Malvin.sendMessage(from, {
                text: t("notes.not_found", { user: getUserName(sender), number: noteNumber }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        const MAX_NOTE = 300;
        const content = note.content;
        let displayContent;
        if (content.length > MAX_NOTE) {
            const visible = content.slice(0, MAX_NOTE);
            const hidden = content.slice(MAX_NOTE);
            displayContent = `${visible}${readmore}${hidden}`;
        } else {
            displayContent = content;
        }

        const text = t("notes.view", {
            number: note.noteNumber,
            content: displayContent,
            date: note.createdAt.toLocaleString(),
        });

        await sendButtons(Malvin, from, {
            text,
            footer: botFooter,
            buttons: [
                {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                        display_text: t("notes.copy_button"),
                        copy_code: content,
                    }),
                },
            ],
        });
    },
);

mxd(
    {
        pattern: "getnotes",
        aliases: [
            "getallnotes",
            "listnotes",
            "allnotes",
            "mynotes",
            "viewnotes",
        ],
        react: "📋",
        category: "notes",
        description: "Get all your notes",
    },
    async (from, Malvin, conText) => {
        const { sender, botPrefix, t } = conText;

        const notes = await getAllNotes(sender);

        if (notes.length === 0) {
            return await Malvin.sendMessage(from, {
                text: t("notes.none_yet", { user: getUserName(sender), prefix: botPrefix }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        let text = t("notes.list_header", { user: getUserName(sender), count: notes.length });
        notes.forEach((note) => {
            const preview =
                note.content.length > 50
                    ? note.content.substring(0, 50) + "..."
                    : note.content;
            text += `*#${note.noteNumber}* - ${preview}\n`;
        });
        text += t("notes.list_footer", { prefix: botPrefix });

        return await Malvin.sendMessage(from, {
            text,
            contextInfo: await getContextInfo([sender]),
        });
    },
);

mxd(
    {
        pattern: "updatenote",
        aliases: ["editnote", "modifynote"],
        react: "✏️",
        category: "notes",
        description: "Update an existing note",
    },
    async (from, Malvin, conText) => {
        const { sender, q, botPrefix, t } = conText;

        if (!q || q.trim() === "") {
            return await Malvin.sendMessage(from, {
                text: t("notes.provide_update", { user: getUserName(sender), prefix: botPrefix }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        const parts = q.trim().split(/\s+/);
        const noteNumber = parseInt(parts[0]);

        if (isNaN(noteNumber)) {
            return await Malvin.sendMessage(from, {
                text: t("notes.invalid_number", { user: getUserName(sender), prefix: botPrefix }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        const newContent = parts.slice(1).join(" ");
        if (!newContent) {
            return await Malvin.sendMessage(from, {
                text: t("notes.provide_new_content", { user: getUserName(sender), prefix: botPrefix }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        const note = await updateNote(sender, noteNumber, newContent);

        if (!note) {
            return await Malvin.sendMessage(from, {
                text: t("notes.not_found", { user: getUserName(sender), number: noteNumber }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        return await Malvin.sendMessage(from, {
            text: t("notes.updated", { user: getUserName(sender), number: note.noteNumber, content: note.content }),
            contextInfo: await getContextInfo([sender]),
        });
    },
);

mxd(
    {
        pattern: "delnote",
        aliases: ["deletenote", "removenote", "rmnote"],
        react: "🗑️",
        category: "notes",
        description: "Delete a specific note",
    },
    async (from, Malvin, conText) => {
        const { sender, q, botPrefix, t } = conText;

        if (!q || isNaN(parseInt(q))) {
            return await Malvin.sendMessage(from, {
                text: t("notes.provide_delete_number", { user: getUserName(sender), prefix: botPrefix }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        const noteNumber = parseInt(q);
        const deleted = await deleteNote(sender, noteNumber);

        if (!deleted) {
            return await Malvin.sendMessage(from, {
                text: t("notes.not_found", { user: getUserName(sender), number: noteNumber }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        return await Malvin.sendMessage(from, {
            text: t("notes.deleted", { user: getUserName(sender), number: noteNumber }),
            contextInfo: await getContextInfo([sender]),
        });
    },
);

mxd(
    {
        pattern: "delallnotes",
        aliases: ["deleteallnotes", "removeallnotes", "clearnotes", "delnotes"],
        react: "🗑️",
        category: "notes",
        description: "Delete all your notes",
    },
    async (from, Malvin, conText) => {
        const { sender, t } = conText;

        const count = await deleteAllNotes(sender);

        if (count === 0) {
            return await Malvin.sendMessage(from, {
                text: t("notes.none_to_delete", { user: getUserName(sender) }),
                contextInfo: await getContextInfo([sender]),
            });
        }

        return await Malvin.sendMessage(from, {
            text: t("notes.deleted_all", { user: getUserName(sender), count, plural: count > 1 ? "s" : "" }),
            contextInfo: await getContextInfo([sender]),
        });
    },
);

module.exports = {};
