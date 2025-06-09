const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const path = require('path');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const readline = require('readline');

// --- Initialize Express app ---
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// --- Constants and Configurations ---
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const LOG_FILE_PATH = path.join(DATA_DIR, 'analytics-log.json');
const NEWSLETTER_FILE_PATH = path.join(DATA_DIR, 'newsletter-signups.json');
const COOKIE_SIGNUP_FILE = path.join(DATA_DIR, 'cookie-signups.json');
const COOKIE_CLOUD_FILE = path.join(DATA_DIR, 'cookie-cloud.json');
const BANNED_IPS_FILE = path.join(DATA_DIR, 'banned-ips.json');
const BANNED_MACS_FILE = path.join(DATA_DIR, 'banned-mac-codes.json');
const PORT = process.env.PORT || 3443;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './cert.pem';
const LATEST_PASSWORD = process.env.LATEST_PASSWORD || 'letmein';
const LATEST_COOKIE = 'latest_auth';
const requiredNodeVersion = 16;
const currentMajor = parseInt(process.versions.node.split('.')[0], 10);

// --- Directory Creation ---
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Node.js version check
if (currentMajor < requiredNodeVersion) {
    console.warn(`Warning: Node.js version ${process.versions.node} detected. Please use Node.js ${requiredNodeVersion}.x or newer for best compatibility.`);
}

// --- Email Configuration ---
let GMAIL_USER = process.env.GMAIL_USER;
let GMAIL_PASS = process.env.GMAIL_PASS;
let apiKeys = [];
try {
    const credsPath = path.join(__dirname, 'gmail_creds.json');
    if (fs.existsSync(credsPath)) {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (creds.email && creds.password) {
            GMAIL_USER = creds.email;
            GMAIL_PASS = creds.password;
            apiKeys.push({ user: creds.email, pass: creds.password });
        }
    }
    // Load additional API keys from admin-settings.json if available
    const adminSettingsPath = path.join(DATA_DIR, 'admin-settings.json');
    if (fs.existsSync(adminSettingsPath)) {
        const settings = JSON.parse(fs.readFileSync(adminSettingsPath, 'utf8'));
        if (settings.apiKey && settings.apiSecret) {
            apiKeys.push({ user: settings.apiKey, pass: settings.apiSecret });
        }
        // Optionally support multiple keys as an array
        if (Array.isArray(settings.extraMailjetKeys)) {
            for (const k of settings.extraMailjetKeys) {
                if (k.user && k.pass) apiKeys.push({ user: k.user, pass: k.pass });
            }
        }
    }
} catch (e) {
    console.error('Failed to load gmail_creds.json or admin-settings.json:', e);
}

let transporter = null;
let currentApiIndex = 0;
function createTransporter(index = 0) {
    if (!apiKeys[index]) return null;
    return nodemailer.createTransport({
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false, // TLS
        auth: {
            user: apiKeys[index].user,
            pass: apiKeys[index].pass
        }
    });
}
function verifyAndSetTransporter(index = 0) {
    if (!apiKeys[index]) {
        transporter = null;
        return;
    }
    transporter = createTransporter(index);
    transporter.verify(function(error, success) {
        if (error) {
            console.error('Mailjet transporter could not connect or authenticate:', error.message || error);
            if (index + 1 < apiKeys.length) {
                console.log('Trying next Mailjet API key...');
                verifyAndSetTransporter(index + 1);
            } else {
                console.error('All Mailjet API keys failed. Email sending will be disabled.');
                transporter = null;
            }
        } else {
            console.log('Mailjet transporter is ready to send emails. Using API key:', apiKeys[index].user);
        }
    });
}
if (apiKeys.length > 0) {
    verifyAndSetTransporter(0);
}

