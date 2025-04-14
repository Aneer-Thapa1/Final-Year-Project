const getWelcomeEmailTemplate = require('./welcomeEmail');
const getOTPResetEmailTemplate = require('./passowrdResetEmail');


const getEmailTemplate = (type, data) => {
    switch (type) {
        case 'welcome':
            return getWelcomeEmailTemplate(data.user_name);
        case 'passwordReset':
            return  getOTPResetEmailTemplate (data.user_name, data.otp)
        case 'achievementUnlocked':
            return  getOTPResetEmailTemplate (data.user_name, data.otp)
        // Add more cases for other email types
        default:
            throw new Error('Invalid email type');
    }
};

module.exports = getEmailTemplate;
