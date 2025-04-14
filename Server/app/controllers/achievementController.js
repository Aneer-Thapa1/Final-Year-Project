const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all achievements for a user, including both achieved and in-progress
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getUserAchievements = async (req, res) => {
    try {
        const userId = parseInt(req.user); // Assuming user ID is available from auth middleware

        // 1. Get all achievements from the system
        const allAchievements = await prisma.achievement.findMany({
            orderBy: {
                criteria_type: 'asc'
            }
        });

        // 2. Get user's unlocked achievements
        const userAchievements = await prisma.userAchievement.findMany({
            where: {
                user_id: userId
            },
            include: {
                achievement: true
            },
            orderBy: {
                unlocked_at: 'desc'
            }
        });

        // 3. Get user's achievement progress
        const achievementProgress = await prisma.achievementProgress.findMany({
            where: {
                user_id: userId
            }
        });

        // 4. Create a map of achievement IDs to their progress
        const progressMap = achievementProgress.reduce((map, progress) => {
            map[progress.achievement_id] = progress;
            return map;
        }, {});

        // 5. Create a map of achievement IDs to their unlocked status
        const unlockedMap = userAchievements.reduce((map, userAchievement) => {
            map[userAchievement.achievement_id] = {
                unlocked: true,
                unlocked_at: userAchievement.unlocked_at,
                points_awarded: userAchievement.points_awarded
            };
            return map;
        }, {});

        // 6. Combine the data into a comprehensive response
        const achievementsData = allAchievements.map(achievement => {
            const progress = progressMap[achievement.achievement_id] || {
                current_value: 0,
                target_value: achievement.criteria_value,
                percent_complete: 0
            };

            const unlocked = unlockedMap[achievement.achievement_id] || {
                unlocked: false,
                unlocked_at: null,
                points_awarded: 0
            };

            return {
                achievement_id: achievement.achievement_id,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                badge_image: achievement.badge_image,
                criteria_type: achievement.criteria_type,
                criteria_value: achievement.criteria_value,
                xp_value: achievement.xp_value,
                points_reward: achievement.points_reward,
                is_hidden: achievement.is_hidden && !unlocked.unlocked, // Only hide if not unlocked
                progress: {
                    current_value: progress.current_value,
                    target_value: progress.target_value,
                    percent_complete: progress.percent_complete,
                    last_updated: progress.last_updated
                },
                unlocked: unlocked.unlocked,
                unlocked_at: unlocked.unlocked_at,
                points_awarded: unlocked.points_awarded
            };
        });

        // 7. Calculate summary statistics
        const totalAchievements = allAchievements.length;
        const unlockedAchievements = userAchievements.length;
        const unlockedPercentage = totalAchievements > 0
            ? Math.round((unlockedAchievements / totalAchievements) * 100)
            : 0;
        const totalPointsEarned = userAchievements.reduce(
            (sum, achievement) => sum + achievement.points_awarded,
            0
        );

        // Group achievements by type
        const achievementsByType = achievementsData.reduce((groups, achievement) => {
            const type = achievement.criteria_type;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(achievement);
            return groups;
        }, {});

        // 8. Get recent achievements (last 5)
        const recentAchievements = userAchievements
            .slice(0, 5)
            .map(ua => ({
                achievement_id: ua.achievement.achievement_id,
                name: ua.achievement.name,
                description: ua.achievement.description,
                icon: ua.achievement.icon,
                badge_image: ua.achievement.badge_image,
                unlocked_at: ua.unlocked_at,
                points_awarded: ua.points_awarded
            }));

        // 9. Get upcoming achievements (close to unlocking)
        const upcomingAchievements = achievementsData
            .filter(a => !a.unlocked && a.progress.percent_complete >= 70 && a.progress.percent_complete < 100)
            .sort((a, b) => b.progress.percent_complete - a.progress.percent_complete)
            .slice(0, 5);

        return res.status(200).json({
            success: true,
            data: {
                summary: {
                    total: totalAchievements,
                    unlocked: unlockedAchievements,
                    percentage: unlockedPercentage,
                    total_points_earned: totalPointsEarned
                },
                achievements: achievementsData,
                by_type: achievementsByType,
                recent: recentAchievements,
                upcoming: upcomingAchievements
            }
        });

    } catch (error) {
        console.error('Error fetching user achievements:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch achievements',
            error: error.message
        });
    }
};

