/**
 * Enhanced Achievement Controller
 * Handles achievements logic with progress tracking and failure recovery
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AchievementController {
    /**
     * Check and award achievements for a user
     */
    async checkAndAwardAchievements(userId, forceFullCheck = false) {
        try {
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                include: {
                    habits: {
                        where: { is_active: true }
                    },
                    userAchievements: {
                        include: { achievement: true }
                    }
                }
            });

            if (!user) {
                throw new Error(`User with ID ${userId} not found`);
            }

            // Get all achievements
            const allAchievements = await prisma.achievement.findMany();

            // Get IDs of achievements the user already has
            const userAchievementIds = user.userAchievements.map(ua => ua.achievement_id);

            // Filter to achievements the user doesn't have yet
            const availableAchievements = allAchievements.filter(
                achievement => !userAchievementIds.includes(achievement.achievement_id)
            );

            const newlyAwarded = [];
            const achievementProgress = [];

            // Check each achievement
            for (const achievement of availableAchievements) {
                try {
                    // Get progress data first
                    const progressData = await this.getAchievementProgress(user, achievement, forceFullCheck);
                    achievementProgress.push(progressData);

                    // Check if achievement is earned
                    if (progressData.is_earned) {
                        // Award the achievement to the user
                        const awardResult = await this.awardAchievement(userId, achievement.achievement_id);
                        newlyAwarded.push(awardResult);
                    }

                    // Store the progress data even if not yet earned
                    await this.updateAchievementProgress(userId, achievement.achievement_id, progressData);

                } catch (error) {
                    console.error(`Error processing achievement ${achievement.name}: ${error.message}`);
                    // Continue with next achievement instead of failing the entire process
                }
            }

            return {
                checked: availableAchievements.length,
                awarded: newlyAwarded.length,
                newAchievements: newlyAwarded,
                progressData: achievementProgress
            };
        } catch (error) {
            console.error(`Error in checkAndAwardAchievements: ${error.message}`);
            throw error;
        }
    }

    /**
     * Update progress tracking for an achievement
     */
    async updateAchievementProgress(userId, achievementId, progressData) {
        try {
            // Check if we already have a progress record
            const existingProgress = await prisma.achievementProgress.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievementId
                    }
                }
            });

            if (existingProgress) {
                // Update existing progress
                await prisma.achievementProgress.update({
                    where: {
                        user_id_achievement_id: {
                            user_id: userId,
                            achievement_id: achievementId
                        }
                    },
                    data: {
                        current_value: progressData.current_progress,
                        target_value: progressData.target_value,
                        percent_complete: progressData.progress_percent,
                        last_updated: new Date()
                    }
                });
            } else {
                // Create new progress record
                await prisma.achievementProgress.create({
                    data: {
                        user_id: userId,
                        achievement_id: achievementId,
                        current_value: progressData.current_progress,
                        target_value: progressData.target_value,
                        percent_complete: progressData.progress_percent,
                        last_updated: new Date()
                    }
                });
            }

            return true;
        } catch (error) {
            console.error(`Error updating achievement progress: ${error.message}`);
            return false;
        }
    }

    /**
     * Get detailed progress for a specific achievement
     */
    async getAchievementProgress(user, achievement, forceFullCheck = false) {
        // Base progress object
        const progressData = {
            achievement_id: achievement.achievement_id,
            name: achievement.name,
            description: achievement.description,
            criteria_type: achievement.criteria_type,
            target_value: achievement.criteria_value,
            current_progress: 0,
            progress_percent: 0,
            is_earned: false
        };

        try {
            // Calculate progress based on achievement type
            switch (achievement.criteria_type) {
                case 'STREAK_LENGTH': {
                    const streakProgress = await this.getStreakLengthProgress(user, achievement, forceFullCheck);
                    Object.assign(progressData, streakProgress);
                    break;
                }

                case 'TOTAL_COMPLETIONS': {
                    const completionsProgress = await this.getTotalCompletionsProgress(user, achievement, forceFullCheck);
                    Object.assign(progressData, completionsProgress);
                    break;
                }

                case 'CONSECUTIVE_DAYS': {
                    const daysProgress = await this.getConsecutiveDaysProgress(user, achievement, forceFullCheck);
                    Object.assign(progressData, daysProgress);
                    break;
                }

                case 'PERFECT_WEEK': {
                    const weekProgress = await this.getPerfectWeekProgress(user, achievement);
                    Object.assign(progressData, weekProgress);
                    break;
                }

                case 'PERFECT_MONTH': {
                    const monthProgress = await this.getPerfectMonthProgress(user, achievement);
                    Object.assign(progressData, monthProgress);
                    break;
                }

                case 'HABIT_DIVERSITY': {
                    const diversityProgress = await this.getHabitDiversityProgress(user, achievement, forceFullCheck);
                    Object.assign(progressData, diversityProgress);
                    break;
                }

                case 'DOMAIN_MASTERY': {
                    const masteryProgress = await this.getDomainMasteryProgress(user, achievement, forceFullCheck);
                    Object.assign(progressData, masteryProgress);
                    break;
                }

                case 'SOCIAL_ENGAGEMENT': {
                    const socialProgress = await this.getSocialEngagementProgress(user, achievement, forceFullCheck);
                    Object.assign(progressData, socialProgress);
                    break;
                }

                default:
                    // Default case - no progress
                    break;
            }

            return progressData;
        } catch (error) {
            console.error(`Error getting achievement progress for ${achievement.name}: ${error.message}`);
            return progressData; // Return basic data with zero progress on error
        }
    }

    /**
     * Get progress data for streak length achievement
     */
    async getStreakLengthProgress(user, achievement, forceFullCheck) {
        let longestStreak = 0;

        try {
            if (forceFullCheck) {
                // Check both current streak and historical maximum
                const habitStreaks = await prisma.habitStreak.findMany({
                    where: { user_id: user.user_id },
                    orderBy: { max_streak: 'desc' },
                    take: 1
                });

                const maxHistoricalStreak = habitStreaks.length > 0 ? habitStreaks[0].max_streak : 0;

                // Also check current active streaks
                const currentStreaks = await prisma.habitStreak.findMany({
                    where: { user_id: user.user_id },
                    orderBy: { current_streak: 'desc' },
                    take: 1
                });

                const maxCurrentStreak = currentStreaks.length > 0 ? currentStreaks[0].current_streak : 0;

                // Use the max of both values
                longestStreak = Math.max(maxHistoricalStreak, maxCurrentStreak, user.longestDailyStreak || 0);
            } else {
                // Use the cached values from the user object if available
                longestStreak = Math.max(
                    ...user.habitStreaks?.map(streak => streak.current_streak || 0) || [0],
                    ...user.habitStreaks?.map(streak => streak.max_streak || 0) || [0],
                    user.longestDailyStreak || 0
                );
            }

            // Calculate progress percentage
            const progressPercent = Math.min(
                Math.floor((longestStreak / achievement.criteria_value) * 100),
                100
            );

            return {
                current_progress: longestStreak,
                progress_percent: progressPercent,
                is_earned: longestStreak >= achievement.criteria_value
            };
        } catch (error) {
            console.error(`Error calculating streak length progress: ${error.message}`);
            return {
                current_progress: 0,
                progress_percent: 0,
                is_earned: false
            };
        }
    }

    /**
     * Get progress data for total completions achievement
     */
    async getTotalCompletionsProgress(user, achievement, forceFullCheck) {
        let totalCompletions = 0;

        try {
            if (forceFullCheck || !user.totalHabitsCompleted) {
                // Query the actual count from the database for an accurate check
                totalCompletions = await prisma.habitLog.count({
                    where: {
                        user_id: user.user_id,
                        completed: true
                    }
                });

                // Update the user's cached value for future checks
                if (totalCompletions > 0) {
                    await prisma.user.update({
                        where: { user_id: user.user_id },
                        data: { totalHabitsCompleted: totalCompletions }
                    });
                }
            } else {
                // Use the cached value
                totalCompletions = user.totalHabitsCompleted;
            }

            // Calculate progress percentage
            const progressPercent = Math.min(
                Math.floor((totalCompletions / achievement.criteria_value) * 100),
                100
            );

            return {
                current_progress: totalCompletions,
                progress_percent: progressPercent,
                is_earned: totalCompletions >= achievement.criteria_value
            };
        } catch (error) {
            console.error(`Error calculating total completions progress: ${error.message}`);
            return {
                current_progress: 0,
                progress_percent: 0,
                is_earned: false
            };
        }
    }

    /**
     * Get progress data for consecutive days achievement
     */
    async getConsecutiveDaysProgress(user, achievement, forceFullCheck) {
        let currentStreak = 0;

        try {
            if (forceFullCheck) {
                // For a complete check, we need to recalculate the login streak from the activity logs
                const loginHistory = await prisma.userActivityLog.findMany({
                    where: {
                        user_id: user.user_id,
                        activity_type: 'LOGIN'
                    },
                    orderBy: {
                        created_at: 'desc'
                    }
                });

                // Calculate the current streak from login history
                currentStreak = this.calculateConsecutiveDaysStreak(loginHistory);

                // Update the user record with the calculated streak
                if (currentStreak > (user.currentDailyStreak || 0)) {
                    await prisma.user.update({
                        where: { user_id: user.user_id },
                        data: { currentDailyStreak: currentStreak }
                    });
                }
            } else {
                // Use the value from the user object
                currentStreak = user.currentDailyStreak || 0;
            }

            // Calculate progress percentage
            const progressPercent = Math.min(
                Math.floor((currentStreak / achievement.criteria_value) * 100),
                100
            );

            return {
                current_progress: currentStreak,
                progress_percent: progressPercent,
                is_earned: currentStreak >= achievement.criteria_value
            };
        } catch (error) {
            console.error(`Error calculating consecutive days progress: ${error.message}`);
            return {
                current_progress: 0,
                progress_percent: 0,
                is_earned: false
            };
        }
    }

    /**
     * Get progress data for perfect week achievement
     */
    async getPerfectWeekProgress(user, achievement) {
        try {
            // Get dates for the current week
            const today = new Date();

            // Current week
            const currentWeekStart = new Date(today);
            currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Start of current week (Sunday)
            currentWeekStart.setHours(0, 0, 0, 0);

            const currentWeekEnd = new Date(currentWeekStart);
            currentWeekEnd.setDate(currentWeekEnd.getDate() + 6); // End of week (Saturday)
            currentWeekEnd.setHours(23, 59, 59, 999);

            // Count total scheduled habits for the current week
            const scheduledCount = await prisma.habitDailyStatus.count({
                where: {
                    user_id: user.user_id,
                    is_scheduled: true,
                    date: {
                        gte: currentWeekStart,
                        lte: currentWeekEnd
                    }
                }
            });

            // Count completed habits for the current week
            const completedCount = await prisma.habitDailyStatus.count({
                where: {
                    user_id: user.user_id,
                    is_scheduled: true,
                    is_completed: true,
                    date: {
                        gte: currentWeekStart,
                        lte: currentWeekEnd
                    }
                }
            });

            // Check if any of the previous 4 weeks had a perfect record
            // This is to determine if the achievement is earned
            let isPerfectWeekAchieved = false;

            // Check the previous 4 weeks
            for (let i = 1; i <= 4; i++) {
                const weekStart = new Date(today);
                weekStart.setDate(weekStart.getDate() - today.getDay() - (7 * i));
                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);

                const pastScheduledCount = await prisma.habitDailyStatus.count({
                    where: {
                        user_id: user.user_id,
                        is_scheduled: true,
                        date: {
                            gte: weekStart,
                            lte: weekEnd
                        }
                    }
                });

                const pastCompletedCount = await prisma.habitDailyStatus.count({
                    where: {
                        user_id: user.user_id,
                        is_scheduled: true,
                        is_completed: true,
                        date: {
                            gte: weekStart,
                            lte: weekEnd
                        }
                    }
                });

                // Check if this past week was perfect (all scheduled habits completed) with at least 7 habits
                if (pastScheduledCount >= 7 && pastScheduledCount === pastCompletedCount) {
                    isPerfectWeekAchieved = true;
                    break;
                }
            }

            // Calculate progress for current week
            const progressPercent = scheduledCount > 0
                ? Math.min(Math.floor((completedCount / scheduledCount) * 100), 100)
                : 0;

            return {
                current_progress: completedCount,
                target_value: scheduledCount,
                progress_percent: progressPercent,
                is_earned: isPerfectWeekAchieved
            };
        } catch (error) {
            console.error(`Error calculating perfect week progress: ${error.message}`);
            return {
                current_progress: 0,
                target_value: 0,
                progress_percent: 0,
                is_earned: false
            };
        }
    }

    /**
     * Get progress data for perfect month achievement
     */
    async getPerfectMonthProgress(user, achievement) {
        try {
            // Get dates for the current month
            const today = new Date();
            const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

            // Count total scheduled habits for the current month
            const scheduledCount = await prisma.habitDailyStatus.count({
                where: {
                    user_id: user.user_id,
                    is_scheduled: true,
                    date: {
                        gte: currentMonthStart,
                        lte: currentMonthEnd
                    }
                }
            });

            // Count completed habits for the current month
            const completedCount = await prisma.habitDailyStatus.count({
                where: {
                    user_id: user.user_id,
                    is_scheduled: true,
                    is_completed: true,
                    date: {
                        gte: currentMonthStart,
                        lte: currentMonthEnd
                    }
                }
            });

            // Check if any of the previous 3 months had a perfect record
            let isPerfectMonthAchieved = false;

            // Check the previous 3 months
            for (let i = 1; i <= 3; i++) {
                const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);

                const pastScheduledCount = await prisma.habitDailyStatus.count({
                    where: {
                        user_id: user.user_id,
                        is_scheduled: true,
                        date: {
                            gte: monthStart,
                            lte: monthEnd
                        }
                    }
                });

                const pastCompletedCount = await prisma.habitDailyStatus.count({
                    where: {
                        user_id: user.user_id,
                        is_scheduled: true,
                        is_completed: true,
                        date: {
                            gte: monthStart,
                            lte: monthEnd
                        }
                    }
                });

                // Check if this past month was perfect (all scheduled habits completed) with at least 20 habits
                if (pastScheduledCount >= 20 && pastScheduledCount === pastCompletedCount) {
                    isPerfectMonthAchieved = true;
                    break;
                }
            }

            // Calculate progress for current month
            const progressPercent = scheduledCount > 0
                ? Math.min(Math.floor((completedCount / scheduledCount) * 100), 100)
                : 0;

            return {
                current_progress: completedCount,
                target_value: scheduledCount,
                progress_percent: progressPercent,
                is_earned: isPerfectMonthAchieved
            };
        } catch (error) {
            console.error(`Error calculating perfect month progress: ${error.message}`);
            return {
                current_progress: 0,
                target_value: 0,
                progress_percent: 0,
                is_earned: false
            };
        }
    }

    /**
     * Get progress data for habit diversity achievement
     */
    async getHabitDiversityProgress(user, achievement, forceFullCheck) {
        let activeHabitsCount = 0;

        try {
            if (forceFullCheck || !user.habits) {
                // Query directly from database
                activeHabitsCount = await prisma.habit.count({
                    where: {
                        user_id: user.user_id,
                        is_active: true
                    }
                });
            } else {
                // Use the prefetched habits
                activeHabitsCount = user.habits.length;
            }

            // Calculate progress percentage
            const progressPercent = Math.min(
                Math.floor((activeHabitsCount / achievement.criteria_value) * 100),
                100
            );

            return {
                current_progress: activeHabitsCount,
                progress_percent: progressPercent,
                is_earned: activeHabitsCount >= achievement.criteria_value
            };
        } catch (error) {
            console.error(`Error calculating habit diversity progress: ${error.message}`);
            return {
                current_progress: 0,
                progress_percent: 0,
                is_earned: false
            };
        }
    }

    /**
     * Get progress data for domain mastery achievement
     */
    async getDomainMasteryProgress(user, achievement, forceFullCheck) {
        let completionsCount = 0;

        try {
            // Get domain from metadata
            const metadata = typeof achievement.metadata === 'string'
                ? JSON.parse(achievement.metadata || '{}')
                : (achievement.metadata || {});

            const domainId = metadata.domain_id;

            if (!domainId) {
                return {
                    current_progress: 0,
                    progress_percent: 0,
                    is_earned: false,
                    error: 'No domain ID found in achievement metadata'
                };
            }

            // Get habits in this domain
            const domainHabits = await prisma.habit.findMany({
                where: {
                    user_id: user.user_id,
                    domain_id: domainId
                },
                select: { habit_id: true }
            });

            if (domainHabits.length > 0) {
                const habitIds = domainHabits.map(h => h.habit_id);

                // Count completions in this domain
                completionsCount = await prisma.habitLog.count({
                    where: {
                        user_id: user.user_id,
                        habit_id: { in: habitIds },
                        completed: true
                    }
                });
            }

            // Calculate progress percentage
            const progressPercent = Math.min(
                Math.floor((completionsCount / achievement.criteria_value) * 100),
                100
            );

            return {
                current_progress: completionsCount,
                progress_percent: progressPercent,
                is_earned: completionsCount >= achievement.criteria_value
            };
        } catch (error) {
            console.error(`Error calculating domain mastery progress: ${error.message}`);
            return {
                current_progress: 0,
                progress_percent: 0,
                is_earned: false
            };
        }
    }

    /**
     * Get progress data for social engagement achievement
     */
    async getSocialEngagementProgress(user, achievement, forceFullCheck) {
        try {
            // Get engagement type from metadata
            const metadata = typeof achievement.metadata === 'string'
                ? JSON.parse(achievement.metadata || '{}')
                : (achievement.metadata || {});

            const engagementType = metadata.engagement_type || 'any';

            let count = 0;

            switch (engagementType) {
                case 'blogs':
                    count = await prisma.blog.count({
                        where: { user_id: user.user_id }
                    });
                    break;

                case 'likes_received':
                    count = await prisma.like.count({
                        where: {
                            blog: { user_id: user.user_id }
                        }
                    });
                    break;

                case 'comments_received':
                    count = await prisma.comment.count({
                        where: {
                            blog: { user_id: user.user_id }
                        }
                    });
                    break;

                case 'friends':
                    count = await prisma.friendRequest.count({
                        where: {
                            OR: [
                                { sender_id: user.user_id, status: 'ACCEPTED' },
                                { receiver_id: user.user_id, status: 'ACCEPTED' }
                            ]
                        }
                    });
                    break;

                default:
                    count = 0;
            }

            // Calculate progress percentage
            const progressPercent = Math.min(
                Math.floor((count / achievement.criteria_value) * 100),
                100
            );

            return {
                current_progress: count,
                progress_percent: progressPercent,
                is_earned: count >= achievement.criteria_value
            };
        } catch (error) {
            console.error(`Error calculating social engagement progress: ${error.message}`);
            return {
                current_progress: 0,
                progress_percent: 0,
                is_earned: false
            };
        }
    }

    /**
     * Perform a full achievement backfill for a user
     */
    async performFullAchievementBackfill(userId) {
        try {
            console.log(`Starting full achievement backfill for user ${userId}`);

            // First, reset progress tracking for this user if something went wrong previously
            await this.resetUserAchievementProgress(userId);

            // Then perform full check with force flag
            const result = await this.checkAndAwardAchievements(userId, true);

            console.log(`Completed achievement backfill for user ${userId}. Awarded ${result.awarded} new achievements.`);
            return result;
        } catch (error) {
            console.error(`Error in performFullAchievementBackfill: ${error.message}`);
            throw error;
        }
    }

    /**
     * Reset progress tracking for a user to fix any inconsistencies
     */
    async resetUserAchievementProgress(userId) {
        try {
            // Get all achievements
            const allAchievements = await prisma.achievement.findMany();

            // Get user's existing awarded achievements
            const userAchievements = await prisma.userAchievement.findMany({
                where: { user_id: userId },
                select: { achievement_id: true }
            });

            const userAchievementIds = userAchievements.map(ua => ua.achievement_id);

            // Delete all existing progress records for this user
            await prisma.achievementProgress.deleteMany({
                where: { user_id: userId }
            });

            // Create fresh progress entries for achievements the user doesn't have yet
            const progressEntries = allAchievements
                .filter(achievement => !userAchievementIds.includes(achievement.achievement_id))
                .map(achievement => ({
                    user_id: userId,
                    achievement_id: achievement.achievement_id,
                    current_value: 0,
                    target_value: achievement.criteria_value,
                    percent_complete: 0,
                    last_updated: new Date()
                }));

            if (progressEntries.length > 0) {
                await prisma.achievementProgress.createMany({
                    data: progressEntries
                });
            }

            return {
                success: true,
                message: `Reset progress tracking for ${progressEntries.length} achievements`
            };
        } catch (error) {
            console.error(`Error resetting user achievement progress: ${error.message}`);
            return {
                success: false,
                message: `Failed to reset progress: ${error.message}`
            };
        }
    }

    /**
     * Award an achievement to a user
     */
    async awardAchievement(userId, achievementId) {
        try {
            // Get achievement details
            const achievement = await prisma.achievement.findUnique({
                where: { achievement_id: achievementId }
            });

            if (!achievement) {
                throw new Error(`Achievement with ID ${achievementId} not found`);
            }

            // Check if user already has this achievement (double check to prevent duplicates)
            const existingAchievement = await prisma.userAchievement.findFirst({
                where: {
                    user_id: userId,
                    achievement_id: achievementId
                }
            });

            if (existingAchievement) {
                console.log(`User ${userId} already has achievement ${achievementId}, skipping award`);
                return {
                    success: true,
                    achievement,
                    alreadyAwarded: true
                };
            }

            // Use transaction to ensure all operations complete or none do
            const result = await prisma.$transaction(async (prisma) => {
                // Record the achievement for the user
                const userAchievement = await prisma.userAchievement.create({
                    data: {
                        user_id: userId,
                        achievement_id: achievementId,
                        points_awarded: achievement.points_reward
                    }
                });

                // If there are points to award, add them to the user's total
                if (achievement.points_reward > 0) {
                    await prisma.user.update({
                        where: { user_id: userId },
                        data: {
                            points_gained: {
                                increment: achievement.points_reward
                            }
                        }
                    });

                    // Record the points transaction
                    await prisma.pointsLog.create({
                        data: {
                            user_id: userId,
                            points: achievement.points_reward,
                            reason: `Achievement unlocked: ${achievement.name}`,
                            description: achievement.description,
                            source_type: 'ACHIEVEMENT',
                            source_id: achievementId
                        }
                    });
                }

                // Remove from progress tracking since it's now awarded
                await prisma.achievementProgress.deleteMany({
                    where: {
                        user_id: userId,
                        achievement_id: achievementId
                    }
                });

                // Create notification for the user
                await prisma.notification.create({
                    data: {
                        user_id: userId,
                        title: 'Achievement Unlocked! 🏆',
                        content: `"${achievement.name}": ${achievement.description}${
                            achievement.points_reward ? ` (+${achievement.points_reward} points)` : ''
                        }`,
                        type: 'ACHIEVEMENT_UNLOCKED',
                        related_id: achievementId,
                        action_url: '/achievements'
                    }
                });

                return {
                    success: true,
                    achievement,
                    userAchievement,
                    pointsAwarded: achievement.points_reward
                };
            });

            return result;
        } catch (error) {
            console.error(`Error awarding achievement: ${error.message}`);

// If there was an error, we'll try to recover by rechecking
            try {
                console.log(`Attempting recovery for achievement award failure for user ${userId}, achievement ${achievementId}`);

                // Check if the achievement was actually awarded despite the error
                const checkExisting = await prisma.userAchievement.findFirst({
                    where: {
                        user_id: userId,
                        achievement_id: achievementId
                    }
                });

                if (checkExisting) {
                    // It was actually awarded, return success
                    return {
                        success: true,
                        achievement,
                        userAchievement: checkExisting,
                        pointsAwarded: achievement.points_reward,
                        recoveryRequired: true
                    };
                } else {
                    // It truly failed, throw the original error
                    throw error;
                }
            } catch (recoveryError) {
                console.error(`Recovery attempt also failed: ${recoveryError.message}`);
                throw error; // Throw the original error
            }
        }
    }

    /**
     * Get all achievement progress for a user
     */
    async getUserAchievementProgress(userId) {
        try {
            // Get all achievements
            const allAchievements = await prisma.achievement.findMany();

            // Get user's awarded achievements
            const userAchievements = await prisma.userAchievement.findMany({
                where: { user_id: userId },
                include: { achievement: true }
            });

            // Get progress data for achievements not yet awarded
            const progressData = await prisma.achievementProgress.findMany({
                where: {
                    user_id: userId
                }
            });

            // Map of achievement IDs to progress data
            const progressMap = new Map();
            progressData.forEach(progress => {
                progressMap.set(progress.achievement_id, progress);
            });

            // Map of awarded achievement IDs
            const awardedMap = new Map();
            userAchievements.forEach(ua => {
                awardedMap.set(ua.achievement_id, ua);
            });

            // Create comprehensive list with both awarded and in-progress achievements
            const result = allAchievements.map(achievement => {
                const isAwarded = awardedMap.has(achievement.achievement_id);
                const progress = progressMap.get(achievement.achievement_id);

                if (isAwarded) {
                    // Achievement is already awarded
                    const awardedData = awardedMap.get(achievement.achievement_id);
                    return {
                        ...achievement,
                        is_awarded: true,
                        awarded_at: awardedData.awarded_at,
                        points_awarded: awardedData.points_awarded,
                        current_progress: achievement.criteria_value,
                        progress_percent: 100
                    };
                } else if (progress) {
                    // Achievement is in progress
                    return {
                        ...achievement,
                        is_awarded: false,
                        current_progress: progress.current_value,
                        progress_percent: progress.percent_complete
                    };
                } else {
                    // No progress data yet
                    return {
                        ...achievement,
                        is_awarded: false,
                        current_progress: 0,
                        progress_percent: 0
                    };
                }
            });

            return result;
        } catch (error) {
            console.error(`Error getting user achievement progress: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle potential progress data corruption by checking for inconsistencies
     */
    async detectAndRepairProgressInconsistencies(userId) {
        try {
            // Get all achievements
            const allAchievements = await prisma.achievement.findMany();

            // Get user's awarded achievements
            const userAchievements = await prisma.userAchievement.findMany({
                where: { user_id: userId },
                select: { achievement_id: true }
            });

            // Get progress data
            const progressData = await prisma.achievementProgress.findMany({
                where: { user_id: userId }
            });

            const userAchievementIds = new Set(userAchievements.map(ua => ua.achievement_id));
            const progressAchievementIds = new Set(progressData.map(p => p.achievement_id));

            const inconsistencies = [];

            // Check for awarded achievements that still have progress records
            const superfluousProgress = [...progressAchievementIds].filter(id => userAchievementIds.has(id));
            if (superfluousProgress.length > 0) {
                // Delete superfluous progress records
                await prisma.achievementProgress.deleteMany({
                    where: {
                        user_id: userId,
                        achievement_id: { in: superfluousProgress }
                    }
                });

                inconsistencies.push({
                    type: 'superfluous_progress',
                    count: superfluousProgress.length,
                    fixed: true
                });
            }

            // Check for achievements that should have progress records but don't
            const missingProgress = allAchievements
                .filter(a => !userAchievementIds.has(a.achievement_id) && !progressAchievementIds.has(a.achievement_id))
                .map(a => a.achievement_id);

            if (missingProgress.length > 0) {
                // Create missing progress records with zero progress
                const newProgressEntries = missingProgress.map(achievementId => {
                    const achievement = allAchievements.find(a => a.achievement_id === achievementId);
                    return {
                        user_id: userId,
                        achievement_id: achievementId,
                        current_value: 0,
                        target_value: achievement.criteria_value,
                        percent_complete: 0,
                        last_updated: new Date()
                    };
                });

                await prisma.achievementProgress.createMany({
                    data: newProgressEntries
                });

                inconsistencies.push({
                    type: 'missing_progress',
                    count: missingProgress.length,
                    fixed: true
                });
            }

            // Check for progress records with unusual values (negative or too high)
            const invalidProgress = progressData.filter(p => {
                const achievement = allAchievements.find(a => a.achievement_id === p.achievement_id);
                return (
                    p.current_value < 0 ||
                    p.percent_complete < 0 ||
                    p.percent_complete > 99 || // 100% should mean awarded
                    (achievement && p.current_value > achievement.criteria_value)
                );
            });

            if (invalidProgress.length > 0) {
                // Reset these progress records
                for (const progress of invalidProgress) {
                    const achievement = allAchievements.find(a => a.achievement_id === progress.achievement_id);

                    // Update with correct values
                    await prisma.achievementProgress.update({
                        where: {
                            user_id_achievement_id: {
                                user_id: userId,
                                achievement_id: progress.achievement_id
                            }
                        },
                        data: {
                            current_value: 0, // Reset to 0
                            target_value: achievement ? achievement.criteria_value : 1,
                            percent_complete: 0,
                            last_updated: new Date()
                        }
                    });
                }

                inconsistencies.push({
                    type: 'invalid_progress',
                    count: invalidProgress.length,
                    fixed: true
                });
            }

            // If any inconsistencies were found and fixed, refresh the progress data
            if (inconsistencies.length > 0) {
                // Perform a backfill check to update the progress values
                await this.checkAndAwardAchievements(userId, true);

                console.log(`Fixed ${inconsistencies.length} types of achievement progress inconsistencies for user ${userId}`);
            }

            return {
                userId,
                inconsistenciesFound: inconsistencies.length > 0,
                inconsistenciesFixed: inconsistencies
            };
        } catch (error) {
            console.error(`Error detecting and repairing achievement progress: ${error.message}`);
            return {
                userId,
                inconsistenciesFound: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate consecutive days streak from a list of timestamped activities
     */
    calculateConsecutiveDaysStreak(activities) {
        if (!activities || activities.length === 0) {
            return 0;
        }

        // Sort activities by date (most recent first)
        activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        let streak = 1;
        let previousDate = new Date(activities[0].created_at);
        previousDate.setHours(0, 0, 0, 0); // Normalize to start of day

        // Check for consecutive days
        for (let i = 1; i < activities.length; i++) {
            const currentDate = new Date(activities[i].created_at);
            currentDate.setHours(0, 0, 0, 0); // Normalize to start of day

            // Calculate day difference
            const diffTime = previousDate.getTime() - currentDate.getTime();
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                // This is the previous consecutive day
                streak++;
                previousDate = currentDate;
            } else if (diffDays === 0) {
                // Same day, continue checking
                continue;
            } else {
                // Break in the streak
                break;
            }
        }

        return streak;
    }

    /**
     * Seed default achievements in the database
     */
    async seedDefaultAchievements() {
        try {
            // Define our default achievements
            const defaultAchievements = [
                {
                    name: 'First Steps',
                    description: 'Complete your first habit',
                    icon: 'footsteps',
                    badge_image: '/badges/first_steps.png',
                    criteria_type: 'TOTAL_COMPLETIONS',
                    criteria_value: 1,
                    xp_value: 10,
                    points_reward: 50,
                    is_hidden: false
                },
                {
                    name: 'Habit Century',
                    description: 'Complete 100 habits',
                    icon: 'hundred',
                    badge_image: '/badges/century.png',
                    criteria_type: 'TOTAL_COMPLETIONS',
                    criteria_value: 100,
                    xp_value: 50,
                    points_reward: 200,
                    is_hidden: false
                },
                {
                    name: 'Consistency is Key',
                    description: 'Maintain a 7-day streak',
                    icon: 'fire',
                    badge_image: '/badges/streak_7.png',
                    criteria_type: 'STREAK_LENGTH',
                    criteria_value: 7,
                    xp_value: 25,
                    points_reward: 100,
                    is_hidden: false
                },
                {
                    name: 'Month Master',
                    description: 'Maintain a 30-day streak',
                    icon: 'calendar-check',
                    badge_image: '/badges/streak_30.png',
                    criteria_type: 'STREAK_LENGTH',
                    criteria_value: 30,
                    xp_value: 75,
                    points_reward: 300,
                    is_hidden: false
                },
                {
                    name: 'Perfect Week',
                    description: 'Complete all scheduled habits for an entire week',
                    icon: 'check-circle',
                    badge_image: '/badges/perfect_week.png',
                    criteria_type: 'PERFECT_WEEK',
                    criteria_value: 1,
                    xp_value: 40,
                    points_reward: 150,
                    is_hidden: false
                },
                {
                    name: 'Perfect Month',
                    description: 'Complete all scheduled habits for an entire month',
                    icon: 'medal',
                    badge_image: '/badges/perfect_month.png',
                    criteria_type: 'PERFECT_MONTH',
                    criteria_value: 1,
                    xp_value: 100,
                    points_reward: 500,
                    is_hidden: false
                },
                {
                    name: 'Habit Collector',
                    description: 'Create 5 different active habits',
                    icon: 'collection',
                    badge_image: '/badges/collector.png',
                    criteria_type: 'HABIT_DIVERSITY',
                    criteria_value: 5,
                    xp_value: 30,
                    points_reward: 100,
                    is_hidden: false
                },
                {
                    name: 'Fitness Enthusiast',
                    description: 'Complete 50 fitness-related habits',
                    icon: 'dumbbell',
                    badge_image: '/badges/fitness.png',
                    criteria_type: 'DOMAIN_MASTERY',
                    criteria_value: 50,
                    xp_value: 60,
                    points_reward: 200,
                    is_hidden: false,
                    metadata: JSON.stringify({ domain_id: 1 }) // Assuming 1 is the fitness domain
                },
                {
                    name: 'Mindfulness Guru',
                    description: 'Complete 50 mindfulness-related habits',
                    icon: 'brain',
                    badge_image: '/badges/mindfulness.png',
                    criteria_type: 'DOMAIN_MASTERY',
                    criteria_value: 50,
                    xp_value: 60,
                    points_reward: 200,
                    is_hidden: false,
                    metadata: JSON.stringify({ domain_id: 2 }) // Assuming 2 is the mindfulness domain
                },
                {
                    name: 'Social Butterfly',
                    description: 'Connect with 5 friends on HabitPulse',
                    icon: 'users',
                    badge_image: '/badges/social.png',
                    criteria_type: 'SOCIAL_ENGAGEMENT',
                    criteria_value: 5,
                    xp_value: 40,
                    points_reward: 150,
                    is_hidden: false,
                    metadata: JSON.stringify({ engagement_type: 'friends' })
                }
            ];

            // Check if there are any existing achievements
            const existingCount = await prisma.achievement.count();

            if (existingCount === 0) {
                // Create all achievements
                await prisma.achievement.createMany({
                    data: defaultAchievements
                });

                console.log(`Successfully seeded ${defaultAchievements.length} default achievements.`);
                return { success: true, count: defaultAchievements.length };
            } else {
                console.log('Achievements already exist in the database, skipping seed.');
                return { success: true, count: 0, skipped: true };
            }
        } catch (error) {
            console.error(`Error seeding achievements: ${error.message}`);
            throw error;
        }
    }
}

// Export an instance of the controller so it can be used as a singleton
const achievementController = new AchievementController();
module.exports = achievementController;