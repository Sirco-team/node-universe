require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');

const app = express();

const LOG_FILE_PATH = './analytics-log.json';
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './cert.pem';

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

        // Append new entry as JSONL (one JSON per line) to local file
        const newLine = JSON.stringify(entry) + '\n';
        fs.appendFileSync(LOG_FILE_PATH, newLine, 'utf8');

        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Error handling analytics:', err.message);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Show the latest N analytics entries as a user-friendly, auto-updating web page
app.get('/latest', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Latest Analytics Entries</title>
            <style>
                body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 2em; }
                h2 { color: #333; }
                #container { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 2em; max-width: 800px; margin: auto; }
                pre { 
                    background: #f4f4f4; 
                    padding: 1em; 
                    border-radius: 4px; 
                    max-height: 400px; 
                    max-width: 100%; 
                    overflow: auto; 
                    white-space: pre; 
                    word-break: break-all;
                }
                #status { color: #888; font-size: 0.9em; margin-bottom: 1em; }
            </style>
        </head>
        <body>
            <div id="container">
                <h2>Latest Analytics Entries</h2>
                <div id="status">Loading latest data...</div>
                <div id="entries"></div>
            </div>
            <script>
                const N = 10; // Number of latest entries to show
                async function fetchLatest() {
                    try {
                        const res = await fetch('/latest.json?n=' + N);
                        if (!res.ok) throw new Error('No data');
                        const data = await res.json();
                        if (Array.isArray(data) && data.length > 0) {
                            document.getElementById('entries').innerHTML = data.map((entry, i) =>
                                '<pre>' + JSON.stringify(entry, null, 2) + '</pre>'
                            ).join('');
                            document.getElementById('status').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
                        } else {
                            document.getElementById('entries').innerHTML = '';
                            document.getElementById('status').textContent = 'No analytics data yet.';
                        }
                    } catch (e) {
                        document.getElementById('entries').innerHTML = '';
                        document.getElementById('status').textContent = 'No analytics data yet.';
                    }
                }
                fetchLatest();
                setInterval(fetchLatest, 3000); // auto-refresh every 3 seconds
            </script>
        </body>
        </html>
    `);
});

// Serve latest N analytics entries as JSON for AJAX polling
app.get('/latest.json', (req, res) => {
    const n = parseInt(req.query.n, 10) || 10;
    if (!fs.existsSync(LOG_FILE_PATH)) {
        return res.status(404).json([]);
    }
    // Filter out empty lines to avoid parsing errors
    const lines = fs.readFileSync(LOG_FILE_PATH, 'utf8')
        .split('\n')
        .filter(line => line.trim().length > 0);
    const lastNLines = lines.slice(-n);
    try {
        const entries = lastNLines.map(line => JSON.parse(line));
        res.json(entries.reverse()); // newest first
    } catch {
        res.status(500).json([]);
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
