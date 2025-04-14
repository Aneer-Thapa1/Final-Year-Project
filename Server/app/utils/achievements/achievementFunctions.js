const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


// Function to check and update achievements when a habit is completed
const checkAndUpdateAchievements = async (userId, habitId, domainId) => {
    try {
        const unlockedAchievements = [];

        // 1. Update TOTAL_COMPLETIONS type achievements
        const totalCompletionsAchievements = await updateTotalCompletionsAchievements(userId);
        if (totalCompletionsAchievements.length > 0) {
            unlockedAchievements.push(...totalCompletionsAchievements);
        }

        // 2. Update STREAK_LENGTH type achievements if applicable
        const habitStreak = await prisma.habitStreak.findFirst({
            where: {
                habit_id: habitId,
                user_id: userId
            }
        });

        if (habitStreak && habitStreak.current_streak > 0) {
            const streakAchievements = await updateStreakAchievements(userId, habitStreak.current_streak);
            if (streakAchievements.length > 0) {
                unlockedAchievements.push(...streakAchievements);
            }
        }

        // 3. Update DOMAIN_MASTERY type achievements
        if (domainId) {
            const domainAchievements = await updateDomainMasteryAchievements(userId, domainId);
            if (domainAchievements.length > 0) {
                unlockedAchievements.push(...domainAchievements);
            }
        }

        // 4. Check for daily/weekly/monthly perfect completion
        const perfectAchievements = await checkPerfectCompletionAchievements(userId);
        if (perfectAchievements.length > 0) {
            unlockedAchievements.push(...perfectAchievements);
        }

        // 5. Update HABIT_DIVERSITY type achievements
        const diversityAchievements = await updateHabitDiversityAchievements(userId);
        if (diversityAchievements.length > 0) {
            unlockedAchievements.push(...diversityAchievements);
        }

        return unlockedAchievements;
    } catch (error) {
        console.error('Error checking and updating achievements:', error);
        return [];
    }
};

// Update total completions achievements
const updateTotalCompletionsAchievements = async (userId) => {
    try {
        // Get total completed habits
        const totalCompletions = await prisma.habitLog.count({
            where: {
                user_id: userId,
                completed: true
            }
        });

        // Get all TOTAL_COMPLETIONS type achievements
        const achievements = await prisma.achievement.findMany({
            where: {
                criteria_type: 'TOTAL_COMPLETIONS'
            }
        });

        const unlockedAchievements = [];

        // Check each achievement
        for (const achievement of achievements) {
            // Get current progress
            const progress = await prisma.achievementProgress.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id
                    }
                }
            });

            if (!progress) {
                // Create progress record if it doesn't exist
                await prisma.achievementProgress.create({
                    data: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id,
                        current_value: totalCompletions,
                        target_value: achievement.criteria_value,
                        percent_complete: Math.min(100, Math.floor((totalCompletions / achievement.criteria_value) * 100))
                    }
                });

                // Check if completed right away
                if (totalCompletions >= achievement.criteria_value) {
                    await awardAchievement(userId, achievement);
                    unlockedAchievements.push(achievement);
                }
                continue;
            }

            // Calculate new percentage
            const percentComplete = Math.min(100, Math.floor((totalCompletions / achievement.criteria_value) * 100));

            // Update progress
            await prisma.achievementProgress.update({
                where: {
                    id: progress.id
                },
                data: {
                    current_value: totalCompletions,
                    percent_complete: percentComplete,
                    last_updated: new Date()
                }
            });

            // Check if newly completed
            if (progress.percent_complete < 100 && percentComplete >= 100) {
                await awardAchievement(userId, achievement);
                unlockedAchievements.push(achievement);
            }
        }

        return unlockedAchievements;
    } catch (error) {
        console.error('Error updating total completions achievements:', error);
        return [];
    }
};

