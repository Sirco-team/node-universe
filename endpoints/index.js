module.exports = {
    verifyAccount: require('./verify-account'),
    accountSignup: require('./account-signup'),
    banUser: require('./ban-user'),
    tempBanUser: require('./temp-ban-user'),
    deleteUser: require('./delete-user'),
    cookieVerify: require('./cookie-verify'),
    cookieSignup: require('./cookie-signup'),
    sendNewsletter: require('./send-newsletter'),
    collect: require('./collect'),
    bannedIps: require('./banned-ips'),
    bannedMacs: require('./banned-macs'),
    unbanIp: require('./unban-ip'),
    unbanMac: require('./unban-mac'),
    latestJson: require('./latest-json'),
    adminSettings: require('./admin-settings'),
    adminSettingsUpdate: require('./admin-settings-update'),
    bannedAccounts: require('./banned-accounts')
};