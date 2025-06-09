// /endpoints/unban-ip.js
const fs = require('fs');
const path = require('path');
const BANNED_IPS_FILE = path.join(__dirname, '../data/banned-ips.json');

module.exports = (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'Missing IP' });

    let bannedIPs = [];
    if (fs.existsSync(BANNED_IPS_FILE)) {
        try { bannedIPs = JSON.parse(fs.readFileSync(BANNED_IPS_FILE, 'utf8')); } catch { bannedIPs = []; }
    }

    bannedIPs = bannedIPs.filter(ban => ban.ip !== ip);
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify(bannedIPs, null, 2));
    
    res.json({ success: true });
};