// Update streak-based achievements
const updateStreakAchievements = async (userId, currentStreak) => {
    try {
        // Get all STREAK_LENGTH type achievements
        const achievements = await prisma.achievement.findMany({
            where: {
                criteria_type: 'STREAK_LENGTH'
            }
        });

        const unlockedAchievements = [];

        // Check each achievement
        for (const achievement of achievements) {
            // Skip if streak is not long enough
            if (currentStreak < achievement.criteria_value) {
                continue;
            }

            // Check if already awarded
            const existingAward = await prisma.userAchievement.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id
                    }
                }
            });

            if (existingAward) {
                continue; // Already awarded
            }

            // Get or create progress
            let progress = await prisma.achievementProgress.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id
                    }
                }
            });

            if (!progress) {
                // Create progress record
                progress = await prisma.achievementProgress.create({
                    data: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id,
                        current_value: currentStreak,
                        target_value: achievement.criteria_value,
                        percent_complete: Math.min(100, Math.floor((currentStreak / achievement.criteria_value) * 100))
                    }
                });
            } else {
                // Update progress
                progress = await prisma.achievementProgress.update({
                    where: {
                        id: progress.id
                    },
                    data: {
                        current_value: currentStreak,
                        percent_complete: 100,
                        last_updated: new Date()
                    }
                });
            }

            // Award achievement
            await awardAchievement(userId, achievement);
            unlockedAchievements.push(achievement);
        }

        return unlockedAchievements;
    } catch (error) {
        console.error('Error updating streak achievements:', error);
        return [];
    }
};

// Update domain mastery achievements
const updateDomainMasteryAchievements = async (userId, domainId) => {
    try {
        // Get domain information
        const domain = await prisma.habitDomain.findUnique({
            where: { domain_id: domainId }
        });

        if (!domain) {
            return [];
        }

        // Count completions in this domain
        const domainCompletions = await prisma.habitLog.count({
            where: {
                user_id: userId,
                completed: true,
                habit: {
                    domain_id: domainId
                }
            }
        });

        // Get domain-specific achievements
        const achievements = await prisma.achievement.findMany({
            where: {
                criteria_type: 'DOMAIN_MASTERY',
                name: {
                    contains: domain.name
                }
            }
        });

        const unlockedAchievements = [];

        // Process each achievement
        for (const achievement of achievements) {
            // Get or create progress
            let progress = await prisma.achievementProgress.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id
                    }
                }
            });

            const percentComplete = Math.min(100, Math.floor((domainCompletions / achievement.criteria_value) * 100));

            if (!progress) {
                // Create progress record
                progress = await prisma.achievementProgress.create({
                    data: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id,
                        current_value: domainCompletions,
                        target_value: achievement.criteria_value,
                        percent_complete: percentComplete
                    }
                });
            } else {
                // Update progress
                progress = await prisma.achievementProgress.update({
                    where: {
                        id: progress.id
                    },
                    data: {
                        current_value: domainCompletions,
                        percent_complete: percentComplete,
                        last_updated: new Date()
                    }
                });
            }

            // Check if newly completed
            if ((progress.percent_complete < 100 && percentComplete >= 100) ||
                (domainCompletions >= achievement.criteria_value)) {

                // Check if already awarded
                const existingAward = await prisma.userAchievement.findUnique({
                    where: {
                        user_id_achievement_id: {
                            user_id: userId,
                            achievement_id: achievement.achievement_id
                        }
                    }
                });

                if (!existingAward) {
                    await awardAchievement(userId, achievement);
                    unlockedAchievements.push(achievement);
                }
            }
        }

        return unlockedAchievements;
    } catch (error) {
        console.error('Error updating domain mastery achievements:', error);
        return [];
    }
};

