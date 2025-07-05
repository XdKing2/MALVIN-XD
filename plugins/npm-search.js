const axios = require("axios");
const { malvin } = require("../malvin");

malvin({
  pattern: "npm",
  desc: "Search for a package on npm.",
  react: '📦',
  category: "download",
  filename: __filename,
  use: ".npm <package-name>"
}, async (conn, mek, msg, { from, args, reply }) => {
  try {
    // Check if a package name is provided
    if (!args.length) {
      return reply("Please provide the name of the npm package you want to search for. Example: .npm express");
    }

    const packageName = args.join(" ");
    const apiUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

    // Fetch package details from npm registry
    const response = await axios.get(apiUrl);
    if (response.status !== 200) {
      throw new Error("Package not found or an error occurred.");
    }

    const packageData = response.data;
    const latestVersion = packageData["dist-tags"].latest;
    const description = packageData.description || "No description available.";
    const npmUrl = `https://www.npmjs.com/package/${packageName}`;
    const license = packageData.license || "Unknown";
    const repository = packageData.repository ? packageData.repository.url : "Not available";

    // Create the response message
    const message = `
*KHAN-MD NPM SEARCH*

*🔰 NPM PACKAGE:* ${packageName}
*📄 DESCRIPTION:* ${description}
*⏸️ LAST VERSION:* ${latestVersion}
*🪪 LICENSE:* ${license}
*🪩 REPOSITORY:* ${repository}
*🔗 NPM URL:* ${npmUrl}
`;

    // Send the message
    await conn.sendMessage(from, { text: message }, { quoted: mek });

  } catch (error) {
    console.error("Error:", error);

    // Send detailed error logs to WhatsApp
    const errorMessage = `
*❌ NPM Command Error Logs*

*Error Message:* ${error.message}
*Stack Trace:* ${error.stack || "Not available"}
*Timestamp:* ${new Date().toISOString()}
`;

    await conn.sendMessage(from, { text: errorMessage }, { quoted: mek });
    reply("An error occurred while fetching the npm package details.");
  }
});
