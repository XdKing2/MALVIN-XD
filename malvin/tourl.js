const { mxd } = require("../king");
const path = require("path");
const fs = require('fs').promises;
const { sendButtons } = require('malvin-btns');

mxd({
    pattern: "catbox",
    react: "⬆️",
    category: "uploader",
    description: "Upload any file to Catbox",
}, async (from, Malvin, conText) => {
    await handleUpload(from, Malvin, conText, 'catbox');
});

mxd({
    pattern: "pixhost",
    react: "🖼️",
    category: "uploader",
    description: "Upload images to Pixhost",
}, async (from, Malvin, conText) => {
    await handleUpload(from, Malvin, conText, 'pixhost');
});

mxd({
    pattern: "imgbb",
    react: "📷",
    category: "uploader",
    description: "Upload images to ImgBB",
}, async (from, Malvin, conText) => {
    await handleUpload(from, Malvin, conText, 'imgbb');
});

async function handleUpload(from, Malvin, conText, service) {
    const { mek, reply, react, botFooter, botPrefix, quoted, getMediaBuffer, uploadToPixhost, getFileContentType, uploadToImgBB, uploadToCatbox, pushName, t } = conText;

    if (!quoted) {
        return reply(t('upload.reply_media'));
    }

    const quotedMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quotedMsg) {
        return reply(t('upload.no_quoted'));
    }

    const quotedImg = quotedMsg?.imageMessage || quotedMsg?.message?.imageMessage;
    const quotedVideo = quotedMsg?.videoMessage || quotedMsg?.message?.videoMessage;
    const quotedAudio = quotedMsg?.audioMessage || quotedMsg?.message?.audioMessage;
    const quotedSticker = quotedMsg?.stickerMessage || quotedMsg?.message?.stickerMessage;
    const quotedDocument = quotedMsg?.documentMessage || quotedMsg?.message?.documentMessage;

    try {
        let buffer;
        let fileExt = '';
        let fileName = 'file';
        let isImage = false;
        let mimetype;
        let mediaType;

        if (quotedImg) {
            buffer = await getMediaBuffer(quotedImg, "image");
            fileExt = '.jpg';
            fileName = `image${fileExt}`;
            isImage = true;
            mimetype = "image/jpeg";
            mediaType = 'image';
        } 
        else if (quotedVideo) {
            if (service !== 'catbox') {
                return reply(t('upload.image_only', { service, prefix: botPrefix, type: 'videos' }));
            }
            buffer = await getMediaBuffer(quotedVideo, "video");
            fileExt = '.mp4';
            fileName = `video${fileExt}`;
            mimetype = "video/mp4";
            mediaType = 'video';
        } 
        else if (quotedAudio) {
            if (service !== 'catbox') {
                return reply(t('upload.image_only', { service, prefix: botPrefix, type: 'audios' }));
            }
            buffer = await getMediaBuffer(quotedAudio, "audio");
            fileExt = '.mp3';
            fileName = `audio${fileExt}`;
            mimetype = "audio/mpeg";
            mediaType = 'audio';
        } 
        else if (quotedSticker) {
            if (service === 'pixhost') {
                return reply(t('upload.no_stickers', { service, prefix: botPrefix }));
            }
            buffer = await getMediaBuffer(quotedSticker, "sticker");
            fileExt = '.webp';
            fileName = `sticker${fileExt}`;
            isImage = true;
            mimetype = "image/webp";
            mediaType = 'sticker';
        } 
        else if (quotedDocument) {
            if (service !== 'catbox') {
                return reply(t('upload.image_only', { service, prefix: botPrefix, type: 'documents' }));
            }
            buffer = await getMediaBuffer(quotedDocument, "document");
            fileExt = quotedDocument.fileName ? path.extname(quotedDocument.fileName).toLowerCase() : '.bin';
            fileName = quotedDocument.fileName || `document${fileExt}`;
            mimetype = getFileContentType(fileExt);
            mediaType = 'document';
        } else {
            return reply(t('upload.unsupported_type'));
        }

        if (!isImage && service !== 'catbox') {
            return reply(t('upload.image_files_only', { service, prefix: botPrefix }));
        }

        let uploadResult;
        switch (service) {
            case 'catbox':
                uploadResult = await uploadToCatbox(buffer, fileName);
                break;
            case 'pixhost':
                uploadResult = await uploadToPixhost(buffer, fileName);
                break;
            case 'imgbb':
                uploadResult = await uploadToImgBB(buffer, fileName);
                break;
            default:
                throw new Error('Invalid upload service');
        }

        const fileSizeMB = buffer.length / (1024 * 1024);
        const fileTypeName = fileExt ? fileExt.replace('.', '').toUpperCase() : 'UNKNOWN';

        const caption = t('upload.caption', {
            user: pushName,
            type: fileTypeName,
            size: fileSizeMB.toFixed(2),
            link: uploadResult.url,
            expiry: t('upload.no_expiry'),
        });

        await sendButtons(Malvin, from, {
            title: '',
            text: caption,
            footer: `> *${botFooter}*`,
            buttons: [
                { 
                    name: 'cta_copy', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: t('upload.copy_url'), 
                        copy_code: uploadResult.url 
                    }) 
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: t('upload.open_link'),
                        url: uploadResult.url
                    })
                }
            ]
        });

        await react("✅");
        
    } catch (error) {
        console.error("Upload Error:", error);
        await reply(t('upload.failed', { service, error: error.message }));
        await react("❌");
    }
}
