const getOTPResetEmailTemplate = (user_name, otp) => {
    return {
        subject: 'Your Password Reset OTP for Habit Pulse',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            text-align: center;
            padding: 10px 0;
          }
          .content {
            padding: 20px;
            text-align: center;
          }
          .otp-box {
            background-color: #F0F4F8;
            border: 2px solid #4CAF50;
            border-radius: 10px;
            padding: 20px;
            font-size: 24px;
            letter-spacing: 10px;
            font-weight: bold;
            color: #4CAF50;
            margin: 20px 0;
            display: inline-block;
          }
          .warning {
            color: #FF5722;
            font-size: 14px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #888;
            margin-top: 20px;
            border-top: 1px solid #E0E0E0;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${user_name}</strong>,</p>
          <p>You've requested to reset your Habit Pulse account password. Use the One-Time Password (OTP) below to proceed:</p>
          
          <div class="otp-box">${otp}</div>
          
          <p>This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
          
          <div class="warning">
            <p>If you did not request a password reset, please contact our support team immediately.</p>
          </div>
          
          <p>Stay secure,<br>The Habit Pulse Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>Need help? Contact us at <a href="mailto:support@habitpulse.com">support@habitpulse.com</a></p>
        </div>
      </body>
      </html>
    `
    };
};


module.exports = getOTPResetEmailTemplate
