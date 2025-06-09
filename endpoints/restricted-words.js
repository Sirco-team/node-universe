// Restricted words and their ban durations
module.exports = {
    // Permanent ban words (admin/owner related)
    PERM_BAN_WORDS: [
        'admin', 'administrator', 'owner', 'mod', 'moderator', 'staff',
        'system', 'official', 'dev', 'developer', 'support'
    ],
    // 30-day ban words (racial slurs)
    MONTH_BAN_WORDS: [
        // Add racial slurs here - keeping empty for code safety
    ],
    // 24-hour ban words (profanity)
    DAY_BAN_WORDS: [
        // Add profanity here - keeping empty for code safety
    ],
    // Ban durations in milliseconds
    BAN_DURATIONS: {
        PERMANENT: -1,
        MONTH: 30 * 24 * 60 * 60 * 1000,  // 30 days
        DAY: 24 * 60 * 60 * 1000          // 24 hours
    }
};