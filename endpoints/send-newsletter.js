// /endpoints/send-newsletter.js
const fs = require('fs');
const path = require('path');
const NEWSLETTER_FILE_PATH = path.join(__dirname, '../data/newsletter-signups.json');
let transporter;
try {
    transporter = require('../server').transporter;
} catch {}

module.exports = async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Missing subject or message' });
    if (!transporter) return res.status(500).json({ error: 'Email not configured' });
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const recipients = Object.values(db)
        .filter(u => u.email && u.verified)
        .map(u => u.email);
    if (recipients.length === 0) return res.status(400).json({ error: 'No verified emails to send to' });
    try {
        for (const email of recipients) {
            await transporter.sendMail({
                from: 'thereal.verify.universe@gmail.com',
                to: email,
                subject,
                text: message,
                html: `<div style='font-family:sans-serif;max-width:500px;margin:auto;background:#f9f9f9;padding:2em;border-radius:8px;'>${message.replace(/\n/g,'<br>')}</div>`
            });
        }
        res.json({ success: true, sent: recipients.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send newsletter', detail: err.message });
    }
};
