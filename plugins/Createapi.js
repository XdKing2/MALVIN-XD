const { malvin } = require('../malvin');
const axios = require('axios');

malvin({
    pattern: "createapi",
    desc: "Create a custom API endpoint",
    alias: ["makeapi", "apimaker"],
    category: "other",
    react: "🌐",
    filename: __filename
}, async (conn, mek, m, { from, quoted, args, q, reply }) => {
    try {
        if (!q) {
            return reply(`
*🌐 API CREATOR GUIDE*

🔹 Usage: .createapi <METHOD> <ENDPOINT> <RESPONSE_TYPE>

📌 *Examples:*
.createapi GET /users json
.createapi POST /create-user json
.createapi PUT /update-product json

📝 *Parameters:*
- METHOD: GET, POST, PUT, DELETE
- ENDPOINT: Must start with '/'
- RESPONSE_TYPE: json, text, xml
`);
        }

        // Parse input safely
        const parts = q.split(/\s+/);
        if (parts.length < 3) {
            return reply("⚠️ *Invalid format!* Use: `.createapi <METHOD> <ENDPOINT> <RESPONSE_TYPE>`");
        }

        const [method, endpoint, responseType] = parts;

        // Validate method
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
        if (!validMethods.includes(method.toUpperCase())) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`⚠️ *Invalid method!* Choose from: ${validMethods.join(', ')}`);
        }

        // Validate endpoint format
        if (!endpoint.startsWith('/')) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("⚠️ *Endpoint must start with '/'* (e.g., `/users`)");
        }

        // Validate response type
        const validResponseTypes = ['json', 'text', 'xml'];
        if (!validResponseTypes.includes(responseType.toLowerCase())) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply(`⚠️ *Invalid response type!* Choose from: ${validResponseTypes.join(', ')}`);
        }

        // React to show processing
        await m.react("🔧");

        // Generate API details
        const apiStructure = {
            method: method.toUpperCase(),
            endpoint: endpoint,
            responseType: responseType.toLowerCase(),
            createdAt: new Date().toISOString(),
            status: "draft"
        };

        // Create response template
        const responseTemplates = {
            json: { status: true, message: "API endpoint created successfully", data: {} },
            text: "API endpoint created successfully",
            xml: `<?xml version="1.0" encoding="UTF-8"?><api><status>true</status><message>API endpoint created successfully</message></api>`
        };

        // Select correct response format
        const responseTemplate = responseTemplates[responseType.toLowerCase()];

        // Auto-generate API implementation
        const apiCode = `
// ${apiStructure.method} ${apiStructure.endpoint}
app.${apiStructure.method.toLowerCase()}('${apiStructure.endpoint}', (req, res) => {
    try {
        // Your API logic here
        res.${apiStructure.responseType}(${JSON.stringify(responseTemplate, null, 2)});
    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
});
`;

        // Send API details to the user
        await reply(`
*🌐 API ENDPOINT CREATED*

📍 Method: *${apiStructure.method}*
🔗 Endpoint: *${apiStructure.endpoint}*
📦 Response Type: *${apiStructure.responseType}*
⏰ Created: *${apiStructure.createdAt}*

*📝 Sample Implementation:*
\`\`\`javascript
${apiCode}
\`\`\`

*📋 Sample Response:*
\`\`\`${apiStructure.responseType}
${JSON.stringify(responseTemplate, null, 2)}
\`\`\`
`);

        // React to successful completion
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (error) {
        console.error("API Creation Error:", error);
        
        // React to error
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        
        // Send error message
        await reply(`
❌ *API Creation Failed*
🔍 Error: ${error.message}
📝 Please try again
`);
    }
});
