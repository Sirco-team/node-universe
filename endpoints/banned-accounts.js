// /endpoints/banned-accounts.js
const fs = require('fs');
const path = require('path');
const ACCOUNTS_FILE_PATH = path.join(__dirname, '../data/account-signups.json');

module.exports = (req, res) => {
    const { usernames } = req.body || {};
    if (!Array.isArray(usernames) || usernames.length === 0) {
        return res.json({ banned: [], temp_banned: [] });
    }

    let db = {};
    if (fs.existsSync(ACCOUNTS_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(ACCOUNTS_FILE_PATH, 'utf8')); } catch { db = {}; }
    }

    const now = Date.now();
    const banned = [];
    const temp_banned = [];

    usernames.forEach(u => {
        const user = db[u];
        if (user && user.banned) {
            banned.push(u);
        } else if (user && user.temp_ban_until && user.temp_ban_until > now) {
            temp_banned.push({ username: u, until: user.temp_ban_until });
        }
    });

    res.json({ banned, temp_banned });
};