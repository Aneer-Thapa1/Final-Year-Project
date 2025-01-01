const getWelcomeEmailTemplate = require('./welcomeEmail');
const getPasswordResetTemplate = require('./passwordResetEmail');

const getEmailTemplate = (type, data) => {
    switch (type) {
        case 'welcome':
            return getWelcomeEmailTemplate(data.user_name);
        case 'passwordReset':
            // return getPasswordResetTemplate(data.resetLink);
        // Add more cases for other email types
        default:
            throw new Error('Invalid email type');
    }
};

module.exports = getEmailTemplate;
