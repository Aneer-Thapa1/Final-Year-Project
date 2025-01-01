const getWelcomeEmailTemplate = (user_name) => {
    return {
        subject: 'Welcome to Habit Pulse – Your Journey Starts Here!',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #333;
            line-height: 1.6;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            text-align: center;
            padding: 10px 0;
          }
          .content {
            padding: 20px;
          }
          .cta {
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            display: inline-block;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #888;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Welcome to Habit Pulse!</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${user_name}</strong>,</p>
          <p>We’re thrilled to have you join us on this journey to build and sustain positive habits. With Habit Pulse, you're stepping into a world of possibilities where small changes lead to big transformations.</p>
          <p>Here’s what you can look forward to:</p>
          <ul>
            <li>🌟 Track and visualize your habits with ease.</li>
            <li>💡 Get personalized habit recommendations tailored to your goals.</li>
            <li>🎯 Stay motivated with streaks, badges, and rewards.</li>
            <li>🤝 Join a supportive community to share your progress and inspire others.</li>
          </ul>
          <p>Ready to take the first step? Click below to start building habits that matter:</p>
          <a class="cta" href="https://habitpulse.com/dashboard">Start Your Journey</a>
          <p>We’re here to support you every step of the way. Let’s make great things happen together!</p>
          <p>Best regards,<br>The Habit Pulse Team</p>
        </div>
        <div class="footer">
          <p>You're receiving this email because you signed up for Habit Pulse. If you have any questions, feel free to contact us at <a href="mailto:support@habitpulse.com">support@habitpulse.com</a>.</p>
        </div>
      </body>
      </html>
    `
    };
};

module.exports = getWelcomeEmailTemplate;
