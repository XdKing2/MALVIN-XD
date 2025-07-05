const { malvin } = require("../malvin");
const googleTTS = require('google-tts-api'); 

malvin({
  pattern: "tts2",
  desc: "Convert text to speech with different voices.",
  category: "convert",
  react: "🔊",
  filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
  try {
    // Ensure there is text
    if (!q) {
      return reply("Please provide text for conversion! Usage: `.tts <text>`");
    }

    // Select voice language based on user input or default to a male voice
    let voiceLanguage = 'en-US'; // Default language is American English with a male voice
    let selectedVoice = 'male';  // Default voice type (we assume it's male by default)

    // Check if user wants a different language or voice
    if (args[0] === "male") {
      voiceLanguage = 'en-US'; // Use American male voice
    } else if (args[0] === "female") {
      voiceLanguage = 'en-GB'; // Use British female voice
      selectedVoice = 'female';
    } else if (args[0] === "loud") {
      voiceLanguage = 'en-US'; // Default male voice, but let's interpret "loud" as normal speech speed.
    } else if (args[0] === "deep") {
      voiceLanguage = 'en-US'; // Deep male voice (still has limitations with `google-tts-api`)
    } else {
      voiceLanguage = 'en-US'; // Default fallback
    }

    // Generate the URL for the TTS audio
    const url = googleTTS.getAudioUrl(q, {
      lang: voiceLanguage,  // Choose language based on selected voice
      slow: false,  // Normal speed for the speech
      host: 'https://translate.google.com'
    });

    // Send the audio message to the user
    await conn.sendMessage(from, { 
      audio: { url: url }, 
      mimetype: 'audio/mpeg', 
      ptt: true 
    }, { quoted: mek });

  } catch (error) {
    console.error(error);
    reply(`Error: ${error.message}`);
  }
});


malvin({
  pattern: "tts3",
  desc: "Convert text to speech with different voices.",
  category: "convert",
  react: "🔊",
  filename: __filename
},
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
  try {
    // Ensure there is text
    if (!q) {
      return reply("Please provide text for conversion! Usage: `.tts2 <text>`");
    }

    // Set default language
    let voiceLanguage = 'en-US'; // Default language is American English

    // Check if user specifies Urdu language
    if (args[0] === "ur" || args[0] === "urdu") {
      voiceLanguage = 'ur'; // Set language to Urdu
    }

    // Generate the URL for the TTS audio
    const url = googleTTS.getAudioUrl(q, {
      lang: voiceLanguage,  // Choose language based on input
      slow: false,  // Normal speed for the speech
      host: 'https://translate.google.com'
    });

    // Send the audio message to the user
    await conn.sendMessage(from, { 
      audio: { url: url }, 
      mimetype: 'audio/mpeg', 
      ptt: true 
    }, { quoted: mek });

  } catch (error) {
    console.error(error);
    reply(`Error: ${error.message}`);
  }
});