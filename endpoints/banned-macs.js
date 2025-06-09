// /endpoints/banned-macs.js
const fs = require('fs');
const path = require('path');
const BANNED_MACS_FILE = path.join(__dirname, '../data/banned-mac-codes.json');

module.exports = (req, res) => {
    let bannedMACs = [];
    if (fs.existsSync(BANNED_MACS_FILE)) {
        try { bannedMACs = JSON.parse(fs.readFileSync(BANNED_MACS_FILE, 'utf8')); } catch { bannedMACs = []; }
    }
    res.json(bannedMACs);
};
