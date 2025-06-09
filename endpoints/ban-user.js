// /endpoints/ban-user.js
const fs = require('fs');
const path = require('path');
const NEWSLETTER_FILE_PATH = path.join(__dirname, '../data/newsletter-signups.json');

module.exports = (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const user = db[username];
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.banned = true;
    db[username] = user;
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
};
