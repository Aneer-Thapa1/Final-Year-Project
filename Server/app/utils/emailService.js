const nodemailer = require('nodemailer');
const getEmailTemplate = require('./emailTemplates');

const transporter = nodemailer.createTransport({
    service: 'Gmail', // Replace with your email provider
    auth: {
        user: process.env["NODE_MAILER_GMAIL "],
        pass: process.env["NODE_MAILER_PASSWORD "],
    },
});

const sendMail = async (to, emailType, data) => {
    try {
        // Get the email template based on the type
        const { subject, html } = getEmailTemplate(emailType, data);

        const mailOptions = {
            from: process.env["NODE_MAILER_GMAIL "],
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = { sendMail };
