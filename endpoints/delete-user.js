// /endpoints/delete-user.js
const fs = require('fs');
const path = require('path');
const NEWSLETTER_FILE_PATH = path.join(__dirname, '../data/newsletter-signups.json');
const COOKIE_CLOUD_FILE = path.join(__dirname, '../data/cookie-cloud.json');

module.exports = (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Missing username' });
    
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    
    if (!db[username]) return res.status(404).json({ error: 'User not found' });
    
    delete db[username];
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
    
    // Also remove from cloud saves
    let cloud = {};
    if (fs.existsSync(COOKIE_CLOUD_FILE)) {
        try { cloud = JSON.parse(fs.readFileSync(COOKIE_CLOUD_FILE, 'utf8')); } catch { cloud = {}; }
    }
    
    if (cloud[username]) {
        delete cloud[username];
        fs.writeFileSync(COOKIE_CLOUD_FILE, JSON.stringify(cloud, null, 2));
    }
    
    res.json({ success: true });
};
