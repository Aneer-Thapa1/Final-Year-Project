const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ReminderService } = require('../services/reminderService');
const moment = require('moment-timezone');

/**
 * Controller for handling reminder-related operations
 * Provides API endpoints for managing habit reminders
 */
class ReminderController {
    constructor() {
        this.reminderService = new ReminderService();
    }

    /**
     * Get all reminders for a specific habit
     * @route GET /api/habits/:habitId/reminders
     */
    async getHabitReminders(req, res) {
        try {
            const { habitId } = req.params;
            const userId = parseInt(req.user);

            // Validate habit exists and belongs to user
            const habit = await prisma.habit.findFirst({
                where: {
                    habit_id: parseInt(habitId),
                    user_id: userId
                }
            });

            if (!habit) {
                return res.status(404).json({
                    success: false,
                    message: 'Habit not found or you do not have permission to access it'
                });
            }

            // Get all reminders for this habit
            const reminders = await prisma.habitReminder.findMany({
                where: {
                    habit_id: parseInt(habitId)
                },
                orderBy: {
                    reminder_time: 'asc'
                }
            });

            return res.status(200).json({
                success: true,
                data: reminders
            });
        } catch (error) {
            console.error('Error fetching habit reminders:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch reminders',
                error: error.message
            });
        }
    }

    /**
     * Create a new reminder for a habit
     * @route POST /api/habits/:habitId/reminders
     */
    async createReminder(req, res) {
        try {
            const { habitId } = req.params;
            const userId = parseInt(req.user);
            const {
                reminder_time,
                repeat = 'DAILY',
                notification_message,
                pre_notification_minutes = 10,
                follow_up_enabled = true,
                follow_up_minutes = 30,
                smart_reminder = false
            } = req.body;

            // Validate the input
            if (!reminder_time) {
                return res.status(400).json({
                    success: false,
                    message: 'Reminder time is required'
                });
            }

            // Validate habit exists and belongs to user
            const habit = await prisma.habit.findFirst({
                where: {
                    habit_id: parseInt(habitId),
                    user_id: userId
                }
            });

            if (!habit) {
                return res.status(404).json({
                    success: false,
                    message: 'Habit not found or you do not have permission to add a reminder'
                });
            }

            // Create the reminder
            const newReminder = await prisma.habitReminder.create({
                data: {
                    habit_id: parseInt(habitId),
                    user_id: userId,
                    reminder_time: new Date(reminder_time),
                    repeat,
                    notification_message: notification_message || `Time to complete your habit: ${habit.name}`,
                    is_enabled: true,
                    smart_reminder,
                    pre_notification_minutes,
                    follow_up_enabled,
                    follow_up_minutes
                }
            });

            // Generate reminders for tomorrow if the habit is scheduled for tomorrow
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { timezone: true }
            });

            const tomorrow = moment().tz(user.timezone || 'UTC').add(1, 'day').startOf('day').toDate();

            if (this.reminderService.isHabitScheduledForDate(habit, tomorrow)) {
                await this.reminderService.generateRemindersForHabit(
                    habit,
                    userId,
                    tomorrow,
                    user.timezone || 'UTC'
                );
            }

            return res.status(201).json({
                success: true,
                message: 'Reminder created successfully',
                data: newReminder
            });
        } catch (error) {
            console.error('Error creating reminder:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create reminder',
                error: error.message
            });
        }
    }

    /**
     * Update an existing reminder
     * @route PUT /api/reminders/:reminderId
     */
    async updateReminder(req, res) {
        try {
            const { reminderId } = req.params;
            const userId = parseInt(req.user);
            const {
                reminder_time,
                repeat,
                notification_message,
                is_enabled,
                pre_notification_minutes,
                follow_up_enabled,
                follow_up_minutes,
                smart_reminder
            } = req.body;

            // Validate reminder exists and belongs to user
            const reminder = await prisma.habitReminder.findFirst({
                where: {
                    reminder_id: parseInt(reminderId),
                    user_id: userId
                },
                include: {
                    habit: true
                }
            });

            if (!reminder) {
                return res.status(404).json({
                    success: false,
                    message: 'Reminder not found or you do not have permission to update it'
                });
            }

            // Update the reminder
            const updatedReminder = await prisma.habitReminder.update({
                where: {
                    reminder_id: parseInt(reminderId)
                },
                data: {
                    reminder_time: reminder_time ? new Date(reminder_time) : undefined,
                    repeat: repeat || undefined,
                    notification_message: notification_message || undefined,
                    is_enabled: is_enabled !== undefined ? is_enabled : undefined,
                    pre_notification_minutes: pre_notification_minutes !== undefined ? pre_notification_minutes : undefined,
                    follow_up_enabled: follow_up_enabled !== undefined ? follow_up_enabled : undefined,
                    follow_up_minutes: follow_up_minutes !== undefined ? follow_up_minutes : undefined,
                    smart_reminder: smart_reminder !== undefined ? smart_reminder : undefined
                }
            });

            // If the reminder was enabled or its time changed, regenerate scheduled reminders
            if ((is_enabled === true || reminder_time) && updatedReminder.is_enabled) {
                const user = await prisma.user.findUnique({
                    where: { user_id: userId },
                    select: { timezone: true }
                });

                const tomorrow = moment().tz(user.timezone || 'UTC').add(1, 'day').startOf('day').toDate();

                if (this.reminderService.isHabitScheduledForDate(reminder.habit, tomorrow)) {
                    await this.reminderService.generateRemindersForHabit(
                        reminder.habit,
                        userId,
                        tomorrow,
                        user.timezone || 'UTC'
                    );
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Reminder updated successfully',
                data: updatedReminder
            });
        } catch (error) {
            console.error('Error updating reminder:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update reminder',
                error: error.message
            });
        }
    }

    /**
     * Delete a reminder
     * @route DELETE /api/reminders/:reminderId
     */
    async deleteReminder(req, res) {
        try {
            const { reminderId } = req.params;
            const userId = parseInt(req.user);

            // Validate reminder exists and belongs to user
            const reminder = await prisma.habitReminder.findFirst({
                where: {
                    reminder_id: parseInt(reminderId),
                    user_id: userId
                }
            });

            if (!reminder) {
                return res.status(404).json({
                    success: false,
                    message: 'Reminder not found or you do not have permission to delete it'
                });
            }

            // Delete the reminder
            await prisma.habitReminder.delete({
                where: {
                    reminder_id: parseInt(reminderId)
                }
            });

            // Clean up any scheduled reminders for this reminder configuration
            await prisma.scheduledReminder.deleteMany({
                where: {
                    reminder_config_id: parseInt(reminderId),
                    is_sent: false
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Reminder deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting reminder:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete reminder',
                error: error.message
            });
        }
    }

    /**
     * Get upcoming reminders for the current user
     * @route GET /api/me/upcoming-reminders
     */
    async getUpcomingReminders(req, res) {
        try {
            const userId = parseInt(req.user);
            const { limit = 10, includeCompleted = false } = req.query;

            // Get the user's timezone
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { timezone: true }
            });

            // Current time in user's timezone
            const now = moment().tz(user.timezone || 'UTC');
            const endOfDay = moment().tz(user.timezone || 'UTC').endOf('day');

            // Query upcoming reminders
            const upcomingReminders = await prisma.scheduledReminder.findMany({
                where: {
                    user_id: userId,
                    scheduled_time: {
                        gte: now.toDate(),
                        lte: endOfDay.toDate()
                    },
                    // Only include unsent reminders if includeCompleted is false
                    ...(includeCompleted === 'false' ? { is_sent: false } : {})
                },
                include: {
                    habit: {
                        select: {
                            name: true,
                            icon: true,
                            color: true,
                            domain: {
                                select: {
                                    name: true,
                                    color: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    scheduled_time: 'asc'
                },
                take: parseInt(limit)
            });

            // Format the response
            const formattedReminders = upcomingReminders.map(reminder => ({
                id: reminder.scheduled_reminder_id,
                habitId: reminder.habit_id,
                habitName: reminder.habit.name,
                habitIcon: reminder.habit.icon,
                habitColor: reminder.habit.color,
                domainName: reminder.habit.domain?.name || 'General',
                domainColor: reminder.habit.domain?.color || '#4285F4',
                time: reminder.scheduled_time,
                formattedTime: moment(reminder.scheduled_time).tz(user.timezone || 'UTC').format('h:mm A'),
                message: reminder.message,
                type: reminder.reminder_type,
                isSent: reminder.is_sent
            }));

            return res.status(200).json({
                success: true,
                data: formattedReminders
            });
        } catch (error) {
            console.error('Error fetching upcoming reminders:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch upcoming reminders',
                error: error.message
            });
        }
    }

    /**
     * Enable or disable a reminder
     * @route PATCH /api/reminders/:reminderId/toggle
     */
    async toggleReminder(req, res) {
        try {
            const { reminderId } = req.params;
            const userId = parseInt(req.user);

            // Validate reminder exists and belongs to user
            const reminder = await prisma.habitReminder.findFirst({
                where: {
                    reminder_id: parseInt(reminderId),
                    user_id: userId
                }
            });

            if (!reminder) {
                return res.status(404).json({
                    success: false,
                    message: 'Reminder not found or you do not have permission to update it'
                });
            }

            // Toggle the reminder's enabled status
            const updatedReminder = await prisma.habitReminder.update({
                where: {
                    reminder_id: parseInt(reminderId)
                },
                data: {
                    is_enabled: !reminder.is_enabled
                }
            });

            // If the reminder was enabled, regenerate scheduled reminders
            if (updatedReminder.is_enabled) {
                const habit = await prisma.habit.findUnique({
                    where: { habit_id: reminder.habit_id }
                });

                const user = await prisma.user.findUnique({
                    where: { user_id: userId },
                    select: { timezone: true }
                });

                const tomorrow = moment().tz(user.timezone || 'UTC').add(1, 'day').startOf('day').toDate();

                if (habit && this.reminderService.isHabitScheduledForDate(habit, tomorrow)) {
                    await this.reminderService.generateRemindersForHabit(
                        habit,
                        userId,
                        tomorrow,
                        user.timezone || 'UTC'
                    );
                }
            } else {
                // If the reminder was disabled, remove any pending scheduled reminders
                await prisma.scheduledReminder.deleteMany({
                    where: {
                        reminder_config_id: parseInt(reminderId),
                        is_sent: false
                    }
                });
            }

            return res.status(200).json({
                success: true,
                message: `Reminder ${updatedReminder.is_enabled ? 'enabled' : 'disabled'} successfully`,
                data: {
                    is_enabled: updatedReminder.is_enabled
                }
            });
        } catch (error) {
            console.error('Error toggling reminder:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to toggle reminder',
                error: error.message
            });
        }
    }

    /**
     * Manually test a reminder by sending a notification immediately
     * @route POST /api/reminders/:reminderId/test
     */
    async testReminder(req, res) {
        try {
            const { reminderId } = req.params;
            const userId = parseInt(req.user);

            // Validate reminder exists and belongs to user
            const reminder = await prisma.habitReminder.findFirst({
                where: {
                    reminder_id: parseInt(reminderId),
                    user_id: userId
                },
                include: {
                    habit: true
                }
            });

            if (!reminder) {
                return res.status(404).json({
                    success: false,
                    message: 'Reminder not found or you do not have permission to test it'
                });
            }

            // Create a test scheduled reminder
            const testScheduledReminder = await prisma.scheduledReminder.create({
                data: {
                    habit_id: reminder.habit_id,
                    user_id: userId,
                    scheduled_time: new Date(),
                    reminder_type: 'PRIMARY',
                    message: reminder.notification_message || `Time to complete your habit: ${reminder.habit.name}`,
                    is_sent: false,
                    reminder_config_id: reminder.reminder_id,
                    metadata: {
                        habitColor: reminder.habit.color,
                        habitIcon: reminder.habit.icon,
                        isTest: true
                    }
                },
                include: {
                    habit: true,
                    user: {
                        select: {
                            user_id: true,
                            user_name: true,
                            user_email: true,
                            prefersNotifications: true,
                            timezone: true
                        }
                    }
                }
            });

            // Process the test reminder immediately
            await this.reminderService.processReminder(testScheduledReminder);

            return res.status(200).json({
                success: true,
                message: 'Test reminder sent successfully'
            });
        } catch (error) {
            console.error('Error sending test reminder:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to send test reminder',
                error: error.message
            });
        }
    }

    /**
     * Generate reminders for a specific date
     * @route POST /api/reminders/generate
     */
    async generateReminders(req, res) {
        try {
            const userId = parseInt(req.user);
            const { date } = req.body;

            // If no date provided, use tomorrow
            const targetDate = date ? new Date(date) : moment().add(1, 'day').startOf('day').toDate();

            // Get user's timezone
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { timezone: true }
            });

            // Generate reminders
            const reminderCount = await this.reminderService.generateRemindersForUser(
                userId,
                user.timezone || 'UTC',
                targetDate
            );

            return res.status(200).json({
                success: true,
                message: `Generated ${reminderCount} reminders successfully`,
                data: {
                    date: moment(targetDate).format('YYYY-MM-DD'),
                    remindersGenerated: reminderCount
                }
            });
        } catch (error) {
            console.error('Error generating reminders:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate reminders',
                error: error.message
            });
        }
    }

    /**
     * Dismiss a specific scheduled reminder
     * @route POST /api/scheduled-reminders/:scheduledReminderId/dismiss
     */
    async dismissReminder(req, res) {
        try {
            const { scheduledReminderId } = req.params;
            const userId = parseInt(req.user);

            // Validate reminder exists and belongs to user
            const scheduledReminder = await prisma.scheduledReminder.findFirst({
                where: {
                    scheduled_reminder_id: parseInt(scheduledReminderId),
                    user_id: userId
                }
            });

            if (!scheduledReminder) {
                return res.status(404).json({
                    success: false,
                    message: 'Scheduled reminder not found or you do not have permission to dismiss it'
                });
            }

            // Mark the reminder as sent with a special status
            await prisma.scheduledReminder.update({
                where: {
                    scheduled_reminder_id: parseInt(scheduledReminderId)
                },
                data: {
                    is_sent: true,
                    send_status: 'DISMISSED_BY_USER',
                    actual_send_time: new Date()
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Reminder dismissed successfully'
            });
        } catch (error) {
            console.error('Error dismissing reminder:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to dismiss reminder',
                error: error.message
            });
        }
    }

    /**
     * Update user notification preferences
     * @route PUT /api/users/notification-preferences
     */
    async updateNotificationPreferences(req, res) {
        try {
            const userId = parseInt(req.user);
            const {
                prefersNotifications,
                quietHoursEnabled,
                quietHoursStart,
                quietHoursEnd,
                emailEnabled,
                pushEnabled
            } = req.body;

            // Update user preferences
            const updatedUser = await prisma.user.update({
                where: { user_id: userId },
                data: {
                    prefersNotifications: prefersNotifications !== undefined ? prefersNotifications : undefined
                }
            });

            // Update or create quiet hours preferences
            if (quietHoursEnabled !== undefined || quietHoursStart || quietHoursEnd) {
                const existingPrefs = await prisma.userNotificationPreference.findFirst({
                    where: {
                        user_id: userId,
                        type: 'QUIET_HOURS'
                    }
                });

                const prefsData = {
                    quietHoursEnabled: quietHoursEnabled !== undefined ? quietHoursEnabled : existingPrefs?.settings?.quietHoursEnabled,
                    start: quietHoursStart || existingPrefs?.settings?.start,
                    end: quietHoursEnd || existingPrefs?.settings?.end
                };

                if (existingPrefs) {
                    await prisma.userNotificationPreference.update({
                        where: { preference_id: existingPrefs.preference_id },
                        data: {
                            settings: prefsData
                        }
                    });
                } else {
                    await prisma.userNotificationPreference.create({
                        data: {
                            user_id: userId,
                            type: 'QUIET_HOURS',
                            enabled: quietHoursEnabled !== undefined ? quietHoursEnabled : true,
                            settings: prefsData
                        }
                    });
                }
            }

            // Update channel preferences
            if (emailEnabled !== undefined) {
                await this.updateChannelPreference(userId, 'EMAIL', emailEnabled);
            }

            if (pushEnabled !== undefined) {
                await this.updateChannelPreference(userId, 'PUSH', pushEnabled);
            }

            // Get the updated preferences to return
            const preferences = await prisma.userNotificationPreference.findMany({
                where: {
                    user_id: userId
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Notification preferences updated successfully',
                data: {
                    prefersNotifications: updatedUser.prefersNotifications,
                    preferences
                }
            });
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update notification preferences',
                error: error.message
            });
        }
    }

    /**
     * Helper to update notification channel preferences
     */
    async updateChannelPreference(userId, channel, enabled) {
        const existingPref = await prisma.userNotificationPreference.findFirst({
            where: {
                user_id: userId,
                channel
            }
        });

        if (existingPref) {
            await prisma.userNotificationPreference.update({
                where: { preference_id: existingPref.preference_id },
                data: { enabled }
            });
        } else {
            await prisma.userNotificationPreference.create({
                data: {
                    user_id: userId,
                    channel,
                    type: 'REMINDER',
                    enabled
                }
            });
        }
    }
}

module.exports = new ReminderController();