// Check for perfect completion achievements (daily, weekly, monthly)
const checkPerfectCompletionAchievements = async (userId) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all scheduled habits for today
        const todayScheduled = await prisma.habitDailyStatus.count({
            where: {
                user_id: userId,
                date: today,
                is_scheduled: true
            }
        });

        // Get completed habits for today
        const todayCompleted = await prisma.habitDailyStatus.count({
            where: {
                user_id: userId,
                date: today,
                is_completed: true
            }
        });

        // Perfect day if all scheduled habits were completed
        const isPerfectDay = todayScheduled > 0 && todayCompleted === todayScheduled;

        // Get start of week (Sunday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        // Get start of month
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        const unlockedAchievements = [];

        // Check for perfect week
        if (today.getDay() === 6 && isPerfectDay) { // If it's Saturday and today was perfect
            // Check if all previous days this week were perfect
            const weekStatuses = await prisma.habitDailyStatus.groupBy({
                by: ['date'],
                where: {
                    user_id: userId,
                    date: {
                        gte: startOfWeek,
                        lt: today // Exclude today
                    },
                    is_scheduled: true
                },
                _count: {
                    is_scheduled: true
                },
                _sum: {
                    is_completed: true
                }
            });

            // Perfect week if every day had 100% completion
            const isPerfectWeek = weekStatuses.every(
                day => day._sum.is_completed === day._count.is_scheduled
            );

            if (isPerfectWeek) {
                // Find PERFECT_WEEK achievement
                const weekAchievement = await prisma.achievement.findFirst({
                    where: {
                        criteria_type: 'PERFECT_WEEK'
                    }
                });

                if (weekAchievement) {
                    // Check if already awarded this week
                    const lastAward = await prisma.userAchievement.findFirst({
                        where: {
                            user_id: userId,
                            achievement_id: weekAchievement.achievement_id
                        },
                        orderBy: {
                            unlocked_at: 'desc'
                        }
                    });

                    // Only award if not already awarded this week
                    if (!lastAward || new Date(lastAward.unlocked_at) < startOfWeek) {
                        await awardAchievement(userId, weekAchievement);
                        unlockedAchievements.push(weekAchievement);
                    }
                }
            }
        }

        // Check for perfect month at month end
        const isLastDayOfMonth = today.getMonth() !== new Date(today.setDate(today.getDate() + 1)).getMonth();

        if (isLastDayOfMonth && isPerfectDay) {
            // Check all days this month
            const monthStatuses = await prisma.habitDailyStatus.groupBy({
                by: ['date'],
                where: {
                    user_id: userId,
                    date: {
                        gte: startOfMonth,
                        lt: today // Exclude today
                    },
                    is_scheduled: true
                },
                _count: {
                    is_scheduled: true
                },
                _sum: {
                    is_completed: true
                }
            });

            // Perfect month if every day had 100% completion
            const isPerfectMonth = monthStatuses.every(
                day => day._sum.is_completed === day._count.is_scheduled
            );

            if (isPerfectMonth) {
                // Find PERFECT_MONTH achievement
                const monthAchievement = await prisma.achievement.findFirst({
                    where: {
                        criteria_type: 'PERFECT_MONTH'
                    }
                });

                if (monthAchievement) {
                    // Check if already awarded this month
                    const lastAward = await prisma.userAchievement.findFirst({
                        where: {
                            user_id: userId,
                            achievement_id: monthAchievement.achievement_id
                        },
                        orderBy: {
                            unlocked_at: 'desc'
                        }
                    });

                    // Only award if not already awarded this month
                    if (!lastAward || new Date(lastAward.unlocked_at) < startOfMonth) {
                        await awardAchievement(userId, monthAchievement);
                        unlockedAchievements.push(monthAchievement);
                    }
                }
            }
        }

        return unlockedAchievements;
    } catch (error) {
        console.error('Error checking perfect completion achievements:', error);
        return [];
    }
};

// Update habit diversity achievements
const updateHabitDiversityAchievements = async (userId) => {
    try {
        // Count distinct active habits
        const activeHabitsCount = await prisma.habit.count({
            where: {
                user_id: userId,
                is_active: true
            }
        });

        // Get HABIT_DIVERSITY achievements
        const achievements = await prisma.achievement.findMany({
            where: {
                criteria_type: 'HABIT_DIVERSITY'
            }
        });

        const unlockedAchievements = [];

        // Process each achievement
        for (const achievement of achievements) {
            // Skip if not enough active habits
            if (activeHabitsCount < achievement.criteria_value) {
                continue;
            }

            // Get or create progress
            let progress = await prisma.achievementProgress.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id
                    }
                }
            });

            const percentComplete = Math.min(100, Math.floor((activeHabitsCount / achievement.criteria_value) * 100));

            if (!progress) {
                // Create progress record
                progress = await prisma.achievementProgress.create({
                    data: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id,
                        current_value: activeHabitsCount,
                        target_value: achievement.criteria_value,
                        percent_complete: percentComplete
                    }
                });
            } else {
                // Update progress
                progress = await prisma.achievementProgress.update({
                    where: {
                        id: progress.id
                    },
                    data: {
                        current_value: activeHabitsCount,
                        percent_complete: percentComplete,
                        last_updated: new Date()
                    }
                });
            }

            // Check if newly completed
            if (progress.percent_complete < 100 && percentComplete >= 100) {
                // Check if already awarded
                const existingAward = await prisma.userAchievement.findUnique({
                    where: {
                        user_id_achievement_id: {
                            user_id: userId,
                            achievement_id: achievement.achievement_id
                        }
                    }
                });

                if (!existingAward) {
                    await awardAchievement(userId, achievement);
                    unlockedAchievements.push(achievement);
                }
            }
        }

        return unlockedAchievements;
    } catch (error) {
        console.error('Error updating habit diversity achievements:', error);
        return [];
    }
};

