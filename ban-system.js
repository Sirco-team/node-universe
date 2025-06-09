// ban-system.js - Handles all ban-related functionality
const fs = require('fs');
const path = require('path');

const BANNED_IPS_FILE = path.join(__dirname, 'data/banned-ips.json');

// Ban durations in milliseconds
const BAN_DURATIONS = {
    PERMANENT: -1,
    MONTH: 30 * 24 * 60 * 60 * 1000,  // 30 days
    DAY: 24 * 60 * 60 * 1000          // 24 hours
};

// Words that trigger different ban durations
const RESTRICTED_WORDS = {
    PERMANENT: ['admin', 'administrator', 'owner', 'mod', 'moderator', 'staff', 'system', 'official', 'dev', 'developer', 'support'],
    MONTH: [], // Add racial slurs here (empty for code safety)
    DAY: []  // Add profanity here (empty for code safety)
};

function checkRestrictedUsername(username) {
    const lowerUsername = username.toLowerCase();
    
    // Check permanent ban words
    if (RESTRICTED_WORDS.PERMANENT.some(word => lowerUsername.includes(word.toLowerCase()))) {
        return { banned: true, duration: BAN_DURATIONS.PERMANENT, reason: 'Restricted username (admin/staff)' };
    }

    // Check month ban words
    if (RESTRICTED_WORDS.MONTH.some(word => lowerUsername.includes(word.toLowerCase()))) {
        return { banned: true, duration: BAN_DURATIONS.MONTH, reason: 'Hate speech in username' };
    }

    // Check day ban words
    if (RESTRICTED_WORDS.DAY.some(word => lowerUsername.includes(word.toLowerCase()))) {
        return { banned: true, duration: BAN_DURATIONS.DAY, reason: 'Profanity in username' };
    }

    return { banned: false };
}

function banIP(ip, duration, reason) {
    let bannedIPs = [];
    if (fs.existsSync(BANNED_IPS_FILE)) {
        try { bannedIPs = JSON.parse(fs.readFileSync(BANNED_IPS_FILE, 'utf8')); } catch { bannedIPs = []; }
    }
    bannedIPs.push({
        ip,
        until: duration === -1 ? -1 : Date.now() + duration,
        reason,
        timestamp: new Date().toISOString()
    });
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify(bannedIPs, null, 2));
}

function bannedIPMiddleware(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
    let bannedIPs = [];
    if (fs.existsSync(BANNED_IPS_FILE)) {
        try { bannedIPs = JSON.parse(fs.readFileSync(BANNED_IPS_FILE, 'utf8')); } catch { bannedIPs = []; }
    }
    
    const now = Date.now();
    const banned = bannedIPs.find(b => b.ip === ip && (b.until === -1 || b.until > now));
    
    if (banned) {
        if (banned.until === -1) {
            return res.status(403).json({ error: 'This IP is permanently banned.', reason: banned.reason });
        }
        return res.status(403).json({ 
            error: 'This IP is temporarily banned.', 
            reason: banned.reason,
            until: banned.until
        });
    }
    next();
}

module.exports = {
    BAN_DURATIONS,
    RESTRICTED_WORDS,
    checkRestrictedUsername,
    banIP,
    bannedIPMiddleware
};