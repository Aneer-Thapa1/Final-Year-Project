    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const moment = require('moment-timezone');

    /**
     * Service for handling reminder generation and processing
     */
    class ReminderService {
        /**
         * Check if a habit is scheduled for a specific date
         * @param {Object} habit - The habit object
         * @param {Date} date - The date to check
         * @returns {Boolean} - Whether the habit is scheduled for the date
         */
        isHabitScheduledForDate(habit, date) {
            if (!habit || !habit.is_active) {
                return false;
            }

            // Check if the date is within the habit's active period
            const startDate = new Date(habit.start_date);
            const endDate = habit.end_date ? new Date(habit.end_date) : null;

            if (date < startDate) {
                return false;
            }

            if (endDate && date > endDate) {
                return false;
            }

            // Get day of week (0 = Sunday, 6 = Saturday)
            const dayOfWeek = date.getDay();

            // Check based on frequency type
            switch (habit.frequency_type) {
                case 'DAILY':
                    return true;

                case 'WEEKDAYS':
                    // Monday to Friday (1-5)
                    return dayOfWeek >= 1 && dayOfWeek <= 5;

                case 'WEEKENDS':
                    // Saturday and Sunday (0, 6)
                    return dayOfWeek === 0 || dayOfWeek === 6;

                case 'SPECIFIC_DAYS':
                    // Check if the day of week is in the specific_days array
                    return habit.specific_days.includes(dayOfWeek);

                case 'INTERVAL':
                    // Calculate days since start date and check if divisible by interval
                    const diffTime = Math.abs(date - startDate);
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays % habit.frequency_interval === 0;

                case 'X_TIMES_WEEK':
                case 'X_TIMES_MONTH':
                    // For these types, we need to check dailyStatus to see if scheduled
                    // This would normally require a DB lookup, but for now we'll default to true
                    // A full implementation would check if this is one of the scheduled days
                    return true;

                default:
                    return false;
            }
        }

        /**
         * Generate reminders for a specific habit on a specific date
         * @param {Object} habit - The habit object
         * @param {Number} userId - The user ID
         * @param {Date} date - The target date
         * @param {String} timezone - The user's timezone
         * @returns {Number} - The number of reminders generated
         */
        async generateRemindersForHabit(habit, userId, date, timezone) {
            try {
                const targetDate = moment(date).tz(timezone);
                let reminderCount = 0;

                // Get all reminder configurations for this habit
                const reminderConfigs = await prisma.habitReminder.findMany({
                    where: {
                        habit_id: habit.habit_id,
                        user_id: userId,
                        is_enabled: true
                    }
                });

                // Check if the habit is already completed for the target date
                const habitCompleted = await this.isHabitCompletedForDate(habit.habit_id, userId, date);

                // If already completed, no need to generate reminders
                if (habitCompleted) {
                    return 0;
                }

                // For each reminder configuration, generate scheduled reminders
                for (const config of reminderConfigs) {
                    // Parse reminder time
                    const reminderTimeStr = moment(config.reminder_time).format('HH:mm');
                    const [hours, minutes] = reminderTimeStr.split(':').map(Number);

                    // Set the time to the target date
                    const scheduledTime = targetDate.clone().set({ hour: hours, minute: minutes, second: 0 });

                    // Skip if the reminder time has already passed
                    if (scheduledTime.isBefore(moment())) {
                        continue;
                    }

                    // Check if a reminder already exists at this time
                    const existingReminder = await prisma.scheduledReminder.findFirst({
                        where: {
                            habit_id: habit.habit_id,
                            user_id: userId,
                            scheduled_time: scheduledTime.toDate(),
                            reminder_config_id: config.reminder_id,
                            is_sent: false
                        }
                    });

                    if (!existingReminder) {
                        // Create primary reminder
                        await this.createScheduledReminder({
                            habit_id: habit.habit_id,
                            user_id: userId,
                            scheduled_time: scheduledTime.toDate(),
                            reminder_type: 'PRIMARY',
                            message: config.notification_message || `Time to complete your habit: ${habit.name}`,
                            reminder_config_id: config.reminder_id,
                            metadata: {
                                habitName: habit.name,
                                habitColor: habit.color,
                                habitIcon: habit.icon
                            }
                        });
                        reminderCount++;

                        // Create pre-notification if enabled
                        if (config.pre_notification_minutes > 0) {
                            const preNotificationTime = scheduledTime.clone().subtract(config.pre_notification_minutes, 'minutes');

                            // Only create if pre-notification time is in the future
                            if (preNotificationTime.isAfter(moment())) {
                                await this.createScheduledReminder({
                                    habit_id: habit.habit_id,
                                    user_id: userId,
                                    scheduled_time: preNotificationTime.toDate(),
                                    reminder_type: 'PRE_NOTIFICATION',
                                    message: `Coming up in ${config.pre_notification_minutes} minutes: ${habit.name}`,
                                    reminder_config_id: config.reminder_id,
                                    metadata: {
                                        habitName: habit.name,
                                        habitColor: habit.color,
                                        habitIcon: habit.icon,
                                        minutesUntil: config.pre_notification_minutes
                                    }
                                });
                                reminderCount++;
                            }
                        }
                    }
                }

                return reminderCount;
            } catch (error) {
                console.error(`Error generating reminders for habit ${habit.habit_id}:`, error);
                return 0;
            }
        }

        /**
         * Create a scheduled reminder
         * @param {Object} reminderData - The reminder data
         * @returns {Object} - The created reminder
         */
        async createScheduledReminder(reminderData) {
            try {
                return await prisma.scheduledReminder.create({
                    data: {
                        ...reminderData,
                        is_prepared: true
                    }
                });
            } catch (error) {
                console.error('Error creating scheduled reminder:', error);
                throw error;
            }
        }

        /**
         * Check if a habit is already completed for a specific date
         * @param {Number} habitId - The habit ID
         * @param {Number} userId - The user ID
         * @param {Date} date - The date to check
         * @returns {Boolean} - Whether the habit is completed
         */
        async isHabitCompletedForDate(habitId, userId, date) {
            const startOfDay = moment(date).startOf('day').toDate();
            const endOfDay = moment(date).endOf('day').toDate();

            // Check habit logs
            const completionCount = await prisma.habitLog.count({
                where: {
                    habit_id: habitId,
                    user_id: userId,
                    completed: true,
                    completed_at: {
                        gte: startOfDay,
                        lte: endOfDay
                    }
                }
            });

            if (completionCount > 0) {
                return true;
            }

            // Check daily status
            const dailyStatus = await prisma.habitDailyStatus.findFirst({
                where: {
                    habit_id: habitId,
                    user_id: userId,
                    date: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    is_completed: true
                }
            });

            return !!dailyStatus;
        }

        /**
         * Generate reminders for a user on a specific date
         * @param {Number} userId - The user ID
         * @param {String} timezone - The user's timezone
         * @param {Date} targetDate - The target date
         * @returns {Number} - The number of reminders generated
         */
        async generateRemindersForUser(userId, timezone, targetDate) {
            try {
                let totalReminders = 0;

                // Check if user wants notifications
                const user = await prisma.user.findUnique({
                    where: { user_id: userId }
                });

                if (!user || !user.prefersNotifications || user.onVacation) {
                    return 0;
                }

                // Get all active habits for this user
                const activeHabits = await prisma.habit.findMany({
                    where: {
                        user_id: userId,
                        is_active: true,
                        start_date: {
                            lte: targetDate
                        },
                        OR: [
                            { end_date: null },
                            { end_date: { gte: targetDate } }
                        ]
                    }
                });

                // For each habit, check if it's scheduled for the target date
                for (const habit of activeHabits) {
                    if (this.isHabitScheduledForDate(habit, targetDate)) {
                        const remindersGenerated = await this.generateRemindersForHabit(
                            habit,
                            userId,
                            targetDate,
                            timezone
                        );
                        totalReminders += remindersGenerated;
                    }
                }

                return totalReminders;
            } catch (error) {
                console.error(`Error generating reminders for user ${userId}:`, error);
                return 0;
            }
        }

        /**
         * Process a specific scheduled reminder
         * @param {Object} reminder - The scheduled reminder to process
         * @returns {Boolean} - Whether the reminder was processed successfully
         */
        async processReminder(reminder) {
            try {
                const now = new Date();

                // If reminder is already sent, skip it
                if (reminder.is_sent) {
                    return true;
                }

                // Check if habit was completed after reminder was scheduled but before it was sent
                const habitCompleted = await this.isHabitCompletedForDate(
                    reminder.habit_id,
                    reminder.user_id,
                    reminder.scheduled_time
                );

                if (habitCompleted) {
                    // Update reminder as skipped due to completion
                    await prisma.scheduledReminder.update({
                        where: { scheduled_reminder_id: reminder.scheduled_reminder_id },
                        data: {
                            is_sent: true,
                            send_status: 'SKIPPED_COMPLETED',
                            actual_send_time: now
                        }
                    });
                    return true;
                }

                // Check if user is in quiet hours
                const inQuietHours = await this.isInQuietHours(reminder.user_id, now);

                if (inQuietHours && !reminder.metadata?.isTest) {
                    // Update reminder as skipped due to quiet hours
                    await prisma.scheduledReminder.update({
                        where: { scheduled_reminder_id: reminder.scheduled_reminder_id },
                        data: {
                            is_sent: true,
                            send_status: 'SKIPPED_QUIET_HOURS',
                            actual_send_time: now
                        }
                    });
                    return true;
                }

                // *** In a real implementation, you would call your notification service here ***
                // For now, we're just simulating successful sending
                console.log(`[NOTIFICATION] Sent reminder to user ${reminder.user_id} for habit "${reminder.habit.name}": ${reminder.message}`);

                // Update reminder as sent
                await prisma.scheduledReminder.update({
                    where: { scheduled_reminder_id: reminder.scheduled_reminder_id },
                    data: {
                        is_sent: true,
                        send_status: 'SENT',
                        actual_send_time: now
                    }
                });

                // Log points for receiving a reminder (gamification)
                if (!reminder.metadata?.isTest) {
                    await prisma.pointsLog.create({
                        data: {
                            user_id: reminder.user_id,
                            points: 1, // Small points for receiving reminders
                            reason: 'Reminder received',
                            source_type: 'SYSTEM_BONUS',
                            source_id: reminder.scheduled_reminder_id
                        }
                    });
                }

                return true;
            } catch (error) {
                console.error(`Error processing reminder ${reminder.scheduled_reminder_id}:`, error);

                // Update reminder with error
                await prisma.scheduledReminder.update({
                    where: { scheduled_reminder_id: reminder.scheduled_reminder_id },
                    data: {
                        is_sent: true,
                        send_status: 'FAILED',
                        actual_send_time: new Date(),
                        failure_reason: error.message
                    }
                });

                return false;
            }
        }

        /**
         * Check if the current time is within user's quiet hours
         * @param {Number} userId - The user ID
         * @param {Date} currentTime - The current time
         * @returns {Boolean} - Whether it's quiet hours
         */
        async isInQuietHours(userId, currentTime) {
            try {
                // Get the user's quiet hours preferences
                const quietHoursPrefs = await prisma.userNotificationPreference.findFirst({
                    where: {
                        user_id: userId,
                        type: 'QUIET_HOURS'
                    }
                });

                // If no preferences or quiet hours are disabled, return false
                if (!quietHoursPrefs || !quietHoursPrefs.enabled || !quietHoursPrefs.settings?.quietHoursEnabled) {
                    return false;
                }

                // Get the user's timezone
                const user = await prisma.user.findUnique({
                    where: { user_id: userId },
                    select: { timezone: true }
                });

                const timezone = user.timezone || 'UTC';

                // Get start and end hours in user's local time
                const start = quietHoursPrefs.settings.start || '22:00';
                const end = quietHoursPrefs.settings.end || '08:00';

                // Current time in user's timezone
                const now = moment(currentTime).tz(timezone);
                const currentHour = now.hour();
                const currentMinute = now.minute();

                // Parse quiet hours times
                const [startHour, startMinute] = start.split(':').map(Number);
                const [endHour, endMinute] = end.split(':').map(Number);

                // Convert current time to minutes since midnight
                const currentTimeMinutes = currentHour * 60 + currentMinute;
                const startTimeMinutes = startHour * 60 + startMinute;
                const endTimeMinutes = endHour * 60 + endMinute;

                // Handle cases where quiet hours span across midnight
                if (startTimeMinutes > endTimeMinutes) {
                    // E.g., 22:00 to 08:00
                    return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes <= endTimeMinutes;
                } else {
                    // E.g., 01:00 to 05:00
                    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
                }
            } catch (error) {
                console.error(`Error checking quiet hours for user ${userId}:`, error);
                return false; // Default to not in quiet hours if there's an error
            }
        }

        /**
         * Process all due reminders
         * This should be called by a cron job
         * @returns {Object} - Result statistics
         */
        async processDueReminders() {
            const now = new Date();
            const results = {
                processed: 0,
                sent: 0,
                skipped: 0,
                failed: 0
            };

            try {
                // Find all scheduled reminders that are due and not yet sent
                const dueReminders = await prisma.scheduledReminder.findMany({
                    where: {
                        scheduled_time: {
                            lte: now
                        },
                        is_sent: false,
                        is_prepared: true
                    },
                    include: {
                        user: true,
                        habit: true
                    }
                });

                console.log(`Processing ${dueReminders.length} due reminders`);
                results.processed = dueReminders.length;

                // Process each reminder
                for (const reminder of dueReminders) {
                    const success = await this.processReminder(reminder);

                    if (success) {
                        // Check if it was sent or skipped
                        const updatedReminder = await prisma.scheduledReminder.findUnique({
                            where: { scheduled_reminder_id: reminder.scheduled_reminder_id }
                        });

                        if (updatedReminder.send_status === 'SENT') {
                            results.sent++;
                        } else {
                            results.skipped++;
                        }
                    } else {
                        results.failed++;
                    }
                }

                return {
                    success: true,
                    results
                };
            } catch (error) {
                console.error('Error processing due reminders:', error);
                return {
                    success: false,
                    error: error.message,
                    results
                };
            }
        }

        /**
         * Prepare reminders for the next day
         * This should be called by a daily cron job
         * @returns {Object} - Result statistics
         */
        async prepareRemindersForNextDay() {
            try {
                // Get all users
                const users = await prisma.user.findMany({
                    where: {
                        // Only include users who want notifications and aren't on vacation
                        prefersNotifications: true,
                        onVacation: false
                    }
                });

                console.log(`Preparing reminders for ${users.length} users`);

                let totalReminders = 0;

                // Generate reminders for tomorrow for each user
                for (const user of users) {
                    const tomorrow = moment().tz(user.timezone || 'UTC').add(1, 'day').startOf('day').toDate();

                    const remindersGenerated = await this.generateRemindersForUser(
                        user.user_id,
                        user.timezone || 'UTC',
                        tomorrow
                    );

                    totalReminders += remindersGenerated;
                }

                return {
                    success: true,
                    preparedCount: totalReminders
                };
            } catch (error) {
                console.error('Error preparing reminders for next day:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }

    module.exports = { ReminderService };