// Helper function to award an achievement
const awardAchievement = async (userId, achievement) => {
    try {
        // Create user achievement record
        await prisma.userAchievement.create({
            data: {
                user_id: userId,
                achievement_id: achievement.achievement_id,
                points_awarded: achievement.points_reward,
                unlocked_at: new Date()
            }
        });

        // Add points to user
        await prisma.user.update({
            where: { user_id: userId },
            data: {
                points_gained: {
                    increment: achievement.points_reward
                }
            }
        });

        // Log points transaction
        await prisma.pointsLog.create({
            data: {
                user_id: userId,
                points: achievement.points_reward,
                reason: `Achievement unlocked: ${achievement.name}`,
                description: achievement.description,
                source_type: 'ACHIEVEMENT',
                source_id: achievement.achievement_id
            }
        });

        // Create notification
        await prisma.notification.create({
            data: {
                user_id: userId,
                title: 'Achievement Unlocked!',
                content: `You earned "${achievement.name}" (${achievement.points_reward} points): ${achievement.description}`,
                type: 'ACHIEVEMENT_UNLOCKED',
                related_id: achievement.achievement_id,
                action_url: '/achievements'
            }
        });

        console.log(`Achievement unlocked for user ${userId}: ${achievement.name}`);

        return true;
    } catch (error) {
        console.error('Error awarding achievement:', error);
        return false;
    }
};

// Update consecutive days achievements
const updateConsecutiveDaysAchievements = async (userId, streakLength) => {
    try {
        // Get all CONSECUTIVE_DAYS type achievements
        const achievements = await prisma.achievement.findMany({
            where: {
                criteria_type: 'CONSECUTIVE_DAYS'
            }
        });

        const unlockedAchievements = [];

        // Check each achievement
        for (const achievement of achievements) {
            // Skip if streak is not long enough
            if (streakLength < achievement.criteria_value) {
                continue;
            }

            // Check if already awarded
            const existingAward = await prisma.userAchievement.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id
                    }
                }
            });

            if (existingAward) {
                continue; // Already awarded
            }

            // Get or create progress
            let progress = await prisma.achievementProgress.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id
                    }
                }
            });

            if (!progress) {
                // Create progress record
                progress = await prisma.achievementProgress.create({
                    data: {
                        user_id: userId,
                        achievement_id: achievement.achievement_id,
                        current_value: streakLength,
                        target_value: achievement.criteria_value,
                        percent_complete: Math.min(100, Math.floor((streakLength / achievement.criteria_value) * 100))
                    }
                });
            } else {
                // Update progress
                progress = await prisma.achievementProgress.update({
                    where: {
                        id: progress.id
                    },
                    data: {
                        current_value: streakLength,
                        percent_complete: 100,
                        last_updated: new Date()
                    }
                });
            }

            // Award achievement
            await awardAchievement(userId, achievement);
            unlockedAchievements.push(achievement);
        }

        return unlockedAchievements;
    } catch (error) {
        console.error('Error updating consecutive days achievements:', error);
        return [];
    }
};
module.exports = {
    checkAndUpdateAchievements,
    updateTotalCompletionsAchievements,
    updateStreakAchievements,
    updateDomainMasteryAchievements,
    checkPerfectCompletionAchievements,
    updateHabitDiversityAchievements,
    updateConsecutiveDaysAchievements,
    awardAchievement
};