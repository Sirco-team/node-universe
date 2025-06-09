// /endpoints/admin-settings-update.js
const fs = require('fs');
const path = require('path');
const ADMIN_SETTINGS_FILE = path.join(__dirname, '../data/admin-settings.json');

module.exports = (req, res) => {
    const { password, fromEmail, emailPass, apiKey, apiSecret } = req.body;
    let settings = {};
    if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
        try { settings = JSON.parse(fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8')); } catch { settings = {}; }
    }
    if (fromEmail) settings.fromEmail = fromEmail;
    if (emailPass) settings.emailPass = emailPass;
    if (apiKey) settings.apiKey = apiKey;
    if (apiSecret) settings.apiSecret = apiSecret;
    fs.writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify(settings, null, 2));

    // Update environment variables
    if (apiKey) process.env.MJ_APIKEY_PUBLIC = apiKey;
    if (apiSecret) process.env.MJ_APIKEY_PRIVATE = apiSecret;
    if (password) process.env.LATEST_PASSWORD = password;

    res.json({ success: true });
};