// Helper to send verification email
async function sendVerificationEmail(email, code) {
    if (!transporter) return;
    const mailOptions = {
        from: 'thereal.verify.universe@gmail.com', // Use a valid, verified sender for Mailjet
        to: email,
        subject: 'Code-Universe Account Activation Code',
        text: `Welcome to Code-Universe!\n\nYour activation code is: ${code}\n\nPlease enter this code to verify your account.\n\nFor your security, you will not need this code after verification, and no one will ever ask you for it.\n\nIf you did not request this, you can ignore this email.\n\nThank you!\nCode-Universe Team`,
        html: `<div style='font-family:sans-serif;max-width:500px;margin:auto;background:#f9f9f9;padding:2em;border-radius:8px;'>
          <h2 style='color:#1976d2;'>Code-Universe Account Activation</h2>
          <p>Welcome to <b>Code-Universe</b>!</p>
          <p style='font-size:1.2em;'>Your activation code is:</p>
          <div style='font-size:2em;font-weight:bold;background:#fff;padding:1em 2em;border-radius:6px;border:1px solid #eee;display:inline-block;margin-bottom:1em;'>${code}</div>
          <p>Enter this code to verify your account.</p>
          <p style='color:#888;font-size:0.95em;'>For your security, you will not need this code after verification, and no one will ever ask you for it.</p>
          <p style='color:#888;font-size:0.95em;'>If you did not request this, you can ignore this email.</p>
          <p style='margin-top:2em;color:#1976d2;'>Thank you!<br>Code-Universe Team</p>
        </div>`
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('Failed to send verification email:', err);
    }
}

// --- Traffic Monitoring Menu ---
function printMenu() {
    console.log('\n=== Traffic Monitor Menu ===');
    console.log('1. View ALL traffic');
    console.log('2. View only Analytics traffic');
    console.log('3. View only Newsletter traffic');
    console.log('4. View only Cookie Signup traffic');
    console.log('5. View only Cookie Cloud traffic');
    console.log('6. View only Shortener traffic');
    console.log('0. Stop viewing traffic');
    console.log('q. Quit menu');
    console.log('===========================');
    process.stdout.write('Select option: ');
}

function setTrafficMode(mode) {
    TRAFFIC_MODE = mode;
    if (mode === null) {
        console.log('\n[Monitor] Traffic viewing stopped.');
    } else {
        console.log(`\n[Monitor] Now viewing: ${mode === 'all' ? 'ALL traffic' : mode + ' traffic only'}`);
    }
}

function startMenu() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    printMenu();
    rl.on('line', (input) => {
        switch (input.trim()) {
            case '1': setTrafficMode('all'); break;
            case '2': setTrafficMode('analytics'); break;
            case '3': setTrafficMode('newsletter'); break;
            case '4': setTrafficMode('cookie-signup'); break;
            case '5': setTrafficMode('cookie-cloud'); break;
            case '6': setTrafficMode('shortener'); break;
            case '0': setTrafficMode(null); break;
            case 'q': rl.close(); return;
            default: console.log('Invalid option.');
        }
        printMenu();
    });
}

// Start traffic monitoring menu
startMenu();

// --- Helper Functions ---
function getTrafficType(req) {
    const url = req.originalUrl.split('?')[0];
    if (url.startsWith('/collect')) return 'analytics';
    if (url.startsWith('/newsletter')) return 'newsletter';
    if (url.startsWith('/cookie-signup')) return 'cookie-signup';
    if (url.startsWith('/cookie-cloud')) return 'cookie-cloud';
    if (url.startsWith('/shortener')) return 'shortener';
    return 'other';
}

function getLocalIP() {
    const os = require('os');
    const ifaces = os.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
        for (const info of iface) {
            if (info.family === 'IPv4' && !info.internal) {
                return info.address;
            }
        }
    }
    return 'localhost';
}

function checkLatestPassword(req) {
    const pwd = req.body?.password || req.query?.password || req.cookies?.[LATEST_COOKIE];
    return pwd === LATEST_PASSWORD;
}

