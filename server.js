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

// Serve favicon.ico to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).send(); // No content response
});

// --- Data directories and file paths ---
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

const LATEST_PASSWORD = process.env.LATEST_PASSWORD || 'letmein';
const LATEST_COOKIE = 'latest_auth';

// Helper: check password from query, body, or cookie
function checkLatestPassword(req) {
    const pwd = req.body?.password || req.query?.password || req.cookies?.[LATEST_COOKIE];
    return pwd === LATEST_PASSWORD;
}

// Serve /latest as a single-page app (login + data UI)
app.get('/latest', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Latest</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 2em; }
    #container { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 2em; max-width: 900px; margin: auto; }
    button { margin: 0 0.5em 1em 0; padding: 0.5em 1.5em; }
    pre { background: #f4f4f4; padding: 1em; border-radius: 4px; max-height: 400px; max-width: 100%; overflow: auto; white-space: pre; word-break: break-all; }
    #status { color: #888; font-size: 0.9em; margin-bottom: 1em; }
    #filelist { margin-bottom: 1em; }
    #fileedit { margin-top: 1em; }
    #fileedit textarea { width: 100%; height: 300px; font-family: monospace; font-size: 1em; }
    #fileedit button { margin-top: 0.5em; }
    .tab { display: inline-block; margin-right: 1em; cursor: pointer; font-weight: bold; }
    .tab.active { color: #1976d2; text-decoration: underline; }
    #login-container { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 2em; max-width: 400px; margin: 5em auto; }
    #login-container input[type=password] { padding: 0.5em; width: 100%; margin-bottom: 1em; }
    #login-container button { padding: 0.5em 2em; }
    #login-msg { color: #c00; }
  </style>
</head>
<body>
  <div id="login-container" style="display:none;">
    <h2>Enter Password</h2>
    <form id="pwform" autocomplete="off">
      <input type="password" id="pw" placeholder="Password" autofocus autocomplete="off" />
      <button type="submit">Access</button>
    </form>
    <div id="login-msg"></div>
  </div>
  <div id="container" style="display:none;">
    <h2>Latest Data</h2>
    <span class="tab active" data-type="analytics">Analytics</span>
    <span class="tab" data-type="newsletter">Newsletter Signups</span>
    <span class="tab" data-type="cookie-signup">Cookie Signups</span>
    <span class="tab" data-type="cookie-cloud">Cloud Cookie Saves</span>
    <span class="tab" data-type="files">Files</span>
    <div id="status">Loading latest data...</div>
    <div id="entries"></div>
    <div id="filelist" style="display:none"></div>
    <div id="fileedit" style="display:none"></div>
  </div>
  <script type="text/javascript">
    window.onload = function() {
      checkAuthAndShow();
    };
    
    async function checkAuthAndShow() {
      try {
        let res = await fetch('/latest.json?type=analytics', { credentials: 'same-origin' });
        if (res.status === 403) throw new Error('Not logged in');
        document.getElementById('container').style.display = 'block';
        document.getElementById('login-container').style.display = 'none';
        initMainUI();
      } catch {
        document.getElementById('container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('pw').focus();
      }
    }
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById('pwform').onsubmit = async function(e) {
        e.preventDefault();
        const pw = document.getElementById('pw').value;
        if (!pw) return;
        const res = await fetch('/latest-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw })
        });
        if (res.ok) {
          document.getElementById('login-msg').textContent = '';
          checkAuthAndShow();
        } else {
          document.getElementById('login-msg').textContent = 'Wrong password.';
        }
      };
    });
    function initMainUI() {
      let currentType = 'analytics';
      function setActiveTab(tab) {
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
      }
      function showTab(tabType) {
        currentType = tabType;
        if (tabType === 'files') {
          document.getElementById('entries').style.display = 'none';
          document.getElementById('status').style.display = 'none';
          document.getElementById('filelist').style.display = '';
          document.getElementById('fileedit').style.display = '';
          fetchFiles();
        } else {
          document.getElementById('entries').style.display = '';
          document.getElementById('status').style.display = '';
          document.getElementById('filelist').style.display = 'none';
          document.getElementById('fileedit').style.display = 'none';
          fetchLatest();
        }
      }
      document.querySelectorAll('.tab').forEach(function(tab) {
        tab.onclick = function() {
          setActiveTab(tab);
          showTab(tab.getAttribute('data-type'));
        };
      });
      async function fetchLatest() {
        try {
          const res = await fetch('/latest.json?type=' + encodeURIComponent(currentType), { credentials: 'same-origin' });
          if (!res.ok) throw new Error('No data');
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            document.getElementById('entries').innerHTML = data.map(function(entry) {
              return '<pre>' + JSON.stringify(entry, null, 2) + '</pre>';
            }).join('');
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
      async function fetchFiles() {
        document.getElementById('filelist').innerHTML = 'Loading file list...';
        document.getElementById('fileedit').innerHTML = '';
        try {
          const res = await fetch('/files/list', { credentials: 'same-origin' });
          if (!res.ok) throw new Error('Failed');
          const files = await res.json();
          document.getElementById('filelist').innerHTML = files.map(function(f) {
            return '<a href="#" onclick="window.editFile(\'' + encodeURIComponent(f) + '\');return false;">' + f + '</a>';
          }).join(' | ');
        } catch {
          document.getElementById('filelist').innerHTML = 'Failed to load file list.';
        }
      }
      window.editFile = async function(fname) {
        fname = decodeURIComponent(fname);
        document.getElementById('fileedit').innerHTML = 'Loading...';
        try {
          const res = await fetch('/files/read?file=' + encodeURIComponent(fname), { credentials: 'same-origin' });
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();
          function escapeHtml(text) {
            return text.replace(/[&<>"']/g, function(m) {
              return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
              })[m];
            });
          }
          document.getElementById('fileedit').innerHTML =
            '<h3>Editing: ' + fname + '</h3>' +
            '<textarea id="filecontent">' + (data.content ? escapeHtml(data.content) : '') + '</textarea><br>' +
            '<button id="savefilebtn" type="button">Save</button>' +
            '<span id="filesave-status"></span>';
          document.getElementById('savefilebtn').addEventListener('click', function() {
            window.saveFile(fname);
          });
        } catch {
          document.getElementById('fileedit').innerHTML = 'Failed to load file.';
        }
      }
      window.saveFile = async function(fname) {
        fname = decodeURIComponent(fname);
        const content = document.getElementById('filecontent').value;
        document.getElementById('filesave-status').textContent = 'Saving...';
        try {
          const res = await fetch('/files/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ file: fname, content })
          });
          if (!res.ok) throw new Error('Failed');
          document.getElementById('filesave-status').textContent = 'Saved!';
        } catch {
          document.getElementById('filesave-status').textContent = 'Failed to save.';
        }
      }
      fetchLatest();
      setInterval(function() {
        if (document.getElementById('entries').style.display !== 'none') fetchLatest();
      }, 3000);
    }
    window.editFile = editFile;
    window.saveFile = saveFile;
  </script>
