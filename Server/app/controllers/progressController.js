const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class progressController {
    static async addAchievementProgress(userId, achievementId, progressAmount) {
        try {
            // First, get the achievement details
            const achievement = await prisma.achievement.findUnique({
                where: { achievement_id: achievementId }
            });

            if (!achievement) {
                throw new Error(`Achievement with ID ${achievementId} not found`);
            }

            // Check if user already has this achievement
            const existingUserAchievement = await prisma.userAchievement.findFirst({
                where: {
                    user_id: userId,
                    achievement_id: achievementId
                }
            });

            if (existingUserAchievement) {
                // User already has this achievement, no need to track progress
                return {
                    success: false,
                    message: 'Achievement already awarded',
                    alreadyAwarded: true
                };
            }

            // Find or create achievement progress record
            const progressRecord = await prisma.achievementProgress.upsert({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievementId
                    }
                },
                update: {
                    current_value: {
                        increment: progressAmount
                    },
                    percent_complete: {
                        // Calculate percentage, capped at 100
                        set: Math.min(
                            100,
                            Math.floor(
                                ((this.getCurrentValue() + progressAmount) / achievement.criteria_value) * 100
                            )
                        )
                    },
                    last_updated: new Date()
                },
                create: {
                    user_id: userId,
                    achievement_id: achievementId,
                    current_value: progressAmount,
                    target_value: achievement.criteria_value,
                    percent_complete: Math.min(
                        100,
                        Math.floor((progressAmount / achievement.criteria_value) * 100)
                    ),
                    last_updated: new Date()
                },
                select: {
                    current_value: true,
                    percent_complete: true
                }
            });

            // Check if achievement is now complete
            if (progressRecord.current_value >= achievement.criteria_value) {
                // Award the achievement
                const awardResult = await this.awardAchievement(userId, achievementId);

                return {
                    success: true,
                    message: 'Achievement completed and awarded',
                    progressRecord,
                    awardResult
                };
            }

            return {
                success: true,
                message: 'Progress added successfully',
                progressRecord
            };
        } catch (error) {
            console.error(`Error adding achievement progress: ${error.message}`);
            return {
                success: false,
                message: error.message
            };
        }
    }


    static async awardAchievement(userId, achievementId, options = {}) {
        try {
            // Get achievement details
            const achievement = await prisma.achievement.findUnique({
                where: { achievement_id: achievementId }
            });

            if (!achievement) {
                throw new Error(`Achievement with ID ${achievementId} not found`);
            }

            // Check if user already has this achievement
            const existingUserAchievement = await prisma.userAchievement.findFirst({
                where: {
                    user_id: userId,
                    achievement_id: achievementId
                }
            });

            if (existingUserAchievement) {
                return {
                    success: false,
                    message: 'Achievement already awarded',
                    alreadyAwarded: true
                };
            }

            // Award the achievement
            const userAchievement = await prisma.$transaction(async (prisma) => {
                // Create user achievement record
                const newUserAchievement = await prisma.userAchievement.create({
                    data: {
                        user_id: userId,
                        achievement_id: achievementId,
                        awarded_at: new Date(),
                        metadata: options.metadata ? JSON.stringify(options.metadata) : undefined
                    }
                });

                // Remove any existing progress records
                await prisma.achievementProgress.deleteMany({
                    where: {
                        user_id: userId,
                        achievement_id: achievementId
                    }
                });

                // Award points if applicable
                if (achievement.points_reward > 0) {
                    await prisma.user.update({
                        where: { user_id: userId },
                        data: {
                            total_points: {
                                increment: achievement.points_reward
                            }
                        }
                    });

                    // Log points transaction
                    await prisma.pointsTransaction.create({
                        data: {
                            user_id: userId,
                            points: achievement.points_reward,
                            type: 'ACHIEVEMENT_REWARD',
                            description: `Awarded for achievement: ${achievement.name}`,
                            created_at: new Date()
                        }
                    });
                }

                // Create a notification
                await prisma.notification.create({
                    data: {
                        user_id: userId,
                        title: 'Achievement Unlocked! 🏆',
                        content: `You've earned "${achievement.name}": ${achievement.description}${
                            achievement.points_reward ? ` (+${achievement.points_reward} points)` : ''
                        }`,
                        type: 'ACHIEVEMENT_UNLOCKED',
                        related_id: achievementId,
                        action_url: '/achievements'
                    }
                });

                return newUserAchievement;
            });

            return {
                success: true,
                message: 'Achievement awarded successfully',
                achievement: userAchievement
            };
        } catch (error) {
            console.error(`Error awarding achievement: ${error.message}`);
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Bulk add progress to multiple achievements
     * @param {string} userId - The ID of the user
     * @param {Array} progressUpdates - Array of progress updates
     * @returns {Promise<Object>} Bulk progress update result
     */
    static async bulkAddAchievementProgress(userId, progressUpdates) {
        const results = [];

        for (const update of progressUpdates) {
            const result = await this.addAchievementProgress(
                userId,
                update.achievementId,
                update.progressAmount
            );
            results.push(result);
        }

        return {
            success: true,
            results,
            totalUpdates: results.length,
            successfulUpdates: results.filter(r => r.success).length
        };
    }

    /**
     * Get current progress for a specific achievement
     * @param {string} userId - The ID of the user
     * @param {string} achievementId - The ID of the achievement
     * @returns {Promise<Object>} Current progress details
     */
    static async getAchievementProgress(userId, achievementId) {
        try {
            const progressRecord = await prisma.achievementProgress.findUnique({
                where: {
                    user_id_achievement_id: {
                        user_id: userId,
                        achievement_id: achievementId
                    }
                },
                include: {
                    achievement: true
                }
            });

            if (!progressRecord) {
                // Check if achievement is already awarded
                const userAchievement = await prisma.userAchievement.findFirst({
                    where: {
                        user_id: userId,
                        achievement_id: achievementId
                    },
                    include: {
                        achievement: true
                    }
                });

                if (userAchievement) {
                    return {
                        status: 'COMPLETED',
                        achievement: userAchievement.achievement,
                        awardedAt: userAchievement.awarded_at
                    };
                }

                // No progress or award found
                return {
                    status: 'NOT_STARTED',
                    achievement: await prisma.achievement.findUnique({
                        where: { achievement_id: achievementId }
                    })
                };
            }

            return {
                status: 'IN_PROGRESS',
                ...progressRecord
            };
        } catch (error) {
            console.error(`Error retrieving achievement progress: ${error.message}`);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = progressController;