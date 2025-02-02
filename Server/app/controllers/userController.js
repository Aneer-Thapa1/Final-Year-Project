const {PrismaClient} = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const {sendMail} = require('../utils/emailService')
const {token} = require("morgan");


const prisma = new PrismaClient();

const register = async (req, res) => {
    const { user_name, user_email, gender, password } = req.body;

    console.log(user_name, user_email, gender, password)


    // Input validation
    if (!user_name?.trim() || !user_email?.trim() || !gender || !password) {
        return res.status(400).json({
            success: false,
            error: "Please fill all the required fields"
        });
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: { user_email: user_email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: "Email already registered"
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Start a transaction for creating the user in the database
        const newUser = await prisma.user.create({
            data: {
                user_name: user_name.trim(),
                user_email: user_email.toLowerCase().trim(),
                password: hashedPassword,
                gender,
                points_gained: 100,
                avatar: "https://example.com/default-avatar.png",
            }
        });

        // Send the welcome email (done after the transaction)
        await sendMail(newUser.user_email, 'welcome', { user_name: newUser.user_name });

        // Generate JWT token


        // Remove sensitive data
        const { password: _, ...userData } = newUser;

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            data: {
                user: userData,
                token: token,
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to complete registration"
        });
    }
};

const login = async (req, res) => {
    // Extract the email and password from the request body (the data sent by the user)
    const { userEmail, password } = req.body;

    // Check if email and password are provided
    if (!userEmail?.trim() || !password) {
        return res.status(400).json({ // If not, return an error
            success: false,
            error: "Email and password are required"
        });
    }

    try {
        // Look for the user in the database using their email
        const user = await prisma.user.findFirst({
            where: { user_email: userEmail.toLowerCase().trim() } // Convert email to lowercase and remove extra spaces
        });
        console.log(user); // Print the user details in the console (for debugging)

        // If the user is not found, return an error
        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials" // User does not exist
            });
        }

        // Compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log(isPasswordValid); // Print whether the password is correct (for debugging)

        // If the password is incorrect, return an error
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials" // Wrong password
            });
        }

        // Generate a token to authenticate the user (used for secure access)
        const token = jwt.sign(user.user_id, process.env.JWT_SECRET);

        // Remove the password field from the user data before sending the response
        const { password: _, ...userData } = user;

        // Send a success response with the user details and token
        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userData, // Send user data (excluding password)
                token: token // Send the authentication token
            }
        });
    } catch (error) {
        console.error('Login error:', error); // Print the error if something goes wrong

        // Return an error response if there's a server issue
        return res.status(500).json({
            success: false,
            error: "Unable to complete login"
        });
    }
};

// Refresh token endpoint - useful for mobile apps
const refreshToken = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: {user_id: req.user.id}
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found"
            });
        }

        const token = jwt.sign(
            {
                id: user.user_id,
                email: user.user_email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '30d'
            }
        );

        return res.status(200).json({
            success: true,
            data: {token}
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to refresh token"
        });
    }
};

const changePassword = async (req, res) => {
    // Get the new password from the request
    const {currentPassword, newPassword} = req.body;

    try {
        // Get user from their authentication token
        const user = req.user;

        // Check if current password matches
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Convert new password into secure format
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Save new password
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });

    } catch (error) {
        res.status(500).json({ message: "Something went wrong, please try again" });
    }
}

const forgotPassword = async (req, res) => {
    try {
        // Get email from request
        const { email } = req.body;

        // Check if user exists in database using Prisma
        const user = await prisma.user.findUnique({
            where: { user_email: email }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate 1-hour valid reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour ahead

        // Save hashed token in database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: crypto.createHash('sha256').update(resetToken).digest('hex'),
                resetPasswordExpiry
            }
        });

        // Create reset password link
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Send reset email to user
        await sendEmail({
            email: user.user_email,
            subject: 'Password Reset Request',
            message: `To reset your password, click: ${resetUrl}\nExpires in 1 hour.`
        });

        res.status(200).json({ message: 'Reset email sent' });

    } catch (error) {
        // If error occurs, clear reset token data
        if (user?.user_id) {
            await prisma.user.update({
                where: { user_id: user.user_id },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpiry: null
                }
            });
        }

        console.error(error);
        res.status(500).json({ error: 'Error sending reset email' });
    }
};

// exporting all the api related to users
module.exports = {register, login, refreshToken, changePassword,forgotPassword};