</body>
</html>
    `);
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
    if (!checkLatestPassword(req)) return res.status(403).json([]);
    let file;
    switch (req.query.type) {
        case 'newsletter':
            try {
                const db = loadNewsletterDB();
                const arr = Object.values(db).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                return res.json(arr);
            } catch {
                return res.status(500).json([]);
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
            } catch {
                return res.status(500).json([]);
            }
        default:
            file = LOG_FILE_PATH;
    }
    if (!fs.existsSync(file)) return res.json([]);
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

// --- File manager endpoints (password protected) ---
const ROOT_DIR = __dirname;
const EXCLUDE_FILES = [
    'node_modules', 'data', '.git', '.env', 'key.pem', 'cert.pem'
];

app.get('/files/list', (req, res) => {
    if (!checkLatestPassword(req)) return res.status(403).json([]);
    try {
        const files = fs.readdirSync(ROOT_DIR)
            .filter(f => !EXCLUDE_FILES.includes(f) && fs.statSync(path.join(ROOT_DIR, f)).isFile());
        res.json(files);
    } catch {
        res.status(500).json([]);
    }
});

app.get('/files/read', (req, res) => {
    if (!checkLatestPassword(req)) return res.status(403).json({ error: 'Forbidden' });
    const fname = req.query.file;
    if (!fname || fname.includes('/') || fname.includes('\\') || EXCLUDE_FILES.includes(fname)) {
        return res.status(400).json({ error: 'Invalid file' });
    }
    const fpath = path.join(ROOT_DIR, fname);
    if (!fs.existsSync(fpath)) return res.status(404).json({ error: 'Not found' });
    try {
        const content = fs.readFileSync(fpath, 'utf8');
        res.json({ content });
    } catch {
        res.status(500).json({ error: 'Failed to read' });
    }
});

app.post('/files/write', (req, res) => {
    if (!checkLatestPassword(req)) return res.status(403).json({ error: 'Forbidden' });
    const { file, content } = req.body;
    if (!file || file.includes('/') || file.includes('\\') || EXCLUDE_FILES.includes(file)) {
        return res.status(400).json({ error: 'Invalid file' });
    }
    const fpath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(fpath)) return res.status(404).json({ error: 'Not found' });
    try {
        fs.writeFileSync(fpath, content, 'utf8');
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to write' });
    }
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
