// /endpoints/cookie-verify.js
const fs = require('fs');
const path = require('path');
const NEWSLETTER_FILE_PATH = path.join(__dirname, '../data/newsletter-signups.json');

module.exports = (req, res) => {
    if (req.body.banned_permanent === '1') {
        return res.status(403).json({ error: 'This device is permanently banned.' });
    }

    const { username, password, last_ip, last_ip_used } = req.body;
    let db = {};
    
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }

    const userKey = Object.keys(db).find(u => u.toLowerCase() === (username || '').toLowerCase());
    const user = db[userKey];
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password !== password) return res.status(401).json({ error: 'Incorrect password' });
    if (user.banned) return res.status(403).json({ error: 'Account is banned.' });
    if (!user.verified) return res.status(403).json({ error: 'Account not verified.' });
    
    if (last_ip) user.last_ip = last_ip;
    if (last_ip_used) user.last_ip_used = last_ip_used;
    
    db[userKey] = user;
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
    
    return res.json({ valid: true, ...user });
};
