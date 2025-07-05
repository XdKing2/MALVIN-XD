const { malvin } = require('../malvin');
const crypto = require('crypto');
const webp = require('node-webpmux');
const axios = require('axios');
const fs = require('fs-extra');
const { exec } = require('child_process');
const { Sticker, createSticker, StickerTypes } = require("wa-sticker-formatter");
const Config = require('../settings');

// Take Sticker 

malvin(
    {
        pattern: 'take',
        alias: ['rename', 'stake'],
        desc: 'Create a sticker with a custom pack name.',
        category: 'owner',
        use: '<reply media or URL>',
        filename: __filename,
    },
    async (conn, mek, m, { quoted, args, q, reply, from }) => {
        if (!mek.quoted) return reply(`*Reply to any sticker.*`);
        if (!q) return reply(`*Please provide a pack name using .take <packname>*`);

        let mime = mek.quoted.mtype;
        let pack = q;

        if (mime === "imageMessage" || mime === "stickerMessage") {
            let media = await mek.quoted.download();
            let sticker = new Sticker(media, {
                pack: pack, 
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                id: "12345",
                quality: 75,
                background: 'transparent',
            });
            const buffer = await sticker.toBuffer();
            return conn.sendMessage(mek.chat, { sticker: buffer }, { quoted: mek });
        } else {
            return reply("*Uhh, Please reply to an image.*");
        }
    }
);

//Sticker create 

malvin(
    {
        pattern: 'sticker',
        alias: ['s', 'stickergif'],
        desc: 'Create a sticker from an image, video, or URL.',
        category: 'owner',
        use: '<reply media or URL>',
        filename: __filename,
    },
    async (conn, mek, m, { quoted, args, q, reply, from }) => {
        if (!mek.quoted) return reply(`*Reply to any Image or Video, Sir.*`);
        let mime = mek.quoted.mtype;
        let pack = Config.STICKER_NAME || "ᴍᴀʟᴠɪɴ-xᴅ";
        
        if (mime === "imageMessage" || mime === "stickerMessage") {
            let media = await mek.quoted.download();
            let sticker = new Sticker(media, {
                pack: pack, 
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"], 
                id: "12345",
                quality: 75, 
                background: 'transparent',
            });
            const buffer = await sticker.toBuffer();
            return conn.sendMessage(mek.chat, { sticker: buffer }, { quoted: mek });
        } else {
            return reply("*Uhh, Please reply to an image.*");
        }
    }
);

// ᴍᴀʟᴠɪɴ ᴛᴇᴄʜ🪀
