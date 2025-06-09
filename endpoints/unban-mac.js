// /endpoints/unban-mac.js
const fs = require('fs');
const path = require('path');
const BANNED_MACS_FILE = path.join(__dirname, '../data/banned-mac-codes.json');

module.exports = (req, res) => {
    const { mac } = req.body;
    if (!mac) return res.status(400).json({ error: 'Missing MAC' });
    let macs = [];
    if (fs.existsSync(BANNED_MACS_FILE)) {
        try { macs = JSON.parse(fs.readFileSync(BANNED_MACS_FILE, 'utf8')); } catch { macs = []; }
    }
    macs = macs.filter(x => x !== mac);
    fs.writeFileSync(BANNED_MACS_FILE, JSON.stringify(macs, null, 2));
    res.json({ success: true });
};
