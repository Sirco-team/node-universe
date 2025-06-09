// /endpoints/admin-settings.js
const fs = require('fs');
const path = require('path');
const ADMIN_SETTINGS_FILE = path.join(__dirname, '../data/admin-settings.json');

module.exports = (req, res) => {
    let settings = {};
    if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
        try { settings = JSON.parse(fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8')); } catch { settings = {}; }
    }
    res.json({
        fromEmail: settings.fromEmail || process.env.GMAIL_USER || '',
        apiKey: settings.apiKey || '',
        apiSecret: settings.apiSecret || ''
    });
};