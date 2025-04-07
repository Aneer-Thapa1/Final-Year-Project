const { PrismaClient } = require('@prisma/client');
const { startOfDay, endOfDay, subDays, isAfter, isBefore, isSameDay, format } = require('date-fns');

const prisma = new PrismaClient();

/**
 * Controller for managing habit streaks and goals
 */
const streakController = {
    /**
     * Process daily habit streak updates
     * This should be run by a cron job once per day (ideally at midnight)
     */
    async processDailyStreakUpdates() {
        console.log(`Processing daily streak updates: ${new Date().toISOString()}`);

        const now = new Date();
        const yesterday = subDays(now, 1);
        const yesterdayStart = startOfDay(yesterday);
        const yesterdayEnd = endOfDay(yesterday);

        try {
            // 1. Get all active habits
            const activeHabits = await prisma.habit.findMany({
                where: {
                    is_active: true,
                    start_date: {
                        lte: now // Only include habits that have already started
                    },
                    OR: [
                        { end_date: null }, // No end date
                        { end_date: { gte: yesterdayStart } } // End date is yesterday or later
                    ]
                },
                include: {
                    user: true,
                    streak: true
                }
            });

            console.log(`Found ${activeHabits.length} active habits to process`);

            // Process each habit streak
            const results = {
                streaksReset: 0,
                streaksMaintained: 0,
                streaksIncreased: 0,
                errors: 0
            };

            for (const habit of activeHabits) {
                try {
                    // Skip if habit is set to skip on vacation and user is on vacation
                    if (habit.skip_on_vacation && habit.user.onVacation) {
                        continue;
                    }

                    // Skip if habit wasn't scheduled for yesterday based on frequency
                    const wasScheduledYesterday = await this.wasHabitScheduled(habit, yesterday);
                    if (!wasScheduledYesterday) {
                        continue;
                    }

                    // Get habit status for yesterday
                    const habitStatus = await prisma.habitDailyStatus.findFirst({
                        where: {
                            habit_id: habit.habit_id,
                            user_id: habit.user_id,
                            date: {
                                gte: yesterdayStart,
                                lte: yesterdayEnd
                            }
                        }
                    });

                    // If no status record exists, we need to create one marked as not completed
                    if (!habitStatus) {
                        await prisma.habitDailyStatus.create({
                            data: {
                                habit_id: habit.habit_id,
                                user_id: habit.user_id,
                                date: yesterdayStart,
                                is_scheduled: true,
                                is_completed: false
                            }
                        });
                    }

                    // Check if habit was completed yesterday (either through status or logs)
                    const wasCompletedYesterday = habitStatus?.is_completed || await this.wasHabitCompleted(
                        habit.habit_id,
                        habit.user_id,
                        yesterdayStart,
                        yesterdayEnd
                    );

                    // Get current streak for this habit
                    const streak = habit.streak[0] || await this.initializeStreak(habit.habit_id, habit.user_id);

                    if (wasCompletedYesterday) {
                        // Habit was completed, increase streak
                        await this.increaseStreak(streak, habit, yesterday);
                        results.streaksIncreased++;
                    } else {
                        // Habit was not completed, reset streak
                        await this.resetStreak(streak, habit, yesterday, 'MISSED_COMPLETION');
                        results.streaksReset++;
                    }
                } catch (error) {
                    console.error(`Error processing streak for habit ${habit.habit_id}:`, error);
                    results.errors++;
                }
            }

            // 2. Process user daily goals
            await this.processDailyGoals(yesterday);

            return {
                success: true,
                results,
                message: `Processed ${activeHabits.length} habits: ${results.streaksIncreased} increased, ${results.streaksReset} reset, ${results.errors} errors`
            };
        } catch (error) {
            console.error('Error processing daily streaks:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Process daily goals for users
     */
    async processDailyGoals(yesterday) {
        const yesterdayStart = startOfDay(yesterday);
        const yesterdayEnd = endOfDay(yesterday);

        try {
            // Get all users
            const users = await prisma.user.findMany();
            console.log(`Processing daily goals for ${users.length} users`);

            for (const user of users) {
                try {
                    // Skip if user is on vacation
                    if (user.onVacation) {
                        continue;
                    }

                    // Count habits completed yesterday
                    const habitsCompletedCount = await prisma.habitLog.count({
                        where: {
                            user_id: user.user_id,
                            completed: true,
                            completed_at: {
                                gte: yesterdayStart,
                                lte: yesterdayEnd
                            }
                        }
                    });

                    // Also count habits marked as completed in daily status
                    const statusCompletedCount = await prisma.habitDailyStatus.count({
                        where: {
                            user_id: user.user_id,
                            is_completed: true,
                            date: {
                                gte: yesterdayStart,
                                lte: yesterdayEnd
                            }
                        }
                    });

                    // Combined total (some habits might have both)
                    const uniqueHabitsCompleted = await this.getUniqueCompletedHabitsCount(
                        user.user_id,
                        yesterdayStart,
                        yesterdayEnd
                    );

                    // Check if daily goal was met
                    const dailyGoalMet = uniqueHabitsCompleted >= user.dailyGoal;

                    if (dailyGoalMet) {
                        // Increase user's daily streak
                        await prisma.user.update({
                            where: { user_id: user.user_id },
                            data: {
                                currentDailyStreak: user.currentDailyStreak + 1,
                                longestDailyStreak: Math.max(user.longestDailyStreak, user.currentDailyStreak + 1)
                            }
                        });

                        // Create streak milestone point reward if applicable (every 5 days)
                        if ((user.currentDailyStreak + 1) % 5 === 0) {
                            const streakMilestone = user.currentDailyStreak + 1;
                            const milestonePoints = 25 * Math.floor(streakMilestone / 5);

                            await prisma.pointsLog.create({
                                data: {
                                    user_id: user.user_id,
                                    points: milestonePoints,
                                    reason: `${streakMilestone} day streak milestone!`,
                                    description: `Completed your daily goal for ${streakMilestone} days in a row`,
                                    source_type: 'STREAK_MILESTONE'
                                }
                            });

                            // Create notification for streak milestone
                            await prisma.notification.create({
                                data: {
                                    user_id: user.user_id,
                                    title: 'Streak Milestone!',
                                    content: `Congratulations on maintaining your daily goals for ${streakMilestone} days! You earned ${milestonePoints} points.`,
                                    type: 'STREAK_MILESTONE'
                                }
                            });
                        }
                    } else {
                        // Daily goal not met, reset user's streak
                        await prisma.user.update({
                            where: { user_id: user.user_id },
                            data: {
                                currentDailyStreak: 0
                            }
                        });
                    }

                    // Log user stats for analytics
                    await prisma.userStats.upsert({
                        where: { user_id: user.user_id },
                        update: {
                            total_habits_completed: uniqueHabitsCompleted,
                            streak_maintained: dailyGoalMet
                        },
                        create: {
                            user_id: user.user_id,
                            date: yesterdayStart,
                            total_habits_completed: uniqueHabitsCompleted,
                            streak_maintained: dailyGoalMet
                        }
                    });
                } catch (error) {
                    console.error(`Error processing daily goals for user ${user.user_id}:`, error);
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error processing daily goals:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get unique count of completed habits
     */
    async getUniqueCompletedHabitsCount(userId, startDate, endDate) {
        // Get habits completed via logs
        const completedHabitLogs = await prisma.habitLog.findMany({
            where: {
                user_id: userId,
                completed: true,
                completed_at: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                habit_id: true
            },
            distinct: ['habit_id']
        });

        // Get habits completed via daily status
        const completedStatusHabits = await prisma.habitDailyStatus.findMany({
            where: {
                user_id: userId,
                is_completed: true,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                habit_id: true
            },
            distinct: ['habit_id']
        });

        // Combine and deduplicate
        const allHabitIds = [
            ...completedHabitLogs.map(log => log.habit_id),
            ...completedStatusHabits.map(status => status.habit_id)
        ];

        // Get unique count
        const uniqueHabitIds = [...new Set(allHabitIds)];
        return uniqueHabitIds.length;
    },

    /**
     * Initialize a streak record for a habit
     */
    async initializeStreak(habitId, userId) {
        return await prisma.habitStreak.create({
            data: {
                habit_id: habitId,
                user_id: userId,
                current_streak: 0,
                longest_streak: 0,
                streak_history: {
                    streaks: [],
                    lastUpdated: new Date()
                }
            }
        });
    },

    /**
     * Increase streak count for a habit
     */
    async increaseStreak(streak, habit, yesterday) {
        const newCurrentStreak = streak.current_streak + 1;
        const newLongestStreak = Math.max(streak.longest_streak, newCurrentStreak);
        const now = new Date();

        // Record in streak history
        const streakHistory = streak.streak_history || { streaks: [] };
        streakHistory.streaks.push({
            date: format(yesterday, 'yyyy-MM-dd'),
            value: newCurrentStreak
        });
        streakHistory.lastUpdated = now;

        // Update streak record
        await prisma.habitStreak.update({
            where: { streak_id: streak.streak_id },
            data: {
                current_streak: newCurrentStreak,
                longest_streak: newLongestStreak,
                last_completed: yesterday,
                start_date: streak.start_date || yesterday,
                streak_history: streakHistory,
                grace_period_used: false // Reset grace period flag on successful completion
            }
        });

        // Award streak bonus points if configured
        if (habit.bonus_points_streak > 0) {
            const streakBonus = habit.bonus_points_streak * newCurrentStreak;

            await prisma.pointsLog.create({
                data: {
                    user_id: habit.user_id,
                    points: streakBonus,
                    reason: `Streak bonus for "${habit.name}"`,
                    description: `${newCurrentStreak} day streak bonus`,
                    source_type: 'STREAK_MILESTONE',
                    source_id: habit.habit_id
                }
            });
        }

        // Check for streak milestones (every 7 days)
        if (newCurrentStreak % 7 === 0) {
            // Create notification for habit streak milestone
            await prisma.notification.create({
                data: {
                    user_id: habit.user_id,
                    title: 'Habit Streak Milestone!',
                    content: `You've completed "${habit.name}" for ${newCurrentStreak} days in a row! Keep it up!`,
                    type: 'STREAK_MILESTONE',
                    related_id: habit.habit_id
                }
            });
        }

        return { success: true, newStreak: newCurrentStreak };
    },

    /**
     * Reset streak count for a habit
     */
    async resetStreak(streak, habit, yesterday, reason) {
        // Only reset if there's actually a streak to reset
        if (streak.current_streak === 0) {
            return { success: true, alreadyReset: true };
        }

        // Check for grace period if enabled
        if (habit.grace_period_enabled && !streak.grace_period_used) {
            // Give the user a grace period, but mark it as used
            await prisma.habitStreak.update({
                where: { streak_id: streak.streak_id },
                data: {
                    grace_period_used: true,
                    missed_days_count: streak.missed_days_count + 1
                }
            });

            // Create notification about grace period
            await prisma.notification.create({
                data: {
                    user_id: habit.user_id,
                    title: 'Grace Period Used',
                    content: `You missed "${habit.name}" yesterday. Your streak is safe for now, but you need to complete it today to keep your ${streak.current_streak} day streak!`,
                    type: 'SYSTEM_MESSAGE',
                    related_id: habit.habit_id
                }
            });

            return { success: true, gracePeriodUsed: true };
        }

        // Record the reset in history
        await prisma.habitReset.create({
            data: {
                habit_id: habit.habit_id,
                user_id: habit.user_id,
                reset_date: yesterday,
                previous_streak: streak.current_streak,
                reason: reason,
                user_initiated: false,
                notes: `Streak of ${streak.current_streak} days was reset because habit was not completed on ${format(yesterday, 'yyyy-MM-dd')}`
            }
        });

        // Update streak record
        await prisma.habitStreak.update({
            where: { streak_id: streak.streak_id },
            data: {
                current_streak: 0,
                missed_days_count: streak.missed_days_count + 1,
                grace_period_used: false, // Reset grace period flag
                last_reset_reason: reason,
                start_date: null // Clear start date for the current streak
            }
        });

        // Create notification about streak reset
        await prisma.notification.create({
            data: {
                user_id: habit.user_id,
                title: 'Streak Reset',
                content: `Your ${streak.current_streak} day streak for "${habit.name}" has been reset because you didn't complete it yesterday.`,
                type: 'SYSTEM_MESSAGE',
                related_id: habit.habit_id
            }
        });

        return { success: true, resetStreak: streak.current_streak };
    },

    /**
     * Check if a habit was scheduled for a specific day based on frequency settings
     */
    async wasHabitScheduled(habit, date) {
        const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday

        // Check based on frequency type
        switch (habit.frequency_type) {
            case 'DAILY':
                return true;

            case 'WEEKDAYS':
                // Monday-Friday (1-5)
                return dayOfWeek >= 1 && dayOfWeek <= 5;

            case 'WEEKENDS':
                // Saturday and Sunday (0, 6)
                return dayOfWeek === 0 || dayOfWeek === 6;

            case 'SPECIFIC_DAYS':
                // Check if the day of week is in the specific_days array
                return habit.specific_days.includes(dayOfWeek);

            case 'INTERVAL':
                // For interval-based habits, we need to check if yesterday falls on the interval
                const habitStartDate = new Date(habit.start_date);
                const diffTime = Math.abs(date - habitStartDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                // Check if the difference in days is divisible by the interval
                return diffDays % habit.frequency_interval === 0;

            case 'X_TIMES_WEEK':
            case 'X_TIMES_MONTH':
                // For these types, check the HabitDailyStatus to see if it was scheduled
                const dailyStatus = await prisma.habitDailyStatus.findFirst({
                    where: {
                        habit_id: habit.habit_id,
                        date: date,
                    }
                });

                return dailyStatus ? dailyStatus.is_scheduled : false;

            default:
                // For any other type, default to true
                return true;
        }
    },

    /**
     * Check if a habit was completed on a specific day
     */
    async wasHabitCompleted(habitId, userId, startDate, endDate) {
        // Check if there's any completion log for this habit in the date range
        const completionCount = await prisma.habitLog.count({
            where: {
                habit_id: habitId,
                user_id: userId,
                completed: true,
                completed_at: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        return completionCount > 0;
    }
};

module.exports = streakController;