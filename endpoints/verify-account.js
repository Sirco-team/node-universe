// /endpoints/verify-account.js
const fs = require('fs');
const path = require('path');
const NEWSLETTER_FILE_PATH = path.join(__dirname, '../data/newsletter-signups.json');

module.exports = (req, res) => {
    const { username, code } = req.body;
    if (!username || !code) return res.status(400).json({ error: 'Missing username or code' });
    
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    
    const key = Object.keys(db).find(u => u.toLowerCase() === username.toLowerCase());
    const user = db[key];
    
    if (!user || user.verified) return res.status(400).json({ error: 'Invalid or already verified' });
    if (user.verification_code !== code) return res.status(400).json({ error: 'Incorrect verification code' });
    
    user.verified = true;
    delete user.verification_code;
    db[key] = user;
    
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
};
