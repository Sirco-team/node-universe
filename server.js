require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');

const app = express();

// Hardcoded config (not recommended for production)
const GITHUB_TOKEN = 'Z2hwXzhuMHpEWDBZNFprRHRDTzlGZGNwMTFJd3M1RDJBajRTa0Vwcg=='; // base64 for 'ghp_xxx...'
const GITHUB_REPO = 'Timmmy307/URL-SHORTINER-files';
const GITHUB_FILE_PATH = 'analytics/log.jsonl';
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './cert.pem';

app.use(bodyParser.json());

// Decode the GitHub token from base64
function getDecodedToken() {
    return Buffer.from(GITHUB_TOKEN, 'base64').toString('utf8');
}

// Helper: Get file from GitHub
async function getFileFromGitHub() {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    try {
        const res = await axios.get(url, {
            headers: {
                Authorization: `token ${getDecodedToken()}`,
                'User-Agent': 'analytics-backend'
            }
        });
        return {
            sha: res.data.sha,
            content: Buffer.from(res.data.content, 'base64').toString('utf8')
        };
    } catch (err) {
        if (err.response && err.response.status === 404) {
            return { sha: null, content: '' }; // File does not exist yet
        }
        throw err;
    }
}

// Helper: Update file on GitHub
async function updateFileOnGitHub(newContent, sha) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    const message = `Analytics update: ${new Date().toISOString()}`;
    const contentEncoded = Buffer.from(newContent, 'utf8').toString('base64');
    const data = {
        message,
        content: contentEncoded,
        sha: sha || undefined
    };
    await axios.put(url, data, {
        headers: {
            Authorization: `token ${getDecodedToken()}`,
            'User-Agent': 'analytics-backend'
        }
    });
}

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

        // Get current file content and sha
        const { sha, content } = await getFileFromGitHub();

        // Append new entry as JSONL (one JSON per line)
        const newLine = JSON.stringify(entry);
        const newContent = content ? content + '\n' + newLine : newLine;

        // Update file on GitHub
        await updateFileOnGitHub(newContent, sha);

        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('Error handling analytics:', err.message);
        res.status(500).json({ status: 'error', error: err.message });
    }
});

app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Replace app.listen(PORT, ...) with HTTPS server:
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
