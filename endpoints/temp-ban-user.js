// /endpoints/temp-ban-user.js
const fs = require('fs');
const path = require('path');
const ACCOUNTS_FILE_PATH = path.join(__dirname, '../data/account-signups.json');

module.exports = (req, res) => {
    const { username, duration } = req.body;
    if (!username || !duration) return res.status(400).json({ error: 'Missing username or duration' });
    let db = {};
    if (fs.existsSync(ACCOUNTS_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(ACCOUNTS_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const user = db[username];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const now = Date.now();
    user.temp_ban_until = now + duration;
    db[username] = user;
    fs.writeFileSync(ACCOUNTS_FILE_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true, until: user.temp_ban_until });
};