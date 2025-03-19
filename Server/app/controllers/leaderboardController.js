// src/controllers/leaderboardController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get leaderboard data for user points (weekly or monthly)
 * Shows users with highest points earned in the specified timeframe
 */
const getPointsLeaderboard = async (req, res) => {
    try {
        const { timeframe = 'weekly', limit = 10 } = req.query;
        const userId = parseInt(req.user);

        // Determine date range based on timeframe
        const endDate = new Date(); // Today
        let startDate = new Date();

        if (timeframe === 'weekly') {
            // Set to beginning of current week (Sunday)
            const day = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            startDate.setDate(startDate.getDate() - day);
        } else if (timeframe === 'monthly') {
            // Set to beginning of current month
            startDate.setDate(1);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid timeframe. Use "weekly" or "monthly"'
            });
        }

        // Reset hours to start of day
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        console.log(`Fetching points leaderboard from ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // Get users with their completions to calculate points in the timeframe
        const userCompletions = await prisma.habitLog.groupBy({
            by: ['user_id'],
            where: {
                completed_at: {
                    gte: startDate,
                    lte: endDate
                },
                completed: true,
                skipped: false
            },
            _count: {
                log_id: true
            }
        });

        // Create a map of user completion counts
        const completionsMap = {};
        userCompletions.forEach(item => {
            completionsMap[item.user_id] = item._count.log_id;
        });

        // Get top users by overall points
        const users = await prisma.user.findMany({
            select: {
                user_id: true,
                user_name: true,
                avatar: true,
                points_gained: true,
                totalHabitsCompleted: true,
                currentDailyStreak: true,
                longestDailyStreak: true
            },
            orderBy: {
                points_gained: 'desc'
            },
            take: parseInt(limit)
        });

        // Format the leaderboard data
        const leaderboardData = users.map((user, index) => {
            const recentCompletions = completionsMap[user.user_id] || 0;

            return {
                rank: index + 1,
                user_id: user.user_id,
                user_name: user.user_name,
                avatar: user.avatar,
                points: user.points_gained,
                totalCompletions: user.totalHabitsCompleted,
                currentStreak: user.currentDailyStreak,
                longestStreak: user.longestDailyStreak,
                recentCompletions: recentCompletions,
                isCurrentUser: user.user_id === userId
            };
        });

        // Get current user's position if not in top results
        let currentUserData = leaderboardData.find(item => item.user_id === userId);

        if (!currentUserData && userId) {
            const userData = await prisma.user.findUnique({
                where: { user_id: userId },
                select: {
                    user_id: true,
                    user_name: true,
                    avatar: true,
                    points_gained: true,
                    totalHabitsCompleted: true,
                    currentDailyStreak: true,
                    longestDailyStreak: true
                }
            });

            if (userData) {
                // Count users with more points to determine rank
                const higherRankedUsers = await prisma.user.count({
                    where: {
                        points_gained: {
                            gt: userData.points_gained
                        }
                    }
                });

                const recentCompletions = completionsMap[userData.user_id] || 0;

                currentUserData = {
                    rank: higherRankedUsers + 1,
                    user_id: userData.user_id,
                    user_name: userData.user_name,
                    avatar: userData.avatar,
                    points: userData.points_gained,
                    totalCompletions: userData.totalHabitsCompleted,
                    currentStreak: userData.currentDailyStreak,
                    longestStreak: userData.longestDailyStreak,
                    recentCompletions: recentCompletions,
                    isCurrentUser: true
                };
            }
        }

        return res.status(200).json({
            success: true,
            timeframe,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            data: leaderboardData,
            currentUser: currentUserData || null
        });
    } catch (error) {
        console.error('Error fetching points leaderboard:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve points leaderboard data',
            error: error.message
        });
    }
};

/**
 * Get top streaks leaderboard
 * Shows users with longest current streaks
 */
const getStreaksLeaderboard = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const userId = parseInt(req.user);

        // Get users with top streaks
        const users = await prisma.user.findMany({
            where: {
                currentDailyStreak: {
                    gt: 0
                }
            },
            select: {
                user_id: true,
                user_name: true,
                avatar: true,
                points_gained: true, // Include points for consistency
                currentDailyStreak: true,
                longestDailyStreak: true,
                totalHabitsCompleted: true
            },
            orderBy: {
                currentDailyStreak: 'desc'
            },
            take: parseInt(limit)
        });

        // Format the leaderboard data
        const leaderboardData = users.map((user, index) => {
            return {
                rank: index + 1,
                user_id: user.user_id,
                user_name: user.user_name,
                avatar: user.avatar,
                points: user.points_gained,
                currentStreak: user.currentDailyStreak,
                longestStreak: user.longestDailyStreak,
                totalCompletions: user.totalHabitsCompleted,
                isCurrentUser: user.user_id === userId
            };
        });

        // Get current user's position if not in top results
        let currentUserData = leaderboardData.find(item => item.user_id === userId);

        if (!currentUserData && userId) {
            const userData = await prisma.user.findUnique({
                where: { user_id: userId },
                select: {
                    user_id: true,
                    user_name: true,
                    avatar: true,
                    points_gained: true,
                    currentDailyStreak: true,
                    longestDailyStreak: true,
                    totalHabitsCompleted: true
                }
            });

            if (userData) {
                // Count users with longer streaks to determine rank
                const higherRankedUsers = await prisma.user.count({
                    where: {
                        currentDailyStreak: {
                            gt: userData.currentDailyStreak
                        }
                    }
                });

                currentUserData = {
                    rank: higherRankedUsers + 1,
                    user_id: userData.user_id,
                    user_name: userData.user_name,
                    avatar: userData.avatar,
                    points: userData.points_gained,
                    currentStreak: userData.currentDailyStreak,
                    longestStreak: userData.longestDailyStreak,
                    totalCompletions: userData.totalHabitsCompleted,
                    isCurrentUser: true
                };
            }
        }

        return res.status(200).json({
            success: true,
            data: leaderboardData,
            currentUser: currentUserData || null
        });
    } catch (error) {
        console.error('Error fetching streak leaderboard:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve streak leaderboard data',
            error: error.message
        });
    }
};

/**
 * Get domain activity leaderboard
 * Shows which categories/domains have the most activity
 */
const getDomainLeaderboard = async (req, res) => {
    try {
        const { timeframe = 'weekly', limit = 10 } = req.query;
        const userId = parseInt(req.user);

        // Determine date range based on timeframe
        const endDate = new Date(); // Today
        let startDate = new Date();

        if (timeframe === 'weekly') {
            // Set to beginning of current week (Sunday)
            const day = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
            startDate.setDate(startDate.getDate() - day);
        } else if (timeframe === 'monthly') {
            // Set to beginning of current month
            startDate.setDate(1);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid timeframe. Use "weekly" or "monthly"'
            });
        }

        // Reset hours to start of day
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // Get habit logs grouped by domain
        const domainActivity = await prisma.$queryRaw`
            SELECT
                d.domain_id,
                d.name,
                d.color,
                d.icon,
                COUNT(hl.log_id) as completion_count,
                COUNT(DISTINCT h.habit_id) as habit_count,
                COUNT(DISTINCT hl.user_id) as user_count
            FROM
                "HabitLog" hl
                    JOIN
                "Habit" h ON hl.habit_id = h.habit_id
                    JOIN
                "HabitDomain" d ON h.domain_id = d.domain_id
            WHERE
                hl.completed_at >= ${startDate} AND
                hl.completed_at <= ${endDate} AND
                hl.completed = true AND
                hl.skipped = false
            GROUP BY
                d.domain_id, d.name, d.color, d.icon
            ORDER BY
                completion_count DESC
                LIMIT
                ${parseInt(limit)}
        `;

        // Format the leaderboard data
        const leaderboardData = domainActivity.map((domain, index) => {
            return {
                rank: index + 1,
                domain_id: domain.domain_id,
                name: domain.name,
                color: domain.color,
                icon: domain.icon,
                completions: parseInt(domain.completion_count),
                habitCount: parseInt(domain.habit_count),
                userCount: parseInt(domain.user_count)
            };
        });

        // Get user's most active domain for comparison
        const userMostActiveDomain = await prisma.$queryRaw`
            SELECT
                d.domain_id,
                d.name,
                d.color,
                d.icon,
                COUNT(hl.log_id) as completion_count
            FROM
                "HabitLog" hl
                    JOIN
                "Habit" h ON hl.habit_id = h.habit_id
                    JOIN
                "HabitDomain" d ON h.domain_id = d.domain_id
            WHERE
                hl.completed_at >= ${startDate} AND
                hl.completed_at <= ${endDate} AND
                hl.completed = true AND
                hl.skipped = false AND
                hl.user_id = ${userId}
            GROUP BY
                d.domain_id, d.name, d.color, d.icon
            ORDER BY
                completion_count DESC
                LIMIT 1
        `;

        let userDomainData = null;
        if (userMostActiveDomain && userMostActiveDomain.length > 0) {
            const domain = userMostActiveDomain[0];

            // Find this domain's global rank
            const domainRank = await prisma.$queryRaw`
                SELECT
                    COUNT(*) + 1 as rank
                FROM
                    (
                        SELECT
                            d.domain_id,
                            COUNT(hl.log_id) as completion_count
                        FROM
                            "HabitLog" hl
                                JOIN
                            "Habit" h ON hl.habit_id = h.habit_id
                                JOIN
                            "HabitDomain" d ON h.domain_id = d.domain_id
                        WHERE
                            hl.completed_at >= ${startDate} AND
                            hl.completed_at <= ${endDate} AND
                            hl.completed = true AND
                            hl.skipped = false
                        GROUP BY
                            d.domain_id
                        HAVING
                            COUNT(hl.log_id) > ${parseInt(domain.completion_count)}
                    ) as higher_ranked
            `;

            userDomainData = {
                rank: parseInt(domainRank[0].rank),
                domain_id: domain.domain_id,
                name: domain.name,
                color: domain.color,
                icon: domain.icon,
                completions: parseInt(domain.completion_count)
            };
        }

        return res.status(200).json({
            success: true,
            timeframe,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            data: leaderboardData,
            userTopDomain: userDomainData
        });
    } catch (error) {
        console.error('Error fetching domain leaderboard:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve domain leaderboard data',
            error: error.message
        });
    }
};

/**
 * Get real-time leaderboard updates
 * Can be used with server-sent events or websockets for live updates
 */
const getRealTimeLeaderboard = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const userId = parseInt(req.user);

        // Get users with highest points
        const users = await prisma.user.findMany({
            select: {
                user_id: true,
                user_name: true,
                avatar: true,
                points_gained: true,
                currentDailyStreak: true,
                totalHabitsCompleted: true,
                lastActive: true
            },
            orderBy: {
                points_gained: 'desc'
            },
            take: parseInt(limit)
        });

        // Format the leaderboard data with real-time indicators
        const leaderboardData = users.map((user, index) => {
            // Calculate if user is active (active in last 10 minutes)
            const isActive = new Date(user.lastActive) > new Date(Date.now() - 10 * 60 * 1000);

            return {
                rank: index + 1,
                user_id: user.user_id,
                user_name: user.user_name,
                avatar: user.avatar,
                points: user.points_gained,
                currentStreak: user.currentDailyStreak,
                totalCompletions: user.totalHabitsCompleted,
                isActive: isActive,
                lastActive: user.lastActive,
                isCurrentUser: user.user_id === userId
            };
        });

        // Get current user's position if not in top results
        let currentUserData = leaderboardData.find(item => item.user_id === userId);

        if (!currentUserData && userId) {
            const userData = await prisma.user.findUnique({
                where: { user_id: userId },
                select: {
                    user_id: true,
                    user_name: true,
                    avatar: true,
                    points_gained: true,
                    currentDailyStreak: true,
                    totalHabitsCompleted: true,
                    lastActive: true
                }
            });

            if (userData) {
                // Count users with more points to determine rank
                const higherRankedUsers = await prisma.user.count({
                    where: {
                        points_gained: {
                            gt: userData.points_gained
                        }
                    }
                });

                const isActive = new Date(userData.lastActive) > new Date(Date.now() - 10 * 60 * 1000);

                currentUserData = {
                    rank: higherRankedUsers + 1,
                    user_id: userData.user_id,
                    user_name: userData.user_name,
                    avatar: userData.avatar,
                    points: userData.points_gained,
                    currentStreak: userData.currentDailyStreak,
                    totalCompletions: userData.totalHabitsCompleted,
                    isActive: isActive,
                    lastActive: userData.lastActive,
                    isCurrentUser: true
                };
            }
        }

        return res.status(200).json({
            success: true,
            lastUpdated: new Date().toISOString(),
            data: leaderboardData,
            currentUser: currentUserData || null
        });
    } catch (error) {
        console.error('Error fetching real-time leaderboard:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve real-time leaderboard data',
            error: error.message
        });
    }
};

module.exports = {
    getPointsLeaderboard,
    getStreaksLeaderboard,
    getDomainLeaderboard,
    getRealTimeLeaderboard
};