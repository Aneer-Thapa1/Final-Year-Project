// analytics.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Analytics Controller
 * Provides data visualization and insights for the HabitPulse app
 */
const AnalyticsController = {
    /**
     * Get user's habit completion heatmap (similar to GitHub contributions)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getHabitHeatmap: async (req, res) => {
        try {
            // Get user ID from authenticated token
            const userId = req.user;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Get query parameters with validation
            const { timeRange = 'month', habitId } = req.query;

            // Validate time range
            if (!['week', 'month', 'quarter', 'year'].includes(timeRange)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timeRange parameter. Use "week", "month", "quarter", or "year"'
                });
            }

            // Parse habit ID if provided
            let parsedHabitId = null;
            if (habitId) {
                parsedHabitId = parseInt(habitId);
                if (isNaN(parsedHabitId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid habitId parameter. Must be a number.'
                    });
                }
            }

            // Calculate date range based on timeRange
            const endDate = new Date();
            const startDate = new Date();

            switch(timeRange) {
                case 'week':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(endDate.getMonth() - 1);
                    break;
                case 'quarter':
                    startDate.setMonth(endDate.getMonth() - 3);
                    break;
                case 'year':
                    startDate.setFullYear(endDate.getFullYear() - 1);
                    break;
            }

            // Build query for habit logs
            const where = {
                user_id: parseInt(userId),
                completed: true,
                completed_at: {
                    gte: startDate,
                    lte: endDate
                }
            };

            // Add habit filter if provided
            if (parsedHabitId) {
                where.habit_id = parsedHabitId;
            }

            // Get completed habit logs in time range
            const habitLogs = await prisma.habitLog.findMany({
                where,
                select: {
                    completed_at: true,
                    habit_id: true,
                    habit: {
                        select: {
                            name: true,
                            color: true
                        }
                    }
                }
            });

            // Create a daily contribution count
            const contributionMap = {};
            const today = new Date().toISOString().split('T')[0];

            // Initialize all days with 0 completions
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateKey = currentDate.toISOString().split('T')[0];
                contributionMap[dateKey] = {
                    date: dateKey,
                    count: 0,
                    level: 0,
                    isToday: dateKey === today,
                    habits: []
                };
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Count completions for each day
            habitLogs.forEach(log => {
                const dateKey = new Date(log.completed_at).toISOString().split('T')[0];
                if (contributionMap[dateKey]) {
                    contributionMap[dateKey].count++;

                    // Add habit details if available
                    if (log.habit) {
                        contributionMap[dateKey].habits.push({
                            id: log.habit_id,
                            name: log.habit.name,
                            color: log.habit.color || '#4285F4'
                        });
                    }
                }
            });

            // Calculate intensity levels (0-4) based on counts
            const values = Object.values(contributionMap);
            const maxCount = Math.max(...values.map(v => v.count));

            // Assign levels based on count percentiles
            if (maxCount > 0) {
                values.forEach(day => {
                    if (day.count === 0) {
                        day.level = 0;
                    } else if (day.count <= maxCount * 0.25) {
                        day.level = 1;
                    } else if (day.count <= maxCount * 0.5) {
                        day.level = 2;
                    } else if (day.count <= maxCount * 0.75) {
                        day.level = 3;
                    } else {
                        day.level = 4;
                    }
                });
            }

            // Group by weeks for easier rendering
            const weeks = [];
            const sortedDates = Object.values(contributionMap).sort((a, b) =>
                new Date(a.date) - new Date(b.date)
            );

            // Get first day of week for the start date
            const firstDate = new Date(sortedDates[0].date);
            const dayOfWeek = firstDate.getDay(); // 0 = Sunday, 6 = Saturday

            let currentWeek = [];

            // Add empty cells for the first week if needed
            for (let i = 0; i < dayOfWeek; i++) {
                currentWeek.push(null);
            }

            // Fill in the actual data
            sortedDates.forEach(day => {
                const date = new Date(day.date);
                if (date.getDay() === 0 && currentWeek.length > 0) {
                    // Start a new week on Sunday
                    weeks.push(currentWeek);
                    currentWeek = [];
                }
                currentWeek.push(day);

                if (currentWeek.length === 7) {
                    weeks.push(currentWeek);
                    currentWeek = [];
                }
            });

            // Add the last partial week if it exists
            if (currentWeek.length > 0) {
                weeks.push(currentWeek);
            }

            // Calculate streak information
            const streakInfo = calculateStreakInfo(sortedDates);

            // Get total contribution stats
            const totalDays = sortedDates.length;
            const contributionDays = sortedDates.filter(day => day.count > 0).length;
            const completionRate = totalDays > 0 ? (contributionDays / totalDays) * 100 : 0;

            return res.status(200).json({
                success: true,
                data: {
                    weeks,
                    contributionDays,
                    totalDays,
                    completionRate: Math.round(completionRate * 10) / 10,
                    longestStreak: streakInfo.longest,
                    currentStreak: streakInfo.current,
                    maxCount,
                    timeRange
                }
            });

        } catch (error) {
            console.error('Error generating habit heatmap:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate habit heatmap data',
                error: error.message || 'Server error'
            });
        }
    },

    /**
     * Get analytics dashboard for user's home screen
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getDashboardAnalytics: async (req, res) => {
        try {
            // Get user ID from authentication
            const userId = req.user;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Get user data with streaks
            const user = await prisma.user.findUnique({
                where: { user_id: parseInt(userId) },
                select: {
                    user_id: true,
                    user_name: true,
                    points_gained: true,
                    currentDailyStreak: true,
                    longestDailyStreak: true,
                    totalHabitsCreated: true,
                    totalHabitsCompleted: true
                }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Calculate date ranges
            const now = new Date();

            // Today's range
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            // This week's range (Sunday to Saturday)
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay()); // Go to Sunday
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Saturday
            weekEnd.setHours(23, 59, 59, 999);

            // This month's range
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

            // Get all active habits
            const habits = await prisma.habit.findMany({
                where: {
                    user_id: parseInt(userId),
                    is_active: true
                },
                include: {
                    domain: {
                        select: {
                            name: true,
                            color: true
                        }
                    },
                    streak: {
                        select: {
                            current_streak: true,
                            longest_streak: true
                        }
                    }
                }
            });

            // Get today's habit statuses
            const todayStatuses = await prisma.habitDailyStatus.findMany({
                where: {
                    user_id: parseInt(userId),
                    date: {
                        gte: todayStart,
                        lte: now
                    }
                }
            });

            // Get this week's habit logs
            const weekLogs = await prisma.habitLog.findMany({
                where: {
                    user_id: parseInt(userId),
                    completed_at: {
                        gte: weekStart,
                        lte: weekEnd
                    }
                }
            });

            // Get this month's points
            const monthPoints = await prisma.pointsLog.findMany({
                where: {
                    user_id: parseInt(userId),
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd
                    }
                }
            });

            // Calculate today's progress
            const todayScheduled = todayStatuses.filter(status => status.is_scheduled).length;
            const todayCompleted = todayStatuses.filter(status => status.is_completed).length;
            const todayProgress = todayScheduled > 0 ? Math.round((todayCompleted / todayScheduled) * 100) : 0;

            // Calculate this week's progress
            const weekCompleted = weekLogs.filter(log => log.completed).length;

            // Expected completions this week
            let weeklyExpected = 0;
            habits.forEach(habit => {
                weeklyExpected += calculateExpectedWeeklyCompletions(habit);
            });

            const weekProgress = weeklyExpected > 0 ? Math.round((weekCompleted / weeklyExpected) * 100) : 0;

            // Calculate this month's points
            const monthPointsTotal = monthPoints.reduce((sum, log) => sum + log.points, 0);

            // Calculate domain distribution
            const domainData = calculateDomainDistribution(habits, weekLogs);

            // Get habits with longest streaks
            const topStreakHabits = habits
                .filter(h => h.streak && h.streak.current_streak > 0)
                .sort((a, b) => (b.streak?.current_streak || 0) - (a.streak?.current_streak || 0))
                .slice(0, 5)
                .map(h => ({
                    id: h.habit_id,
                    name: h.name,
                    color: h.color || h.domain.color || '#4285F4',
                    current_streak: h.streak?.current_streak || 0,
                    longest_streak: h.streak?.longest_streak || 0
                }));

            return res.status(200).json({
                success: true,
                data: {
                    user: {
                        id: user.user_id,
                        name: user.user_name,
                        totalPoints: user.points_gained,
                        currentStreak: user.currentDailyStreak,
                        longestStreak: user.longestDailyStreak
                    },
                    summary: {
                        todayProgress,
                        todayCompleted,
                        todayRemaining: todayScheduled - todayCompleted,
                        weekProgress,
                        weekCompleted,
                        weekExpected: weeklyExpected,
                        monthPoints: monthPointsTotal,
                        totalHabits: habits.length,
                        activeStreaks: habits.filter(h => h.streak && h.streak.current_streak > 0).length
                    },
                    habitsOverview: {
                        totalActive: habits.length,
                        byDomain: domainData,
                        topStreaks: topStreakHabits
                    },
                    dateRanges: {
                        today: todayStart.toISOString(),
                        weekStart: weekStart.toISOString(),
                        weekEnd: weekEnd.toISOString(),
                        monthStart: monthStart.toISOString(),
                        monthEnd: monthEnd.toISOString()
                    }
                }
            });

        } catch (error) {
            console.error('Error generating dashboard analytics:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate dashboard analytics',
                error: error.message || 'Server error'
            });
        }
    },

    /**
     * Get detailed analytics for a specific habit
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getHabitAnalytics: async (req, res) => {
        try {
            // Get user ID from authentication
            const userId = req.user;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Parse habitId from request parameters
            const { habitId } = req.params;
            if (!habitId) {
                return res.status(400).json({
                    success: false,
                    message: 'Habit ID is required'
                });
            }

            // Validate habitId is a number
            const habitIdNum = parseInt(habitId);
            if (isNaN(habitIdNum)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid habit ID format'
                });
            }

            // Get timeRange with validation
            const { timeRange = 'month' } = req.query;
            if (!['week', 'month', 'quarter', 'year', 'all'].includes(timeRange)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timeRange parameter. Use "week", "month", "quarter", "year", or "all"'
                });
            }

            // Validate habit exists and belongs to user
            const habit = await prisma.habit.findFirst({
                where: {
                    habit_id: habitIdNum,
                    user_id: parseInt(userId)
                },
                include: {
                    domain: true
                }
            });

            if (!habit) {
                return res.status(404).json({
                    success: false,
                    message: 'Habit not found or you do not have access to it'
                });
            }

            // Calculate date range
            const endDate = new Date();
            let startDate;

            if (timeRange === 'week') {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
            } else if (timeRange === 'month') {
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
            } else if (timeRange === 'quarter') {
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 3);
            } else if (timeRange === 'year') {
                startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
            } else {
                // Use habit start date for 'all'
                startDate = new Date(habit.start_date);
            }

            // Get habit logs
            const habitLogs = await prisma.habitLog.findMany({
                where: {
                    habit_id: habitIdNum,
                    completed_at: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: {
                    completed_at: 'asc'
                }
            });

            // Get streak information
            const streak = await prisma.habitStreak.findFirst({
                where: {
                    habit_id: habitIdNum,
                    user_id: parseInt(userId)
                }
            });

            // Get habit daily statuses
            const habitStatuses = await prisma.habitDailyStatus.findMany({
                where: {
                    habit_id: habitIdNum,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: {
                    date: 'asc'
                }
            });

            // Calculate completion stats
            const completedLogs = habitLogs.filter(log => log.completed);
            const scheduledDays = habitStatuses.filter(status => status.is_scheduled);
            const completedDays = habitStatuses.filter(status => status.is_completed);
            const skippedDays = habitStatuses.filter(status => status.is_skipped);

            const completionRate = scheduledDays.length > 0
                ? (completedDays.length / scheduledDays.length) * 100
                : 0;

            // Calculate day of week distribution
            const dayDistribution = [0, 1, 2, 3, 4, 5, 6].map(dayNum => {
                const count = completedLogs.filter(log => {
                    const date = new Date(log.completed_at);
                    return date.getDay() === dayNum;
                }).length;

                return {
                    day: dayNum,
                    name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayNum],
                    count,
                    percentage: completedLogs.length > 0
                        ? Math.round((count / completedLogs.length) * 100)
                        : 0
                };
            });

            // Calculate time of day distribution
            const timeDistribution = calculateTimeOfDayDistribution(completedLogs);

            // Format progress data for charts
            const progressData = formatProgressData(habitLogs, habitStatuses, startDate, endDate, timeRange);

            return res.status(200).json({
                success: true,
                data: {
                    habitDetails: {
                        id: habit.habit_id,
                        name: habit.name,
                        description: habit.description || '',
                        color: habit.color || habit.domain.color || '#4285F4',
                        icon: habit.icon || 'calendar',
                        domain: habit.domain.name,
                        frequency: formatFrequencyText(habit),
                        trackingType: habit.tracking_type,
                        startDate: habit.start_date
                    },
                    streakData: {
                        current: streak ? streak.current_streak : 0,
                        longest: streak ? streak.longest_streak : 0,
                        lastCompleted: streak ? streak.last_completed : null
                    },
                    completionStats: {
                        completionRate: Math.round(completionRate * 10) / 10,
                        totalScheduled: scheduledDays.length,
                        totalCompleted: completedDays.length,
                        totalSkipped: skippedDays.length,
                        dayDistribution,
                        timeDistribution
                    },
                    progressData,
                    timeRange,
                    dateRange: {
                        start: startDate.toISOString(),
                        end: endDate.toISOString()
                    }
                }
            });

        } catch (error) {
            console.error('Error generating habit analytics:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate habit analytics',
                error: error.message || 'Server error'
            });
        }
    },

    /**
     * Get personalized insights for the user
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getPersonalInsights: async (req, res) => {
        try {
            // Get user ID from authentication
            const userId = req.user;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            // Get user habits with related data
            const habits = await prisma.habit.findMany({
                where: {
                    user_id: parseInt(userId),
                    is_active: true
                },
                include: {
                    domain: true,
                    streak: true,
                    habitLogs: {
                        where: {
                            completed_at: {
                                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                            }
                        }
                    }
                }
            });

            // Get user achievements
            const achievements = await prisma.userAchievement.findMany({
                where: { user_id: parseInt(userId) },
                include: { achievement: true },
                orderBy: { unlocked_at: 'desc' }
            });

            // Get upcoming achievements
            const achievementProgress = await prisma.achievementProgress.findMany({
                where: {
                    user_id: parseInt(userId),
                    percent_complete: { lt: 100, gte: 50 } // At least 50% complete
                },
                include: { achievement: true },
                orderBy: { percent_complete: 'desc' }
            });

            // Calculate insights
            const insights = {
                strengths: [],
                improvements: [],
                suggestions: [],
                achievement_opportunities: [],
                metrics: {}
            };

            // Identify domain strengths and weaknesses
            const domainPerformance = {};
            habits.forEach(habit => {
                const domainName = habit.domain?.name;
                if (!domainName) return;

                if (!domainPerformance[domainName]) {
                    domainPerformance[domainName] = { habits: 0, completed: 0, total: 0 };
                }

                domainPerformance[domainName].habits++;

                // Calculate completion rate for this habit
                const logs = habit.habitLogs || [];
                domainPerformance[domainName].completed += logs.filter(log => log.completed).length;
                domainPerformance[domainName].total += logs.length;
            });

            // Identify strengths and improvement areas
            Object.entries(domainPerformance).forEach(([domain, stats]) => {
                if (stats.total < 5) return; // Skip domains with insufficient data

                const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

                if (completionRate >= 80) {
                    insights.strengths.push({
                        type: 'domain',
                        name: domain,
                        metric: Math.round(completionRate),
                        message: `You're excelling in ${domain} habits with ${Math.round(completionRate)}% completion rate`
                    });
                } else if (completionRate < 50 && stats.habits > 1) {
                    insights.improvements.push({
                        type: 'domain',
                        name: domain,
                        metric: Math.round(completionRate),
                        message: `Your ${domain} habits need attention with only ${Math.round(completionRate)}% completion rate`
                    });
                }
            });

            // Identify streak opportunities
            const streakOpportunities = habits
                .filter(h => h.streak && h.streak.current_streak >= 3)
                .sort((a, b) => (b.streak?.current_streak || 0) - (a.streak?.current_streak || 0))
                .slice(0, 3);

            streakOpportunities.forEach(habit => {
                const nextMilestone = getNextStreakMilestone(habit.streak.current_streak);

                insights.suggestions.push({
                    type: 'streak',
                    habitId: habit.habit_id,
                    habitName: habit.name,
                    current: habit.streak.current_streak,
                    next: nextMilestone,
                    message: `Keep going with "${habit.name}" - you're only ${nextMilestone - habit.streak.current_streak} days from a ${nextMilestone}-day streak!`
                });
            });

            // Add achievement opportunities
            achievementProgress.slice(0, 3).forEach(progress => {
                insights.achievement_opportunities.push({
                    id: progress.achievement_id,
                    name: progress.achievement.name,
                    percentComplete: progress.percent_complete,
                    description: progress.achievement.description,
                    message: `You're at ${Math.round(progress.percent_complete)}% progress toward unlocking "${progress.achievement.name}"`
                });
            });

            // Calculate key metrics
            const allCompletedLogs = habits.flatMap(h => (h.habitLogs || []).filter(log => log.completed));
            const allLogs = habits.flatMap(h => h.habitLogs || []);

            // Find most consistent habit
            const mostConsistentHabit = habits.reduce((best, current) => {
                const bestStreak = best.streak?.current_streak || 0;
                const currentStreak = current.streak?.current_streak || 0;
                return currentStreak > bestStreak ? current : best;
            }, habits[0] || null);

            insights.metrics = {
                overallCompletionRate: allLogs.length > 0
                    ? Math.round((allCompletedLogs.length / allLogs.length) * 100)
                    : 0,
                totalStreakDays: habits.reduce((sum, h) => sum + (h.streak?.current_streak || 0), 0),
                mostConsistentHabit: mostConsistentHabit?.name || null,
                achievementsEarned: achievements.length,
                recentAchievement: achievements.length > 0 ? achievements[0].achievement.name : null
            };

            return res.status(200).json({
                success: true,
                data: insights
            });

        } catch (error) {
            console.error('Error generating personalized insights:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate personalized insights',
                error: error.message || 'Server error'
            });
        }
    }
};

// ===== HELPER FUNCTIONS =====

/**
 * Calculate streak information from date data
 * @param {Array} sortedDates - Array of date objects sorted chronologically
 * @returns {Object} Streak info with current and longest streaks
 */
function calculateStreakInfo(sortedDates) {
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Start from the end (most recent) to calculate current streak
    for (let i = sortedDates.length - 1; i >= 0; i--) {
        const day = sortedDates[i];

        if (day.count > 0) {
            // Check if this is part of the current streak
            if (i === sortedDates.length - 1) {
                // First day of the streak (most recent)
                tempStreak = 1;
            } else {
                // Check if the previous day was consecutive
                const currentDate = new Date(day.date);
                const nextDate = new Date(sortedDates[i + 1].date);
                const diffDays = Math.floor((nextDate - currentDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    // Consecutive day
                    tempStreak++;
                } else {
                    // Streak broken
                    break;
                }
            }
        } else {
            // No contributions on this day, streak broken
            break;
        }
    }

    currentStreak = tempStreak;

    // Calculate longest streak
    tempStreak = 0;
    for (let i = 0; i < sortedDates.length; i++) {
        const day = sortedDates[i];

        if (day.count > 0) {
            tempStreak++;

            // Check if we've found a new longest streak
            if (tempStreak > longestStreak) {
                longestStreak = tempStreak;
            }
        } else {
            // Reset the temp streak counter
            tempStreak = 0;
        }
    }

    return {
        current: currentStreak,
        longest: longestStreak
    };
}

/**
 * Calculate expected weekly completions based on habit frequency
 * @param {Object} habit - Habit object
 * @returns {number} Expected completions per week
 */
function calculateExpectedWeeklyCompletions(habit) {
    if (!habit || !habit.frequency_type) {
        return 0;
    }

    switch (habit.frequency_type) {
        case 'DAILY':
            return 7;
        case 'WEEKDAYS':
            return 5;
        case 'WEEKENDS':
            return 2;
        case 'SPECIFIC_DAYS':
            return habit.specific_days ? habit.specific_days.length : 0;
        case 'INTERVAL':
            return Math.ceil(7 / Math.max(habit.frequency_interval || 1, 1));
        case 'X_TIMES_WEEK':
            return habit.frequency_value || 0;
        case 'X_TIMES_MONTH':
            return Math.ceil((habit.frequency_value || 0) / 4); // rough weekly estimate
        default:
            return 0;
    }
}

/**
 * Calculate distribution of habits by domain
 * @param {Array} habits - Array of habits
 * @param {Array} weekLogs - Array of habit logs for the week
 * @returns {Array} Domain distribution data
 */
function calculateDomainDistribution(habits, weekLogs) {
    const domainMap = {};

    // Initialize with all domains
    habits.forEach(habit => {
        if (!habit.domain) return;

        const domainName = habit.domain.name;
        if (!domainName) return;

        if (!domainMap[domainName]) {
            domainMap[domainName] = {
                name: domainName,
                color: habit.domain.color || '#4285F4',
                habitCount: 0,
                completionCount: 0,
                percentage: 0
            };
        }
        domainMap[domainName].habitCount++;
    });

    // Count completions by domain
    weekLogs.forEach(log => {
        if (!log.completed) return;

        // Find the habit to get its domain
        const habit = habits.find(h => h.habit_id === log.habit_id);
        if (habit && habit.domain && habit.domain.name) {
            const domainName = habit.domain.name;
            if (domainMap[domainName]) {
                domainMap[domainName].completionCount++;
            }
        }
    });

    // Calculate percentages
    const totalCompletions = weekLogs.filter(log => log.completed).length;

    Object.values(domainMap).forEach(domain => {
        domain.percentage = totalCompletions > 0 ?
            Math.round((domain.completionCount / totalCompletions) * 100) : 0;
    });

    return Object.values(domainMap).sort((a, b) => b.completionCount - a.completionCount);
}

/**
 * Calculate distribution of completions by time of day
 * @param {Array} logs - Array of completed habit logs
 * @returns {Array} Time distribution data
 */
function calculateTimeOfDayDistribution(logs) {
    // Define time periods
    const periods = [
        { name: 'Early Morning', start: 5, end: 8, count: 0 },
        { name: 'Morning', start: 8, end: 12, count: 0 },
        { name: 'Afternoon', start: 12, end: 17, count: 0 },
        { name: 'Evening', start: 17, end: 21, count: 0 },
        { name: 'Night', start: 21, end: 24, count: 0 },
        { name: 'Late Night', start: 0, end: 5, count: 0 }
    ];

    // Count completions in each period
    logs.forEach(log => {
        if (!log.completed_at) return;

        const hour = new Date(log.completed_at).getHours();

        for (const period of periods) {
            if ((period.start <= hour && hour < period.end) ||
                (period.start > period.end && (hour >= period.start || hour < period.end))) {
                period.count++;
                break;
            }
        }
    });

    // Calculate percentages
    const total = logs.length;
    periods.forEach(period => {
        period.percentage = total > 0 ? Math.round((period.count / total) * 100) : 0;
    });

    return periods;
}

/**
 * Format progress data for charts based on time range
 * @param {Array} logs - Habit logs
 * @param {Array} statuses - Habit daily statuses
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} timeRange - Time range selection
 * @returns {Array} Formatted progress data
 */
function formatProgressData(logs, statuses, startDate, endDate, timeRange) {
    // For shorter time ranges, use daily data
    if (timeRange === 'week' || timeRange === 'month') {
        return formatDailyProgressData(logs, statuses, startDate, endDate);
    }
    // Otherwise use weekly data
    else {
        return formatWeeklyProgressData(logs, statuses, startDate, endDate);
    }
}

/**
 * Format daily progress data for charts
 * @param {Array} logs - Habit logs
 * @param {Array} statuses - Habit daily statuses
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Daily progress data
 */
function formatDailyProgressData(logs, statuses, startDate, endDate) {
    const progressData = [];
    const currentDate = new Date(startDate);

    // Create data for each day in the range
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        // Find status for this day
        const status = statuses.find(s =>
            new Date(s.date).toISOString().split('T')[0] === dateStr
        );

        // Check if completed
        const completed = logs.filter(log =>
            new Date(log.completed_at).toISOString().split('T')[0] === dateStr &&
            log.completed
        ).length > 0;

        progressData.push({
            date: dateStr,
            label: formatDateLabel(currentDate),
            completed: completed,
            scheduled: status ? status.is_scheduled : false,
            skipped: status ? status.is_skipped : false
        });

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return progressData;
}

/**
 * Format weekly progress data for charts
 * @param {Array} logs - Habit logs
 * @param {Array} statuses - Habit daily statuses
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Weekly progress data
 */
function formatWeeklyProgressData(logs, statuses, startDate, endDate) {
    const progressData = [];
    const currentDate = new Date(startDate);

    // Get the start of the week (Sunday)
    const dayOfWeek = currentDate.getDay();
    currentDate.setDate(currentDate.getDate() - dayOfWeek);

    // Create data for each week in the range
    while (currentDate <= endDate) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // If week end is beyond our range, cap it
        if (weekEnd > endDate) {
            weekEnd.setTime(endDate.getTime());
        }

        // Count scheduled and completed for the week
        const weekStatuses = statuses.filter(s => {
            const date = new Date(s.date);
            return date >= weekStart && date <= weekEnd;
        });

        const weekLogs = logs.filter(log => {
            const date = new Date(log.completed_at);
            return date >= weekStart && date <= weekEnd && log.completed;
        });

        progressData.push({
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            label: formatWeekLabel(weekStart),
            completed: weekLogs.length > 0,
            completedCount: weekLogs.length,
            scheduledCount: weekStatuses.filter(s => s.is_scheduled).length,
            skippedCount: weekStatuses.filter(s => s.is_skipped).length
        });

        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return progressData;
}

/**
 * Format date label for charts
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDateLabel(date) {
    return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' }).substring(0, 3)}`;
}

/**
 * Format week label for charts
 * @param {Date} date - Start date of week
 * @returns {string} Formatted week label
 */
function formatWeekLabel(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Format habit frequency as readable text
 * @param {Object} habit - Habit object
 * @returns {string} Human-readable frequency
 */
function formatFrequencyText(habit) {
    if (!habit || !habit.frequency_type) {
        return 'Custom schedule';
    }

    switch (habit.frequency_type) {
        case 'DAILY':
            return 'Every day';
        case 'WEEKDAYS':
            return 'Weekdays (Mon-Fri)';
        case 'WEEKENDS':
            return 'Weekends (Sat-Sun)';
        case 'SPECIFIC_DAYS':
            if (!habit.specific_days || habit.specific_days.length === 0) {
                return 'No days selected';
            }

            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const days = habit.specific_days.map(day => dayNames[day]);

            if (days.length === 1) return days[0];
            if (days.length === 2) return `${days[0]} and ${days[1]}`;

            return `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`;
        case 'INTERVAL':
            const interval = habit.frequency_interval || 1;
            return interval === 1 ? 'Every day' : `Every ${interval} days`;
        case 'X_TIMES_WEEK':
            const times = habit.frequency_value || 0;
            return times === 1 ? 'Once a week' : `${times} times per week`;
        case 'X_TIMES_MONTH':
            const monthlyTimes = habit.frequency_value || 0;
            return monthlyTimes === 1 ? 'Once a month' : `${monthlyTimes} times per month`;
        default:
            return 'Custom schedule';
    }
}

/**
 * Get next milestone for a streak
 * @param {number} currentStreak - Current streak value
 * @returns {number} Next milestone value
 */
function getNextStreakMilestone(currentStreak) {
    const milestones = [7, 14, 21, 30, 60, 90, 100, 180, 365];

    for (const milestone of milestones) {
        if (currentStreak < milestone) {
            return milestone;
        }
    }

    // If beyond all predefined milestones, round up to next hundred
    return Math.ceil(currentStreak / 100) * 100;
}

module.exports = AnalyticsController;