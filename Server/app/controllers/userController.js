const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { sendMail } = require('../utils/emailService');
const { createDefaultHabitsForUser } = require('../utils/habit/defaultHabit');
const { createAchievementProgressForUser } = require('../utils/achievements/createAchievements');

const prisma = new PrismaClient();

/**
 * Generate a random numeric OTP of specified length
 * @param {number} length - Length of OTP
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
};

/**
 * Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
    const { user_name, user_email, gender, password } = req.body;

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

        // Create the user
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

        // Run setup tasks in parallel for better performance
        await Promise.all([
            // Create default habits for the new user
            createDefaultHabitsForUser(newUser.user_id),

            // Create achievement progress tracking for the new user
            createAchievementProgressForUser(newUser.user_id),

            // Create user stats
            prisma.userStats.create({
                data: {
                    user_id: newUser.user_id
                }
            }),

            // Send welcome email
            sendMail(newUser.user_email, 'welcome', { user_name: newUser.user_name })
        ]);

        // Generate JWT token
        const token = jwt.sign(
            newUser.user_id.toString(),
            process.env.JWT_SECRET
        );

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

/**
 * Login a user
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
    const { userEmail, password } = req.body;

    if (!userEmail?.trim() || !password) {
        return res.status(400).json({
            success: false,
            error: "Email and password are required"
        });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { user_email: userEmail.toLowerCase().trim() }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials"
            });
        }

        // Update last active timestamp
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: { lastActive: new Date() }
        });

        const token = jwt.sign(
            user.user_id.toString(),
            process.env.JWT_SECRET
        );

        const { password: _, ...userData } = user;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userData,
                token: token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to complete login"
        });
    }
};

/**
 * Refresh the user's token
 * @route POST /api/auth/refresh-token
 */
const refreshToken = async (req, res) => {
    try {
        const user_id = parseInt(req.user);

        const user = await prisma.user.findUnique({
            where: { user_id: user_id }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found"
            });
        }

        const token = jwt.sign(
            user.user_id.toString(),
            process.env.JWT_SECRET
        );

        return res.status(200).json({
            success: true,
            data: { token }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to refresh token"
        });
    }
};

/**
 * Change user password
 * @route POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user_id = parseInt(req.user);

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            error: "Current password and new password are required"
        });
    }

    try {
        // Get user from database
        const user = await prisma.user.findUnique({
            where: { user_id: user_id }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Check if current password matches
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: "Current password is incorrect"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await prisma.user.update({
            where: { user_id: user_id },
            data: { password: hashedPassword }
        });

        return res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to change password"
        });
    }
};

/**
 * Send password reset OTP
 * @route POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required"
            });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { user_email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Check for rate limiting - prevent OTP spam
        if (user.otpLastSent) {
            const lastSentTime = new Date(user.otpLastSent).getTime();
            const currentTime = Date.now();
            const timeDifference = currentTime - lastSentTime;

            // Limit to one OTP per minute (60000 milliseconds)
            if (timeDifference < 60000) {
                return res.status(429).json({
                    success: false,
                    error: "Please wait before requesting another OTP"
                });
            }
        }

        // Generate a 6-digit OTP
        const otp = generateOTP(6);

        // Hash the OTP for storage
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

        // Set expiry to 90 seconds
        const otpExpiry = new Date(Date.now() + 90 * 1000); // 90 seconds

        // Save OTP information in database
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                resetOTP: hashedOTP,
                resetOTPExpiry: otpExpiry,
                otpAttempts: 0, // Reset attempts counter
                otpLastSent: new Date()
            }
        });

        // Send OTP via email
        await sendMail(
            user.user_email,
            'passwordReset',
            {
                user_name: user.user_name,
                otp: otp
            }
        );

        return res.status(200).json({
            success: true,
            message: "Password reset OTP sent to your email",
            data: {
                email: user.user_email // Return email for the verify step
            }
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({
            success: false,
            error: "Error sending OTP"
        });
    }
};

/**
 * Verify OTP and allow password reset
 * @route POST /api/auth/verify-otp
 */
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: "Email and OTP are required"
            });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { user_email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Check if OTP exists and is not expired
        if (!user.resetOTP || !user.resetOTPExpiry) {
            return res.status(400).json({
                success: false,
                error: "No OTP was requested or it has expired"
            });
        }

        // Check if OTP is expired
        if (new Date() > new Date(user.resetOTPExpiry)) {
            return res.status(400).json({
                success: false,
                error: "OTP has expired. Please request a new one"
            });
        }

        // Check attempts - limit to 5 attempts
        if (user.otpAttempts >= 5) {
            // Clear OTP data to force requesting a new one
            await prisma.user.update({
                where: { user_id: user.user_id },
                data: {
                    resetOTP: null,
                    resetOTPExpiry: null,
                    otpAttempts: 0
                }
            });

            return res.status(400).json({
                success: false,
                error: "Too many invalid attempts. Please request a new OTP"
            });
        }

        // Hash provided OTP to compare with stored hash
        const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

        // Verify OTP
        if (hashedOTP !== user.resetOTP) {
            // Increment failed attempts
            await prisma.user.update({
                where: { user_id: user.user_id },
                data: {
                    otpAttempts: user.otpAttempts + 1
                }
            });

            return res.status(400).json({
                success: false,
                error: "Invalid OTP. Please try again"
            });
        }

        // Generate a reset token for the password reset page
        // This token will be used for the actual password reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save new reset token and clear OTP data
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                resetPasswordToken: crypto.createHash('sha256').update(resetToken).digest('hex'),
                resetPasswordExpiry: resetTokenExpiry,
                resetOTP: null,
                resetOTPExpiry: null,
                otpAttempts: 0
            }
        });

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            data: {
                resetToken: resetToken // Token to be used in reset password URL
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({
            success: false,
            error: "Error verifying OTP"
        });
    }
};

/**
 * Reset password with token (after OTP verification)
 * @route POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Token and new password are required"
            });
        }

        // Hash the token to compare with stored token
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with matching token that hasn't expired
        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpiry: {
                    gt: new Date() // Token should not be expired
                }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: "Invalid or expired reset token"
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password and clear reset tokens
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpiry: null
            }
        });

        return res.status(200).json({
            success: true,
            message: "Password has been reset successfully"
        });
    } catch (error) {
        console.error('Password reset error:', error);
        return res.status(500).json({
            success: false,
            error: "Error resetting password"
        });
    }
};

/**
 * Verify a user from token
 * @route GET /api/auth/verify
 */
const verifyUser = async (req, res) => {
    try {
        const user_id = parseInt(req.user);

        if (!user_id) {
            return res.status(401).json({
                success: false,
                error: "User ID not found"
            });
        }

        const user = await prisma.user.findUnique({
            where: { user_id: user_id }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Remove sensitive data
        const { password, resetPasswordToken, resetPasswordExpiry, resetOTP, resetOTPExpiry, otpAttempts, otpLastSent, ...userData } = user;

        return res.status(200).json({
            success: true,
            message: "User verified",
            data: { user: userData }
        });
    } catch (error) {
        console.error('Error verifying user:', error);
        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

module.exports = {
    register,
    login,
    refreshToken,
    changePassword,
    forgotPassword,
    verifyOTP,
    resetPassword,
    verifyUser
};