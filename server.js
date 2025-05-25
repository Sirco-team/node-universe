require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Root endpoint
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Create public directory if it doesn't exist
const PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// --- Data directories and file paths ---
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const LOG_FILE_PATH = path.join(DATA_DIR, 'analytics-log.json');
const NEWSLETTER_FILE_PATH = path.join(DATA_DIR, 'newsletter-signups.json');
const COOKIE_SIGNUP_FILE = path.join(DATA_DIR, 'cookie-signups.json');
const COOKIE_CLOUD_FILE = path.join(DATA_DIR, 'cookie-cloud.json');
const BANNED_IPS_FILE = path.join(DATA_DIR, 'banned-ips.json');
const PORT = process.env.PORT || 3443;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './cert.pem';

const LATEST_PASSWORD = process.env.LATEST_PASSWORD || 'letmein';
const LATEST_COOKIE = 'latest_auth';

// Helper: check password from query, body, or cookie
function checkLatestPassword(req) {
    const pwd = req.body?.password || req.query?.password || req.cookies?.[LATEST_COOKIE];
    return pwd === LATEST_PASSWORD;
}

// Serve /latest as a single-page app
app.get('/latest', (req, res) => {
    res.sendFile('latest.html', { root: __dirname });
});

// Password auth endpoint for /latest (POST)
app.post('/latest-auth', (req, res) => {
    const { password } = req.body;
    if (password === LATEST_PASSWORD) {
        res.cookie(LATEST_COOKIE, password, { httpOnly: true, sameSite: 'lax' });
        return res.json({ ok: true });
    }
    res.status(401).json({ ok: false });
});

// --- Data endpoints for /latest tabs (all password protected) ---
function loadNewsletterDB() {
    if (!fs.existsSync(NEWSLETTER_FILE_PATH)) return {};
    try { return JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { return {}; }
}

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
                return res.json(arr);
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
app.post('/cookie-signup', bannedIPMiddleware, (req, res, next) => {
    const data = { ...req.body, timestamp: new Date().toISOString() };
    // Save creation_ip
    if (!data.creation_ip) {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
        data.creation_ip = ip;
    }
    // Save to DB (example: newsletter-signups.json or your user DB)
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    db[data.username] = { ...data, last_ip: data.creation_ip };
    fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
    // Also log to cookie-signups.json as before
    try {
        const content = fs.existsSync(COOKIE_SIGNUP_FILE) ? fs.readFileSync(COOKIE_SIGNUP_FILE, 'utf8') : '';
        const lines = content.split('\n').filter(line => line.trim());
        lines.push(JSON.stringify(data));
        fs.writeFileSync(COOKIE_SIGNUP_FILE, lines.join('\n') + '\n');
        res.json({ success: true, ...data });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save signup' });
    }
});

// --- Cookie verify endpoint (login) ---
app.post('/cookie-verify', (req, res) => {
    const { username, password, last_ip } = req.body;
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const user = db[username];
    if (user && user.password === password) {
        // Update last_ip
        if (last_ip) {
            user.last_ip = last_ip;
            db[username] = user;
            fs.writeFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(db, null, 2));
        }
        return res.json({ valid: true, ...user });
    }
    res.json({ valid: false });
});

// --- Terminal interactive menu for live traffic viewing ---

const readline = require('readline');
let TRAFFIC_MODE = null; // null = off, 'all', 'analytics', 'newsletter', etc.

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
startMenu();

// Helper to match route type for traffic filtering
function getTrafficType(req) {
    const url = req.originalUrl.split('?')[0];
    if (url.startsWith('/collect')) return 'analytics';
    if (url.startsWith('/newsletter')) return 'newsletter';
    if (url.startsWith('/cookie-signup')) return 'cookie-signup';
    if (url.startsWith('/cookie-cloud')) return 'cookie-cloud';
    if (url.startsWith('/shortener')) return 'shortener';
    return 'other';
}

// Log all incoming requests and outgoing responses (with menu filtering)
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

// --- Banned IPs functionality ---

if (!fs.existsSync(BANNED_IPS_FILE)) {
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify([]));
}

