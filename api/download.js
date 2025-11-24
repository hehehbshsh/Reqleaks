// This file will act as your Vercel Serverless Function (the new backend proxy)
import fetch from 'node-fetch';

export default async function (req, res) {
    // 1. Get parameters from the request URL
    // Vercel serverless functions use req.query to access URL parameters
    const assetId = req.query.id;
    const filename = req.query.filename || 'default_asset.rbxm';

    // 2. Load the secret token from environment variables
    const ROBLOX_TOKEN = process.env.ROBLOX_TOKEN;
    
    if (!ROBLOX_TOKEN) {
        res.status(500).send("Server Configuration Error: ROBLOX_TOKEN not set on Vercel.");
        return;
    }

    const robloxUrl = `https://assetdelivery.roblox.com/v1/asset/?id=${assetId}`;
    const cookieHeader = `.ROBLOSECURITY=${ROBLOX_TOKEN}`;

    try {
        // 3. Make the authenticated request to Roblox
        const response = await fetch(robloxUrl, {
            method: 'GET',
            headers: {
                // 🕵️‍♀️ Spoof a User-Agent to bypass security checks
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
                // 🔑 Pass the authentication cookie
                'Cookie': cookieHeader
            },
            redirect: 'follow' // Follow redirects automatically
        });

        // 4. Check for authentication errors (Roblox returns the error as text/JSON)
        if (!response.ok) {
            const body = await response.text();
            if (body.includes('Authentication required to access Asset.')) {
                res.status(401).send("Authentication Failed! The security token has expired or is invalid. Update ROBLOX_TOKEN.");
            } else {
                res.status(response.status).send(`Roblox API Error: ${body}`);
            }
            return;
        }

        // 5. Set download headers (Renaming the file)
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // 6. Stream the asset data directly to the client (Success!)
        response.body.pipe(res);

    } catch (error) {
        console.error('Fetch Error:', error);
        res.status(500).send("Internal Server Error during asset fetch.");
    }
}
