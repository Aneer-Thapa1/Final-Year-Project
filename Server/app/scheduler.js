const cron = require('node-cron');
const streakController = require('./controllers/streakController');
const achievementController = require('./controllers/achievementController');
const { ReminderService } = require('./services/reminderService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
 * Create notification with appropriate type
 * @param {Object} data - Notification data
 */
async function createNotification(data) {
    try {
        await prisma.notification.create({
            data: {
                user_id: data.user_id,
                title: data.title,
                content: data.content,
                type: data.type,
                related_id: data.related_id || null,
                action_url: data.action_url || null,
                is_read: false
            }
        });
    } catch (error) {
        console.error(`Error creating notification: ${error.message}`);
    }
}

/**
 * Create a streak warning notification
 * @param {number} userId - User ID
 * @param {string} habitName - Habit name
 * @param {number} currentStreak - Current streak
 * @param {number} habitId - Habit ID
 */
async function createStreakWarningNotification(userId, habitName, currentStreak, habitId) {
    try {
        await createNotification({
            user_id: userId,
            title: 'Streak at Risk!',
            content: `Your ${currentStreak}-day streak for "${habitName}" will be reset if you don't complete it today!`,
            type: 'STREAK_MILESTONE',
            related_id: habitId,
            action_url: `/habits/${habitId}`
        });

        // Also create a scheduled reminder with high priority
        const now = new Date();
        const reminderTime = new Date(now);
        reminderTime.setHours(20, 0, 0); // Set reminder for 8:00 PM

        // Only create reminder if it's earlier than 8 PM
        if (now < reminderTime) {
            await prisma.scheduledReminder.create({
                data: {
                    habit_id: habitId,
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

/**
 * Create a grace period notification
 */
async function createGracePeriodNotification(userId, habitName, streakCount, habitId) {
    await createNotification({
        user_id: userId,
        title: 'Grace Period Used',
        content: `You missed "${habitName}" yesterday. Your streak is safe for now, but you need to complete it today to keep your ${streakCount} day streak!`,
        type: 'SYSTEM_MESSAGE',
        related_id: habitId,
        action_url: `/habits/${habitId}`
    });
}

/**
 * Create a streak reset notification
 */
async function createStreakResetNotification(userId, habitName, streakBroken, habitId) {
    await createNotification({
        user_id: userId,
        title: 'Streak Reset',
        content: `Your ${streakBroken} day streak for "${habitName}" has been reset because you didn't complete it yesterday.`,
        type: 'SYSTEM_MESSAGE',
        related_id: habitId,
        action_url: `/habits/${habitId}`
    });
}

/**
 * Create a weekly summary notification
 */
async function createWeeklySummaryNotification(userId, completedCount, topHabits) {
    // Format top habits text
    let topHabitsText = "";
    if (topHabits && topHabits.length > 0) {
        const topHabitsList = topHabits.slice(0, 3).map(h =>
            `${h.name} (${h.count} times)`
        ).join(", ");
        topHabitsText = `Top habits: ${topHabitsList}`;
    } else {
        topHabitsText = "No habits completed this week.";
    }

    let emoji = '📊';
    let message = `You completed ${completedCount} habits this week! ${topHabitsText}`;

    // Add encouragement based on completion count
    if (completedCount === 0) {
        emoji = '🌱';
        message += " Let's set some goals for next week!";
    } else if (completedCount < 5) {
        emoji = '👍';
        message += " You're making progress!";
    } else if (completedCount < 15) {
        emoji = '🎯';
        message += " Great consistency!";
    } else if (completedCount < 30) {
        emoji = '🔥';
        message += " You're on fire!";
    } else {
        emoji = '🏆';
        message += " Incredible dedication!";
    }

    await createNotification({
        user_id: userId,
        title: `Weekly Summary ${emoji}`,
        content: message,
        type: 'SYSTEM_MESSAGE',
        action_url: '/stats'
    });
}

/**
 * Create an achievement notification
 */
async function createAchievementNotification(userId, achievement) {
    await createNotification({
        user_id: userId,
        title: 'Achievement Unlocked! 🏆',
        content: `"${achievement.name}": ${achievement.description}${
            achievement.points_reward ? ` (+${achievement.points_reward} points)` : ''
        }`,
        type: 'ACHIEVEMENT_UNLOCKED',
        related_id: achievement.achievement_id,
        action_url: '/achievements'
    });
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

// Check achievements - Run daily at 1 AM after streak updates
cron.schedule('0 1 * * *', async () => {
    const jobName = 'daily-achievement-check';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();

        // Get all active users
        const users = await prisma.user.findMany({
            where: {
                onVacation: false
            },
            select: {
                user_id: true,
                user_name: true
            }
        });

        let totalChecked = 0;
        let totalAwarded = 0;

        // Check achievements for each user
        for (const user of users) {
            try {
                const result = await achievementController.checkAndAwardAchievements(user.user_id);
                totalChecked += result.checked;
                totalAwarded += result.awarded;
            } catch (error) {
                console.error(`Error checking achievements for user ${user.user_id}: ${error.message}`);
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            usersProcessed: users.length,
            achievementsChecked: totalChecked,
            newAchievementsAwarded: totalAwarded
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Weekly full achievement backfill (every Monday at 3 AM) to catch any missed achievements
cron.schedule('0 3 * * 1', async () => {
    const jobName = 'weekly-achievement-backfill';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();

        // Get all active users
        const users = await prisma.user.findMany({
            where: {
                onVacation: false,
                // Only process users who have been active in the last 30 days to save resources
                lastActivity: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            },
            select: {
                user_id: true,
                user_name: true
            }
        });

        let totalChecked = 0;
        let totalAwarded = 0;
        let processedUsers = 0;

        // Check all achievements for each user (with force full check)
        for (const user of users) {
            try {
                const result = await achievementController.performFullAchievementBackfill(user.user_id);
                totalChecked += result.checked;
                totalAwarded += result.awarded;
                processedUsers++;

                // Add a small delay to prevent database overload
                if (processedUsers % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`Error performing achievement backfill for user ${user.user_id}: ${error.message}`);
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            usersProcessed: processedUsers,
            totalUsers: users.length,
            achievementsChecked: totalChecked,
            newAchievementsAwarded: totalAwarded
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Check for streak milestone achievements and events - Run after streak updates
cron.schedule('5 0 * * *', async () => {
    const jobName = 'streak-milestone-check';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();

        // Important streak milestones to check for notifications (even if the achievement doesn't exist)
        const milestones = [7, 14, 21, 30, 60, 90, 100, 180, 365];

        // Get all habits with their current streaks
        const habitsWithStreaks = await prisma.habit.findMany({
            where: {
                is_active: true
            },
            include: {
                streak: true,
                user: {
                    select: {
                        user_id: true,
                        prefersNotifications: true
                    }
                }
            }
        });

        let notificationsSent = 0;

        for (const habit of habitsWithStreaks) {
            if (!habit.streak || habit.streak.length === 0 || !habit.user.prefersNotifications) {
                continue;
            }

            const streak = habit.streak[0];

            // Check if the streak is at a milestone exactly (meaning it just reached this value)
            if (streak.current_streak > 0 && milestones.includes(streak.current_streak)) {
                // Create a special milestone notification
                await createNotification({
                    user_id: habit.user_id,
                    title: `${streak.current_streak}-Day Streak! 🔥`,
                    content: `Amazing! You've maintained your "${habit.name}" habit for ${streak.current_streak} days in a row! Keep going!`,
                    type: 'STREAK_MILESTONE',
                    related_id: habit.habit_id,
                    action_url: `/habits/${habit.habit_id}`
                });

                notificationsSent++;

                // Also check for streak-related achievements
                await achievementController.checkAndAwardAchievements(habit.user_id);
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            habitsChecked: habitsWithStreaks.length,
            milestoneNotificationsSent: notificationsSent
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
                    streak.current_streak,
                    habit.habit_id
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

                    // Also create a notification with the REMINDER type instead of SYSTEM_MESSAGE
                    await createNotification({
                        user_id: habit.user_id,
                        title: 'Urgent Habit Reminder',
                        content: `🔥 Don't lose your ${streak.current_streak}-day streak for "${habit.name}"! Complete it now!`,
                        type: 'REMINDER',
                        related_id: habit.habit_id,
                        action_url: `/habits/${habit.habit_id}`
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

                // Create topHabits array
                const topHabits = habits.map(habit => {
                    const count = completedHabits.find(ch => ch.habit_id === habit.habit_id)?._count.habit_id || 0;
                    return {
                        name: habit.name,
                        count: count
                    };
                }).sort((a, b) => b.count - a.count); // Sort by count desc

                await createWeeklySummaryNotification(user.user_id, totalCompletions, topHabits);
                reportsGenerated++;

                // Check for weekly achievements
                await achievementController.checkAndAwardAchievements(user.user_id);
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

// Check for daily goals achievement - Run at 10 PM every day
cron.schedule('0 22 * * *', async () => {
    const jobName = 'daily-goal-check';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();

        // Get today's range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find users who completed habits today and met their daily goal
        const users = await prisma.user.findMany({
            where: {
                prefersNotifications: true,
                onVacation: false,
                dailyGoal: { gt: 0 }
            },
            select: {
                user_id: true,
                user_name: true,
                dailyGoal: true
            }
        });

        let notificationsSent = 0;

        for (const user of users) {
            // Count today's completed habits
            const completedCount = await prisma.habitLog.count({
                where: {
                    user_id: user.user_id,
                    completed: true,
                    completed_at: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            });

            // If they met or exceeded their goal, send a congratulatory notification
            if (completedCount >= user.dailyGoal) {
                await createNotification({
                    user_id: user.user_id,
                    title: 'Daily Goal Achieved! 🎯',
                    content: `Congratulations! You've completed ${completedCount}/${user.dailyGoal} habits today. Keep up the great work!`,
                    type: 'ACHIEVEMENT_UNLOCKED',
                    action_url: '/stats'
                });
                notificationsSent++;

                // Check for achievements related to goal completion
                await achievementController.checkAndAwardAchievements(user.user_id);
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            usersProcessed: users.length,
            notificationsSent: notificationsSent
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Monthly achievement check - Run on the 1st of each month
cron.schedule('0 2 1 * *', async () => {
    const jobName = 'monthly-achievement-check';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();

        // Get all active users
        const users = await prisma.user.findMany({
            where: {
                onVacation: false
            },
            select: {
                user_id: true,
                user_name: true
            }
        });

        let achievementsAwarded = 0;

        // Check monthly achievements for each user
        for (const user of users) {
            try {
                // Specifically check for achievement types that are relevant to monthly reviews
                const result = await achievementController.checkAndAwardAchievements(user.user_id);
                achievementsAwarded += result.awarded;

                // Get last month's stats
                const today = new Date();
                const lastMonth = new Date(today);
                lastMonth.setMonth(lastMonth.getMonth() - 1);

                // Check if user completed all scheduled habits last month (for Perfect Month achievement)
                const lastMonthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);

                const perfectMonth = await prisma.$transaction(async (prisma) => {
                    // Get scheduled habit statuses
                    const scheduledCount = await prisma.habitDailyStatus.count({
                        where: {
                            user_id: user.user_id,
                            is_scheduled: true,
                            date: {
                                gte: lastMonthStart,
                                lte: lastMonthEnd
                            }
                        }
                    });

                    // Get completed habit statuses
                    const completedCount = await prisma.habitDailyStatus.count({
                        where: {
                            user_id: user.user_id,
                            is_scheduled: true,
                            is_completed: true,
                            date: {
                                gte: lastMonthStart,
                                lte: lastMonthEnd
                            }
                        }
                    });

                    // If all scheduled habits were completed and there were at least 20 scheduled habits
                    return scheduledCount >= 20 && scheduledCount === completedCount;
                });

                if (perfectMonth) {
                    // Find the Perfect Month achievement
                    const perfectMonthAchievement = await prisma.achievement.findFirst({
                        where: {
                            name: 'Perfect Month',
                            criteria_type: 'PERFECT_MONTH'
                        }
                    });

                    if (perfectMonthAchievement) {
                        // Check if user already has this achievement
                        const hasAchievement = await prisma.userAchievement.findFirst({
                            where: {
                                user_id: user.user_id,
                                achievement_id: perfectMonthAchievement.achievement_id
                            }
                        });

                        if (!hasAchievement) {
                            // Award the achievement
                            await achievementController.awardAchievement(user.user_id,
                                perfectMonthAchievement.achievement_id
                            );
                            achievementsAwarded++;
                        }
                    }
                }
            } catch (error) {
                console.error(`Error checking monthly achievements for user ${user.user_id}: ${error.message}`);
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            usersProcessed: users.length,
            achievementsAwarded: achievementsAwarded
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

// Check for new user onboarding achievement backfill - Run for new users
cron.schedule('*/30 * * * *', async () => {
    const jobName = 'new-user-achievement-backfill';
    logJobStatus(jobName, 'started');

    try {
        const startTime = Date.now();

        // Look for users created in the last 30 minutes who haven't had an achievement check yet
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        const newUsers = await prisma.user.findMany({
            where: {
                registeredAt : {
                    gte: thirtyMinutesAgo
                },
                // Check if they have any achievements already to avoid rechecking
                userAchievements: {
                    none: {}
                }
            },
            select: {
                user_id: true,
                user_name: true
            }
        });

        let processedUsers = 0;
        let totalAwarded = 0;

        // Process each new user
        for (const user of newUsers) {
            try {
                // Perform a full achievement backfill for this new user
                const result = await achievementController.performFullAchievementBackfill(user.user_id);
                totalAwarded += result.awarded;
                processedUsers++;

                // Log that we've processed this new user
                console.log(`Processed achievements for new user ${user.user_id}, awarded ${result.awarded} achievements`);

                // Also create a welcome notification
                await createNotification({
                    user_id: user.user_id,
                    title: 'Welcome to HabitPulse! 👋',
                    content: 'Start tracking your habits and earn achievements as you build positive routines. Check out your first achievements!',
                    type: 'SYSTEM_MESSAGE',
                    action_url: '/achievements'
                });

            } catch (error) {
                console.error(`Error processing achievements for new user ${user.user_id}: ${error.message}`);
            }
        }

        const duration = Date.now() - startTime;

        logJobStatus(jobName, 'completed', {
            duration: `${duration}ms`,
            newUsersProcessed: processedUsers,
            achievementsAwarded: totalAwarded
        });
    } catch (error) {
        logJobStatus(jobName, 'failed', {
            error: error.message,
            stack: error.stack
        });
    }
});

/**
 * Manual testing functions for various notification types
 */
async function testStreakMilestoneNotification(userId, habitName, milestone, habitId) {
    await createNotification({
        user_id: userId,
        title: `${milestone}-Day Streak! 🔥`,
        content: `Amazing! You've maintained your "${habitName}" habit for ${milestone} days in a row!`,
        type: 'STREAK_MILESTONE',
        related_id: habitId,
        action_url: `/habits/${habitId}`
    });
}

async function testAchievementNotification(userId, achievementName, description, points, achievementId) {
    await createNotification({
        user_id: userId,
        title: 'Achievement Unlocked! 🏆',
        content: `"${achievementName}": ${description}${points ? ` (+${points} points)` : ''}`,
        type: 'ACHIEVEMENT_UNLOCKED',
        related_id: achievementId,
        action_url: '/achievements'
    });
}

async function testFriendRequestNotification(userId, senderName, requestId) {
    await createNotification({
        user_id: userId,
        title: 'New Friend Request',
        content: `${senderName} sent you a friend request`,
        type: 'SOCIAL_INTERACTION',
        related_id: requestId,
        action_url: `/friends/requests/${requestId}`
    });
}

async function testChallengeInviteNotification(userId, challengeName, challengerId, challengeId) {
    await createNotification({
        user_id: userId,
        title: 'Habit Challenge Invite',
        content: `You've been invited to join the "${challengeName}" challenge!`,
        type: 'CHALLENGE_INVITE',
        related_id: challengeId,
        action_url: `/challenges/${challengeId}`
    });
}

async function testQuoteOfTheDayNotification(userId) {
    const motivationalQuotes = [
        "Small steps lead to big changes.",
        "Consistency is the key to success.",
        "Every day is a new opportunity to improve.",
        "Your habits shape your future.",
        "Progress, not perfection."
    ];

    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

    await createNotification({
        user_id: userId,
        title: 'Daily Motivation 💡',
        content: randomQuote,
        type: 'MOTIVATION_QUOTE',
        action_url: '/inspiration'
    });
}

async function testGoalReminderNotification(userId, habitName, habitId) {
    await createNotification({
        user_id: userId,
        title: 'Stay on Track 🎯',
        content: `Don't forget to work on your "${habitName}" habit today!`,
        type: 'GOAL_REMINDER',
        related_id: habitId,
        action_url: `/habits/${habitId}`
    });
}

async function testProgressUpdateNotification(userId, habitName, progressPercentage, habitId) {
    let progressMessage;
    let emoji;

    if (progressPercentage < 25) {
        progressMessage = "You're just getting started!";
        emoji = "🌱";
    } else if (progressPercentage < 50) {
        progressMessage = "Keep building momentum!";
        emoji = "🚀";
    } else if (progressPercentage < 75) {
        progressMessage = "You're making great progress!";
        emoji = "🔥";
    } else {
        progressMessage = "Almost there! Stay consistent!";
        emoji = "🏆";
    }

    await createNotification({
        user_id: userId,
        title: `${habitName} Progress Update ${emoji}`,
        content: `${progressMessage} You're ${progressPercentage}% towards your goal.`,
        type: 'PROGRESS_UPDATE',
        related_id: habitId,
        action_url: `/habits/${habitId}/progress`
    });
}

/**
 * Achievement Backfill Functions
 */

/**
 * Perform achievement backfill for a specific user
 * @param {number} userId - User ID to process achievements for
 * @return {Promise<Object>} - Results of the backfill process
 */
async function performUserAchievementBackfill(userId) {
    try {
        console.log(`Starting achievement backfill for user ${userId}`);

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { user_id: userId }
        });

        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        // Perform a full backfill of all achievements
        const result = await achievementController.performFullAchievementBackfill(userId);

        console.log(`Completed achievement backfill for user ${userId}. Awarded ${result.awarded} new achievements.`);

        // Return detailed results
        return {
            success: true,
            userId,
            achievementsChecked: result.checked,
            achievementsAwarded: result.awarded,
            newAchievements: result.newAchievements
        };
    } catch (error) {
        console.error(`Error performing achievement backfill for user ${userId}: ${error.message}`);
        throw error;
    }
}

/**
 * Perform achievement backfill for all users (admin-only function)
 * @param {number} batchSize - Number of users to process per batch (default: 50)
 * @param {boolean} activeOnly - Only process active users (default: true)
 * @return {Promise<Object>} - Results of the backfill process
 */
async function performAllUsersAchievementBackfill(batchSize = 50, activeOnly = true) {
    try {
        console.log('Starting achievement backfill for all users');
        const startTime = Date.now();

        // Get user count for progress tracking
        const where = activeOnly ? {
            onVacation: false,
            lastActive : {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
        } : {};

        const totalUserCount = await prisma.user.count({ where });
        console.log(`Total users to process: ${totalUserCount}`);

        let processedCount = 0;
        let totalAwarded = 0;
        let startCursor = null;

        // Process users in batches to prevent memory issues
        while (true) {
            const usersQuery = {
                where,
                take: batchSize,
                select: {
                    user_id: true
                },
                orderBy: {
                    user_id: 'asc'
                }
            };

            if (startCursor) {
                usersQuery.skip = 1;
                usersQuery.cursor = {
                    user_id: startCursor
                };
            }

            const userBatch = await prisma.user.findMany(usersQuery);

            if (userBatch.length === 0) {
                break;
            }

            // Process each user in the batch
            for (const user of userBatch) {
                try {
                    const result = await achievementController.performFullAchievementBackfill(user.user_id);
                    totalAwarded += result.awarded;
                } catch (error) {
                    console.error(`Error processing user ${user.user_id}: ${error.message}`);
                }
            }

            processedCount += userBatch.length;
            startCursor = userBatch[userBatch.length - 1].user_id;

            console.log(`Progress: ${processedCount}/${totalUserCount} users processed (${Math.round(processedCount / totalUserCount * 100)}%)`);

            // Small delay to prevent database overload
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const duration = (Date.now() - startTime) / 1000;

        console.log(`Completed achievement backfill for all users in ${duration} seconds`);
        console.log(`Total achievements awarded: ${totalAwarded}`);

        return {
            success: true,
            usersProcessed: processedCount,
            totalAchievementsAwarded: totalAwarded,
            durationSeconds: duration
        };
    } catch (error) {
        console.error(`Error performing bulk achievement backfill: ${error.message}`);
        throw error;
    }
}

// Export these functions for testing purposes
module.exports = {
    testStreakMilestoneNotification,
    testAchievementNotification,
    testFriendRequestNotification,
    testChallengeInviteNotification,
    testQuoteOfTheDayNotification,
    testGoalReminderNotification,
    testProgressUpdateNotification,
    performUserAchievementBackfill,
    performAllUsersAchievementBackfill
};