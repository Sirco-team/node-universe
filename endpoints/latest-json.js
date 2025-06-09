// /endpoints/latest-json.js
const fs = require('fs');
const path = require('path');
const LOG_FILE_PATH = path.join(__dirname, '../data/analytics-log.json');
const COOKIE_SIGNUP_FILE = path.join(__dirname, '../data/cookie-signups.json');
const COOKIE_CLOUD_FILE = path.join(__dirname, '../data/cookie-cloud.json');
const NEWSLETTER_FILE_PATH = path.join(__dirname, '../data/newsletter-signups.json');

function loadNewsletterDB() {
    if (!fs.existsSync(NEWSLETTER_FILE_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8'));
    } catch {
        return {};
    }
}

module.exports = (req, res) => {
    if (!req.body?.password && !req.query?.password && !req.cookies?.latest_auth === process.env.LATEST_PASSWORD) {
        return res.status(403).json({ error: 'Forbidden: Invalid or missing password' });
    }

    let file;
    switch (req.query.type) {
        case 'newsletter':
            try {
                const db = loadNewsletterDB();
                const arr = Object.values(db).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                return res.json({ label: "Account Sign Ups", data: arr });
            } catch (err) {
                return res.status(500).json({ error: 'Failed to load newsletter data' });
            }
        case 'cookie-signup':
            file = COOKIE_SIGNUP_FILE;
            break;
        case 'cookie-cloud':
            try {
                if (!fs.existsSync(COOKIE_CLOUD_FILE)) return res.json([]);
                const saves = JSON.parse(fs.readFileSync(COOKIE_CLOUD_FILE, 'utf8'));
                const arr = Object.entries(saves)
                    .map(([username, obj]) => ({
                        username,
                        cookies: obj.cookies,
                        timestamp: obj.timestamp
                    }))
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                return res.json(arr);
            } catch (err) {
                return res.status(500).json({ error: 'Failed to load cookie cloud data' });
            }
        case 'analytics':
            file = LOG_FILE_PATH;
            break;
        default:
            file = LOG_FILE_PATH;
    }

    if (!fs.existsSync(file)) return res.json([]);
    
    try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const entries = lines
            .map(line => {
                try { return JSON.parse(line); } 
                catch { return null; }
            })
            .filter(Boolean);
        res.json(entries.reverse());
    } catch (err) {
        res.status(500).json({ error: 'Failed to load log data' });
    }
};