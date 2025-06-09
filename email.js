// email.js
// All email configuration and sending logic for the server
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const DATA_DIR = path.join(__dirname, 'data');
const EMAIL_CREDS_PATH = path.join(__dirname, 'email_creds.json');
const ADMIN_SETTINGS_FILE = path.join(DATA_DIR, 'admin-settings.json');

let apiKeys = [];
let GMAIL_USER = '';
let GMAIL_PASS = '';

try {
    if (fs.existsSync(EMAIL_CREDS_PATH)) {
        const creds = JSON.parse(fs.readFileSync(EMAIL_CREDS_PATH, 'utf8'));
        if (creds.email && creds.password) {
            GMAIL_USER = creds.email;
            GMAIL_PASS = creds.password;
            apiKeys.push({ user: creds.email, pass: creds.password });
        }
    }
    if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
        const settings = JSON.parse(fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8'));
        if (settings.apiKey && settings.apiSecret) {
            apiKeys.push({ user: settings.apiKey, pass: settings.apiSecret });
        }
        if (Array.isArray(settings.extraMailjetKeys)) {
            for (const k of settings.extraMailjetKeys) {
                if (k.user && k.pass) apiKeys.push({ user: k.user, pass: k.pass });
            }
        }
    }
} catch (e) {
    console.error('Failed to load email_creds.json or admin-settings.json:', e);
}

let transporter = null;
function createTransporter(index = 0) {
    if (!apiKeys[index]) return null;
    return nodemailer.createTransport({
        host: 'in-v3.mailjet.com',
        port: 587,
        secure: false,
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

async function sendVerificationEmail(email, code) {
    if (!transporter) return;
    const mailOptions = {
        from: 'thereal.verify.universe@gmail.com',
        to: email,
        subject: 'Code-Universe Account Activation Code',
        text: `Welcome to Code-Universe!\n\nYour activation code is: ${code}\n\nPlease enter this code to verify your account.\n\nFor your security, you will not need this code after verification, and no one will ever ask you for it.\n\nIf you did not request this, you can ignore this email.\n\nThank you!\nCode-Universe Team`,
        html: `<div style='font-family:sans-serif;max-width:500px;margin:auto;background:#f9f9f9;padding:2em;border-radius:8px;'>\n  <h2 style='color:#1976d2;'>Code-Universe Account Activation</h2>\n  <p>Welcome to <b>Code-Universe</b>!</p>\n  <p style='font-size:1.2em;'>Your activation code is:</p>\n  <div style='font-size:2em;font-weight:bold;background:#fff;padding:1em 2em;border-radius:6px;border:1px solid #eee;display:inline-block;margin-bottom:1em;'>${code}</div>\n  <p>Enter this code to verify your account.</p>\n  <p style='color:#888;font-size:0.95em;'>For your security, you will not need this code after verification, and no one will ever ask you for it.</p>\n  <p style='color:#888;font-size:0.95em;'>If you did not request this, you can ignore this email.</p>\n  <p style='margin-top:2em;color:#1976d2;'>Thank you!<br>Code-Universe Team</p>\n</div>`
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.error('Failed to send verification email:', err);
    }
}

async function sendNewsletterEmail(recipients, subject, message) {
    if (!transporter) throw new Error('Email not configured');
    for (const email of recipients) {
        await transporter.sendMail({
            from: 'thereal.verify.universe@gmail.com',
            to: email,
            subject,
            text: message,
            html: `<div style='font-family:sans-serif;max-width:500px;margin:auto;background:#f9f9f9;padding:2em;border-radius:8px;'>${message.replace(/\n/g,'<br>')}</div>`
        });
    }
}

module.exports = {
    sendVerificationEmail,
    sendNewsletterEmail,
    transporter,
    GMAIL_USER,
    GMAIL_PASS
};
