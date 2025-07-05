const { malvin } = require("../malvin");

// Command: biblelist
malvin({
    pattern: "biblelist",
    alias: ["biblebooks", "listbible", "blist"], // Added aliases
    desc: "Get the complete list of books in the Bible.",
    category: "download",
    react: "📜",
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    try {
        // List of Bible books
        const bibleList = `
📜 *Old Testament*:
1. Genesis
2. Exodus
3. Leviticus
4. Numbers
5. Deuteronomy
6. Joshua
7. Judges
8. Ruth
9. 1 Samuel
10. 2 Samuel
11. 1 Kings
12. 2 Kings
13. 1 Chronicles
14. 2 Chronicles
15. Ezra
16. Nehemiah
17. Esther
18. Job
19. Psalms
20. Proverbs
21. Ecclesiastes
22. Song of Solomon
23. Isaiah
24. Jeremiah
25. Lamentations
26. Ezekiel
27. Daniel
28. Hosea
29. Joel
30. Amos
31. Obadiah
32. Jonah
33. Micah
34. Nahum
35. Habakkuk
36. Zephaniah
37. Haggai
38. Zechariah
39. Malachi

📖 *New Testament*:
1. Matthew
2. Mark
3. Luke
4. John
5. Acts
6. Romans
7. 1 Corinthians
8. 2 Corinthians
9. Galatians
10. Ephesians
11. Philippians
12. Colossians
13. 1 Thessalonians
14. 2 Thessalonians
15. 1 Timothy
16. 2 Timothy
17. Titus
18. Philemon
19. Hebrews
20. James
21. 1 Peter
22. 2 Peter
23. 1 John
24. 2 John
25. 3 John
26. Jude
27. Revelation

> ©️ʙʏ ᴍᴀʟᴠɪɴ xᴅ ᴠ3❤☑
`;

        // Image URL
        const imageUrl = "https://files.catbox.moe/kx30st.jpeg"; // Replace with the actual image URL

        // Check if the chat is valid
        if (!m.chat) {
            return reply("❌ *An error occurred: Invalid chat.*");
        }

        // Send the response with the image and Bible list
        await conn.sendMessage(m.chat, {
            image: { url: imageUrl },
            caption: `📖 *Bible List By Malvin xᴅ*:\n\n` +
                     `Here is the complete list of books in the Bible:\n\n` +
                     bibleList.trim() // Added the Bible list text
        }, { quoted: mek });
    } catch (error) {
        console.error(error);
        reply("❌ *An error occurred while fetching the Bible list. Please try again.*");
    }
});
