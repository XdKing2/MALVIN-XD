const fs = require('fs');
const config = require('../settings')
const { malvin, commands } = require('../malvin')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')



//vcf//

malvin({
    pattern: 'savecontact',
    alias: ["vcf","scontact","savecontacts"],
    desc: 'gc vcard',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        if (!isGroup) return reply("This command is for groups only.");
        if (!isOwner) return reply("*_This command is for the owner only_*");

        let card = quoted || m; // Handle if quoted message exists
        let cmiggc = groupMetadata;
        const { participants } = groupMetadata;
        
        let orgiggc = participants.map(a => a.id);
        let vcard = '';
        let noPort = 0;
        
        for (let a of cmiggc.participants) {
            vcard += `BEGIN:VCARD\nVERSION:3.0\nFN:[${noPort++}] +${a.id.split("@")[0]}\nTEL;type=CELL;type=VOICE;waid=${a.id.split("@")[0]}:+${a.id.split("@")[0]}\nEND:VCARD\n`;
        }

        let nmfilect = './contacts.vcf';
        reply('Saving ' + cmiggc.participants.length + ' participants contact');

        fs.writeFileSync(nmfilect, vcard.trim());
        await sleep(2000);

        await conn.sendMessage(from, {
            document: fs.readFileSync(nmfilect), 
            mimetype: 'text/vcard', 
            fileName: 'MalvinTech.vcf', 
            caption: `\nDone saving.\nGroup Name: *${cmiggc.subject}*\nContacts: *${cmiggc.participants.length}*\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴍᴀʟᴠɪɴ-xᴅ ᴛᴇᴄʜ`}, { quoted: mek });

        fs.unlinkSync(nmfilect); // Cleanup the file after sending
    } catch (err) {
        reply(err.toString());
    }
});


