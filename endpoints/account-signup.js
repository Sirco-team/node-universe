// /workspaces/code-universe/NODE/endpoints/account-signup.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const NEWSLETTER_FILE_PATH = path.join(__dirname, '../data/newsletter-signups.json');
const sendVerificationEmail = require('../email').sendVerificationEmail;
const BANNED_IPS_FILE = path.join(__dirname, '../data/banned-ips.json');
const restrictedWords = require('./restricted-words');

function checkRestrictedUsername(username) {
    // Convert to lowercase for case-insensitive matching
    const lowerUsername = username.toLowerCase();
    
    // Check permanent ban words
    for (const word of restrictedWords.PERM_BAN_WORDS) {
        if (lowerUsername.includes(word.toLowerCase())) {
            return {
                banned: true,
                duration: restrictedWords.BAN_DURATIONS.PERMANENT,
                reason: 'Attempted to use restricted username (administrator/owner)'
            };
        }
    }

    // Check month ban words
    for (const word of restrictedWords.MONTH_BAN_WORDS) {
        if (lowerUsername.includes(word.toLowerCase())) {
            return {
                banned: true,
                duration: restrictedWords.BAN_DURATIONS.MONTH,
                reason: 'Attempted to use hate speech in username'
            };
        }
    }

    // Check day ban words
    for (const word of restrictedWords.DAY_BAN_WORDS) {
        if (lowerUsername.includes(word.toLowerCase())) {
            return {
                banned: true,
                duration: restrictedWords.BAN_DURATIONS.DAY,
                reason: 'Attempted to use profanity in username'
            };
        }
    }

    return { banned: false };
}

function banIP(ip, duration, reason) {
    let bannedIPs = [];
    if (fs.existsSync(BANNED_IPS_FILE)) {
        try { bannedIPs = JSON.parse(fs.readFileSync(BANNED_IPS_FILE, 'utf8')); } catch {}
    }
    bannedIPs.push({
        ip,
        until: duration === -1 ? -1 : Date.now() + duration,
        reason,
        timestamp: new Date().toISOString()
    });
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify(bannedIPs, null, 2));
}

module.exports = async (req, res) => {
    if (req.body.banned_permanent === '1') {
        return res.status(403).json({ error: 'This device is permanently banned.' });
    }
    const data = { ...req.body, timestamp: new Date().toISOString() };
    const username = (data.username || '').toLowerCase();
    
    // Check for restricted usernames first
    const restrictedCheck = checkRestrictedUsername(username);
    if (restrictedCheck.banned) {
        // Ban the IP
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
        banIP(ip, restrictedCheck.duration, restrictedCheck.reason);
        
        return res.status(403).json({ 
            error: 'This username is not allowed.',
            banned: true,
            duration: restrictedCheck.duration,
            reason: restrictedCheck.reason
        });
    }

    if (!/^[a-z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: 'Username must only contain letters, numbers, underscores, or hyphens (no spaces or special characters).'});
    }
    if (!data.creation_ip) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
        data.creation_ip = ip;
    }
    if (!data.last_ip_used) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
        data.last_ip_used = ip;
    }
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    if (Object.keys(db).some(u => u.toLowerCase() === username)) {
        return res.status(400).json({ error: 'Username already exists.' });
    }
    const verification_code = uuidv4().slice(0, 8).toUpperCase();
    db[data.username] = { ...data, last_ip: data.creation_ip, last_ip_used: data.last_ip_used, verified: false, verification_code };
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
    if (data.email) {
        await sendVerificationEmail(data.email, verification_code);
    }
    res.json({ success: true, verification_required: true, message: 'Account created. Please check your email for the verification code.', verification_code: null });
};