function loadBannedIPs() {
    try {
        return JSON.parse(fs.readFileSync(BANNED_IPS_FILE, 'utf8'));
    } catch {
        return [];
    }
}
function saveBannedIPs(ips) {
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify(ips, null, 2));
}
function isIPBanned(ip) {
    const banned = loadBannedIPs();
    return banned.includes(ip);
}

// Middleware to block banned IPs from sensitive endpoints
function bannedIPMiddleware(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
    if (isIPBanned(ip)) {
        return res.status(403).json({ error: 'Your IP is banned.' });
    }
    next();
}

// API to get all banned IPs
app.get('/banned-ips', (req, res) => {
    res.json(loadBannedIPs());
});
// API to ban an IP (POST, expects {ip})
app.post('/ban-ip', (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'No IP provided' });
    const banned = loadBannedIPs();
    if (!banned.includes(ip)) {
        banned.push(ip);
        saveBannedIPs(banned);
    }
    res.json({ success: true, banned });
});
// API to unban an IP (POST, expects {ip})
app.post('/unban-ip', (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'No IP provided' });
    let banned = loadBannedIPs();
    banned = banned.filter(item => item !== ip);
    saveBannedIPs(banned);
    res.json({ success: true, banned });
});

// --- Cookie Cloud Save/Load endpoints ---
app.post('/cookie-cloud', (req, res) => {
    const { username, password, cookies, timestamp } = req.body || {};
    if (!username || !password || !cookies) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    // Load user DB (newsletter-signups.json)
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const user = db[username];
    if (!user || user.password !== password) {
        return res.status(403).json({ error: 'Invalid username or password' });
    }
    // Load cloud DB
    let cloud = {};
    if (fs.existsSync(COOKIE_CLOUD_FILE)) {
        try { cloud = JSON.parse(fs.readFileSync(COOKIE_CLOUD_FILE, 'utf8')); } catch { cloud = {}; }
    }
    cloud[username] = { cookies, timestamp: timestamp || new Date().toISOString() };
    try {
        fs.writeFileSync(COOKIE_CLOUD_FILE, JSON.stringify(cloud, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save cloud data' });
    }
});

app.get('/cookie-cloud', (req, res) => {
    const { username, password } = req.query || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
    }
    // Load user DB
    let db = {};
    if (fs.existsSync(NEWSLETTER_FILE_PATH)) {
        try { db = JSON.parse(fs.readFileSync(NEWSLETTER_FILE_PATH, 'utf8')); } catch { db = {}; }
    }
    const user = db[username];
    if (!user || user.password !== password) {
        return res.status(403).json({ error: 'Invalid username or password' });
    }
    // Load cloud DB
    let cloud = {};
    if (fs.existsSync(COOKIE_CLOUD_FILE)) {
        try { cloud = JSON.parse(fs.readFileSync(COOKIE_CLOUD_FILE, 'utf8')); } catch { cloud = {}; }
    }
    if (!cloud[username] || !cloud[username].cookies) {
        return res.status(404).json({ error: 'No cloud data found' });
    }
    res.json({ cookies: cloud[username].cookies });
});

// Endpoint to get the user's IP address
app.get('/my-ip', (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
    res.json({ ip });
});

// List files in a directory (public or data)
app.get('/files/list', (req, res) => {
    const dir = req.query.dir === 'data' ? DATA_DIR : PUBLIC_DIR;
    fs.readdir(dir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to list files' });
        res.json(files);
    });
});

// --- Analytics collection endpoint ---
app.post('/collect', (req, res) => {
    const data = { ...req.body, timestamp: new Date().toISOString() };
    // Ensure log file exists
    if (!fs.existsSync(LOG_FILE_PATH)) {
        fs.writeFileSync(LOG_FILE_PATH, '');
    }
    try {
        fs.appendFileSync(LOG_FILE_PATH, JSON.stringify(data) + '\n');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to log analytics data' });
    }
});

// HTTPS server if certs exist, otherwise HTTP
if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    const sslOptions = {
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH)
    };
    https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
        console.log(`Analytics backend listening on HTTPS port ${HTTPS_PORT}`);
    });
} else {
    app.listen(PORT, () => {
        console.log(`Analytics backend listening on HTTP port ${PORT} (SSL certs not found)`);
    });
}
