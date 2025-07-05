const {malvin , commands} = require('../malvin')
const Jimp = require("jimp");
var { S_WHATSAPP_NET } = require('@whiskeysockets/baileys');
const Baileys = require('@whiskeysockets/baileys');

malvin({
    pattern: "pp",
    desc: "changes profile picture.",
    category: "owner",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {

try {
  // Download and save media message
  let ig = await m.quoted.download();
  
  // Read image using Jimp
  const jimp = await Jimp.read(ig),
    min = jimp.getWidth(),
    max = jimp.getHeight(),
    cropped = jimp.crop(0, 0, min, max);
  
  // Process the image
  const img = await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG);
  const preview = await cropped.normalize().getBufferAsync(Jimp.MIME_JPEG);

  // Send profile picture update
  await conn.query({
    tag: 'iq',
    attrs: {
      //target: conn.user.jid,
      to: S_WHATSAPP_NET,
      type: 'set',
      xmlns: 'w:profile:picture',
    },
    content: [
      {
        tag: 'picture',
        attrs: { type: 'image' },
        content: img,
      },
    ],
  });
  
  return m.reply( "done"); // Success return value
} catch (err) {
  console.error('Error:', err);
  return err; // Error return value
}

})
