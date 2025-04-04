const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const validator = require('validator');
const { isPast, isAfter, isDate } = require('date-fns');

/**
 * Get user settings
 * @route GET /api/settings
 */
const getUserSettings = async (req, res) => {
    try {
        const userId = parseInt(req.user);

        // Get user with all settings but exclude sensitive information
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                user_name: true,
                user_email: true,
                avatar: true,
                gender: true,
                timezone: true,
                prefersNotifications: true,
                theme_preference: true,
                language: true,
                premium_status: true,
                premium_until: true,
                onVacation: true,
                vacation_start: true,
                vacation_end: true,
                dailyGoal: true,
                weeklyGoal: true,
                monthlyGoal: true,
                totalHabitsCreated: true,
                totalHabitsCompleted: true,
                currentDailyStreak: true,
                longestDailyStreak: true,
                registeredAt: true,
                lastActive: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user settings:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user settings',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update profile information (basic details)
 * @route PUT /api/settings/profile
 */
const updateProfile = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { user_name, gender, avatar, timezone, language } = req.body;

        // Validate inputs
        const validationErrors = {};

        if (user_name !== undefined) {
            if (!user_name || user_name.trim() === '') {
                validationErrors.user_name = 'Username cannot be empty';
            } else if (user_name.length < 3 || user_name.length > 30) {
                validationErrors.user_name = 'Username must be between 3 and 30 characters';
            }
        }

        if (timezone !== undefined && !validator.isIn(timezone, [
            'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
            'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
            // Add other common timezones here
        ])) {
            validationErrors.timezone = 'Invalid timezone';
        }

        if (language !== undefined && !validator.isIn(language, ['en', 'es', 'fr', 'de', 'ja', 'zh', 'hi', 'ar'])) {
            validationErrors.language = 'Unsupported language';
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (user_name !== undefined) updateData.user_name = user_name;
        if (gender !== undefined) updateData.gender = gender;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (timezone !== undefined) updateData.timezone = timezone;
        if (language !== undefined) updateData.language = language;

        // Update user
        const updatedUser = await prisma.user.update({
            where: { user_id: userId },
            data: updateData,
            select: {
                user_name: true,
                gender: true,
                avatar: true,
                timezone: true,
                language: true,
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update app preferences (notifications, theme)
 * @route PUT /api/settings/preferences
 */
const updatePreferences = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { prefersNotifications, theme_preference } = req.body;

        // Validate inputs
        const validationErrors = {};

        if (theme_preference !== undefined && !validator.isIn(theme_preference, ['light', 'dark', 'auto'])) {
            validationErrors.theme_preference = 'Theme must be light, dark, or auto';
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (prefersNotifications !== undefined) updateData.prefersNotifications = Boolean(prefersNotifications);
        if (theme_preference !== undefined) updateData.theme_preference = theme_preference;

        // Update user
        const updatedPreferences = await prisma.user.update({
            where: { user_id: userId },
            data: updateData,
            select: {
                prefersNotifications: true,
                theme_preference: true
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Preferences updated successfully',
            data: updatedPreferences
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update preferences',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update habit goals
 * @route PUT /api/settings/goals
 */
const updateGoals = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { dailyGoal, weeklyGoal, monthlyGoal } = req.body;

        // Validate inputs
        const validationErrors = {};

        if (dailyGoal !== undefined) {
            if (!Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 100) {
                validationErrors.dailyGoal = 'Daily goal must be a positive integer between 1 and 100';
            }
        }

        if (weeklyGoal !== undefined) {
            if (!Number.isInteger(weeklyGoal) || weeklyGoal < 1 || weeklyGoal > 500) {
                validationErrors.weeklyGoal = 'Weekly goal must be a positive integer between 1 and 500';
            }
        }

        if (monthlyGoal !== undefined) {
            if (!Number.isInteger(monthlyGoal) || monthlyGoal < 1 || monthlyGoal > 2000) {
                validationErrors.monthlyGoal = 'Monthly goal must be a positive integer between 1 and 2000';
            }
        }

        // Make sure weekly goal is at least as large as daily goal
        if (dailyGoal !== undefined && weeklyGoal !== undefined && weeklyGoal < dailyGoal * 7) {
            validationErrors.weeklyGoal = 'Weekly goal should be at least 7 times the daily goal';
        }

        // Make sure monthly goal is at least as large as weekly goal
        if (weeklyGoal !== undefined && monthlyGoal !== undefined && monthlyGoal < weeklyGoal * 4) {
            validationErrors.monthlyGoal = 'Monthly goal should be at least 4 times the weekly goal';
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (dailyGoal !== undefined) updateData.dailyGoal = dailyGoal;
        if (weeklyGoal !== undefined) updateData.weeklyGoal = weeklyGoal;
        if (monthlyGoal !== undefined) updateData.monthlyGoal = monthlyGoal;

        // Update user
        const updatedGoals = await prisma.user.update({
            where: { user_id: userId },
            data: updateData,
            select: {
                dailyGoal: true,
                weeklyGoal: true,
                monthlyGoal: true
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit goals updated successfully',
            data: updatedGoals
        });
    } catch (error) {
        console.error('Error updating goals:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update habit goals',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Toggle vacation mode
 * @route PUT /api/settings/vacation
 */
const toggleVacationMode = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { onVacation, vacation_start, vacation_end } = req.body;

        // Validate inputs
        const validationErrors = {};

        // If turning vacation mode on, require start and end dates
        if (onVacation === true) {
            if (!vacation_start) {
                validationErrors.vacation_start = 'Vacation start date is required';
            } else {
                const startDate = new Date(vacation_start);
                if (!isDate(startDate)) {
                    validationErrors.vacation_start = 'Invalid vacation start date';
                }
            }

            if (!vacation_end) {
                validationErrors.vacation_end = 'Vacation end date is required';
            } else {
                const endDate = new Date(vacation_end);
                if (!isDate(endDate)) {
                    validationErrors.vacation_end = 'Invalid vacation end date';
                }
            }

            // Make sure start date is not after end date
            if (vacation_start && vacation_end) {
                const startDate = new Date(vacation_start);
                const endDate = new Date(vacation_end);
                if (isAfter(startDate, endDate)) {
                    validationErrors.vacation_dates = 'Vacation start date cannot be after end date';
                }
            }
        }

        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Build update object
        const updateData = {
            onVacation: Boolean(onVacation)
        };

        // Only update dates if turning vacation mode on
        if (onVacation === true) {
            updateData.vacation_start = new Date(vacation_start);
            updateData.vacation_end = new Date(vacation_end);
        } else {
            // Clear vacation dates if turning off
            updateData.vacation_start = null;
            updateData.vacation_end = null;
        }

        // Update user
        const updatedVacationMode = await prisma.user.update({
            where: { user_id: userId },
            data: updateData,
            select: {
                onVacation: true,
                vacation_start: true,
                vacation_end: true
            }
        });

        let message = onVacation
            ? `Vacation mode activated from ${new Date(vacation_start).toLocaleDateString()} to ${new Date(vacation_end).toLocaleDateString()}`
            : 'Vacation mode deactivated';

        // If turning on vacation mode, update user's habits
        if (onVacation === true) {
            // Get all active habits that should be paused during vacation
            const habitsToUpdate = await prisma.habit.findMany({
                where: {
                    user_id: userId,
                    is_active: true,
                    skip_on_vacation: true
                }
            });

            // Log message about pausing habits
            if (habitsToUpdate.length > 0) {
                message += `. ${habitsToUpdate.length} habits will be paused during vacation.`;
            }
        }

        return res.status(200).json({
            success: true,
            message,
            data: updatedVacationMode
        });
    } catch (error) {
        console.error('Error toggling vacation mode:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to toggle vacation mode',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Change user email
 * @route PUT /api/settings/email
 */
const changeEmail = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { new_email, password } = req.body;

        // Validate inputs
        if (!new_email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        if (!validator.isEmail(new_email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if email is already in use
        const existingUser = await prisma.user.findUnique({
            where: { user_email: new_email }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already in use'
            });
        }

        // Verify password
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                password: true
            }
        });

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        // Update email
        await prisma.user.update({
            where: { user_id: userId },
            data: { user_email: new_email }
        });

        return res.status(200).json({
            success: true,
            message: 'Email updated successfully'
        });
    } catch (error) {
        console.error('Error changing email:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to change email',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Change user password
 * @route PUT /api/settings/password
 */
const changePassword = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { current_password, new_password, confirm_password } = req.body;

        // Validate inputs
        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'All password fields are required'
            });
        }

        if (new_password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match'
            });
        }

        // Password strength validation
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        if (!validator.isStrongPassword(new_password, {
            minLength: 8,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
        })) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            });
        }

        // Get current user password
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { password: true }
        });

        // Verify current password
        const passwordMatch = await bcrypt.compare(current_password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password
        await prisma.user.update({
            where: { user_id: userId },
            data: { password: hashedPassword }
        });

        return res.status(200).json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Delete user account
 * @route DELETE /api/settings/account
 */
const deleteAccount = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { password } = req.body;

        // Validate input
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete account'
            });
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { password: true }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        // Delete user account (cascades to all related data)
        await prisma.user.delete({
            where: { user_id: userId }
        });

        return res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete account',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Check if email exists (for registration validation)
 * @route GET /api/settings/check-email/:email
 */
const checkEmailExists = async (req, res) => {
    try {
        const { email } = req.params;

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        const user = await prisma.user.findUnique({
            where: { user_email: email },
            select: { user_id: true }
        });

        return res.status(200).json({
            success: true,
            exists: !!user
        });
    } catch (error) {
        console.error('Error checking email:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check email',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get user data export
 * @route GET /api/settings/export-data
 */
const exportUserData = async (req, res) => {
    try {
        const userId = parseInt(req.user);

        // Get user data with related records
        const userData = await prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
                user_name: true,
                user_email: true,
                avatar: true,
                gender: true,
                timezone: true,
                prefersNotifications: true,
                theme_preference: true,
                language: true,
                premium_status: true,
                premium_until: true,
                onVacation: true,
                vacation_start: true,
                vacation_end: true,
                dailyGoal: true,
                weeklyGoal: true,
                monthlyGoal: true,
                totalHabitsCreated: true,
                totalHabitsCompleted: true,
                currentDailyStreak: true,
                longestDailyStreak: true,
                registeredAt: true,
                lastActive: true,
                habits: {
                    select: {
                        habit_id: true,
                        name: true,
                        description: true,
                        start_date: true,
                        end_date: true,
                        is_active: true,
                        is_favorite: true,
                        icon: true,
                        color: true,
                        frequency_type: true,
                        frequency_value: true,
                        frequency_interval: true,
                        tracking_type: true,
                        createdAt: true
                    }
                },
                habitLogs: {
                    select: {
                        log_id: true,
                        habit_id: true,
                        completed: true,
                        completion_notes: true,
                        completed_at: true,
                        skipped: true,
                        mood: true
                    },
                    orderBy: {
                        completed_at: 'desc'
                    },
                    take: 1000 // Limit to avoid extremely large responses
                },
                habitStreaks: {
                    select: {
                        streak_id: true,
                        habit_id: true,
                        current_streak: true,
                        longest_streak: true,
                        last_completed: true
                    }
                }
            }
        });

        if (!userData) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Create filename based on username and date
        const sanitizedUsername = userData.user_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const date = new Date().toISOString().split('T')[0];
        const filename = `${sanitizedUsername}-data-export-${date}.json`;

        // Set headers for file download
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/json');

        return res.json(userData);
    } catch (error) {
        console.error('Error exporting user data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to export user data',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getUserSettings,
    updateProfile,
    updatePreferences,
    updateGoals,
    toggleVacationMode,
    changeEmail,
    changePassword,
    deleteAccount,
    checkEmailExists,
    exportUserData
};