// --- Middleware ---
// Traffic logging middleware
app.use((req, res, next) => {
    const type = getTrafficType(req);
    const shouldLog = TRAFFIC_MODE === 'all' || TRAFFIC_MODE === type;
    // Log incoming request
    if (shouldLog) {
        console.log(`\n[IN] ${req.method} ${req.originalUrl}`);
        if (Object.keys(req.body || {}).length > 0) {
            console.log('[IN] Body:', JSON.stringify(req.body, null, 2));
        }
        if (Object.keys(req.query || {}).length > 0) {
            console.log('[IN] Query:', JSON.stringify(req.query, null, 2));
        }
    }

    // Wrap res.json and res.send to log outgoing data
    const origJson = res.json;
    const origSend = res.send;
    res.json = function (data) {
        if (shouldLog) {
            console.log(`[OUT] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode}`);
            console.log('[OUT] JSON:', JSON.stringify(data, null, 2));
        }
        return origJson.call(this, data);
    };
    res.send = function (data) {
        if (shouldLog) {
            console.log(`[OUT] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode}`);
            let out = data;
            if (typeof data !== 'string') {
                try { out = JSON.stringify(data, null, 2); } catch {}
            }
            if (typeof out === 'string' && out.length > 1000) {
                out = out.slice(0, 1000) + '... [truncated]';
            }
            console.log('[OUT] Body:', out);
        }
        return origSend.call(this, data);
    };
    next();
});

// --- Import ban system ---
const banSystem = require('./ban-system');
// Use bannedIPMiddleware from ban-system
app.use(banSystem.bannedIPMiddleware);

// Banned IP middleware is imported from ban-system.js

// --- Import all endpoint handlers ---
const {
    verifyAccount,
    accountSignup,
    banUser,
    tempBanUser,
    deleteUser,
    cookieVerify,
    cookieSignup,
    sendNewsletter,
    collect,
    bannedIps,
    bannedMacs,
    unbanIp,
    unbanMac,
    latestJson,
    adminSettings,
    adminSettingsUpdate,
    bannedAccounts
} = require('./endpoints');

// --- Use routes ---
routes(app, helpers);

// --- Routes ---
// --- Ensure all critical endpoints exist and are correct ---
// Root endpoint
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// /latest and /latest.html
app.get('/latest', (req, res) => {
    const latestPath = path.resolve(__dirname, 'latest.html');
    if (!fs.existsSync(latestPath)) {
        return res.status(404).send('latest.html not found in project root. Please add latest.html to your project root.');
    }
    res.sendFile(latestPath);
});
app.get('/latest.html', (req, res) => {
    const latestPath = path.resolve(__dirname, 'latest.html');
    if (!fs.existsSync(latestPath)) {
        return res.status(404).send('latest.html not found in project root. Please add latest.html to your project root.');
    }
    res.sendFile(latestPath);
});

// /my-ip
app.get('/my-ip', (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
    res.json({ ip });
});

// /account-signup
app.post('/account-signup', bannedIPMiddleware, accountSignup);

// /collect
app.post('/collect', collect);

// /banned-ips
app.get('/banned-ips', bannedIps);
// /banned-macs
app.get('/banned-macs', bannedMacs);
// /unban-ip
app.post('/unban-ip', unbanIp);
// /unban-mac
app.post('/unban-mac', unbanMac);

