require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const path = require('path');

const app = express();

// Update all file paths to use /data directory
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const LOG_FILE_PATH = path.join(DATA_DIR, 'analytics-log.json');
const NEWSLETTER_FILE_PATH = path.join(DATA_DIR, 'newsletter-signups.json');
const COOKIE_SIGNUP_FILE = path.join(DATA_DIR, 'cookie-signups.json');
const COOKIE_CLOUD_FILE = path.join(DATA_DIR, 'cookie-cloud.json');
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './cert.pem';
const OWNER_PASSWORD = 'sircoownsthis@2025'; // <-- Make sure this matches link-server.js

app.use(cors());
app.use(bodyParser.json());

// Explicitly handle preflight OPTIONS requests for all routes
app.options('*', cors());

// Middleware to set ngrok-skip-browser-warning header for all responses
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    // Optionally, set a custom User-Agent for all responses (not requests)
    // Note: To set a custom User-Agent for outgoing requests, do it in your frontend fetch code.
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Endpoint to receive analytics data
app.post('/collect', async (req, res) => {
    try {
        const entry = req.body;
        entry._received = new Date().toISOString();

        // Log incoming analytics for debugging
        console.log('Received analytics:', entry);

        // Optionally, you could validate or sanitize the new fields here:
        // entry.country, entry.city, entry.hostname, entry.isp

        // Append new entry as JSONL (one JSON per line) to local file
        const newLine = JSON.stringify(entry) + '\n';
        fs.appendFileSync(LOG_FILE_PATH, newLine, 'utf8');

        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Error handling analytics:', err.message);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Endpoint to receive newsletter signups
app.post('/newsletter', async (req, res) => {
    try {
        const entry = req.body;
        entry._received = new Date().toISOString();
        fs.appendFileSync(NEWSLETTER_FILE_PATH, JSON.stringify(entry) + '\n', 'utf8');
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Error handling newsletter signup:', err.message);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Signup info endpoint
app.post('/cookie-signup', async (req, res) => {
    try {
        const entry = req.body;
        entry._received = new Date().toISOString();
        fs.appendFileSync(COOKIE_SIGNUP_FILE, JSON.stringify(entry) + '\n', 'utf8');
        res.status(200).json({ status: 'ok', success: true });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message, success: false });
    }
});

// Cloud save (one save per username)
app.post('/cookie-cloud', async (req, res) => {
    try {
        let saves = {};
        if (fs.existsSync(COOKIE_CLOUD_FILE)) {
            saves = JSON.parse(fs.readFileSync(COOKIE_CLOUD_FILE, 'utf8'));
        }
        const { username, password, cookies, timestamp } = req.body;
        saves[username] = { password, cookies, timestamp };
        fs.writeFileSync(COOKIE_CLOUD_FILE, JSON.stringify(saves, null, 2), 'utf8');
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Cloud load (get save by username/password)
app.get('/cookie-cloud', (req, res) => {
    try {
        const { username, password } = req.query;
        if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
        if (!fs.existsSync(COOKIE_CLOUD_FILE)) return res.status(404).json({ error: 'No saves' });
        const saves = JSON.parse(fs.readFileSync(COOKIE_CLOUD_FILE, 'utf8'));
        if (!saves[username] || saves[username].password !== password) {
            return res.status(404).json({ error: 'Not found or wrong password' });
        }
        // Only return user cookies, not internal/service cookies
        const exclude = [
            'cookie_saver_email',
            'cookie_saver_name',
            'cookie_saver_password',
            'newsletter_hide',
            'cookie_saver_signedup',
            'cookie_saver_username'
        ];
        const allCookies = saves[username].cookies || {};
        const userCookies = {};
        Object.keys(allCookies).forEach(k => {
            if (!exclude.includes(k)) userCookies[k] = allCookies[k];
        });
        res.json({ cookies: userCookies });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Show all analytics entries, newsletter signups, cookie signups, or cloud saves as a user-friendly, auto-updating web page
app.get('/latest', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Latest Data</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 2em; }
                #container { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 2em; max-width: 900px; margin: auto; }
                button { margin: 0 0.5em 1em 0; padding: 0.5em 1.5em; }
                pre { background: #f4f4f4; padding: 1em; border-radius: 4px; max-height: 400px; max-width: 100%; overflow: auto; white-space: pre; word-break: break-all; }
                #status { color: #888; font-size: 0.9em; margin-bottom: 1em; }
            </style>
        </head>
        <body>
            <div id="container">
                <h2>Latest Data</h2>
                <button onclick="showType('analytics')">Analytics</button>
                <button onclick="showType('newsletter')">Newsletter Signups</button>
                <button onclick="showType('cookie-signup')">Cookie Signups</button>
                <button onclick="showType('cookie-cloud')">Cloud Cookie Saves</button>
                <div id="status">Loading latest data...</div>
                <div id="entries"></div>
            </div>
            <script>
                let currentType = 'analytics';
                function showType(type) {
                    currentType = type;
                    fetchLatest();
                }
                async function fetchLatest() {
                    try {
                        const res = await fetch('/latest.json?type=' + currentType);
                        if (!res.ok) throw new Error('No data');
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            document.getElementById('entries').innerHTML = data.map(entry =>
                                '<pre>' + JSON.stringify(entry, null, 2) + '</pre>'
                            ).join('');
                            document.getElementById('status').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
                        } else {
                            document.getElementById('entries').innerHTML = '';
                            document.getElementById('status').textContent = 'No data yet.';
                        }
                    } catch (e) {
                        document.getElementById('entries').innerHTML = '';
                        document.getElementById('status').textContent = 'No data yet.';
                    }
                }
                fetchLatest();
                setInterval(fetchLatest, 3000);
            </script>
        </body>
        </html>
    `);
});

// Serve all analytics, newsletter, cookie signups, or cloud saves as JSON for AJAX polling
app.get('/latest.json', (req, res) => {
    let file;
    switch (req.query.type) {
        case 'newsletter':
            file = NEWSLETTER_FILE_PATH;
            break;
        case 'cookie-signup':
            file = COOKIE_SIGNUP_FILE;
            break;
        case 'cookie-cloud':
            file = COOKIE_CLOUD_FILE;
            break;
        default:
            file = LOG_FILE_PATH;
    }
    if (!fs.existsSync(file)) {
        return res.status(404).json([]);
    }
    // For cookie-cloud, show as array of {username, cookies, timestamp}
    if (req.query.type === 'cookie-cloud') {
        try {
            const saves = JSON.parse(fs.readFileSync(file, 'utf8'));
            const arr = Object.entries(saves)
                .map(([username, obj]) => ({
                    username,
                    cookies: obj.cookies,
                    timestamp: obj.timestamp
                }))
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return res.json(arr);
        } catch {
            return res.status(500).json([]);
        }
    }
    // For other files (jsonl), show all lines
    const lines = fs.readFileSync(file, 'utf8')
        .split('\n')
        .filter(line => line.trim().length > 0);
    try {
        const entries = lines.map(line => JSON.parse(line));
        res.json(entries.reverse());
    } catch {
        res.status(500).json([]);
    }
});

// Endpoint to check account validity (for client-side check on every page load)
app.post('/cookie-verify', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ valid: false });
        if (!fs.existsSync(COOKIE_CLOUD_FILE)) return res.status(404).json({ valid: false });
        const saves = JSON.parse(fs.readFileSync(COOKIE_CLOUD_FILE, 'utf8'));
        if (!saves[username] || saves[username].password !== password) {
            return res.status(404).json({ valid: false });
        }
        res.json({ valid: true });
    } catch {
        res.status(500).json({ valid: false });
    }
});

// Link shortener endpoints
const LINK_DB_FILE = path.join(__dirname, 'links.json');

// Helper to load/save link DB
function loadLinksDB() {
    if (!fs.existsSync(LINK_DB_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(LINK_DB_FILE, 'utf8'));
    } catch {
        return {};
    }
}
function saveLinksDB(db) {
    fs.writeFileSync(LINK_DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// REST API for link shortener server

// Get all links
app.get('/shortener', (req, res) => {
    try {
        const db = loadLinksDB();
        res.json(db);
    } catch (err) {
        res.status(500).json({ error: "Failed to read links.json" });
    }
});

// Create or update a link (POST)
app.post('/shortener', (req, res) => {
    const { code, url, status } = req.body;
    if (!code || !url) {
        return res.status(400).json({ error: 'Missing code or url' });
    }
    try {
        const db = loadLinksDB();
        db[code] = { url, status: status || "active" };
        saveLinksDB(db);
        res.json({ success: true, code });
    } catch (err) {
        res.status(500).json({ error: "Failed to update links.json" });
    }
});

// Delete a link (DELETE)
app.delete('/shortener/:code', (req, res) => {
    const code = req.params.code;
    try {
        const db = loadLinksDB();
        if (!(code in db)) {
            return res.status(404).json({ error: 'Code not found' });
        }
        delete db[code];
        saveLinksDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to update links.json" });
    }
});

app.get('/', (req, res) => {
    res.send('Server is running!');
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
