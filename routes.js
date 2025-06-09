// routes.js
// All endpoint routes for the server
const fs = require('fs');
const path = require('path');

module.exports = function(app, helpers) {
    // --- Root endpoint ---
    app.get('/', (req, res) => {
        res.send('Server is running');
    });

    // --- Static files ---
    app.use(require('express').static(path.join(__dirname, 'public')));

    // --- /latest and /latest.html ---
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

    // --- /my-ip ---
    app.get('/my-ip', (req, res) => {
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
        res.json({ ip });
    });

    // --- /account-signup ---
    app.post('/account-signup', (req, res) => {
        // ...copy logic from server.js...
    });

    // --- /collect ---
    app.post('/collect', (req, res) => {
        // ...copy logic from server.js...
    });

    // --- /banned-ips ---
    app.get('/banned-ips', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /banned-macs ---
    app.get('/banned-macs', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /unban-ip ---
    app.post('/unban-ip', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /unban-mac ---
    app.post('/unban-mac', (req, res) => {
        // ...copy logic from server.js...
    });

    // --- /latest.json ---
    app.get('/latest.json', (req, res) => {
        // ...copy logic from server.js...
    });

    // --- /cookie-signup ---
    app.post('/cookie-signup', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /verify-account ---
    app.post('/verify-account', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /ban-user ---
    app.post('/ban-user', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /temp-ban-user ---
    app.post('/temp-ban-user', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /delete-user ---
    app.post('/delete-user', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /cookie-verify ---
    app.post('/cookie-verify', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /send-newsletter ---
    app.post('/send-newsletter', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /admin-settings ---
    app.get('/admin-settings', (req, res) => {
        // ...copy logic from server.js...
    });
    app.post('/admin-settings/update', (req, res) => {
        // ...copy logic from server.js...
    });
    // --- /banned-accounts ---
    app.post('/banned-accounts', (req, res) => {
        // ...copy logic from server.js...
    });
};