// /latest.json
app.get('/latest.json', (req, res) => {
    if (!checkLatestPassword(req)) {
        return res.status(403).json({ error: 'Forbidden: Invalid or missing password' });
    }
    let file;
    switch (req.query.type) {
        case 'newsletter':
            try {
                const db = loadNewsletterDB();
                const arr = Object.values(db).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                // Change label in response
                return res.json({ label: "Account Sign Ups", data: arr });
            } catch (err) {
                return res.status(500).json({ error: 'Failed to load newsletter data' });
            }
        case 'cookie-signup':
            file = COOKIE_SIGNUP_FILE;
            break;
        case 'cookie-cloud':
            try {
                if (!fs.existsSync(COOKIE_CLOUD_FILE)) return res.json([]);
                const saves = JSON.parse(fs.readFileSync(COOKIE_CLOUD_FILE, 'utf8'));
                const arr = Object.entries(saves)
                    .map(([username, obj]) => ({
                        username,
                        cookies: obj.cookies,
                        timestamp: obj.timestamp
                    }))
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                return res.json(arr);
            } catch (err) {
                return res.status(500).json({ error: 'Failed to load cookie cloud data' });
            }
        case 'analytics':
            file = LOG_FILE_PATH;
            break;
        default:
            file = LOG_FILE_PATH;
    }
    if (!fs.existsSync(file)) return res.json([]);
    try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const entries = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(Boolean);
        res.json(entries.reverse());
    } catch (err) {
        res.status(500).json({ error: 'Failed to load log data' });
    }
});

// --- Cookie signup endpoint ---
app.post('/cookie-signup', bannedIPMiddleware, async (req, res, next) => {
    // Permanent ban check (by browser localStorage, see frontend)
    if (req.body.banned_permanent === '1') {
        return res.status(403).json({ error: 'This device is permanently banned.' });
    }
    const data = { ...req.body, timestamp: new Date().toISOString() };
    // Username validation
    const username = (data.username || '').toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: 'Username must only contain letters, numbers, underscores, or hyphens (no spaces or special characters).'});
    }
    // Save creation_ip
    if (!data.creation_ip) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
        data.creation_ip = ip;
    }
    // Save last_ip_used
    if (!data.last_ip_used) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
        data.last_ip_used = ip;
    }
    // Load DB
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    // Prevent duplicate usernames (case-insensitive)
    if (Object.keys(db).some(u => u.toLowerCase() === username)) {
        return res.status(400).json({ error: 'Username already exists.' });
    }
    // Generate verification code
    const verification_code = uuidv4().slice(0, 8).toUpperCase();
    db[data.username] = { ...data, last_ip: data.creation_ip, last_ip_used: data.last_ip_used, verified: false, verification_code };
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
    // Send verification code to email if provided
    if (data.email) {
        await sendVerificationEmail(data.email, verification_code);
    }
    res.json({ success: true, verification_required: true, message: 'Account created. Please check your email for the verification code.', verification_code: null });
});
// --- Verification endpoint ---
app.post('/verify-account', verifyAccount);

// --- Ban user endpoint ---
app.post('/ban-user', banUser);

