const { getContentType, downloadContentFromMessage, downloadMediaMessage } = require('mrxd-baileys');
const { getLidMapping } = require('./groupStore');
const { fancy } = require("../fancyFont");

const standardizeJid = (jid) => {
    if (!jid) return '';
    try {
        jid = typeof jid === 'string' ? jid : 
            (jid.decodeJid ? jid.decodeJid() : String(jid));
        jid = jid.split(':')[0].split('/')[0];
        if (!jid.includes('@')) {
            jid += '@s.whatsapp.net';
        } else if (jid.endsWith('@lid')) {
            return jid.toLowerCase();
        }
        return jid.toLowerCase();
    } catch (e) {
        console.error('JID standardization error:', e);
        return '';
    }
};

const convertLidToJid = (lid) => {
    if (!lid) return '';
    if (!lid.endsWith('@lid')) return lid;
    const cached = getLidMapping(lid);
    if (cached) return cached;
    return lid;
};

const serializeMessage = async (ms, Malvin, settings = {}) => {
    if (!ms?.message || !ms?.key) return null;

    const botId = standardizeJid(Malvin.user?.id);
    const type = getContentType(ms.message);
    
    const hasEntryPointContext = 
        ms.message?.extendedTextMessage?.contextInfo?.entryPointConversionApp === 'whatsapp' ||
        ms.message?.imageMessage?.contextInfo?.entryPointConversionApp === 'whatsapp' ||
        ms.message?.videoMessage?.contextInfo?.entryPointConversionApp === 'whatsapp' ||
        ms.message?.documentMessage?.contextInfo?.entryPointConversionApp === 'whatsapp' ||
        ms.message?.audioMessage?.contextInfo?.entryPointConversionApp === 'whatsapp';

    const isMessageYourself = hasEntryPointContext && ms.key.remoteJid.endsWith('@lid') && ms.key.fromMe;
    const from = isMessageYourself ? botId : standardizeJid(ms.key.remoteJid);
    const isGroup = from.endsWith('@g.us');
    
    const sendr = ms.key.fromMe 
        ? (Malvin.user.id.split(':')[0] + '@s.whatsapp.net' || Malvin.user.id) 
        : (ms.key.senderPn || ms.key.participantPn || ms.key.participantAlt || ms.key.remoteJidAlt || ms.key.remoteJid || ms.key.participant);
    
    let body = '';
    let isButtonResponse = false;
    let buttonId = null;
    
    if (ms.message?.interactiveResponseMessage) {
        isButtonResponse = true;
        try {
            const paramsJson = ms.message.interactiveResponseMessage.nativeFlowResponseMessage?.paramsJson;
            if (paramsJson) {
                buttonId = JSON.parse(paramsJson)?.id || null;
            }
        } catch (e) {
            buttonId = null;
        }
        if (!buttonId) {
            buttonId = ms.message.interactiveResponseMessage.buttonId || null;
        }
        body = buttonId || ms.message.interactiveResponseMessage?.body?.text || '';
    } else if (ms.message?.buttonsResponseMessage?.selectedButtonId) {
        isButtonResponse = true;
        buttonId = ms.message.buttonsResponseMessage.selectedButtonId;
        body = buttonId;
    } else if (ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId) {
        isButtonResponse = true;
        buttonId = ms.message.listResponseMessage.singleSelectReply.selectedRowId;
        body = buttonId;
    } else if (ms.message?.templateButtonReplyMessage?.selectedId) {
        isButtonResponse = true;
        buttonId = ms.message.templateButtonReplyMessage.selectedId;
        body = buttonId;
    } else if (type === 'conversation') {
        body = ms.message.conversation;
    } else if (type === 'extendedTextMessage') {
        body = ms.message.extendedTextMessage.text;
    } else if (type === 'imageMessage' && ms.message.imageMessage.caption) {
        body = ms.message.imageMessage.caption;
    } else if (type === 'videoMessage' && ms.message.videoMessage.caption) {
        body = ms.message.videoMessage.caption;
    }

    const botPrefix = settings.PREFIX || '.';
    const isCommand = body.startsWith(botPrefix);
    const command = isCommand ? body.slice(botPrefix.length).trim().split(' ').shift().toLowerCase() : '';
    const args = typeof body === 'string' ? body.trim().split(/\s+/).slice(1) : [];

    const repliedMessage = ms.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
    const quoted = type == 'extendedTextMessage' && 
        ms.message.extendedTextMessage.contextInfo != null 
        ? ms.message.extendedTextMessage.contextInfo.quotedMessage || [] 
        : [];
    
    const mentionedJid = (ms.message?.extendedTextMessage?.contextInfo?.mentionedJid || []).map(standardizeJid);
    const tagged = ms.mtype === 'extendedTextMessage' && ms.message.extendedTextMessage.contextInfo != null
        ? ms.message.extendedTextMessage.contextInfo.mentionedJid
        : [];
    
    const contextInfo = ms.message?.extendedTextMessage?.contextInfo || 
        ms.message?.imageMessage?.contextInfo ||
        ms.message?.videoMessage?.contextInfo ||
        ms.message?.audioMessage?.contextInfo ||
        ms.message?.documentMessage?.contextInfo ||
        ms.message?.stickerMessage?.contextInfo || null;
    
    const quotedMsg = contextInfo?.quotedMessage || null;
    const rawQuotedUser = contextInfo?.participant || contextInfo?.remoteJid;
    const quotedUser = convertLidToJid(standardizeJid(rawQuotedUser));
    const repliedMessageAuthor = convertLidToJid(standardizeJid(contextInfo?.participant));
    
    const quotedStanzaId = contextInfo?.stanzaId || null;
    const quotedKey = quotedStanzaId ? {
        remoteJid: from,
        fromMe: rawQuotedUser === botId || contextInfo?.participant === botId,
        id: quotedStanzaId,
        participant: isGroup ? rawQuotedUser : undefined
    } : null;
    
    let messageAuthor = isGroup 
        ? standardizeJid(ms.key.participant || ms.participant || from)
        : from;
    if (ms.key.fromMe) messageAuthor = botId;
    
    const user = mentionedJid.length > 0 
        ? mentionedJid[0] 
        : repliedMessage 
            ? repliedMessageAuthor 
            : '';

    return {
        ms,
        mek: ms,
        type,
        from,
        isGroup,
        sender: sendr,
        botId,
        body,
        isCommand,
        command,
        args,
        q: args.join(' '),
        pushName: ms.pushName || (ms.key.fromMe ? Malvin.user?.name : null) || fancy("MXD USER", "mono"),
        quoted,
        repliedMessage,
        mentionedJid,
        tagged,
        quotedMsg,
        quotedKey,
        quotedUser,
        repliedMessageAuthor,
        messageAuthor,
        user,
        prefix: botPrefix,
        isButtonResponse,
        buttonId
    };
};

module.exports = {
    standardizeJid,
    convertLidToJid,
    serializeMessage,
    downloadMediaMessage
};
