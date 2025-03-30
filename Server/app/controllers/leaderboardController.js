const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get leaderboard data for user points (weekly, monthly, or all-time)
 * Shows users with highest points earned in the specified timeframe
 */
const getPointsLeaderboard = async (req, res) => {
    try {
        const { timeframe = 'weekly', limit = 10, friendsOnly = false } = req.query;
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
        } else if (timeframe === 'allTime') {
            // No date filtering for all-time
            startDate = null;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid timeframe. Use "weekly", "monthly", or "allTime"'
            });
        }

        // Reset hours to start of day if we have a date range
        if (startDate) {
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            console.log(`Fetching points leaderboard from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        }

        // Build the where clause for querying completions
        const whereClause = {
            completed: true,
            skipped: false
        };

        // Add date range if not all-time
        if (startDate) {
            whereClause.completed_at = {
                gte: startDate,
                lte: endDate
            };
        }

        // Determine user selection (all users or just friends)
        let userSelection = {};

        if (friendsOnly === 'true' || friendsOnly === true) {
            // Get list of user's friends
            const friendRequests = await prisma.friendRequest.findMany({
                where: {
                    OR: [
                        { sender_id: userId },
                        { receiver_id: userId }
                    ],
                    status: 'ACCEPTED'
                }
            });

            // Extract friend IDs
            const friendIds = friendRequests.map(fr =>
                fr.sender_id === userId ? fr.receiver_id : fr.sender_id
            );

            // Add current user to the list
            friendIds.push(userId);

            // Modify user selection to only include friends
            userSelection = {
                user_id: {
                    in: friendIds
                }
            };
        }

        // Get completions to calculate points in the timeframe
        const userCompletions = await prisma.habitLog.groupBy({
            by: ['user_id'],
            where: {
                ...whereClause,
                ...userSelection
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
            where: userSelection,
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
            const points = timeframe === 'allTime'
                ? user.points_gained
                : recentCompletions * 10; // Simple points calculation for recent activity

            return {
                rank: index + 1,
                user_id: user.user_id,
                user_name: user.user_name,
                avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_name)}`,
                points: points,
                totalCompletions: user.totalHabitsCompleted,
                currentStreak: user.currentDailyStreak,
                longestStreak: user.longestDailyStreak,
                recentCompletions: recentCompletions,
                isCurrentUser: user.user_id === userId
            };
        });

        // Sort by points (specifically for weekly/monthly where we calculate)
        if (timeframe !== 'allTime') {
            leaderboardData.sort((a, b) => b.points - a.points);

            // Update ranks after sorting
            leaderboardData.forEach((item, index) => {
                item.rank = index + 1;
            });
        }

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
                const recentCompletions = completionsMap[userData.user_id] || 0;
                const points = timeframe === 'allTime'
                    ? userData.points_gained
                    : recentCompletions * 10;

                // Determine rank
                let higherRankedUsers;
                if (timeframe === 'allTime') {
                    higherRankedUsers = await prisma.user.count({
                        where: {
                            ...userSelection,
                            points_gained: {
                                gt: userData.points_gained
                            }
                        }
                    });
                } else {
                    // For weekly/monthly, we need to manually calculate
                    // This is simplified - in a real app, you might want to optimize this
                    higherRankedUsers = 0;

                    for (const userId in completionsMap) {
                        if (completionsMap[userId] * 10 > points) {
                            higherRankedUsers++;
                        }
                    }
                }

                currentUserData = {
                    rank: higherRankedUsers + 1,
                    user_id: userData.user_id,
                    user_name: userData.user_name,
                    avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.user_name)}`,
                    points: points,
                    totalCompletions: userData.totalHabitsCompleted,
                    currentStreak: userData.currentDailyStreak,
                    longestStreak: userData.longestDailyStreak,
                    recentCompletions: recentCompletions,
                    isCurrentUser: true
                };
            }
        }

        // Prepare metadata based on timeframe
        const metadata = {
            timeframe,
        };

        if (startDate) {
            metadata.startDate = startDate.toISOString().split('T')[0];
            metadata.endDate = endDate.toISOString().split('T')[0];
        }

        return res.status(200).json({
            success: true,
            ...metadata,
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
        const { limit = 10, friendsOnly = false } = req.query;
        const userId = parseInt(req.user);

        // Determine user selection (all users or just friends)
        let userSelection = {};

        if (friendsOnly === 'true' || friendsOnly === true) {
            // Get list of user's friends
            const friendRequests = await prisma.friendRequest.findMany({
                where: {
                    OR: [
                        { sender_id: userId },
                        { receiver_id: userId }
                    ],
                    status: 'ACCEPTED'
                }
            });

            // Extract friend IDs
            const friendIds = friendRequests.map(fr =>
                fr.sender_id === userId ? fr.receiver_id : fr.sender_id
            );
            // Add current user to the list
            friendIds.push(userId);

            // Modify user selection to only include friends
            userSelection = {
                user_id: {
                    in: friendIds
                }
            };
        }
        // Get users with top streaks
        const users = await prisma.user.findMany({
            where: {
                ...userSelection,
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
                avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_name)}`,
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

            if (userData && userData.currentDailyStreak > 0) {
                // Count users with longer streaks to determine rank
                const higherRankedUsers = await prisma.user.count({
                    where: {
                        ...userSelection,
                        currentDailyStreak: {
                            gt: userData.currentDailyStreak
                        }
                    }
                });

                currentUserData = {
                    rank: higherRankedUsers + 1,
                    user_id: userData.user_id,
                    user_name: userData.user_name,
                    avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.user_name)}`,
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
        } else if (timeframe === 'allTime') {
            // Use a very old date for "all time"
            startDate = new Date(2000, 0, 1);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid timeframe. Use "weekly", "monthly", or "allTime"'
            });
        }

        // Reset hours to start of day
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        try {
            // Use a simpler approach with normal Prisma queries to avoid SQL issues
            // First get all completed habit logs in the time period
            const completedLogs = await prisma.habitLog.findMany({
                where: {
                    completed_at: {
                        gte: startDate,
                        lte: endDate
                    },
                    completed: true,
                    skipped: false
                },
                include: {
                    habit: {
                        select: {
                            domain_id: true
                        }
                    }
                }
            });

            // Then aggregate the data manually
            const domainCompletions = {};
            const domainHabits = {};
            const domainUsers = {};

            // Populate domain maps with completion data
            for (const log of completedLogs) {
                const domainId = log.habit.domain_id;

                // Count completions
                if (!domainCompletions[domainId]) {
                    domainCompletions[domainId] = 0;
                }
                domainCompletions[domainId]++;

                // Count unique habits
                if (!domainHabits[domainId]) {
                    domainHabits[domainId] = new Set();
                }
                domainHabits[domainId].add(log.habit_id);

                // Count unique users
                if (!domainUsers[domainId]) {
                    domainUsers[domainId] = new Set();
                }
                domainUsers[domainId].add(log.user_id);
            }

            // Get domain details
            const domains = await prisma.habitDomain.findMany();

            // Map domain IDs to details
            const domainMap = {};
            domains.forEach(domain => {
                domainMap[domain.domain_id] = domain;
            });

            // Build the leaderboard data
            const leaderboardData = Object.keys(domainCompletions)
                .map(domainId => {
                    const domain = domainMap[domainId];
                    if (!domain) return null;

                    return {
                        domain_id: parseInt(domainId),
                        name: domain.name,
                        color: domain.color,
                        icon: domain.icon,
                        completions: domainCompletions[domainId],
                        habitCount: domainHabits[domainId]?.size || 0,
                        userCount: domainUsers[domainId]?.size || 0
                    };
                })
                .filter(item => item !== null)
                .sort((a, b) => b.completions - a.completions)
                .slice(0, parseInt(limit))
                .map((domain, index) => ({ ...domain, rank: index + 1 }));

            // Get user's most active domain
            let userDomainData = null;

            // First check if the user has any completions in this timeframe
            const userLogs = completedLogs.filter(log => log.user_id === userId);

            if (userLogs.length > 0) {
                // Count completions by domain for the user
                const userDomainCompletions = {};

                userLogs.forEach(log => {
                    const domainId = log.habit.domain_id;
                    if (!userDomainCompletions[domainId]) {
                        userDomainCompletions[domainId] = 0;
                    }
                    userDomainCompletions[domainId]++;
                });

                // Find the domain with the most completions
                let topDomainId = null;
                let maxCompletions = 0;

                for (const domainId in userDomainCompletions) {
                    if (userDomainCompletions[domainId] > maxCompletions) {
                        topDomainId = domainId;
                        maxCompletions = userDomainCompletions[domainId];
                    }
                }

                if (topDomainId) {
                    const domain = domainMap[topDomainId];

                    if (domain) {
                        // Find this domain's global rank
                        const allDomainsSorted = Object.keys(domainCompletions)
                            .sort((a, b) => domainCompletions[b] - domainCompletions[a]);

                        const domainRank = allDomainsSorted.indexOf(topDomainId) + 1;

                        userDomainData = {
                            rank: domainRank,
                            domain_id: parseInt(topDomainId),
                            name: domain.name,
                            color: domain.color,
                            icon: domain.icon,
                            completions: userDomainCompletions[topDomainId]
                        };
                    }
                }
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
            throw error;
        }
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
                avatar: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_name)}`,
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
                    avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.user_name)}`,
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