const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const enhancedAnalyticsController = {
    /**
     * Get contribution graph data similar to GitHub's activity heatmap
     * Shows user's habit completions for each day with intensity levels
     */
    getContributionHeatmap: async (req, res) => {
        try {
            const { userId } = req.params;
            const { timeRange = 'year', habitId } = req.query;

            // Calculate date range - GitHub shows a full year by default
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            let startDate;
            if (timeRange === 'year') {
                // Last 365 days
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 365);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'quarter') {
                // Last 90 days
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 90);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'month') {
                // Last 30 days
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timeRange parameter. Use "year", "quarter", or "month"'
                });
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

            // Filter by specific habit if requested
            if (habitId) {
                where.habit_id = parseInt(habitId);
            }

            // Get all completed habit logs in the time range
            const habitLogs = await prisma.habitLog.findMany({
                where,
                select: {
                    completed_at: true,
                    habit_id: true
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
                    isToday: dateKey === today
                };
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Count completions for each day
            habitLogs.forEach(log => {
                const dateKey = new Date(log.completed_at).toISOString().split('T')[0];
                if (contributionMap[dateKey]) {
                    contributionMap[dateKey].count++;
                }
            });

            // Calculate intensity levels (0-4) based on counts
            // Find the max count to normalize levels
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

            res.status(200).json({
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
            console.error('Error generating contribution heatmap:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate contribution heatmap data',
                error: error.message
            });
        }
    },

    /**
     * Get habit progress analytics over time
     * Shows habit consistency, streak data, and completion rate changes
     */
    getHabitProgressAnalytics: async (req, res) => {
        try {
            const { habitId } = req.params;
            const { timeRange = 'all' } = req.query;

            // Validate habit ID and get habit details
            const habit = await prisma.habit.findUnique({
                where: {
                    habit_id: parseInt(habitId)
                },
                include: {
                    domain: true
                }
            });

            if (!habit) {
                return res.status(404).json({
                    success: false,
                    message: 'Habit not found'
                });
            }

            // Calculate date range
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            let startDate;
            if (timeRange === 'month') {
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'quarter') {
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 3);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'year') {
                startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
                startDate.setHours(0, 0, 0, 0);
            } else {
                // Use habit start date for 'all'
                startDate = new Date(habit.start_date);
                startDate.setHours(0, 0, 0, 0);
            }

            // Get all logs for this habit
            const habitLogs = await prisma.habitLog.findMany({
                where: {
                    habit_id: parseInt(habitId),
                    completed_at: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: {
                    completed_at: 'asc'
                }
            });

            // Get habit streak data
            const streak = await prisma.habitStreak.findFirst({
                where: {
                    habit_id: parseInt(habitId)
                }
            });

            // Get habit daily statuses (scheduled vs completed)
            const habitStatuses = await prisma.habitDailyStatus.findMany({
                where: {
                    habit_id: parseInt(habitId),
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: {
                    date: 'asc'
                }
            });

            // Calculate completion and consistency metrics
            const analysisData = calculateHabitAnalysisData(habit, habitLogs, habitStatuses, startDate, endDate);

            // Format progress charts data based on timeRange
            let progressChartData = [];
            let consistencyData = [];

            if (timeRange === 'month' || timeRange === 'quarter') {
                // Group by day for shorter time ranges
                progressChartData = formatDailyProgressData(habitLogs, habitStatuses, startDate, endDate);
                consistencyData = formatDailyConsistencyData(habitLogs, habitStatuses, startDate, endDate);
            } else {
                // Group by week for longer time ranges
                progressChartData = formatWeeklyProgressData(habitLogs, habitStatuses, startDate, endDate);
                consistencyData = formatWeeklyConsistencyData(habitLogs, habitStatuses, startDate, endDate);
            }

            // Create streak history array if available
            const streakHistory = streak && streak.streak_history ?
                JSON.parse(streak.streak_history) : generateDefaultStreakHistory();

            // Calculate time of day distribution
            const timeOfDayData = calculateTimeOfDayDistribution(habitLogs);

            // Calculate duration stats if applicable
            const durationStats = calculateDurationStats(habit, habitLogs);

            // Calculate completion time trend (how long it takes to complete)
            const completionTimeTrend = calculateCompletionTimeTrend(habitLogs, timeRange);

            // Build final response
            res.status(200).json({
                success: true,
                data: {
                    habitDetails: {
                        id: habit.habit_id,
                        name: habit.name,
                        description: habit.description || '',
                        color: habit.color || habit.domain.color || '#4285F4',
                        icon: habit.icon || 'calendar',
                        domain: habit.domain.name,
                        domainColor: habit.domain.color,
                        difficulty: habit.difficulty,
                        frequency: formatFrequencyText(habit),
                        tracking_type: habit.tracking_type,
                        duration_goal: habit.duration_goal,
                        count_goal: habit.count_goal,
                        numeric_goal: habit.numeric_goal,
                        units: habit.units
                    },
                    streakData: {
                        current: streak ? streak.current_streak : 0,
                        longest: streak ? streak.longest_streak : 0,
                        history: streakHistory,
                        lastCompleted: streak ? streak.last_completed : null
                    },
                    analysisData,
                    progressChartData,
                    consistencyData,
                    timeOfDayData,
                    durationStats,
                    completionTimeTrend,
                    timeRange,
                    dateRange: {
                        start: startDate.toISOString(),
                        end: endDate.toISOString()
                    }
                }
            });

        } catch (error) {
            console.error('Error generating habit progress analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate habit progress analytics',
                error: error.message
            });
        }
    },

    /**
     * Get mood analysis data for habit completions
     * Analyzes user mood trends when completing habits
     */
    getMoodAnalytics: async (req, res) => {
        try {
            const { userId } = req.params;
            const { habitId, timeRange = 'month' } = req.query;

            // Calculate date range
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            let startDate;
            if (timeRange === 'week') {
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'month') {
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'quarter') {
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 3);
                startDate.setHours(0, 0, 0, 0);
            } else if (timeRange === 'year') {
                startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() - 1);
                startDate.setHours(0, 0, 0, 0);
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid timeRange parameter. Use "week", "month", "quarter", or "year"'
                });
            }

            // Build where clause
            const where = {
                user_id: parseInt(userId),
                completed: true,
                completed_at: {
                    gte: startDate,
                    lte: endDate
                },
                mood: {
                    not: null
                }
            };

            // Add habit filter if specified
            if (habitId) {
                where.habit_id = parseInt(habitId);
            }

            // Get all logs with mood data
            const moodLogs = await prisma.habitLog.findMany({
                where,
                select: {
                    log_id: true,
                    habit_id: true,
                    completed_at: true,
                    mood: true,
                    habit: {
                        select: {
                            name: true,
                            color: true,
                            domain: {
                                select: {
                                    name: true,
                                    color: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    completed_at: 'asc'
                }
            });

            // Get counts of logs with and without mood
            const totalLogsCount = await prisma.habitLog.count({
                where: {
                    user_id: parseInt(userId),
                    completed: true,
                    completed_at: {
                        gte: startDate,
                        lte: endDate
                    },
                    ...(habitId ? { habit_id: parseInt(habitId) } : {})
                }
            });

            // If no mood data available
            if (moodLogs.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: {
                        moodAvailable: false,
                        totalLogs: totalLogsCount,
                        logsWithMood: 0,
                        message: 'No mood data available for the selected time period'
                    }
                });
            }

            // Calculate average mood by day
            const moodByDay = {};
            const dayFormat = new Intl.DateTimeFormat('en', { weekday: 'short' });

            moodLogs.forEach(log => {
                const date = new Date(log.completed_at);
                const day = dayFormat.format(date);

                if (!moodByDay[day]) {
                    moodByDay[day] = { day, totalMood: 0, count: 0, averageMood: 0 };
                }

                moodByDay[day].totalMood += log.mood;
                moodByDay[day].count++;
            });

            // Calculate average moods
            Object.values(moodByDay).forEach(dayData => {
                dayData.averageMood = dayData.count > 0 ?
                    Math.round((dayData.totalMood / dayData.count) * 10) / 10 : 0;
            });

            // Get mood distribution
            const moodDistribution = {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0
            };

            moodLogs.forEach(log => {
                if (log.mood >= 1 && log.mood <= 5) {
                    moodDistribution[log.mood]++;
                }
            });

            // Calculate mood trends over time
            const moodTrend = calculateMoodTrend(moodLogs, timeRange);

            // Calculate mood by habit (if no specific habit was requested)
            let moodByHabit = [];
            if (!habitId) {
                const habitMoodMap = {};

                moodLogs.forEach(log => {
                    const habitId = log.habit_id;

                    if (!habitMoodMap[habitId]) {
                        habitMoodMap[habitId] = {
                            habit_id: habitId,
                            name: log.habit.name,
                            color: log.habit.color || log.habit.domain.color || '#4285F4',
                            domain: log.habit.domain.name,
                            totalMood: 0,
                            count: 0,
                            averageMood: 0
                        };
                    }

                    habitMoodMap[habitId].totalMood += log.mood;
                    habitMoodMap[habitId].count++;
                });

                // Calculate average mood per habit
                moodByHabit = Object.values(habitMoodMap).map(habitData => ({
                    ...habitData,
                    averageMood: habitData.count > 0 ?
                        Math.round((habitData.totalMood / habitData.count) * 10) / 10 : 0
                })).sort((a, b) => b.averageMood - a.averageMood);
            }

            // Build response
            res.status(200).json({
                success: true,
                data: {
                    moodAvailable: true,
                    totalLogs: totalLogsCount,
                    logsWithMood: moodLogs.length,
                    moodCompletionRate: (moodLogs.length / totalLogsCount) * 100,
                    averageMood: moodLogs.length > 0 ?
                        Math.round((moodLogs.reduce((sum, log) => sum + log.mood, 0) / moodLogs.length) * 10) / 10 : 0,
                    moodDistribution,
                    moodByDay: Object.values(moodByDay).sort((a, b) => {
                        // Sort by day of week (Sunday first)
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        return days.indexOf(a.day) - days.indexOf(b.day);
                    }),
                    moodTrend,
                    moodByHabit,
                    timeRange,
                    dateRange: {
                        start: startDate.toISOString(),
                        end: endDate.toISOString()
                    }
                }
            });

        } catch (error) {
            console.error('Error generating mood analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate mood analytics',
                error: error.message
            });
        }
    },

    /**
     * Get aggregated analytics for user dashboard
     * Combines multiple analytics endpoints for a comprehensive dashboard view
     */
    getDashboardAnalytics: async (req, res) => {
        try {
            const { userId } = req.params;

            // Get current streak and overall stats
            const user = await prisma.user.findUnique({
                where: { user_id: parseInt(userId) },
                select: {
                    user_id: true,
                    user_name: true,
                    points_gained: true,
                    currentDailyStreak: true,
                    longestDailyStreak: true,
                    totalHabitsCreated: true,
                    totalHabitsCompleted: true,
                    timezone: true
                }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Calculate date ranges for different timeframes
            const now = new Date();

            // Today
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);

            // This week (Sunday to Saturday)
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay()); // Sunday
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Saturday
            weekEnd.setHours(23, 59, 59, 999);

            // This month
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

            // Get last 30 days completion data for trend
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);

            const completionTrend = await prisma.habitLog.groupBy({
                by: ['completed_at'],
                where: {
                    user_id: parseInt(userId),
                    completed: true,
                    completed_at: {
                        gte: thirtyDaysAgo,
                        lte: now
                    }
                },
                _count: true
            });

            // Calculate today's progress
            const todayScheduled = todayStatuses.filter(status => status.is_scheduled).length;
            const todayCompleted = todayStatuses.filter(status => status.is_completed).length;
            const todayProgress = todayScheduled > 0 ? Math.round((todayCompleted / todayScheduled) * 100) : 0;

            // Calculate this week's progress
            const weekCompleted = weekLogs.filter(log => log.completed).length;

            // Expected completions this week (estimated)
            let weeklyExpected = 0;
            habits.forEach(habit => {
                weeklyExpected += calculateExpectedWeeklyCompletions(habit);
            });

            const weekProgress = weeklyExpected > 0 ? Math.round((weekCompleted / weeklyExpected) * 100) : 0;

            // Calculate this month's points
            const monthPointsTotal = monthPoints.reduce((sum, log) => sum + log.points, 0);

            // Format completion trend data
            const trendData = formatCompletionTrendData(completionTrend);

            // Build domain distribution data
            const domainData = calculateDomainDistribution(habits, weekLogs);

            // Build completed vs missed data for the week
            const weekStatusData = calculateWeekStatusData(habits, weekLogs, weekStart, weekEnd);

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

            // Build final response
            res.status(200).json({
                success: true,
                data: {
                    user: {
                        id: user.user_id,
                        name: user.user_name,
                        totalPoints: user.points_gained,
                        currentStreak: user.currentDailyStreak,
                        longestStreak: user.longestDailyStreak,
                        timezone: user.timezone
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
                    completionTrend: trendData,
                    weekStatus: weekStatusData,
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
            res.status(500).json({
                success: false,
                message: 'Failed to generate dashboard analytics',
                error: error.message
            });
        }
    }
};

// HELPER FUNCTIONS

// Calculate streak information from sorted date data
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

// Calculate habit analysis data
function calculateHabitAnalysisData(habit, habitLogs, habitStatuses, startDate, endDate) {
    // Calculate completion rate
    const scheduledStatuses = habitStatuses.filter(status => status.is_scheduled);
    const completedStatuses = scheduledStatuses.filter(status => status.is_completed);
    const skippedStatuses = scheduledStatuses.filter(status => status.is_skipped);

    const completionRate = scheduledStatuses.length > 0 ?
        (completedStatuses.length / scheduledStatuses.length) * 100 : 0;

// Count completions by day of week
    const completionsByDayOfWeek = {
        0: 0, // Sunday
        1: 0, // Monday
        2: 0, // Tuesday
        3: 0, // Wednesday
        4: 0, // Thursday
        5: 0, // Friday
        6: 0  // Saturday
    };

    habitLogs.forEach(log => {
        if (log.completed) {
            const dayOfWeek = new Date(log.completed_at).getDay();
            completionsByDayOfWeek[dayOfWeek]++;
        }
    });

// Calculate consistency score (0-100)
// A measure of how regularly the habit is completed
    const consistencyScore = calculateConsistencyScore(habitLogs, habitStatuses, startDate, endDate, habit);

// Calculate completion intervals (days between completions)
    const intervals = calculateCompletionIntervals(habitLogs);

    return {
        completionRate: Math.round(completionRate * 10) / 10,
        totalScheduled: scheduledStatuses.length,
        totalCompleted: completedStatuses.length,
        totalSkipped: skippedStatuses.length,
        consistencyScore,
        completionsByDayOfWeek,
        completionIntervals: intervals
    };
}

// Calculate consistency score based on completion patterns
function calculateConsistencyScore(habitLogs, habitStatuses, startDate, endDate, habit) {
    if (habitLogs.length === 0 || habitStatuses.length === 0) {
        return 0;
    }

    // Expected interval based on habit frequency
    const expectedInterval = getExpectedInterval(habit);

    // Calculate actual intervals between completions
    const intervals = calculateCompletionIntervals(habitLogs);

    if (intervals.length === 0) {
        return 0;
    }

    // Calculate coefficient of variation (lower is better)
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) : 0;

    // Calculate deviation from expected interval
    const intervalDeviation = Math.abs(mean - expectedInterval) / expectedInterval;

    // Combine metrics into a final score (0-100)
    // Lower coefficient of variation and lower deviation from expected = higher score
    const cvScore = Math.max(0, 100 - (cv * 100));
    const deviationScore = Math.max(0, 100 - (intervalDeviation * 100));

    // Weight: 60% completion rate, 20% consistency (CV), 20% adherence to schedule
    const completionRate = habitStatuses.length > 0 ?
        habitLogs.filter(log => log.completed).length / habitStatuses.filter(s => s.is_scheduled).length : 0;

    return Math.round(
        (completionRate * 100 * 0.6) +
        (cvScore * 0.2) +
        (deviationScore * 0.2)
    );
}

// Get expected interval between completions based on habit frequency
function getExpectedInterval(habit) {
    switch (habit.frequency_type) {
        case 'DAILY':
            return 1;
        case 'WEEKDAYS':
            return 1.4; // Average over a week (5 days out of 7)
        case 'WEEKENDS':
            return 3.5; // Average over a week (2 days out of 7)
        case 'SPECIFIC_DAYS':
            return habit.specific_days && habit.specific_days.length > 0 ?
                7 / habit.specific_days.length : 7;
        case 'INTERVAL':
            return habit.frequency_interval || 1;
        case 'X_TIMES_WEEK':
            return habit.frequency_value > 0 ? 7 / habit.frequency_value : 7;
        case 'X_TIMES_MONTH':
            return habit.frequency_value > 0 ? 30 / habit.frequency_value : 30;
        default:
            return 1;
    }
}

// Calculate intervals (in days) between completions
function calculateCompletionIntervals(habitLogs) {
    if (habitLogs.length < 2) {
        return [];
    }

    const completedLogs = habitLogs
        .filter(log => log.completed)
        .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));

    if (completedLogs.length < 2) {
        return [];
    }

    const intervals = [];

    for (let i = 1; i < completedLogs.length; i++) {
        const prevDate = new Date(completedLogs[i-1].completed_at);
        const currDate = new Date(completedLogs[i].completed_at);

        // Calculate days between in case completions happen on different times of day
        const diffTime = Math.abs(currDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        intervals.push(diffDays);
    }

    return intervals;
}

