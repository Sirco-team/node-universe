// /endpoints/banned-macs.js
const fs = require('fs');
const path = require('path');
const BANNED_MACS_FILE = path.join(__dirname, '../data/banned-mac-codes.json');

module.exports = (req, res) => {
    let macs = [];
    if (fs.existsSync(BANNED_MACS_FILE)) {
        try { macs = JSON.parse(fs.readFileSync(BANNED_MACS_FILE, 'utf8')); } catch { macs = []; }
    }
    res.json(macs);
};