// --- Temp ban endpoint ---
app.post('/temp-ban-user', (req, res) => {
    const { username, duration } = req.body; // duration in ms
    if (!username || !duration) return res.status(400).json({ error: 'Missing username or duration' });
    const ACCOUNTS_FILE_PATH = path.join(DATA_DIR, 'account-signups.json');
    let db = {};
    if (fs.existsSync(ACCOUNTS_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(ACCOUNTS_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const user = db[username];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const now = Date.now();
    user.temp_ban_until = now + duration;
    db[username] = user;
    fs.writeFileSync(ACCOUNTS_FILE_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true, until: user.temp_ban_until });
});
// --- Delete user endpoint ---
app.post('/delete-user', (req, res) => {
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
});
// --- Cookie verify endpoint (login) ---
app.post('/cookie-verify', (req, res) => {
    if (req.body.banned_permanent === '1') {
        return res.status(403).json({ error: 'This device is permanently banned.' });
    }
    const { username, password, last_ip, last_ip_used } = req.body;
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const userKey = Object.keys(db).find(u => u.toLowerCase() === (username || '').toLowerCase());
    const user = db[userKey];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password !== password) return res.status(401).json({ error: 'Incorrect password' });
    if (user.banned) {
        return res.status(403).json({ error: 'Account is banned.' });
    }
    if (!user.verified) {
        return res.status(403).json({ error: 'Account not verified.' });
    }
    // Update last_ip and last_ip_used
    if (last_ip) user.last_ip = last_ip;
    if (last_ip_used) user.last_ip_used = last_ip_used;
    db[userKey] = user;
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
    return res.json({ valid: true, ...user });
});
// --- Send newsletter email to all signups ---
app.post('/send-newsletter', async (req, res) => {
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
});

// --- Admin settings endpoints ---

// Get admin settings
app.get('/admin-settings', (req, res) => {
    let settings = {};
    if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
        try { settings = JSON.parse(fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8')); } catch { settings = {}; }
    }
    res.json({
        fromEmail: settings.fromEmail || GMAIL_USER || '',
        apiKey: settings.apiKey || '',
        apiSecret: settings.apiSecret || ''
    });
});

// Update admin settings
app.post('/admin-settings/update', (req, res) => {
    const { password, fromEmail, emailPass, apiKey, apiSecret } = req.body;
    let settings = {};
    if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
        try { settings = JSON.parse(fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8')); } catch { settings = {}; }
    }
    if (fromEmail) settings.fromEmail = fromEmail;
    if (emailPass) settings.emailPass = emailPass;
    if (apiKey) settings.apiKey = apiKey;
    if (apiSecret) settings.apiSecret = apiSecret;
    fs.writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify(settings, null, 2));
    // Update in-memory config
    if (fromEmail) GMAIL_USER = fromEmail;
    if (emailPass) GMAIL_PASS = emailPass;
    if (apiKey) process.env.MJ_APIKEY_PUBLIC = apiKey;
    if (apiSecret) process.env.MJ_APIKEY_PRIVATE = apiSecret;
    if (password) {
        process.env.LATEST_PASSWORD = password;
    }
    // Recreate transporter if needed
    if (GMAIL_USER && GMAIL_PASS) {
        transporter = nodemailer.createTransport({
            host: 'in-v3.mailjet.com',
            port: 587,
            secure: false,
            auth: { user: GMAIL_USER, pass: GMAIL_PASS }
        });
    }
    res.json({ success: true });
});
// --- Banned accounts check endpoint ---
app.post('/banned-accounts', (req, res) => {
    const { usernames } = req.body || {};
    if (!Array.isArray(usernames) || usernames.length === 0) return res.json({ banned: [], temp_banned: [] });
    const ACCOUNTS_FILE_PATH = path.join(DATA_DIR, 'account-signups.json');
    let db = {};
    if (fs.existsSync(ACCOUNTS_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(ACCOUNTS_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const now = Date.now();
    const banned = [];
    const temp_banned = [];
    usernames.forEach(u => {
        const user = db[u];
        if (user && user.banned) banned.push(u);
        else if (user && user.temp_ban_until && user.temp_ban_until > now) temp_banned.push({ username: u, until: user.temp_ban_until });
    });
    res.json({ banned, temp_banned });
});

// All email configuration is now handled in email.js

// --- Fix: Declare TRAFFIC_MODE variable ---
let TRAFFIC_MODE = null;

// Ban system is already imported above

// --- Start HTTP or HTTPS server ---
if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    const sslOptions = {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH)
    };
    https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
        console.log(`Analytics backend listening on HTTPS port ${HTTPS_PORT}`);
        console.log(`Access from your Pi's browser: https://` + getLocalIP() + `:${HTTPS_PORT}`);
    });
} else {
    app.listen(PORT, () => {
        console.log(`Analytics backend listening on HTTP port ${PORT} (SSL certs not found)`);
        console.log(`Access from your Pi's browser: http://` + getLocalIP() + `:${PORT}`);
    });
}

// --- Banned IPs endpoint ---
// (Moved to endpoints/banned-ips.js)
// --- Banned MACs endpoint ---
// (Moved to endpoints/banned-macs.js)
// --- Unban IP endpoint ---
// (Moved to endpoints/unban-ip.js)
// --- Unban MAC endpoint ---
// (Moved to endpoints/unban-mac.js)