/**
 * Get achievement details by ID
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getAchievementDetails = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const achievementId = parseInt(req.params.id);

        // Get the achievement
        const achievement = await prisma.achievement.findUnique({
            where: { achievement_id: achievementId }
        });

        if (!achievement) {
            return res.status(404).json({
                success: false,
                message: 'Achievement not found'
            });
        }

        // Check if the user has unlocked this achievement
        const userAchievement = await prisma.userAchievement.findUnique({
            where: {
                user_id_achievement_id: {
                    user_id: userId,
                    achievement_id: achievementId
                }
            }
        });

        // Get progress for this achievement
        const progress = await prisma.achievementProgress.findUnique({
            where: {
                user_id_achievement_id: {
                    user_id: userId,
                    achievement_id: achievementId
                }
            }
        });

        // Get progress history (if available)
        const progressHistory = await prisma.$queryRaw`
            SELECT * FROM achievement_progress_history
            WHERE user_id = ${userId} AND achievement_id = ${achievementId}
            ORDER BY recorded_at ASC
        `.catch(() => []);  // If table doesn't exist, return empty array

        // Combine all data
        const achievementData = {
            ...achievement,
            unlocked: !!userAchievement,
            unlocked_at: userAchievement?.unlocked_at || null,
            points_awarded: userAchievement?.points_awarded || 0,
            progress: progress ? {
                current_value: progress.current_value,
                target_value: progress.target_value,
                percent_complete: progress.percent_complete,
                last_updated: progress.last_updated
            } : {
                current_value: 0,
                target_value: achievement.criteria_value,
                percent_complete: 0,
                last_updated: null
            },
            history: progressHistory
        };

        return res.status(200).json({
            success: true,
            data: achievementData
        });

    } catch (error) {
        console.error('Error fetching achievement details:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch achievement details',
            error: error.message
        });
    }
};

/**
 * Get achievements by type
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getAchievementsByType = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { type } = req.params;

        // Validate type
        const validTypes = [
            'STREAK_LENGTH', 'TOTAL_COMPLETIONS', 'CONSECUTIVE_DAYS',
            'PERFECT_WEEK', 'PERFECT_MONTH', 'HABIT_DIVERSITY',
            'DOMAIN_MASTERY', 'SOCIAL_ENGAGEMENT'
        ];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid achievement type'
            });
        }

        // Get achievements of the specified type
        const achievements = await prisma.achievement.findMany({
            where: { criteria_type: type }
        });

        // Get user's unlocked achievements
        const userAchievements = await prisma.userAchievement.findMany({
            where: {
                user_id: userId,
                achievement: {
                    criteria_type: type
                }
            }
        });

        // Get user's achievement progress
        const achievementProgress = await prisma.achievementProgress.findMany({
            where: {
                user_id: userId,
                achievement: {
                    criteria_type: type
                }
            }
        });

        // Create maps for quick lookup
        const unlockedMap = userAchievements.reduce((map, ua) => {
            map[ua.achievement_id] = {
                unlocked: true,
                unlocked_at: ua.unlocked_at,
                points_awarded: ua.points_awarded
            };
            return map;
        }, {});

        const progressMap = achievementProgress.reduce((map, progress) => {
            map[progress.achievement_id] = progress;
            return map;
        }, {});

        // Combine data
        const achievementsData = achievements.map(achievement => {
            const unlocked = unlockedMap[achievement.achievement_id] || {
                unlocked: false,
                unlocked_at: null,
                points_awarded: 0
            };

            const progress = progressMap[achievement.achievement_id] || {
                current_value: 0,
                target_value: achievement.criteria_value,
                percent_complete: 0
            };

            return {
                achievement_id: achievement.achievement_id,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                badge_image: achievement.badge_image,
                criteria_type: achievement.criteria_type,
                criteria_value: achievement.criteria_value,
                points_reward: achievement.points_reward,
                is_hidden: achievement.is_hidden && !unlocked.unlocked,
                progress: {
                    current_value: progress.current_value,
                    target_value: progress.target_value,
                    percent_complete: progress.percent_complete,
                    last_updated: progress.last_updated
                },
                unlocked: unlocked.unlocked,
                unlocked_at: unlocked.unlocked_at,
                points_awarded: unlocked.points_awarded
            };
        });

        return res.status(200).json({
            success: true,
            data: achievementsData
        });

    } catch (error) {
        console.error('Error fetching achievements by type:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch achievements by type',
            error: error.message
        });
    }
};

/**
 * Get recently unlocked achievements
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getRecentAchievements = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const limit = parseInt(req.query.limit) || 5;

        const recentAchievements = await prisma.userAchievement.findMany({
            where: {
                user_id: userId
            },
            orderBy: {
                unlocked_at: 'desc'
            },
            take: limit,
            include: {
                achievement: true
            }
        });

        const formattedAchievements = recentAchievements.map(ua => ({
            achievement_id: ua.achievement.achievement_id,
            name: ua.achievement.name,
            description: ua.achievement.description,
            icon: ua.achievement.icon,
            badge_image: ua.achievement.badge_image,
            criteria_type: ua.achievement.criteria_type,
            points_awarded: ua.points_awarded,
            unlocked_at: ua.unlocked_at
        }));

        return res.status(200).json({
            success: true,
            data: formattedAchievements
        });

    } catch (error) {
        console.error('Error fetching recent achievements:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch recent achievements',
            error: error.message
        });
    }
};

/**
 * Get upcoming achievements (close to being unlocked)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getUpcomingAchievements = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const threshold = parseInt(req.query.threshold) || 70;
        const limit = parseInt(req.query.limit) || 5;

        // Get achievements the user hasn't unlocked yet
        const userAchievementIds = await prisma.userAchievement.findMany({
            where: { user_id: userId },
            select: { achievement_id: true }
        });

        const unlockedIds = userAchievementIds.map(ua => ua.achievement_id);

        // Get progress for achievements not yet unlocked
        const progress = await prisma.achievementProgress.findMany({
            where: {
                user_id: userId,
                percent_complete: {
                    gte: threshold,
                    lt: 100
                },
                achievement_id: {
                    notIn: unlockedIds
                }
            },
            orderBy: {
                percent_complete: 'desc'
            },
            take: limit,
            include: {
                achievement: true
            }
        });

        const upcomingAchievements = progress.map(p => ({
            achievement_id: p.achievement.achievement_id,
            name: p.achievement.name,
            description: p.achievement.description,
            icon: p.achievement.icon,
            badge_image: p.achievement.badge_image,
            criteria_type: p.achievement.criteria_type,
            criteria_value: p.achievement.criteria_value,
            points_reward: p.achievement.points_reward,
            progress: {
                current_value: p.current_value,
                target_value: p.target_value,
                percent_complete: p.percent_complete,
                last_updated: p.last_updated
            }
        }));

        return res.status(200).json({
            success: true,
            data: upcomingAchievements
        });

    } catch (error) {
        console.error('Error fetching upcoming achievements:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming achievements',
            error: error.message
        });
    }
};

/**
 * Get achievement statistics
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getAchievementStats = async (req, res) => {
    try {
        const userId = parseInt(req.user);

        // Get total achievements count
        const totalAchievements = await prisma.achievement.count();

        // Get unlocked achievements count
        const unlockedAchievements = await prisma.userAchievement.count({
            where: { user_id: userId }
        });

        // Get total points from achievements
        const pointsResult = await prisma.userAchievement.aggregate({
            where: { user_id: userId },
            _sum: { points_awarded: true }
        });
        const totalPoints = pointsResult._sum.points_awarded || 0;

        // Get all user achievements with their types
        const userAchievementsWithTypes = await prisma.userAchievement.findMany({
            where: { user_id: userId },
            include: { achievement: true }
        });

        // Manually calculate points by type
        const pointsByTypeMap = {};
        const countByTypeMap = {};

        userAchievementsWithTypes.forEach(ua => {
            const type = ua.achievement.criteria_type;
            if (!pointsByTypeMap[type]) pointsByTypeMap[type] = 0;
            if (!countByTypeMap[type]) countByTypeMap[type] = 0;

            pointsByTypeMap[type] += ua.points_awarded || 0;
            countByTypeMap[type] += 1;
        });

        // Get total achievements by type
        const totalByType = await prisma.achievement.groupBy({
            by: ['criteria_type'],
            _count: { achievement_id: true }
        });

        // Create a map for total counts by type
        const totalByTypeMap = totalByType.reduce((map, item) => {
            map[item.criteria_type] = item._count.achievement_id;
            return map;
        }, {});

        // Calculate percentages by type
        const percentagesByType = Object.keys(totalByTypeMap).map(type => ({
            type,
            total: totalByTypeMap[type] || 0,
            unlocked: countByTypeMap[type] || 0,
            percentage: totalByTypeMap[type]
                ? Math.round((countByTypeMap[type] || 0) / totalByTypeMap[type] * 100)
                : 0,
            points: pointsByTypeMap[type] || 0
        }));

        // Calculate recent activity
        const recentActivity = await prisma.userAchievement.findMany({
            where: { user_id: userId },
            orderBy: { unlocked_at: 'desc' },
            take: 5,
            include: { achievement: true }
        });

        const formattedRecentActivity = recentActivity.map(ua => ({
            achievement_id: ua.achievement_id,
            name: ua.achievement.name,
            unlocked_at: ua.unlocked_at,
            points_awarded: ua.points_awarded
        }));

        return res.status(200).json({
            success: true,
            data: {
                overall: {
                    total: totalAchievements,
                    unlocked: unlockedAchievements,
                    percentage: totalAchievements > 0
                        ? Math.round((unlockedAchievements / totalAchievements) * 100)
                        : 0,
                    total_points: totalPoints
                },
                by_type: percentagesByType,
                recent_activity: formattedRecentActivity
            }
        });

    } catch (error) {
        console.error('Error fetching achievement stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch achievement statistics',
            error: error.message
        });
    }
};

module.exports = {
    getUserAchievements,
    getAchievementDetails,
    getAchievementsByType,
    getRecentAchievements,
    getUpcomingAchievements,
    getAchievementStats
};