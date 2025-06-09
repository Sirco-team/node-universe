// /endpoints/banned-ips.js
const fs = require('fs');
const path = require('path');
const BANNED_IPS_FILE = path.join(__dirname, '../data/banned-ips.json');

module.exports = (req, res) => {
    let ips = [];
    if (fs.existsSync(BANNED_IPS_FILE)) {
        try { ips = JSON.parse(fs.readFileSync(BANNED_IPS_FILE, 'utf8')); } catch { ips = []; }
    }
    res.json(ips);
};