// Format daily progress data for charts
function formatDailyProgressData(habitLogs, habitStatuses, startDate, endDate) {
    const progressData = [];
    const currentDate = new Date(startDate);

    // Create data for each day in the range
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const status = habitStatuses.find(s =>
            new Date(s.date).toISOString().split('T')[0] === dateStr
        );

        const completed = habitLogs.filter(log =>
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

// Format date label for charts
function formatDateLabel(date) {
    // For days, just show day of month and first 3 letters of month
    return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' }).substring(0, 3)}`;
}

// Format daily consistency data
function formatDailyConsistencyData(habitLogs, habitStatuses, startDate, endDate) {
    // Group by week number
    const weeklyData = {};
    const completedLogs = habitLogs.filter(log => log.completed);

    completedLogs.forEach(log => {
        const date = new Date(log.completed_at);
        const weekNum = getWeekNumber(date);
        const key = `${date.getFullYear()}-W${weekNum}`;

        if (!weeklyData[key]) {
            weeklyData[key] = { week: key, days: {} };
        }

        const dayOfWeek = date.getDay();
        if (!weeklyData[key].days[dayOfWeek]) {
            weeklyData[key].days[dayOfWeek] = 0;
        }

        weeklyData[key].days[dayOfWeek]++;
    });

    // Calculate daily consistency pattern
    const dayConsistency = [0, 1, 2, 3, 4, 5, 6].map(day => {
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
        const completions = completedLogs.filter(log =>
            new Date(log.completed_at).getDay() === day
        ).length;

        // Calculate percentage of weeks this day had a completion
        let weekCount = 0;
        Object.values(weeklyData).forEach(week => {
            if (week.days[day] && week.days[day] > 0) {
                weekCount++;
            }
        });

        const totalWeeks = Object.keys(weeklyData).length || 1;
        const percentage = Math.round((weekCount / totalWeeks) * 100);

        return {
            day,
            name: dayName,
            completions,
            consistency: percentage
        };
    });

    return dayConsistency;
}

// Get week number for a date
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Format weekly progress data
function formatWeeklyProgressData(habitLogs, habitStatuses, startDate, endDate) {
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
        const weekStatuses = habitStatuses.filter(s => {
            const date = new Date(s.date);
            return date >= weekStart && date <= weekEnd;
        });

        const weekLogs = habitLogs.filter(log => {
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

// Format weekly consistency data
function formatWeeklyConsistencyData(habitLogs, habitStatuses, startDate, endDate) {
    // Similar to daily consistency but aggregated by month
    const monthlyData = {};
    const completedLogs = habitLogs.filter(log => log.completed);

    completedLogs.forEach(log => {
        const date = new Date(log.completed_at);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!monthlyData[key]) {
            monthlyData[key] = { month: key, weeks: {} };
        }

        const weekNum = getWeekNumber(date);
        const weekKey = weekNum % 5; // Group into 5 buckets for "week of month"

        if (!monthlyData[key].weeks[weekKey]) {
            monthlyData[key].weeks[weekKey] = 0;
        }

        monthlyData[key].weeks[weekKey]++;
    });

    // Calculate weekly consistency pattern
    const weekConsistency = [0, 1, 2, 3, 4].map(weekIndex => {
        const weekName = `Week ${weekIndex + 1}`;
        const completions = Object.values(monthlyData).reduce((sum, month) => {
            return sum + (month.weeks[weekIndex] || 0);
        }, 0);

        // Calculate percentage of months this week had a completion
        let monthCount = 0;
        Object.values(monthlyData).forEach(month => {
            if (month.weeks[weekIndex] && month.weeks[weekIndex] > 0) {
                monthCount++;
            }
        });

        const totalMonths = Object.keys(monthlyData).length || 1;
        const percentage = Math.round((monthCount / totalMonths) * 100);

        return {
            week: weekIndex,
            name: weekName,
            completions,
            consistency: percentage
        };
    });

    return weekConsistency;
}

// Format week label for charts
function formatWeekLabel(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// Calculate time of day distribution for habit completions
function calculateTimeOfDayDistribution(habitLogs) {
    const completedLogs = habitLogs.filter(log => log.completed);

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
    completedLogs.forEach(log => {
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
    const total = completedLogs.length;
    periods.forEach(period => {
        period.percentage = total > 0 ? Math.round((period.count / total) * 100) : 0;
    });

    return periods;
}

// Calculate duration statistics for tracked habits
function calculateDurationStats(habit, habitLogs) {
    // Only relevant for duration-tracked habits
    if (habit.tracking_type !== 'DURATION' || !habitLogs.length) {
        return null;
    }

    const completedLogs = habitLogs.filter(log => log.completed && log.duration_completed);

    if (completedLogs.length === 0) {
        return null;
    }

    // Extract durations
    const durations = completedLogs.map(log => log.duration_completed);

    // Calculate statistics
    const totalDuration = durations.reduce((sum, val) => sum + val, 0);
    const avgDuration = Math.round(totalDuration / durations.length);
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    // Goal achievement rate
    const goalRate = habit.duration_goal ?
        Math.round((avgDuration / habit.duration_goal) * 100) : null;

    return {
        totalMinutes: totalDuration,
        averageMinutes: avgDuration,
        minMinutes: minDuration,
        maxMinutes: maxDuration,
        goalMinutes: habit.duration_goal,
        goalAchievementRate: goalRate,
        sessionsCount: completedLogs.length
    };
}

// Calculate trends in completion time (when habit is typically completed)
function calculateCompletionTimeTrend(habitLogs, timeRange) {
    const completedLogs = habitLogs.filter(log => log.completed);

    if (completedLogs.length === 0) {
        return [];
    }

    // For shorter time ranges, group by hour
    if (timeRange === 'month' || timeRange === 'quarter') {
        const hourlyData = {};

        for (let i = 0; i < 24; i++) {
            hourlyData[i] = { hour: i, count: 0, displayHour: formatHour(i) };
        }

        completedLogs.forEach(log => {
            const hour = new Date(log.completed_at).getHours();
            hourlyData[hour].count++;
        });

        return Object.values(hourlyData);
    }

    // For longer ranges, group by time period
    const periodData = {
        'morning': { name: 'Morning (5am-12pm)', count: 0 },
        'afternoon': { name: 'Afternoon (12pm-5pm)', count: 0 },
        'evening': { name: 'Evening (5pm-9pm)', count: 0 },
        'night': { name: 'Night (9pm-5am)', count: 0 }
    };

    completedLogs.forEach(log => {
        const hour = new Date(log.completed_at).getHours();

        if (hour >= 5 && hour < 12) {
            periodData.morning.count++;
        } else if (hour >= 12 && hour < 17) {
            periodData.afternoon.count++;
        } else if (hour >= 17 && hour < 21) {
            periodData.evening.count++;
        } else {
            periodData.night.count++;
        }
    });

    return Object.values(periodData);
}

// Format hour for display
function formatHour(hour) {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
}

// Generate a default streak history structure if none exists
function generateDefaultStreakHistory() {
    return {
        streaks: [],
        average: 0,
        total: 0
    };
}

// Calculate expected weekly completions based on habit frequency
function calculateExpectedWeeklyCompletions(habit) {
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
            return Math.ceil(7 / (habit.frequency_interval || 1));
        case 'X_TIMES_WEEK':
            return habit.frequency_value || 0;
        case 'X_TIMES_MONTH':
            return Math.ceil((habit.frequency_value || 0) / 4); // rough weekly estimate
        default:
            return 0;
    }
}

// Format completion trend data from raw logs
function formatCompletionTrendData(completionLogs) {
    // Group by day
    const trendData = {};

    completionLogs.forEach(item => {
        const date = new Date(item.completed_at);
        const dateStr = date.toISOString().split('T')[0];

        trendData[dateStr] = {
            date: dateStr,
            count: item._count
        };
    });

    // Sort by date
    return Object.values(trendData).sort((a, b) => a.date.localeCompare(b.date));
}

// Calculate distribution of habits by domain
function calculateDomainDistribution(habits, weekLogs) {
    const domainMap = {};

    // Initialize with all domains
    habits.forEach(habit => {
        const domainName = habit.domain.name;
        if (!domainMap[domainName]) {
            domainMap[domainName] = {
                name: domainName,
                color: habit.domain.color,
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
        if (habit && habit.domain) {
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

// Calculate weekly status data (for stacked bar charts)
function calculateWeekStatusData(habits, weekLogs, weekStart, weekEnd) {
    const dayData = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Process each day of the week
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);

        const dateStr = date.toISOString().split('T')[0];

        // Count completions for this day
        const completed = weekLogs.filter(log => {
            const logDate = new Date(log.completed_at);
            return logDate.toISOString().split('T')[0] === dateStr && log.completed;
        }).length;

        // Count scheduled habits for this day (approximation)
        let scheduled = 0;
        habits.forEach(habit => {
            if (shouldHabitBeScheduledForDay(habit, date)) {
                scheduled++;
            }
        });

        dayData.push({
            day: i,
            name: dayNames[i],
            date: dateStr,
            completed,
            missed: Math.max(0, scheduled - completed),
            total: scheduled
        });
    }

    return dayData;
}

// Check if a habit should be scheduled for a specific day
function shouldHabitBeScheduledForDay(habit, date) {
    // Check if habit's start date is after the given date
    if (new Date(habit.start_date) > date) {
        return false;
    }

    // Check if habit's end date is before the given date
    if (habit.end_date && new Date(habit.end_date) < date) {
        return false;
    }

    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    switch (habit.frequency_type) {
        case 'DAILY':
            return true;
        case 'WEEKDAYS':
            return dayOfWeek >= 1 && dayOfWeek <= 5;
        case 'WEEKENDS':
            return dayOfWeek === 0 || dayOfWeek === 6;
        case 'SPECIFIC_DAYS':
            return habit.specific_days && habit.specific_days.includes(dayOfWeek);
        case 'INTERVAL':
            // Calculate days since start
            const daysSinceStart = Math.floor((date - new Date(habit.start_date)) / (1000 * 60 * 60 * 24));
            return daysSinceStart % (habit.frequency_interval || 1) === 0;
        case 'X_TIMES_WEEK':
            // Can't precisely determine without additional state
            return false;
        case 'X_TIMES_MONTH':
            // Can't precisely determine without additional state
            return false;
        default:
            return false;
    }
}

// Calculate mood trend over time
function calculateMoodTrend(moodLogs, timeRange) {
    if (moodLogs.length === 0) {
        return [];
    }

    // Determine grouping based on time range
    let groupByFormat;
    if (timeRange === 'week') {
        // Group by day
        groupByFormat = date => date.toISOString().split('T')[0];
    } else if (timeRange === 'month') {
        // Group by day
        groupByFormat = date => date.toISOString().split('T')[0];
    } else if (timeRange === 'quarter') {
        // Group by week
        groupByFormat = date => {
            const year = date.getFullYear();
            const week = getWeekNumber(date);
            return `${year}-W${week}`;
        };
    } else {
        // Group by month
        groupByFormat = date => {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            return `${year}-${month}`;
        };
    }

    // Group logs
    const groups = {};

    moodLogs.forEach(log => {
        const date = new Date(log.completed_at);
        const key = groupByFormat(date);

        if (!groups[key]) {
            groups[key] = {
                date: key,
                totalMood: 0,
                count: 0,
                mood: 0,
                displayDate: formatTrendDate(date, timeRange)
            };
        }

        groups[key].totalMood += log.mood;
        groups[key].count++;
    });

    // Calculate average mood for each group
    Object.values(groups).forEach(group => {
        group.mood = group.count > 0 ? Math.round((group.totalMood / group.count) * 10) / 10 : 0;
    });

    // Convert to array and sort by date
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
}

// Format date for trend display
function formatTrendDate(date, timeRange) {
    if (timeRange === 'week' || timeRange === 'month') {
        return `${date.getMonth() + 1}/${date.getDate()}`;
    } else if (timeRange === 'quarter') {
        const week = getWeekNumber(date) % 52;
        return `Week ${week}`;
    } else {
        return date.toLocaleString('default', { month: 'short' });
    }
}

// Format habit frequency as human-readable text
function formatFrequencyText(habit) {
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

module.exports = enhancedAnalyticsController;