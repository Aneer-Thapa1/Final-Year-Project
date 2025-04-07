const cron = require('node-cron');
const streakController = require('./controllers/streakController');
const { ReminderService } = require('./services/reminderService');

// Initialize the reminder service
const reminderService = new ReminderService();

/**
 * Enhanced logging function with colorized console output
 * @param {string} jobName - Name of the cron job
 * @param {string} status - Status of the job (started/completed/failed/warning)
 * @param {Object} details - Additional details to log
 */
function logJobStatus(jobName, status, details = {}) {
    const timestamp = new Date().toISOString();
    const logObject = {
        timestamp,
        job: jobName,
        status,
        ...details
    };

    // Colorized console output
    let statusColor;
    switch (status) {
        case 'started':
            statusColor = '\x1b[34m'; // Blue
            break;
        case 'completed':
            statusColor = '\x1b[32m'; // Green
            break;
        case 'failed':
            statusColor = '\x1b[31m'; // Red
            break;
        case 'warning':
            statusColor = '\x1b[33m'; // Yellow
            break;
        default:
            statusColor = '\x1b[0m'; // Reset
    }

    console.log(`${statusColor}[${timestamp}][${jobName}][${status}]\x1b[0m`, JSON.stringify(details, null, 2));
}

/**
 * Create notification for streak warning
 * @param {number} userId - User ID
 * @param {string} habitName - Habit name
 * @param {number} currentStreak - Current streak
 */
async function createStreakWarningNotification(userId, habitName, currentStreak) {
    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        await prisma.notification.create({
            data: {
                user_id: userId,
                title: 'Streak at Risk!',
                content: `Your ${currentStreak}-day streak for "${habitName}" will be reset if you don't complete it today!`,
                type: 'SYSTEM_MESSAGE',
                is_read: false,
                related_id: null,
                action_url: `/habits?focus=${habitName}`
            }
        });

        // Also create a scheduled reminder with high priority
        const now = new Date();
        const reminderTime = new Date(now);
        reminderTime.setHours(20, 0, 0); // Set reminder for 8:00 PM

        // Only create reminder if it's earlier than 8 PM
        if (now < reminderTime) {
            await prisma.scheduledReminder.create({
                data: {
                    habit_id: null, // This is a system reminder
                    user_id: userId,
                    scheduled_time: reminderTime,
                    reminder_type: 'STREAK_WARNING',
                    message: `⚠️ STREAK ALERT: Your ${currentStreak}-day streak for "${habitName}" will be reset tonight if not completed!`,
                    is_sent: false,
                    is_prepared: true,
                    metadata: {
                        priority: 'high',
                        streakLength: currentStreak,
                        habitName: habitName
                    }
                }
            });
        }
    } catch (error) {
        console.error(`Error creating streak warning notification: ${error.message}`);
    }
}

