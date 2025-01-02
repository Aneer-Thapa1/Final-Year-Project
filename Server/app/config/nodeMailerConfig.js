const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env["NODE_MAILER_GMAIL"],
        pass: process.env["NODE_MAILER_PASSWORD"],
    },
});

module.exports = transporter;