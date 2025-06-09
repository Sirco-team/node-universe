// /endpoints/collect.js - Analytics collection endpoint
const fs = require('fs');
const path = require('path');
const LOG_FILE_PATH = path.join(__dirname, '../data/analytics-log.json');

module.exports = (req, res) => {
    try {
        const entry = {
            ...req.body,
            timestamp: new Date().toISOString(),
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress
        };
        
        fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(entry) + '\n');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save analytics', details: err.message });
    }
};