// Process streaks daily at midnight
cron.schedule('0 0 * * *', async () => {
    const jobName = 'daily-streak-update';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();
        const result = await streakController.processDailyStreakUpdates();
        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            results: result.results,
            message: result.message
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Check habits at risk of losing streak - Run at 9 AM every day
cron.schedule('0 9 * * *', async () => {
    const jobName = 'streak-warning-check';
    logJobStatus(jobName, 'started');

    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const startTime = Date.now();

        // Get all active habits with streaks > 0
        const habitsAtRisk = await prisma.habit.findMany({
            where: {
                is_active: true
            },
            include: {
                streak: {
                    where: {
                        current_streak: {
                            gt: 2 // Only warn for streaks greater than 2 days
                        }
                    }
                },
                user: true
            }
        });

        let warningsCreated = 0;

        // Filter to habits that are scheduled for today but not yet completed
        for (const habit of habitsAtRisk) {
            // Skip if no streak or user is on vacation
            if (habit.streak.length === 0 || habit.user.onVacation) {
                continue;
            }

            const streak = habit.streak[0];
            const today = new Date();

            // Check if habit is scheduled for today
            const isScheduledToday = await reminderService.isHabitScheduledForDate(habit, today);
            if (!isScheduledToday) {
                continue;
            }

            // Check if habit is already completed today
            const isCompletedToday = await reminderService.isHabitCompletedForDate(
                habit.habit_id,
                habit.user_id,
                today
            );

            // If not completed and scheduled, send a warning
            if (!isCompletedToday) {
                await createStreakWarningNotification(
                    habit.user_id,
                    habit.name,
                    streak.current_streak
                );
                warningsCreated++;
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            habitsChecked: habitsAtRisk.length,
            warningsCreated: warningsCreated
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Process upcoming reminders every 15 minutes
cron.schedule('*/15 * * * *', async () => {
    const jobName = 'process-reminders';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();
        const result = await reminderService.processDueReminders();
        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            processed: result.results.processed,
            sent: result.results.sent,
            skipped: result.results.skipped,
            failed: result.results.failed
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Generate immediate reminder for missed habits with high streak - every 2 hours from 10 AM to 8 PM
cron.schedule('0 10,12,14,16,18,20 * * *', async () => {
    const jobName = 'streak-preservation-reminder';
    logJobStatus(jobName, 'started');

    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const startTime = Date.now();

        // Get all active habits with high streaks (>7 days) that aren't completed today
        const highValueHabits = await prisma.habit.findMany({
            where: {
                is_active: true
            },
            include: {
                streak: {
                    where: {
                        current_streak: {
                            gt: 7 // High value streak
                        }
                    }
                },
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        prefersNotifications: true,
                        onVacation: true,
                        timezone: true
                    }
                }
            }
        });

        let remindersCreated = 0;
        const now = new Date();

        for (const habit of highValueHabits) {
            // Skip if no streak or user is on vacation or doesn't want notifications
            if (habit.streak.length === 0 ||
                habit.user.onVacation ||
                !habit.user.prefersNotifications) {
                continue;
            }

            const streak = habit.streak[0];

            // Check if habit is scheduled for today
            const isScheduledToday = await reminderService.isHabitScheduledForDate(habit, now);
            if (!isScheduledToday) {
                continue;
            }

            // Check if habit is already completed today
            const isCompletedToday = await reminderService.isHabitCompletedForDate(
                habit.habit_id,
                habit.user_id,
                now
            );

            // If not completed and in quiet hours, don't send
            const inQuietHours = await reminderService.isInQuietHours(habit.user_id, now);

            // If not completed, scheduled, and not in quiet hours, send an urgent reminder
            if (!isCompletedToday && !inQuietHours) {
                // Check if we already sent a reminder in the last 2 hours
                const recentReminder = await prisma.scheduledReminder.findFirst({
                    where: {
                        habit_id: habit.habit_id,
                        user_id: habit.user_id,
                        reminder_type: 'STREAK_PRESERVATION',
                        scheduled_time: {
                            gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
                        }
                    }
                });

                if (!recentReminder) {
                    await prisma.scheduledReminder.create({
                        data: {
                            habit_id: habit.habit_id,
                            user_id: habit.user_id,
                            scheduled_time: now,
                            reminder_type: 'STREAK_PRESERVATION',
                            message: `🔥 Don't lose your ${streak.current_streak}-day streak for "${habit.name}"! Complete it now!`,
                            is_sent: false,
                            is_prepared: true,
                            metadata: {
                                priority: 'urgent',
                                streakLength: streak.current_streak,
                                habitName: habit.name,
                                habitColor: habit.color,
                                habitIcon: habit.icon
                            }
                        }
                    });
                    remindersCreated++;
                }
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            habitsChecked: highValueHabits.length,
            remindersCreated: remindersCreated
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Prepare reminders for next day (once per day at 11 PM)
cron.schedule('0 23 * * *', async () => {
    const jobName = 'prepare-next-day-reminders';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();
        const result = await reminderService.prepareRemindersForNextDay();
        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            preparedCount: result.preparedCount
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Weekly review and analytics (Sunday at 9 AM)
cron.schedule('0 9 * * 0', async () => {
    const jobName = 'weekly-habit-review';
    logJobStatus(jobName, 'started');

    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const startTime = Date.now();

        // Get all active users
        const activeUsers = await prisma.user.findMany({
            where: {
                prefersNotifications: true,
                onVacation: false
            }
        });

        let reportsGenerated = 0;

        for (const user of activeUsers) {
            try {
                // Get last week's stats
                const today = new Date();
                const oneWeekAgo = new Date(today);
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                // Get habit completion stats
                const completedHabits = await prisma.habitLog.groupBy({
                    by: ['habit_id'],
                    where: {
                        user_id: user.user_id,
                        completed: true,
                        completed_at: {
                            gte: oneWeekAgo,
                            lte: today
                        }
                    },
                    _count: {
                        habit_id: true
                    }
                });

                // Get habit names
                const habitIds = completedHabits.map(h => h.habit_id);
                const habits = await prisma.habit.findMany({
                    where: {
                        habit_id: {
                            in: habitIds
                        }
                    },
                    select: {
                        habit_id: true,
                        name: true
                    }
                });

                // Create a weekly summary notification
                const totalCompletions = completedHabits.reduce((sum, h) => sum + h._count.habit_id, 0);

                // Format top habits
                let topHabitsText = "";
                if (habits.length > 0) {
                    const topHabitsList = habits.slice(0, 3).map(h => {
                        const count = completedHabits.find(ch => ch.habit_id === h.habit_id)?._count.habit_id || 0;
                        return `${h.name} (${count} times)`;
                    }).join(", ");
                    topHabitsText = `Top habits: ${topHabitsList}`;
                } else {
                    topHabitsText = "No habits completed this week.";
                }

                await prisma.notification.create({
                    data: {
                        user_id: user.user_id,
                        title: 'Weekly Habit Summary',
                        content: `You completed ${totalCompletions} habits this week! ${topHabitsText} Keep up the great work!`,
                        type: 'SYSTEM_MESSAGE',
                        is_read: false,
                        action_url: '/stats'
                    }
                });

                reportsGenerated++;
            } catch (error) {
                console.error(`Error generating weekly report for user ${user.user_id}: ${error.message}`);
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            usersProcessed: activeUsers.length,
            reportsGenerated
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

/**
 * Manual testing function for streak processing
 */
async function testStreakProcessing() {
    const jobName = 'test-streak-processing';
    logJobStatus(jobName, 'started', {
        note: 'Manual test execution'
    });

    try {
        const startTime = Date.now();
        const result = await streakController.processDailyStreakUpdates();
        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            results: result.results,
            message: result.message
        });
        return result;
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Manual testing function for reminder processing
 */
async function testReminderProcessing() {
    const jobName = 'test-reminder-processing';
    logJobStatus(jobName, 'started', {
        note: 'Manual test execution'
    });

    try {
        const startTime = Date.now();
        const result = await reminderService.processDueReminders();
        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            processed: result.results.processed,
            sent: result.results.sent,
            skipped: result.results.skipped,
            failed: result.results.failed
        });
        return result;
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Generate streak warning notifications for testing
 */
async function testStreakWarnings() {
    const jobName = 'test-streak-warnings';
    logJobStatus(jobName, 'started', {
        note: 'Manual test execution'
    });

    try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        // Get a sample habit with streak > 0
        const sampleHabit = await prisma.habit.findFirst({
            where: {
                is_active: true
            },
            include: {
                streak: {
                    where: {
                        current_streak: {
                            gt: 0
                        }
                    }
                }
            }
        });

        if (sampleHabit && sampleHabit.streak.length > 0) {
            await createStreakWarningNotification(
                sampleHabit.user_id,
                sampleHabit.name,
                sampleHabit.streak[0].current_streak
            );

            return {
                success: true,
                message: `Created test warning for habit "${sampleHabit.name}" with streak ${sampleHabit.streak[0].current_streak}`
            };
        } else {
            return {
                success: false,
                message: "No suitable habit found for testing streak warnings"
            };
        }
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Export the test functions
module.exports = {
    testStreakProcessing,
    testReminderProcessing,
    testStreakWarnings
};

logJobStatus('scheduler', 'initialized', {
    activeJobs: [
        'daily-streak-update',
        'process-reminders',
        'prepare-next-day-reminders',
        'streak-warning-check',
        'streak-preservation-reminder',
        'weekly-habit-review'
    ],
    environment: process.env.NODE_ENV || 'development'
});