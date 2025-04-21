const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const moment = require('moment-timezone');
const {  checkAndUpdateAchievements,
    updateTotalCompletionsAchievements,
    updateStreakAchievements,
    updateDomainMasteryAchievements,
    checkPerfectCompletionAchievements,
    updateHabitDiversityAchievements,
    awardAchievement,updateConsecutiveDaysAchievements } = require('../utils/achievements/achievementFunctions');

/**
 * Helper function to determine if a habit should be scheduled for a specific date
 * based on its frequency type
 */
const isHabitScheduledForDate = (habit, targetDate) => {
    // Get day of week (0-6, Sunday is 0)
    const dayOfWeek = targetDate.getDay();

    // Calculate days since start
    const habitStartDate = new Date(habit.start_date);
    habitStartDate.setHours(0, 0, 0, 0);

    const daysSinceStart = Math.floor((targetDate - habitStartDate) / (24 * 60 * 60 * 1000));

    // If habit hasn't started yet, it's not scheduled
    if (daysSinceStart < 0) return false;

    // Check if the habit has ended
    if (habit.end_date) {
        const endDate = new Date(habit.end_date);
        endDate.setHours(23, 59, 59, 999);

        if (targetDate > endDate) return false;
    }

    // Check if user is on vacation and habit should be skipped
    if (habit.user?.onVacation && habit.skip_on_vacation) {
        return false;
    }

    // Date is between start and end, check frequency type
    switch (habit.frequency_type) {
        case 'DAILY':
            return true;

        case 'WEEKDAYS':
            // Weekdays are Monday (1) through Friday (5)
            return dayOfWeek >= 1 && dayOfWeek <= 5;

        case 'WEEKENDS':
            // Weekend days are Saturday (6) and Sunday (0)
            return dayOfWeek === 0 || dayOfWeek === 6;

        case 'SPECIFIC_DAYS':
            // Check if current day of week is in specific_days array
            return habit.specific_days && habit.specific_days.includes(dayOfWeek);

        case 'INTERVAL':
            // Every X days since start date
            return daysSinceStart % habit.frequency_interval === 0;

        case 'X_TIMES_WEEK':
            // Get the start of the week (Sunday)
            const startOfWeek = new Date(targetDate);
            startOfWeek.setDate(targetDate.getDate() - dayOfWeek);
            startOfWeek.setHours(0, 0, 0, 0);

            // Check if this habit has already been scheduled enough times this week
            // This is a simplified approach - we'll handle the async call separately
            return getScheduledDaysInRange(
                habit.habit_id,
                startOfWeek,
                targetDate
            ).then(scheduledDaysThisWeek => {
                return scheduledDaysThisWeek < habit.frequency_value;
            }).catch(() => {
                console.error(`Error checking X_TIMES_WEEK for habit ${habit.habit_id}`);
                return true; // Default to scheduling if there's an error
            });

        case 'X_TIMES_MONTH':
            // Get the start of the month
            const startOfMonth = new Date(targetDate);
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Check if this habit has already been scheduled enough times this month
            return getScheduledDaysInRange(
                habit.habit_id,
                startOfMonth,
                targetDate
            ).then(scheduledDaysThisMonth => {
                return scheduledDaysThisMonth < habit.frequency_value;
            }).catch(() => {
                console.error(`Error checking X_TIMES_MONTH for habit ${habit.habit_id}`);
                return true; // Default to scheduling if there's an error
            });

        default:
            // Unknown frequency type, default to scheduled
            return true;
    }
};

/**
 * Helper function to get the count of days a habit has been scheduled in a date range
 */
const getScheduledDaysInRange = async (habitId, startDate, endDate) => {
    try {
        const statuses = await prisma.habitDailyStatus.findMany({
            where: {
                habit_id: habitId,
                date: {
                    gte: startDate,
                    lte: endDate
                },
                is_scheduled: true
            }
        });

        return statuses.length;
    } catch (error) {
        console.error('Error getting scheduled days in range:', error);
        return 0;
    }
};

/**
 * Helper function to get a user-friendly display string for the habit frequency
 */
const getFrequencyDisplay = (habit) => {
    switch (habit.frequency_type) {
        case 'DAILY':
            return "Daily";
        case 'WEEKDAYS':
            return "Weekdays";
        case 'WEEKENDS':
            return "Weekends";
        case 'SPECIFIC_DAYS':
            return "Specific Days";
        case 'INTERVAL':
            return `Every ${habit.frequency_interval} day${habit.frequency_interval !== 1 ? 's' : ''}`;
        case 'X_TIMES_WEEK':
            return `${habit.frequency_value}× per week`;
        case 'X_TIMES_MONTH':
            return `${habit.frequency_value}× per month`;
        default:
            return "Daily";
    }
};

/**
 * Helper function to create a daily status record for a habit
 */
const createHabitDailyStatus = async (habitId, userId, date, isScheduled) => {
    return await prisma.habitDailyStatus.create({
        data: {
            habit_id: habitId,
            user_id: userId,
            date: date,
            is_scheduled: isScheduled,
            is_completed: false,
            is_skipped: false
        }
    });
};


/**
 * Add a new habit to the database with enhanced reminder support and points setup
 */
const addHabit = async (req, res) => {
    try {
        const {
            name,
            description,
            icon,
            color,
            start_date,
            end_date,
            is_favorite,
            frequency_type,
            frequency_value,
            frequency_interval,
            custom_frequency,
            specific_days,
            tracking_type,
            duration_goal,
            count_goal,
            numeric_goal,
            units,
            skip_on_vacation,
            require_evidence,
            location_based,
            location_name,
            location_lat,
            location_lng,
            location_radius,
            motivation_quote,
            external_resource_url,
            tags,
            cue,
            reward,
            difficulty,
            domain_id,
            reminders,
            grace_period_enabled,
            grace_period_hours
            // Removed points_per_completion and bonus_points_streak to prevent abuse
        } = req.body;

        const user_id = parseInt(req.user);

        // Validate required fields
        if (!name || !domain_id || !frequency_type || !tracking_type) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: name, domain_id, frequency_type, and tracking_type are required'
            });
        }

        // Validate frequency values
        if (!frequency_value || !frequency_interval) {
            return res.status(400).json({
                success: false,
                message: 'Frequency value and interval are required'
            });
        }

        // Validate tracking type-specific fields
        if (tracking_type === 'DURATION' && !duration_goal) {
            return res.status(400).json({
                success: false,
                message: 'Duration goal is required for duration-based habits'
            });
        }

        if (tracking_type === 'COUNT' && !count_goal) {
            return res.status(400).json({
                success: false,
                message: 'Count goal is required for count-based habits'
            });
        }

        if (tracking_type === 'NUMERIC' && (!numeric_goal || !units)) {
            return res.status(400).json({
                success: false,
                message: 'Numeric goal and units are required for measurable habits'
            });
        }

        // Process tags
        let processedTags = tags;
        if (tags && typeof tags === 'string') {
            try {
                JSON.parse(tags);
            } catch (error) {
                processedTags = JSON.stringify(tags.split(',').map(tag => tag.trim()));
            }
        } else if (Array.isArray(tags)) {
            processedTags = JSON.stringify(tags);
        }

        // Determine points without using user input to prevent abuse
        let pointsValue = 5; // Default base points
        let streakBonusPoints = 1; // Default streak bonus

        // Calculate points based on difficulty (not allowing user override)
        if (difficulty) {
            switch (difficulty) {
                case 'VERY_EASY':
                    pointsValue = 5;
                    break;
                case 'EASY':
                    pointsValue = 10;
                    break;
                case 'MEDIUM':
                    pointsValue = 15;
                    break;
                case 'HARD':
                    pointsValue = 20;
                    break;
                case 'VERY_HARD':
                    pointsValue = 30;
                    break;
                default:
                    pointsValue = 15; // Default to medium
            }
        }

        // Adjust streak bonus based on difficulty
        if (difficulty) {
            switch (difficulty) {
                case 'VERY_EASY':
                    streakBonusPoints = 1;
                    break;
                case 'EASY':
                    streakBonusPoints = 2;
                    break;
                case 'MEDIUM':
                    streakBonusPoints = 3;
                    break;
                case 'HARD':
                    streakBonusPoints = 4;
                    break;
                case 'VERY_HARD':
                    streakBonusPoints = 5;
                    break;
                default:
                    streakBonusPoints = 3; // Default to medium
            }
        }

        // Add small bonuses for additional complexity
        if (tracking_type === 'DURATION' || tracking_type === 'COUNT') {
            pointsValue += 2;
        } else if (tracking_type === 'NUMERIC') {
            pointsValue += 3;
        }

        if (require_evidence) {
            pointsValue += 2;
        }

        // Create the new habit
        const newHabit = await prisma.habit.create({
            data: {
                name,
                description,
                icon,
                color,
                start_date: start_date ? new Date(start_date) : new Date(),
                end_date: end_date ? new Date(end_date) : null,
                is_active: true,
                is_favorite: is_favorite || false,
                frequency_type: frequency_type || 'DAILY',
                frequency_value: parseInt(frequency_value, 10),
                frequency_interval: parseInt(frequency_interval, 10),
                custom_frequency: custom_frequency || null,
                specific_days: specific_days || [],
                tracking_type: tracking_type,
                duration_goal: tracking_type === 'DURATION' ? parseInt(duration_goal, 10) : null,
                count_goal: tracking_type === 'COUNT' ? parseInt(count_goal, 10) : null,
                numeric_goal: tracking_type === 'NUMERIC' ? parseFloat(numeric_goal) : null,
                units: units || null,
                skip_on_vacation: skip_on_vacation || false,
                require_evidence: require_evidence || false,
                location_based: location_based || false,
                location_name: location_name || null,
                location_lat: location_lat ? parseFloat(location_lat) : null,
                location_lng: location_lng ? parseFloat(location_lng) : null,
                location_radius: location_radius ? parseInt(location_radius, 10) : null,
                motivation_quote: motivation_quote || null,
                external_resource_url: external_resource_url || null,
                tags: processedTags || null,
                cue: cue || null,
                reward: reward || null,
                difficulty: difficulty || 'MEDIUM',
                domain_id: parseInt(domain_id, 10),
                user_id: parseInt(user_id, 10),
                grace_period_enabled: grace_period_enabled !== undefined ? grace_period_enabled : true,
                grace_period_hours: grace_period_hours ? parseInt(grace_period_hours, 10) : 24,
                points_per_completion: pointsValue,
                bonus_points_streak: streakBonusPoints
            }
        });

        // Initialize streak record for the new habit
        await prisma.habitStreak.create({
            data: {
                habit_id: newHabit.habit_id,
                user_id: user_id,
                current_streak: 0,
                longest_streak: 0,
                start_date: new Date(),
                missed_days_count: 0,
                grace_period_used: false
            }
        });

        // Initialize daily status for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get user info to check vacation status
        const user = await prisma.user.findUnique({
            where: { user_id: parseInt(user_id, 10) }
        });

        // Create daily status with proper scheduling check
        const isScheduled = await isHabitScheduledForDate({
            ...newHabit,
            user: user
        }, today);

        await prisma.habitDailyStatus.create({
            data: {
                habit_id: newHabit.habit_id,
                user_id: user_id,
                date: today,
                is_scheduled: isScheduled,
                is_completed: false,
                is_skipped: false
            }
        });

        // Process and add reminders - Fixed for the Invalid Date issue
        if (reminders && Array.isArray(reminders) && reminders.length > 0) {
            // Process each reminder one at a time to handle any time format issues
            for (const reminder of reminders) {
                try {
                    // Create a default reminder time (9:00 AM today)
                    const defaultTime = new Date();
                    defaultTime.setHours(9, 0, 0, 0);

                    // Parse the time string properly
                    let reminderTime = defaultTime;

                    if (reminder.time) {
                        // Handle time string format (HH:MM:SS or HH:MM)
                        if (typeof reminder.time === 'string') {
                            if (reminder.time.includes(':')) {
                                // Format: "09:00:00" or "09:00"
                                const now = new Date();
                                const [hourStr, minuteStr, secondStr = '0'] = reminder.time.split(':');

                                const hour = parseInt(hourStr, 10);
                                const minute = parseInt(minuteStr, 10);
                                const second = parseInt(secondStr, 10);

                                if (!isNaN(hour) && !isNaN(minute) && !isNaN(second) &&
                                    hour >= 0 && hour < 24 && minute >= 0 && minute < 60 && second >= 0 && second < 60) {
                                    reminderTime = new Date(now);
                                    reminderTime.setHours(hour, minute, second, 0);
                                }
                            }
                        }
                    }

                    // Create the reminder with the validated time
                    await prisma.habitReminder.create({
                        data: {
                            habit_id: newHabit.habit_id,
                            user_id: user_id,
                            reminder_time: reminderTime,
                            repeat: reminder.repeat || 'DAILY',
                            notification_message: reminder.message || `Time to complete your habit: ${name}`,
                            is_enabled: reminder.is_enabled !== undefined ? reminder.is_enabled : true,
                            pre_notification_minutes: reminder.pre_notification_minutes || 10,
                            follow_up_enabled: reminder.follow_up_enabled !== undefined ? reminder.follow_up_enabled : true,
                            follow_up_minutes: reminder.follow_up_minutes || 30
                        }
                    });
                } catch (reminderError) {
                    console.error(`Failed to create reminder:`, reminderError);
                    // Continue with other reminders
                }
            }
        }

        // Update user's totalHabitsCreated stat
        await prisma.user.update({
            where: { user_id: user_id },
            data: { totalHabitsCreated: { increment: 1 } }
        });

        // Create welcome notification for the new habit
        await prisma.notification.create({
            data: {
                user_id: user_id,
                title: 'New Habit Created',
                content: `You've set up a new habit: ${name}. Start building that streak!`,
                type: 'SYSTEM_MESSAGE',
                related_id: newHabit.habit_id,
                action_url: `/habits/${newHabit.habit_id}`
            }
        });

        // Return the newly created habit with domain information
        const habitWithDomain = await prisma.habit.findUnique({
            where: { habit_id: newHabit.habit_id },
            include: {
                domain: true,
                reminders: true,
                streak: true,
                dailyStatuses: {
                    where: {
                        date: today
                    }
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Habit created successfully',
            data: habitWithDomain
        });
    } catch (error) {
        console.error('Error adding habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create habit',
            error: error.message
        });
    }
};

/**
 * Get a single habit by ID with comprehensive data
 */
const getHabitById = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);

        if (!habitId) {
            return res.status(400).json({
                success: false,
                message: 'Habit ID is required'
            });
        }

        const habitIdInt = parseInt(habitId, 10);

        // Find the habit with related data
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: habitIdInt,
                user_id: userId
            },
            include: {
                domain: true,
                reminders: true,
                streak: true
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found'
            });
        }

        // Get recent logs for this habit
        const recentLogs = await prisma.habitLog.findMany({
            where: {
                habit_id: habitIdInt,
                user_id: userId
            },
            orderBy: {
                completed_at: 'desc'
            },
            take: 10
        });

        // Get recent streak resets if any
        const recentResets = await prisma.habitReset.findMany({
            where: {
                habit_id: habitIdInt,
                user_id: userId
            },
            orderBy: {
                reset_date: 'desc'
            },
            take: 5
        });

        // Calculate completion statistics
        const totalLogs = await prisma.habitLog.count({
            where: {
                habit_id: habitIdInt,
                user_id: userId
            }
        });

        const completedLogs = await prisma.habitLog.count({
            where: {
                habit_id: habitIdInt,
                user_id: userId,
                completed: true
            }
        });

        const completionRate = totalLogs > 0 ? (completedLogs / totalLogs) * 100 : 0;

        // Get today's status
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStatus = await prisma.habitDailyStatus.findUnique({
            where: {
                habit_id_date: {
                    habit_id: habitIdInt,
                    date: today
                }
            }
        });

        // Calculate total points earned from this habit
        const totalPoints = await prisma.pointsLog.aggregate({
            where: {
                user_id: userId,
                source_type: 'HABIT_COMPLETION',
                source_id: habitIdInt
            },
            _sum: {
                points: true
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                habit,
                recentLogs,
                recentResets,
                todayStatus: todayStatus || {
                    is_scheduled: isHabitScheduledForDate(habit, today),
                    is_completed: false,
                    is_skipped: false
                },
                stats: {
                    totalLogs,
                    completedLogs,
                    completionRate: Math.round(completionRate * 10) / 10,
                    totalPoints: totalPoints._sum.points || 0
                }
            }
        });
    } catch (error) {
        console.error('Error getting habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve habit',
            error: error.message
        });
    }
};

/**
 * Get all habits for the authenticated user with enhanced filtering
 */
const getUserHabits = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const {
            domain_id,
            is_active,
            is_favorite,
            sort_by = 'createdAt',
            sort_order = 'desc',
            page = 1,
            limit = 20
        } = req.query;

        // Build filter conditions
        const whereConditions = {
            user_id: userId
        };

        // Add optional filters
        if (domain_id) {
            whereConditions.domain_id = parseInt(domain_id, 10);
        }

        if (is_active !== undefined) {
            whereConditions.is_active = is_active === 'true';
        }

        if (is_favorite !== undefined) {
            whereConditions.is_favorite = is_favorite === 'true';
        }

        // Calculate pagination
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const take = parseInt(limit, 10);

        // Determine sorting
        let orderBy = {};

        switch (sort_by) {
            case 'name':
                orderBy.name = sort_order.toLowerCase();
                break;
            case 'createdAt':
                orderBy.createdAt = sort_order.toLowerCase();
                break;
            case 'start_date':
                orderBy.start_date = sort_order.toLowerCase();
                break;
            case 'updatedAt':
                orderBy.updatedAt = sort_order.toLowerCase();
                break;
            default:
                orderBy.createdAt = 'desc';
        }

        // Special handling for streak sorting
        let habits;
        let totalCount;

        if (sort_by === 'streak') {
            totalCount = await prisma.habit.count({
                where: whereConditions
            });

            const habitsWithStreaks = await prisma.habit.findMany({
                where: whereConditions,
                include: {
                    domain: true,
                    streak: true
                }
            });

            habitsWithStreaks.sort((a, b) => {
                const streakA = a.streak[0]?.current_streak || 0;
                const streakB = b.streak[0]?.current_streak || 0;

                return sort_order.toLowerCase() === 'desc' ? streakB - streakA : streakA - streakB;
            });

            habits = habitsWithStreaks.slice(skip, skip + take);
        } else {
            totalCount = await prisma.habit.count({
                where: whereConditions
            });

            habits = await prisma.habit.findMany({
                where: whereConditions,
                include: {
                    domain: true,
                    streak: true,
                    reminders: true
                },
                orderBy,
                skip,
                take
            });
        }

        // Get today's completion status for habits
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const habitIds = habits.map(habit => habit.habit_id);

        // Get today's statuses from dailyStatuses
        const todayStatuses = await prisma.habitDailyStatus.findMany({
            where: {
                habit_id: { in: habitIds },
                user_id: userId,
                date: today
            }
        });

        // Create status lookup map
        const habitStatusMap = {};
        todayStatuses.forEach(status => {
            habitStatusMap[status.habit_id] = status;
        });

        // Get user info to check vacation status
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { onVacation: true }
        });

        // Add completion and scheduled status
        const enhancedHabits = await Promise.all(habits.map(async habit => {
            const todayStatus = habitStatusMap[habit.habit_id];

            // If no status exists yet, determine if it should be scheduled
            const isScheduled = todayStatus
                ? todayStatus.is_scheduled
                : await isHabitScheduledForDate({ ...habit, user }, today);

            // Get next occurrence if needed
            let nextOccurrence = null;
            if (todayStatus && !todayStatus.is_scheduled) {
                nextOccurrence = await getNextOccurrence(habit);
            }

            return {
                ...habit,
                scheduledToday: isScheduled,
                completedToday: todayStatus ? todayStatus.is_completed : false,
                skippedToday: todayStatus ? todayStatus.is_skipped : false,
                todayStatus: todayStatus || null,
                nextOccurrence
            };
        }));

        return res.status(200).json({
            success: true,
            data: enhancedHabits,
            pagination: {
                total: totalCount,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                pages: Math.ceil(totalCount / parseInt(limit, 10))
            }
        });
    } catch (error) {
        console.error('Error getting habits:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve habits',
            error: error.message
        });
    }
};

/**
 * Get all habits for the given date with enhanced scheduling logic
 */
const getHabitsByDate = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { date } = req.params; // Format: YYYY-MM-DD

        console.log(date)

        if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Valid date is required (YYYY-MM-DD format)'
            });
        }

        // Parse the date and ensure it's properly formatted for database comparison
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);

        // Get user info for vacation status
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                dailyGoal: true,
                onVacation: true,
                vacation_start: true,
                vacation_end: true
            }
        });

        // Get all active habits for the user
        const habits = await prisma.habit.findMany({
            where: {
                user_id: userId,
                is_active: true,
                // Habit must have started on or before the target date
                start_date: {
                    lte: targetDate
                },
                // And either has no end date, or ends on/after the target date
                OR: [
                    { end_date: null },
                    { end_date: { gte: targetDate } }
                ]
            },
            include: {
                domain: true,
                streak: {
                    where: {
                        user_id: userId
                    }
                }
            }
        });

        // Get daily statuses for the target date
        const dailyStatuses = await prisma.habitDailyStatus.findMany({
            where: {
                user_id: userId,
                date: targetDate
            }
        });

        // Create status lookup map
        const statusMap = {};
        dailyStatuses.forEach(status => {
            statusMap[status.habit_id] = status;
        });

        // Process each habit to determine if it should be scheduled for this date
        const processedHabits = [];

        for (const habit of habits) {
            // Check if we already have a status for this habit and date
            const existingStatus = statusMap[habit.habit_id];

            if (existingStatus) {
                // We have an existing status, use it
                if (existingStatus.is_scheduled) {
                    processedHabits.push({
                        ...habit, // Keep all original habit properties
                        scheduledToday: existingStatus.is_scheduled,
                        completedToday: existingStatus.is_completed,
                        skippedToday: existingStatus.is_skipped,
                        todayStatus: existingStatus
                    });
                }
            } else {
                // No existing status, determine if it should be scheduled
                const isScheduled = await isHabitScheduledForDate({
                    ...habit,
                    user
                }, targetDate);

                // If it should be scheduled, create a status record
                if (isScheduled) {
                    await createHabitDailyStatus(habit.habit_id, userId, targetDate, true);

                    // Create a new status object to return
                    const newStatus = {
                        habit_id: habit.habit_id,
                        user_id: userId,
                        date: targetDate,
                        is_scheduled: true,
                        is_completed: false,
                        is_skipped: false
                    };

                    processedHabits.push({
                        ...habit, // Keep all original habit properties
                        scheduledToday: true,
                        completedToday: false,
                        skippedToday: false,
                        todayStatus: newStatus
                    });
                }
            }
        }

        // Calculate completion rate
        const totalHabits = processedHabits.length;
        const completedHabits = processedHabits.filter(h => h.completedToday).length;

        // Calculate total points earned on this day
        const dayPoints = await prisma.pointsLog.aggregate({
            where: {
                user_id: userId,
                createdAt: {
                    gte: targetDate,
                    lt: nextDate
                }
            },
            _sum: {
                points: true
            }
        });

        return res.status(200).json({
            success: true,
            date: targetDate.toISOString().split('T')[0],
            data: processedHabits,
            stats: {
                total: totalHabits,
                completed: completedHabits,
                completionRate: totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0,
                dailyGoal: user?.dailyGoal || 0,
                goalAchieved: completedHabits >= (user?.dailyGoal || 0),
                pointsEarned: dayPoints._sum.points || 0
            }
        });
    } catch (error) {
        console.error('Error getting habits by date:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve habits for the specified date',
            error: error.message
        });
    }
};

/**
 * Get habits by domain with enhanced daily status data
 */
const getHabitsByDomain = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { domainId } = req.params;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        const domainIdInt = parseInt(domainId, 10);

        // Check if domain exists
        const domain = await prisma.habitDomain.findUnique({
            where: { domain_id: domainIdInt }
        });

        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        // Get user info for vacation status
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { onVacation: true }
        });

        // Get habits in this domain
        const habits = await prisma.habit.findMany({
            where: {
                user_id: userId,
                domain_id: domainIdInt,
                is_active: true
            },
            include: {
                domain: true,
                streak: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Get completion status for today using daily statuses
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const habitIds = habits.map(habit => habit.habit_id);

        const todayStatuses = await prisma.habitDailyStatus.findMany({
            where: {
                habit_id: { in: habitIds },
                user_id: userId,
                date: today
            }
        });

        // Create lookup map
        const statusMap = {};
        todayStatuses.forEach(status => {
            statusMap[status.habit_id] = status;
        });

        // Add completion status
        const habitsWithStatus = await Promise.all(habits.map(async habit => {
            const todayStatus = statusMap[habit.habit_id];

            if (todayStatus) {
                return {
                    ...habit,
                    isScheduledToday: todayStatus.is_scheduled,
                    completedToday: todayStatus.is_completed,
                    skippedToday: todayStatus.is_skipped,
                    todayStatus
                };
            }

            // Determine if this habit should be scheduled for today
            const isScheduled = await isHabitScheduledForDate({
                ...habit,
                user
            }, today);

            // Create status if needed
            if (isScheduled) {
                const newStatus = await createHabitDailyStatus(habit.habit_id, userId, today, true);

                return {
                    ...habit,
                    isScheduledToday: true,
                    completedToday: false,
                    skippedToday: false,
                    todayStatus: newStatus
                };
            }

            return {
                ...habit,
                isScheduledToday: false,
                completedToday: false,
                skippedToday: false,
                todayStatus: null
            };
        }));

        // Get domain stats
        const domainStats = {
            totalHabits: habits.length,
            scheduledToday: habitsWithStatus.filter(h => h.isScheduledToday).length,
            completedToday: habitsWithStatus.filter(h => h.completedToday).length,
            averageStreak: habits.length > 0
                ? Math.round(habits.reduce((sum, habit) => sum + (habit.streak[0]?.current_streak || 0), 0) / habits.length)
                : 0
        };

        // Calculate total points for this domain
        const domainPoints = await prisma.pointsLog.aggregate({
            where: {
                user_id: userId,
                source_type: 'HABIT_COMPLETION',
                source_id: { in: habitIds }
            },
            _sum: {
                points: true
            }
        });

        return res.status(200).json({
            success: true,
            domain,
            data: habitsWithStatus,
            stats: {
                ...domainStats,
                totalPoints: domainPoints._sum.points || 0
            }
        });
    } catch (error) {
        console.error('Error getting habits by domain:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve habits for the specified domain',
            error: error.message
        });
    }
};

/**
 * Log a habit completion with streak management, points, and achievement tracking
 */
const logHabitCompletion = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);

        const {
            completed = true,
            completed_at,
            completion_notes,
            duration_completed,
            count_completed,
            numeric_completed,
            skipped = false,
            skip_reason,
            mood,
            evidence_image,
        } = req.body;

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            },
            include: {
                streak: true,
                domain: true
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to log completion'
            });
        }

        const now = new Date();
        const completionDate = completed_at ? new Date(completed_at) : now;

        // Determine if this is logged for today or a past date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const completionDay = new Date(completionDate);
        completionDay.setHours(0, 0, 0, 0);

        const isBackdated = completionDay < today;

        // Get or create the daily status for this date
        let dailyStatus = await prisma.habitDailyStatus.findUnique({
            where: {
                habit_id_date: {
                    habit_id: parseInt(habitId, 10),
                    date: completionDay
                }
            }
        });

        // If no status exists, create one
        if (!dailyStatus) {
            // Check if it should be scheduled for this date
            const user = await prisma.user.findUnique({
                where: { user_id: userId },
                select: { onVacation: true, timezone: true }
            });

            const isScheduled = await isHabitScheduledForDate({
                ...habit,
                user: user
            }, completionDay);

            dailyStatus = await createHabitDailyStatus(
                parseInt(habitId, 10),
                userId,
                completionDay,
                isScheduled
            );
        }

        // Update the daily status
        await prisma.habitDailyStatus.update({
            where: {
                status_id: dailyStatus.status_id
            },
            data: {
                is_completed: completed && !skipped ? true : false,
                is_skipped: skipped,
                skip_reason: skipped ? skip_reason : null,
                completion_time: completed && !skipped ? completionDate : null
            }
        });

        let pointsEarned = 0;
        let streakData = null;

        // Prepare log data
        const logData = {
            habit_id: parseInt(habitId, 10),
            user_id: userId,
            completed,
            skipped,
            completion_notes: completion_notes || null,
            completed_at: completionDate,
            mood: mood ? parseInt(mood, 10) : null,
            evidence_image: evidence_image || null,
            auto_logged: false,
            logged_late: isBackdated,
            skip_reason: skipped ? skip_reason : null,
            points_earned: 0 // Will update after streak calculation if completed
        };

        // Add tracking-specific data
        if (habit.tracking_type === 'DURATION' && duration_completed) {
            logData.duration_completed = parseInt(duration_completed, 10);
        }

        if (habit.tracking_type === 'COUNT' && count_completed) {
            logData.count_completed = parseInt(count_completed, 10);
        }

        if (habit.tracking_type === 'NUMERIC' && numeric_completed) {
            logData.numeric_completed = parseFloat(numeric_completed);
        }

        // Create the log entry
        let newLog = await prisma.habitLog.create({
            data: logData
        });

        // For storing achievement updates
        let unlockedAchievements = [];

        // Handle streak and points for completion
        if (completed && !skipped) {
            // Update streak with enhanced rules
            streakData = await updateHabitStreak(habit, userId, completionDay);

            // Calculate points based on streak
            const basePoints = habit.points_per_completion || 5;
            const streakMultiplier = habit.bonus_points_streak || 1;

            // Cap the streak bonus at 30 days to prevent excessive points
            const cappedStreak = Math.min(streakData.newStreak - 1, 30);
            const streakBonus = cappedStreak * streakMultiplier;

            // Calculate difficulty bonus (if applicable)
            let difficultyBonus = 0;
            switch(habit.difficulty) {
                case 'HARD':
                    difficultyBonus = Math.round(basePoints * 0.2);
                    break;
                case 'VERY_HARD':
                    difficultyBonus = Math.round(basePoints * 0.5);
                    break;
            }

            // Total points earned
            pointsEarned = basePoints + streakBonus + difficultyBonus;

            // Update the log with points earned
            newLog = await prisma.habitLog.update({
                where: { log_id: newLog.log_id },
                data: { points_earned: pointsEarned }
            });

            // Create points log entry
            await prisma.pointsLog.create({
                data: {
                    user_id: userId,
                    points: pointsEarned,
                    reason: `Completed habit: ${habit.name}`,
                    description: streakData.newStreak > 1 ?
                        `${streakData.newStreak} day streak (+${streakBonus} bonus)` :
                        undefined,
                    source_type: 'HABIT_COMPLETION',
                    source_id: parseInt(habitId, 10)
                }
            });

            // Update user's total points and completion count
            await prisma.user.update({
                where: { user_id: userId },
                data: {
                    points_gained: { increment: pointsEarned },
                    totalHabitsCompleted: { increment: 1 }
                }
            });

            // Check for streak milestones and award bonus points
            if (streakData.newStreak >= 7) {
                await checkAndAwardStreakMilestone(habit, userId, streakData.newStreak);
            }

            // Update achievement progress for total completions
            await updateTotalCompletionsAchievements(userId);

            // Update achievement progress for streak length if applicable
            if (streakData.newStreak > 0) {
                await updateStreakAchievements(userId, streakData.newStreak);
            }

            // Update domain mastery achievements
            await updateDomainMasteryAchievements(userId, habit.domain_id);

            // Update habit diversity achievements (only update if completed today)
            if (!isBackdated) {
                await updateHabitDiversityAchievements(userId);
            }
        } else if (skipped) {
            // Handle skips based on user's preferences
            await handleSkippedHabit(habit, userId, completionDay, skip_reason);
        }

        // Check daily goal completion
        const completedHabitsToday = await prisma.habitDailyStatus.count({
            where: {
                user_id: userId,
                date: today,
                is_completed: true
            }
        });

        // Get user's daily goal
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: {
                dailyGoal: true,
                currentDailyStreak: true,
                longestDailyStreak: true
            }
        });

        let dailyGoalAchieved = false;
        let dailyGoalPoints = 0;

        // If daily goal is completed and not previously completed today
        if (completedHabitsToday >= user.dailyGoal) {
            // Check if we need to record daily goal achievement
            const todayStats = await prisma.userStats.findFirst({
                where: {
                    user_id: userId,
                    updated_at: {
                        gte: today,
                        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                    }
                }
            });

            if (!todayStats || !todayStats.streak_maintained) {
                // Daily goal bonus points
                dailyGoalPoints = 20;
                dailyGoalAchieved = true;

                // Create points log for daily goal
                await prisma.pointsLog.create({
                    data: {
                        user_id: userId,
                        points: dailyGoalPoints,
                        reason: 'Daily Goal Achieved',
                        description: `Completed ${user.dailyGoal} habits today`,
                        source_type: 'SYSTEM_BONUS'
                    }
                });

                // Update user's total points and streak
                await prisma.user.update({
                    where: { user_id: userId },
                    data: {
                        points_gained: { increment: dailyGoalPoints },
                        currentDailyStreak: { increment: 1 },
                        longestDailyStreak: Math.max(user.currentDailyStreak + 1, user.longestDailyStreak)
                    }
                });

                // Create notification for daily goal achievement
                await prisma.notification.create({
                    data: {
                        user_id: userId,
                        title: 'Daily Goal Achieved!',
                        content: `You've completed your daily goal of ${user.dailyGoal} habits and earned ${dailyGoalPoints} points!`,
                        type: 'SYSTEM_MESSAGE'
                    }
                });

                // Update consecutive days achievements
                await updateConsecutiveDaysAchievements(userId, user.currentDailyStreak + 1);

                // Check for perfect completion (all scheduled habits completed)
                await checkPerfectCompletionAchievements(userId);
            }
        }

        // Get the updated habit with streak
        const updatedHabit = await prisma.habit.findUnique({
            where: { habit_id: parseInt(habitId, 10) },
            include: {
                streak: true,
                dailyStatuses: {
                    where: {
                        date: completionDay
                    }
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: skipped ? 'Habit skip logged successfully' : 'Habit completion logged successfully',
            data: {
                log: newLog,
                streak: updatedHabit.streak[0] || null,
                dailyStatus: updatedHabit.dailyStatuses[0] || null,
                completedHabitsToday,
                dailyGoalMet: dailyGoalAchieved,
                points: {
                    earned: pointsEarned,
                    dailyGoalBonus: dailyGoalPoints,
                    total: pointsEarned + dailyGoalPoints
                }
            }
        });
    } catch (error) {
        console.error('Error logging habit completion:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to log habit completion',
            error: error.message
        });
    }
};

/**
 * Skip a habit for a specified date with reason
 */
const skipHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);
        const { date, reason } = req.body;

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date is required for skipping a habit'
            });
        }

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            },
            include: {
                streak: true
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to skip it'
            });
        }

        const skipDate = new Date(date);
        skipDate.setHours(0, 0, 0, 0);

        // Get or create daily status for this date
        let dailyStatus = await prisma.habitDailyStatus.findUnique({
            where: {
                habit_id_date: {
                    habit_id: parseInt(habitId, 10),
                    date: skipDate
                }
            }
        });

        // Get user info to check vacation status
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { onVacation: true, timezone: true }
        });

        if (!dailyStatus) {
            const isScheduled = await isHabitScheduledForDate({
                ...habit,
                user: user
            }, skipDate);

            dailyStatus = await createHabitDailyStatus(
                parseInt(habitId, 10),
                userId,
                skipDate,
                isScheduled
            );
        }

        // Update the daily status to skipped
        await prisma.habitDailyStatus.update({
            where: {
                status_id: dailyStatus.status_id
            },
            data: {
                is_skipped: true,
                is_completed: false,
                skip_reason: reason || 'User skipped'
            }
        });

        // Create log entry for skip
        const skipLog = await prisma.habitLog.create({
            data: {
                habit_id: parseInt(habitId, 10),
                user_id: userId,
                completed: false,
                skipped: true,
                completed_at: new Date(),
                skip_reason: reason || 'User skipped',
                auto_logged: false
            }
        });

        // Determine if this should affect streak
        const isVacationSkip = user.onVacation || (reason && reason.toLowerCase().includes('vacation'));

        // Handle streak based on habit settings and vacation status
        let streakResult;
        if (habit.skip_on_vacation || isVacationSkip) {
            // Vacation skip doesn't affect streak
            streakResult = await handleSkippedHabit(habit, userId, skipDate, reason, true);
        } else {
            // Regular skip resets streak to 0
            streakResult = await handleSkippedHabit(habit, userId, skipDate, reason, false);
        }

        return res.status(200).json({
            success: true,
            message: 'Habit skipped successfully',
            data: {
                habit_id: parseInt(habitId, 10),
                date: skipDate.toISOString().split('T')[0],
                status: 'skipped',
                reason: reason || 'User skipped',
                log: skipLog,
                streak: streakResult?.currentStreak || 0,
                streak_maintained: habit.skip_on_vacation || isVacationSkip
            }
        });
    } catch (error) {
        console.error('Error skipping habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to skip habit',
            error: error.message
        });
    }
};

/**
 * Process daily habit reset for habits that were due but not completed
 * This should be run every day at midnight for each user's timezone
 */
const processHabitDailyReset = async (req, res) => {
    try {
        const userId = parseInt(req.user);

        // Get yesterday's date in user's timezone
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { timezone: true, onVacation: true }
        });

        // Get yesterday in user's timezone
        const userTimezone = user.timezone || 'UTC';
        const yesterday = moment().tz(userTimezone).subtract(1, 'day').startOf('day').toDate();

        // Get all active habits for the user
        const habits = await prisma.habit.findMany({
            where: {
                user_id: userId,
                is_active: true
            },
            include: {
                streak: true
            }
        });

        // Process each habit
        const results = [];

        for (const habit of habits) {
            // Skip processing if user is on vacation and habit should be skipped
            if (user.onVacation && habit.skip_on_vacation) {
                results.push({
                    habit_id: habit.habit_id,
                    name: habit.name,
                    action: 'vacation_skip',
                    current_streak: habit.streak[0]?.current_streak || 0
                });
                continue;
            }

            // Check if this habit was scheduled for yesterday
            const isScheduled = await isHabitScheduledForDate({
                ...habit,
                user: user
            }, yesterday);

            if (!isScheduled) {
                continue; // Skip habits not scheduled for yesterday
            }

            // Get the daily status for yesterday
            let dailyStatus = await prisma.habitDailyStatus.findUnique({
                where: {
                    habit_id_date: {
                        habit_id: habit.habit_id,
                        date: yesterday
                    }
                }
            });

            // If no status exists, create one
            if (!dailyStatus) {
                dailyStatus = await createHabitDailyStatus(
                    habit.habit_id,
                    userId,
                    yesterday,
                    true // It was scheduled
                );
            }

            // If not completed or skipped, mark as missed and reset streak
            if (!dailyStatus.is_completed && !dailyStatus.is_skipped) {
                // Create auto-logged entry for the missed habit
                const missedLog = await prisma.habitLog.create({
                    data: {
                        habit_id: habit.habit_id,
                        user_id: userId,
                        completed: false,
                        skipped: false,
                        completed_at: new Date(),
                        auto_logged: true
                    }
                });

                // Reset streak immediately (we don't use grace period for daily reset)
                // This is important - even if grace period is enabled, after the day passes,
                // we reset the streak as it's a missed completion

                const currentStreak = habit.streak[0]?.current_streak || 0;

                // Create reset record
                await prisma.habitReset.create({
                    data: {
                        habit_id: habit.habit_id,
                        user_id: userId,
                        reset_date: new Date(),
                        previous_streak: currentStreak,
                        reason: 'MISSED_COMPLETION',
                        user_initiated: false,
                        notes: 'Automatically reset due to missed completion.'
                    }
                });

                // Reset the streak
                await prisma.habitStreak.update({
                    where: { streak_id: habit.streak[0].streak_id },
                    data: {
                        current_streak: 0,
                        missed_days_count: habit.streak[0].missed_days_count + 1,
                        last_reset_reason: 'MISSED_COMPLETION',
                        grace_period_used: false
                    }
                });

                // If streak was significant (> 7 days), create a notification
                if (currentStreak >= 7) {
                    await prisma.notification.create({
                        data: {
                            user_id: userId,
                            title: 'Streak Lost',
                            content: `Your ${currentStreak}-day streak for "${habit.name}" was reset because you missed yesterday's completion.`,
                            type: 'STREAK_MILESTONE',
                            related_id: habit.habit_id
                        }
                    });
                }

                results.push({
                    habit_id: habit.habit_id,
                    name: habit.name,
                    action: 'streak_reset',
                    previous_streak: currentStreak
                });
            }
        }

        // If this is a new day, check if user completed their daily goal yesterday
        // If not, reset their daily streak
        const yesterdayCompletedCount = await prisma.habitDailyStatus.count({
            where: {
                user_id: userId,
                date: yesterday,
                is_completed: true
            }
        });

        const userGoals = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { dailyGoal: true, currentDailyStreak: true }
        });

        if (yesterdayCompletedCount < userGoals.dailyGoal && userGoals.currentDailyStreak > 0) {
            // User missed their daily goal, reset the streak
            await prisma.user.update({
                where: { user_id: userId },
                data: {
                    currentDailyStreak: 0
                }
            });

            // Create notification about lost daily goal streak
            if (userGoals.currentDailyStreak >= 3) {
                await prisma.notification.create({
                    data: {
                        user_id: userId,
                        title: 'Daily Goal Streak Lost',
                        content: `Your ${userGoals.currentDailyStreak}-day streak of completing your daily goal was reset.`,
                        type: 'STREAK_MILESTONE'
                    }
                });
            }

            results.push({
                action: 'daily_goal_streak_reset',
                previous_streak: userGoals.currentDailyStreak
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Daily habit reset process completed',
            data: {
                processed_date: yesterday.toISOString().split('T')[0],
                results
            }
        });
    } catch (error) {
        console.error('Error processing daily habit reset:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process daily habit reset',
            error: error.message
        });
    }
};

/**
 * Delete a habit log entry with streak recalculation
 */
const deleteHabitLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const userId = parseInt(req.user);

        // Validate log exists and belongs to user
        const log = await prisma.habitLog.findFirst({
            where: {
                log_id: parseInt(logId, 10),
                user_id: userId
            }
        });

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Log entry not found or you do not have permission to delete it'
            });
        }

        // Get the completion date from the log
        const completionDate = new Date(log.completed_at);
        completionDate.setHours(0, 0, 0, 0);

        // If log had points, remove those points from user's total
        if (log.points_earned > 0) {
            // Create a negative points log entry
            await prisma.pointsLog.create({
                data: {
                    user_id: userId,
                    points: -log.points_earned,
                    reason: 'Log Entry Deleted',
                    description: `Deleted log entry for habit ID ${log.habit_id}`,
                    source_type: 'ADMIN_ADJUSTMENT'
                }
            });

            // Update user's total points
            await prisma.user.update({
                where: { user_id: userId },
                data: {
                    points_gained: { increment: -log.points_earned }
                }
            });
        }

        // If this was a completion or skip, update the daily status
        await prisma.habitDailyStatus.updateMany({
            where: {
                habit_id: log.habit_id,
                user_id: userId,
                date: completionDate
            },
            data: {
                is_completed: false,
                is_skipped: false,
                completion_time: null,
                skip_reason: null
            }
        });

        // Delete the log
        await prisma.habitLog.delete({
            where: { log_id: parseInt(logId, 10) }
        });

        // Recalculate streak if this was a completed log
        let newStreak = null;
        if (log.completed) {
            newStreak = await recalculateHabitStreak(log.habit_id, userId);

            // Update user's total habits completed if needed
            await prisma.user.update({
                where: { user_id: userId },
                data: { totalHabitsCompleted: { decrement: 1 } }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Habit log deleted successfully',
            data: {
                points_removed: log.points_earned > 0 ? log.points_earned : 0,
                new_streak: newStreak?.current_streak || 0
            }
        });
    } catch (error) {
        console.error('Error deleting habit log:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete habit log',
            error: error.message
        });
    }
};

/**
 * Update an existing habit
 */
const updateHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);
        const habitData = req.body;

        // Validate habit exists and belongs to user
        const existingHabit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            }
        });

        if (!existingHabit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to update it'
            });
        }

        // Process tags if they exist
        let processedTags = habitData.tags;
        if (habitData.tags && typeof habitData.tags === 'string') {
            try {
                JSON.parse(habitData.tags);
            } catch (error) {
                processedTags = JSON.stringify(habitData.tags.split(',').map(tag => tag.trim()));
            }
        } else if (Array.isArray(habitData.tags)) {
            processedTags = JSON.stringify(habitData.tags);
        }

        // Determine points based on difficulty if difficulty is being updated
        let pointsValue = existingHabit.points_per_completion;
        let streakBonusPoints = existingHabit.bonus_points_streak;

        // Only recalculate points if difficulty is being changed
        if (habitData.difficulty && habitData.difficulty !== existingHabit.difficulty) {
            // Calculate points based on difficulty
            switch (habitData.difficulty) {
                case 'VERY_EASY':
                    pointsValue = 5;
                    streakBonusPoints = 1;
                    break;
                case 'EASY':
                    pointsValue = 10;
                    streakBonusPoints = 2;
                    break;
                case 'MEDIUM':
                    pointsValue = 15;
                    streakBonusPoints = 3;
                    break;
                case 'HARD':
                    pointsValue = 20;
                    streakBonusPoints = 4;
                    break;
                case 'VERY_HARD':
                    pointsValue = 30;
                    streakBonusPoints = 5;
                    break;
            }

            // Add complexity bonuses
            const trackingType = habitData.tracking_type || existingHabit.tracking_type;
            if (trackingType === 'DURATION' || trackingType === 'COUNT') {
                pointsValue += 2;
            } else if (trackingType === 'NUMERIC') {
                pointsValue += 3;
            }

            const requireEvidence = habitData.require_evidence !== undefined ?
                habitData.require_evidence : existingHabit.require_evidence;
            if (requireEvidence) {
                pointsValue += 2;
            }
        }

        // Update the habit
        const updatedHabit = await prisma.habit.update({
            where: {
                habit_id: parseInt(habitId, 10)
            },
            data: {
                name: habitData.name || existingHabit.name,
                description: habitData.description !== undefined ? habitData.description : existingHabit.description,
                icon: habitData.icon || existingHabit.icon,
                color: habitData.color || existingHabit.color,
                start_date: habitData.start_date ? new Date(habitData.start_date) : existingHabit.start_date,
                end_date: habitData.end_date ? new Date(habitData.end_date) : existingHabit.end_date,
                is_active: habitData.is_active !== undefined ? habitData.is_active : existingHabit.is_active,
                is_favorite: habitData.is_favorite !== undefined ? habitData.is_favorite : existingHabit.is_favorite,
                frequency_type: habitData.frequency_type || existingHabit.frequency_type,
                frequency_value: habitData.frequency_value ? parseInt(habitData.frequency_value, 10) : existingHabit.frequency_value,
                frequency_interval: habitData.frequency_interval ? parseInt(habitData.frequency_interval, 10) : existingHabit.frequency_interval,
                custom_frequency: habitData.custom_frequency || existingHabit.custom_frequency,
                specific_days: habitData.specific_days || existingHabit.specific_days,
                tracking_type: habitData.tracking_type || existingHabit.tracking_type,
                duration_goal: habitData.tracking_type === 'DURATION' && habitData.duration_goal ?
                    parseInt(habitData.duration_goal, 10) : existingHabit.duration_goal,
                count_goal: habitData.tracking_type === 'COUNT' && habitData.count_goal ?
                    parseInt(habitData.count_goal, 10) : existingHabit.count_goal,
                numeric_goal: habitData.tracking_type === 'NUMERIC' && habitData.numeric_goal ?
                    parseFloat(habitData.numeric_goal) : existingHabit.numeric_goal,
                units: habitData.units !== undefined ? habitData.units : existingHabit.units,
                skip_on_vacation: habitData.skip_on_vacation !== undefined ?
                    habitData.skip_on_vacation : existingHabit.skip_on_vacation,
                require_evidence: habitData.require_evidence !== undefined ?
                    habitData.require_evidence : existingHabit.require_evidence,
                location_based: habitData.location_based !== undefined ?
                    habitData.location_based : existingHabit.location_based,
                location_name: habitData.location_name !== undefined ?
                    habitData.location_name : existingHabit.location_name,
                location_lat: habitData.location_lat !== undefined ?
                    parseFloat(habitData.location_lat) : existingHabit.location_lat,
                location_lng: habitData.location_lng !== undefined ?
                    parseFloat(habitData.location_lng) : existingHabit.location_lng,
                location_radius: habitData.location_radius !== undefined ?
                    parseInt(habitData.location_radius, 10) : existingHabit.location_radius,
                motivation_quote: habitData.motivation_quote !== undefined ?
                    habitData.motivation_quote : existingHabit.motivation_quote,
                external_resource_url: habitData.external_resource_url !== undefined ?
                    habitData.external_resource_url : existingHabit.external_resource_url,
                tags: processedTags !== undefined ? processedTags : existingHabit.tags,
                cue: habitData.cue !== undefined ? habitData.cue : existingHabit.cue,
                reward: habitData.reward !== undefined ? habitData.reward : existingHabit.reward,
                difficulty: habitData.difficulty || existingHabit.difficulty,
                domain_id: habitData.domain_id ?
                    parseInt(habitData.domain_id, 10) : existingHabit.domain_id,
                grace_period_enabled: habitData.grace_period_enabled !== undefined ?
                    habitData.grace_period_enabled : existingHabit.grace_period_enabled,
                grace_period_hours: habitData.grace_period_hours !== undefined ?
                    parseInt(habitData.grace_period_hours, 10) : existingHabit.grace_period_hours,
                // Use calculated points values instead of user input
                points_per_completion: pointsValue,
                bonus_points_streak: streakBonusPoints
            },
            include: {
                domain: true,
                reminders: true,
                streak: true
            }
        });

        // Handle reminders update if provided
        if (habitData.reminders && Array.isArray(habitData.reminders)) {
            // First delete existing reminders
            await prisma.habitReminder.deleteMany({
                where: {
                    habit_id: parseInt(habitId, 10),
                    user_id: userId
                }
            });

            // Process each reminder individually to handle time format issues
            for (const reminder of habitData.reminders) {
                try {
                    // Create a default reminder time (9:00 AM today)
                    const defaultTime = new Date();
                    defaultTime.setHours(9, 0, 0, 0);

                    // Parse the time string properly
                    let reminderTime = defaultTime;

                    if (reminder.time) {
                        // Handle time string format (HH:MM:SS or HH:MM)
                        if (typeof reminder.time === 'string') {
                            if (reminder.time.includes(':')) {
                                // Format: "09:00:00" or "09:00"
                                const now = new Date();
                                const [hourStr, minuteStr, secondStr = '0'] = reminder.time.split(':');

                                const hour = parseInt(hourStr, 10);
                                const minute = parseInt(minuteStr, 10);
                                const second = parseInt(secondStr, 10);

                                if (!isNaN(hour) && !isNaN(minute) && !isNaN(second) &&
                                    hour >= 0 && hour < 24 && minute >= 0 && minute < 60 && second >= 0 && second < 60) {
                                    reminderTime = new Date(now);
                                    reminderTime.setHours(hour, minute, second, 0);
                                }
                            }
                        }
                    }

                    // Create each reminder with validated time
                    await prisma.habitReminder.create({
                        data: {
                            habit_id: parseInt(habitId, 10),
                            user_id: userId,
                            reminder_time: reminderTime,
                            repeat: reminder.repeat || 'DAILY',
                            notification_message: reminder.message || `Time to complete your habit: ${updatedHabit.name}`,
                            is_enabled: reminder.is_enabled !== undefined ? reminder.is_enabled : true,
                            pre_notification_minutes: reminder.pre_notification_minutes || 10,
                            follow_up_enabled: reminder.follow_up_enabled !== undefined ? reminder.follow_up_enabled : true,
                            follow_up_minutes: reminder.follow_up_minutes || 30
                        }
                    });
                } catch (reminderError) {
                    console.error(`Failed to create reminder:`, reminderError);
                    // Continue with other reminders
                }
            }

            // Fetch updated habit with new reminders
            const habitWithReminders = await prisma.habit.findUnique({
                where: { habit_id: parseInt(habitId, 10) },
                include: {
                    domain: true,
                    reminders: true,
                    streak: true
                }
            });

            return res.status(200).json({
                success: true,
                message: 'Habit updated successfully with new reminders',
                data: habitWithReminders
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Habit updated successfully',
            data: updatedHabit
        });
    } catch (error) {
        console.error('Error updating habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update habit',
            error: error.message
        });
    }
};

/**
 * Delete a habit
 */
const deleteHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to delete it'
            });
        }

        // Delete related entities first to avoid foreign key constraints
        // Delete reminders
        await prisma.habitReminder.deleteMany({
            where: {
                habit_id: parseInt(habitId, 10)
            }
        });

        // Delete daily statuses
        await prisma.habitDailyStatus.deleteMany({
            where: {
                habit_id: parseInt(habitId, 10)
            }
        });

        // Delete streak data
        await prisma.habitStreak.deleteMany({
            where: {
                habit_id: parseInt(habitId, 10)
            }
        });

        // Delete streak resets
        await prisma.habitReset.deleteMany({
            where: {
                habit_id: parseInt(habitId, 10)
            }
        });

        // Delete logs
        await prisma.habitLog.deleteMany({
            where: {
                habit_id: parseInt(habitId, 10)
            }
        });

        // Finally delete the habit
        await prisma.habit.delete({
            where: {
                habit_id: parseInt(habitId, 10)
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit and all related data deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete habit',
            error: error.message
        });
    }
};

/**
 * Archive a habit (mark as inactive)
 */
const archiveHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to archive it'
            });
        }

        // Update habit to inactive
        const updatedHabit = await prisma.habit.update({
            where: {
                habit_id: parseInt(habitId, 10)
            },
            data: {
                is_active: false
            },
            include: {
                domain: true,
                streak: true
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit archived successfully',
            data: updatedHabit
        });
    } catch (error) {
        console.error('Error archiving habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to archive habit',
            error: error.message
        });
    }
};

/**
 * Restore an archived habit (mark as active)
 */
const restoreHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to restore it'
            });
        }

        // Update habit to active
        const updatedHabit = await prisma.habit.update({
            where: {
                habit_id: parseInt(habitId, 10)
            },
            data: {
                is_active: true
            },
            include: {
                domain: true,
                streak: true
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit restored successfully',
            data: updatedHabit
        });
    } catch (error) {
        console.error('Error restoring habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to restore habit',
            error: error.message
        });
    }
};

/**
 * Get the next scheduled occurrence of a habit after a given date
 */
const getNextOccurrence = async (habit, startDate = new Date()) => {
    try {
        // Create a copy of the start date to avoid modifying the original
        let currentDate = new Date(startDate);
        currentDate.setHours(0, 0, 0, 0);

        // Check the next 30 days at most
        for (let i = 1; i <= 30; i++) {
            // Move to the next day
            currentDate.setDate(currentDate.getDate() + 1);

            // Check if the habit is scheduled for this date
            const isScheduled = await isHabitScheduledForDate(habit, currentDate);

            if (isScheduled) {
                return currentDate;
            }
        }

        // If no occurrence found in the next 30 days, return null
        return null;
    } catch (error) {
        console.error('Error getting next occurrence:', error);
        return null;
    }
};

/**
 * Reset a habit streak manually
 */
const resetHabitStreak = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);
        const { reason, notes } = req.body;

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            },
            include: {
                streak: true
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to reset its streak'
            });
        }

        if (!habit.streak || habit.streak.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No streak record found for this habit'
            });
        }

        const currentStreak = habit.streak[0].current_streak;

        // Create reset record
        await prisma.habitReset.create({
            data: {
                habit_id: parseInt(habitId, 10),
                user_id: userId,
                reset_date: new Date(),
                previous_streak: currentStreak,
                reason: reason || 'USER_INITIATED',
                user_initiated: true,
                notes: notes || 'Manually reset by user.'
            }
        });

        // Reset the streak
        const updatedStreak = await prisma.habitStreak.update({
            where: { streak_id: habit.streak[0].streak_id },
            data: {
                current_streak: 0,
                last_reset_reason: reason || 'USER_INITIATED',
                grace_period_used: false
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit streak reset successfully',
            data: {
                habit_id: parseInt(habitId, 10),
                previous_streak: currentStreak,
                new_streak: 0,
                reset_reason: reason || 'USER_INITIATED',
                reset_date: new Date()
            }
        });
    } catch (error) {
        console.error('Error resetting habit streak:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset habit streak',
            error: error.message
        });
    }
};

/**
 * Set a custom streak for a habit
 */
const setHabitStreak = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);
        const { streak, reason } = req.body;

        if (streak === undefined || isNaN(parseInt(streak, 10))) {
            return res.status(400).json({
                success: false,
                message: 'Valid streak value is required'
            });
        }

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            },
            include: {
                streak: true
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to update its streak'
            });
        }

        if (!habit.streak || habit.streak.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No streak record found for this habit'
            });
        }

        const newStreakValue = parseInt(streak, 10);
        const currentStreak = habit.streak[0].current_streak;

        // Create an adjustment record
        await prisma.habitReset.create({
            data: {
                habit_id: parseInt(habitId, 10),
                user_id: userId,
                reset_date: new Date(),
                previous_streak: currentStreak,
                reason: 'MANUAL_ADJUSTMENT',
                user_initiated: true,
                notes: reason || `Manually adjusted streak from ${currentStreak} to ${newStreakValue}.`
            }
        });

        // Update the streak
        const updatedStreak = await prisma.habitStreak.update({
            where: { streak_id: habit.streak[0].streak_id },
            data: {
                current_streak: newStreakValue,
                longest_streak: Math.max(newStreakValue, habit.streak[0].longest_streak),
                last_reset_reason: 'MANUAL_ADJUSTMENT'
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit streak updated successfully',
            data: {
                habit_id: parseInt(habitId, 10),
                previous_streak: currentStreak,
                new_streak: newStreakValue,
                longest_streak: updatedStreak.longest_streak,
                adjustment_reason: reason || 'Manual adjustment by user'
            }
        });
    } catch (error) {
        console.error('Error setting habit streak:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to set habit streak',
            error: error.message
        });
    }
};

/**
 * Toggle a habit as favorite/unfavorite
 */
const toggleFavoriteHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to update it'
            });
        }

        // Toggle the favorite status
        const updatedHabit = await prisma.habit.update({
            where: {
                habit_id: parseInt(habitId, 10)
            },
            data: {
                is_favorite: !habit.is_favorite
            }
        });

        return res.status(200).json({
            success: true,
            message: updatedHabit.is_favorite ? 'Habit marked as favorite' : 'Habit removed from favorites',
            data: {
                habit_id: parseInt(habitId, 10),
                is_favorite: updatedHabit.is_favorite
            }
        });
    } catch (error) {
        console.error('Error toggling favorite status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to toggle favorite status',
            error: error.message
        });
    }
};

/**
 * Helper function to update habit streak after completion
 */
const updateHabitStreak = async (habit, userId, completionDate) => {
    try {
        if (!habit.streak || habit.streak.length === 0) {
            // Create streak record if it doesn't exist
            const newStreak = await prisma.habitStreak.create({
                data: {
                    habit_id: habit.habit_id,
                    user_id: userId,
                    current_streak: 1,
                    longest_streak: 1,
                    start_date: completionDate,
                    missed_days_count: 0
                }
            });

            return {
                previousStreak: 0,
                newStreak: 1,
                longestStreak: 1
            };
        }

        const streakRecord = habit.streak[0];
        let { current_streak, longest_streak } = streakRecord;

        // Get previous completion for this habit
        const previousCompletion = await prisma.habitDailyStatus.findFirst({
            where: {
                habit_id: habit.habit_id,
                user_id: userId,
                is_completed: true,
                date: {
                    lt: completionDate
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        // Calculate if this is a streak continuation
        let isStreakContinuation = false;
        let daysSinceLastCompletion = 0;

        if (previousCompletion) {
            const previousDate = new Date(previousCompletion.date);
            previousDate.setHours(0, 0, 0, 0);

            // Calculate days between completions
            daysSinceLastCompletion = Math.round(
                (completionDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000)
            );

            // Streak continues if completed the next day or same day
            if (daysSinceLastCompletion <= 1) {
                isStreakContinuation = true;
            }
            // Check grace period if enabled
            else if (habit.grace_period_enabled && daysSinceLastCompletion <= (habit.grace_period_hours / 24 + 1)) {
                isStreakContinuation = true;

                // Update streak to indicate grace period was used
                await prisma.habitStreak.update({
                    where: { streak_id: streakRecord.streak_id },
                    data: { grace_period_used: true }
                });
            }
        } else {
            // First completion ever, start streak at 1
            isStreakContinuation = true;
        }

        let previousStreak = current_streak;

        if (isStreakContinuation) {
            // Only increment streak if this isn't a duplicate completion for the same day
            if (daysSinceLastCompletion > 0) {
                current_streak += 1;

                // Update longest streak if needed
                longest_streak = Math.max(current_streak, longest_streak);
            }
        } else {
            // Streak was broken, reset to 1
            current_streak = 1;
        }

        // Update the streak record
        await prisma.habitStreak.update({
            where: {
                streak_id: streakRecord.streak_id
            },
            data: {
                current_streak,
                longest_streak,
                last_completed: completionDate
            }
        });

        return {
            previousStreak,
            newStreak: current_streak,
            longestStreak: longest_streak,
            isStreakContinuation
        };
    } catch (error) {
        console.error('Error updating habit streak:', error);
        throw error;
    }
};

/**
 * Helper function to handle skipped habits with streak maintenance
 */
const handleSkippedHabit = async (habit, userId, skipDate, skipReason, maintainStreak = false) => {
    try {
        // If this skip shouldn't affect streak, just return current streak
        if (maintainStreak) {
            // Get current streak
            const streakRecord = await prisma.habitStreak.findFirst({
                where: {
                    habit_id: habit.habit_id,
                    user_id: userId
                }
            });

            if (!streakRecord) {
                return { currentStreak: 0 };
            }

            return { currentStreak: streakRecord.current_streak };
        }

        // Otherwise reset streak to 0
        const streakRecord = await prisma.habitStreak.findFirst({
            where: {
                habit_id: habit.habit_id,
                user_id: userId
            }
        });

        if (!streakRecord) {
            return { currentStreak: 0 };
        }

        const currentStreak = streakRecord.current_streak;

        // Only create reset record if there was a streak to lose
        if (currentStreak > 0) {
            // Create reset record
            await prisma.habitReset.create({
                data: {
                    habit_id: habit.habit_id,
                    user_id: userId,
                    reset_date: new Date(),
                    previous_streak: currentStreak,
                    reason: 'USER_SKIPPED',
                    user_initiated: true,
                    notes: skipReason || 'User skipped this habit.'
                }
            });

            // Reset streak
            await prisma.habitStreak.update({
                where: { streak_id: streakRecord.streak_id },
                data: {
                    current_streak: 0,
                    missed_days_count: streakRecord.missed_days_count + 1,
                    last_reset_reason: 'USER_SKIPPED'
                }
            });

            // Notify about significant streak loss
            if (currentStreak >= 7) {
                await prisma.notification.create({
                    data: {
                        user_id: userId,
                        title: 'Streak Reset',
                        content: `Your ${currentStreak}-day streak for "${habit.name}" was reset because you skipped today's completion.`,
                        type: 'STREAK_MILESTONE',
                        related_id: habit.habit_id
                    }
                });
            }
        }

        return { currentStreak: 0, previousStreak: currentStreak };
    } catch (error) {
        console.error('Error handling skipped habit:', error);
        throw error;
    }
};

/**
 * Helper function to recalculate a habit streak from all completion records
 */
const recalculateHabitStreak = async (habitId, userId) => {
    try {
        // Get all completed daily statuses, ordered by date
        const completions = await prisma.habitDailyStatus.findMany({
            where: {
                habit_id: habitId,
                user_id: userId,
                is_completed: true
            },
            orderBy: {
                date: 'asc'
            }
        });

        if (completions.length === 0) {
            // No completions, reset streak to 0
            return await prisma.habitStreak.update({
                where: {
                    habit_id_user_id: {
                        habit_id: habitId,
                        user_id: userId
                    }
                },
                data: {
                    current_streak: 0,
                    longest_streak: 0
                }
            });
        }

        // Get the habit with grace period settings
        const habit = await prisma.habit.findUnique({
            where: { habit_id: habitId }
        });

        // Calculate current streak
        let currentStreak = 1; // Start with 1 for the first completion
        let longestStreak = 1;
        let previousDate = new Date(completions[0].date);

        // Skip the first entry since we've already counted it
        for (let i = 1; i < completions.length; i++) {
            const currentDate = new Date(completions[i].date);

            // Calculate days between completions
            const daysBetween = Math.round(
                (currentDate.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000)
            );

            // Check if this is a continuation (1 day apart or within grace period)
            if (daysBetween === 1 ||
                (habit.grace_period_enabled && daysBetween <= (habit.grace_period_hours / 24 + 1))) {
                // This is a continuation
                currentStreak++;
            } else if (daysBetween === 0) {
                // Same day, don't count
                continue;
            } else {
                // The streak was broken
                currentStreak = 1;
            }

            // Update longest streak if needed
            longestStreak = Math.max(currentStreak, longestStreak);

            // Update previous date
            previousDate = currentDate;
        }

        // Check if streak is still active
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastCompletionDate = new Date(completions[completions.length - 1].date);
        lastCompletionDate.setHours(0, 0, 0, 0);

        const daysSinceLastCompletion = Math.round(
            (today.getTime() - lastCompletionDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        // If it's been more than the grace period since the last completion, reset current streak
        if (daysSinceLastCompletion > 1 &&
            !(habit.grace_period_enabled && daysSinceLastCompletion <= (habit.grace_period_hours / 24 + 1))) {
            currentStreak = 0;
        }

        // Update streak record
        return await prisma.habitStreak.update({
            where: {
                habit_id_user_id: {
                    habit_id: habitId,
                    user_id: userId
                }
            },
            data: {
                current_streak: currentStreak,
                longest_streak: longestStreak,
                last_completion_date: completions[completions.length - 1].date
            }
        });
    } catch (error) {
        console.error('Error recalculating habit streak:', error);
        throw error;
    }
};

/**
 * Helper function to check for streak milestones and award bonus points
 */
const checkAndAwardStreakMilestone = async (habit, userId, streakLength) => {
    try {
        // Check if this streak length is a milestone
        const milestones = [7, 14, 30, 60, 90, 180, 365];

        if (!milestones.includes(streakLength)) {
            return null;
        }

        // Calculate bonus points based on milestone
        let bonusPoints = 0;

        if (streakLength >= 365) {
            bonusPoints = 300;
        } else if (streakLength >= 180) {
            bonusPoints = 150;
        } else if (streakLength >= 90) {
            bonusPoints = 75;
        } else if (streakLength >= 60) {
            bonusPoints = 50;
        } else if (streakLength >= 30) {
            bonusPoints = 30;
        } else if (streakLength >= 14) {
            bonusPoints = 15;
        } else if (streakLength >= 7) {
            bonusPoints = 10;
        }

        if (bonusPoints > 0) {
            // Create points log entry for milestone
            await prisma.pointsLog.create({
                data: {
                    user_id: userId,
                    points: bonusPoints,
                    reason: `Streak Milestone: ${streakLength} Days`,
                    description: `You've maintained "${habit.name}" for ${streakLength} days in a row!`,
                    source_type: 'STREAK_MILESTONE',
                    source_id: habit.habit_id
                }
            });

            // Update user's total points
            await prisma.user.update({
                where: { user_id: userId },
                data: {
                    points_gained: { increment: bonusPoints }
                }
            });

            // Create notification
            await prisma.notification.create({
                data: {
                    user_id: userId,
                    title: `${streakLength}-Day Streak Achieved!`,
                    content: `Congratulations! You've kept up your habit "${habit.name}" for ${streakLength} days and earned ${bonusPoints} bonus points!`,
                    type: 'STREAK_MILESTONE',
                    related_id: habit.habit_id
                }
            });

            return {
                milestone: streakLength,
                bonusPoints
            };
        }

        return null;
    } catch (error) {
        console.error('Error checking streak milestone:', error);
        return null;
    }
};

/**
 * Get habit streak history with detailed analysis
 */
const getHabitStreakHistory = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = parseInt(req.user);

        // Validate habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to view its streak history'
            });
        }

        // Get current streak
        const streak = await prisma.habitStreak.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            }
        });

        // Get streak reset history
        const resets = await prisma.habitReset.findMany({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            },
            orderBy: {
                reset_date: 'desc'
            },
            take: 10
        });

        // Get completion history for analysis
        const completions = await prisma.habitDailyStatus.findMany({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId,
                is_completed: true
            },
            orderBy: {
                date: 'desc'
            },
            take: 90 // Get last 90 days of completions for analysis
        });

        // Analyze completion patterns
        const completionDates = completions.map(c => new Date(c.date));

        // Calculate current active streak
        let currentStreak = streak?.current_streak || 0;

        // Calculate longest ever streak
        let longestStreak = streak?.longest_streak || 0;

        // Calculate streak reliability (percentage of days kept in the habit)
        let streakReliability = 0;

        if (completions.length > 0) {
            // Get date range
            const oldestCompletion = new Date(Math.min(...completionDates.map(d => d.getTime())));
            const latestCompletion = new Date(Math.max(...completionDates.map(d => d.getTime())));

            // Calculate total days in range
            const totalDaysInRange = Math.round(
                (latestCompletion.getTime() - oldestCompletion.getTime()) / (24 * 60 * 60 * 1000)
            ) + 1;

            // Calculate reliability
            streakReliability = totalDaysInRange > 0
                ? (completions.length / totalDaysInRange) * 100
                : 0;
        }

        // Get total resets
        const totalResetCount = await prisma.habitReset.count({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            }
        });

        // Get missed days count
        const missedDaysCount = streak?.missed_days_count || 0;

        // Calculate completion rate by day of week to find patterns
        const completionsByDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, ..., Sat

        completionDates.forEach(date => {
            const dayOfWeek = date.getDay();
            completionsByDayOfWeek[dayOfWeek]++;
        });

        // Find strongest and weakest days
        let strongestDay = 0;
        let weakestDay = 0;
        let maxCompletions = completionsByDayOfWeek[0];
        let minCompletions = completionsByDayOfWeek[0];

        for (let i = 1; i < 7; i++) {
            if (completionsByDayOfWeek[i] > maxCompletions) {
                maxCompletions = completionsByDayOfWeek[i];
                strongestDay = i;
            }

            if (completionsByDayOfWeek[i] < minCompletions) {
                minCompletions = completionsByDayOfWeek[i];
                weakestDay = i;
            }
        }

        // Calculate streak trends (improving or declining)
        let streakTrend = 'stable';

        if (resets.length >= 2) {
            // Calculate average streak length before last few resets
            const avgLastFewStreaks = resets.slice(0, Math.min(5, resets.length))
                .reduce((sum, reset) => sum + reset.previous_streak, 0) / Math.min(5, resets.length);

            if (currentStreak > avgLastFewStreaks * 1.5) {
                streakTrend = 'improving';
            } else if (currentStreak < avgLastFewStreaks * 0.5) {
                streakTrend = 'declining';
            }
        }

        // Get days of the week as strings
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        return res.status(200).json({
            success: true,
            data: {
                habit_id: parseInt(habitId, 10),
                name: habit.name,
                current_streak: currentStreak,
                longest_streak: longestStreak,
                resets: resets,
                total_completions: completions.length,
                streak_reliability: Math.round(streakReliability * 10) / 10,
                total_reset_count: totalResetCount,
                missed_days_count: missedDaysCount,
                completions_by_day: daysOfWeek.map((day, index) => ({
                    day,
                    count: completionsByDayOfWeek[index]
                })),
                strongest_day: daysOfWeek[strongestDay],
                weakest_day: daysOfWeek[weakestDay],
                streak_trend: streakTrend,
                grace_period_enabled: habit.grace_period_enabled,
                grace_period_hours: habit.grace_period_hours
            }
        });
    } catch (error) {
        console.error('Error getting habit streak history:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve habit streak history',
            error: error.message
        });
    }
};

/**
 * Get user's habit domains with statistics
 */
const getHabitDomains = async (req, res) => {
    try {
        const userId = parseInt(req.user);

        // Get all domains
        const domains = await prisma.habitDomain.findMany({
            where: {
                OR: [
                    { is_default: true }
                ]
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Get counts of habits in each domain
        const domainStats = await Promise.all(domains.map(async (domain) => {
            // Count total habits in this domain
            const totalHabits = await prisma.habit.count({
                where: {
                    domain_id: domain.domain_id,
                    user_id: userId
                }
            });

            // Count active habits in this domain
            const activeHabits = await prisma.habit.count({
                where: {
                    domain_id: domain.domain_id,
                    user_id: userId,
                    is_active: true
                }
            });

            // Get today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Count habits scheduled for today
            const habitsScheduledToday = await prisma.habitDailyStatus.count({
                where: {
                    user_id: userId,
                    date: today,
                    is_scheduled: true,
                    habit: {
                        domain_id: domain.domain_id
                    }
                }
            });

            // Count habits completed today
            const habitsCompletedToday = await prisma.habitDailyStatus.count({
                where: {
                    user_id: userId,
                    date: today,
                    is_completed: true,
                    habit: {
                        domain_id: domain.domain_id
                    }
                }
            });

            // Calculate average streak for habits in this domain
            const habitWithStreaks = await prisma.habit.findMany({
                where: {
                    domain_id: domain.domain_id,
                    user_id: userId,
                    is_active: true
                },
                include: {
                    streak: true
                }
            });

            const totalStreak = habitWithStreaks.reduce((sum, habit) => {
                return sum + (habit.streak[0]?.current_streak || 0);
            }, 0);

            const avgStreak = habitWithStreaks.length > 0
                ? Math.round(totalStreak / habitWithStreaks.length * 10) / 10
                : 0;

            // Get total points earned from habits in this domain
            const pointsData = await prisma.pointsLog.aggregate({
                where: {
                    user_id: userId,
                    source_type: 'HABIT_COMPLETION',
                    source_id: {
                        in: habitWithStreaks.map(h => h.habit_id)
                    }
                },
                _sum: {
                    points: true
                }
            });

            return {
                ...domain,
                stats: {
                    total_habits: totalHabits,
                    active_habits: activeHabits,
                    scheduled_today: habitsScheduledToday,
                    completed_today: habitsCompletedToday,
                    avg_streak: avgStreak,
                    total_points: pointsData._sum?.points || 0
                }
            };
        }));

        console.log(domainStats)

        return res.status(200).json({
            success: true,
            data: domainStats
        });
    } catch (error) {
        console.error('Error getting habit domains:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve habit domains',
            error: error.message
        });
    }
};

const getAllHabitDomains = async (req, res) => {
    try {
        // Get all domains without any filtering
        const domains = await prisma.habitDomain.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        return res.status(200).json({
            success: true,
            data: domains
        });
    } catch (error) {
        console.error('Error getting all habit domains:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve habit domains',
            error: error.message
        });
    }
};


/**
 * Add a new habit domain
 */
const addHabitDomain = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { name, description, icon, color } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Domain name is required'
            });
        }

        // Create the new domain
        const newDomain = await prisma.habitDomain.create({
            data: {
                name,
                description: description || null,
                icon: icon || null,
                color: color || null,
                is_default: false,
                user_id: userId
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Habit domain created successfully',
            data: newDomain
        });
    } catch (error) {
        console.error('Error adding habit domain:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create habit domain',
            error: error.message
        });
    }
};

/**
 * Update a habit domain
 */
const updateHabitDomain = async (req, res) => {
    try {
        const { domainId } = req.params;
        const userId = parseInt(req.user);
        const { name, description, icon, color } = req.body;

        // Check if domain exists and belongs to user
        const domain = await prisma.habitDomain.findFirst({
            where: {
                domain_id: parseInt(domainId, 10),
                user_id: userId,
                is_default: false // Can't modify default domains
            }
        });

        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found or you do not have permission to update it'
            });
        }

        // Update the domain
        const updatedDomain = await prisma.habitDomain.update({
            where: {
                domain_id: parseInt(domainId, 10)
            },
            data: {
                name: name || domain.name,
                description: description !== undefined ? description : domain.description,
                icon: icon !== undefined ? icon : domain.icon,
                color: color !== undefined ? color : domain.color
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit domain updated successfully',
            data: updatedDomain
        });
    } catch (error) {
        console.error('Error updating habit domain:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update habit domain',
            error: error.message
        });
    }
};

/**
 * Delete a habit domain
 */
const deleteHabitDomain = async (req, res) => {
    try {
        const { domainId } = req.params;
        const userId = parseInt(req.user);

        // Check if domain exists and belongs to user
        const domain = await prisma.habitDomain.findFirst({
            where: {
                domain_id: parseInt(domainId, 10),
                user_id: userId,
                is_default: false // Can't delete default domains
            }
        });

        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found or you do not have permission to delete it'
            });
        }

        // Check if there are habits using this domain
        const habitCount = await prisma.habit.count({
            where: {
                domain_id: parseInt(domainId, 10)
            }
        });

        if (habitCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete domain that contains habits. Please move or delete the habits first.'
            });
        }

        // Delete the domain
        await prisma.habitDomain.delete({
            where: {
                domain_id: parseInt(domainId, 10)
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit domain deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting habit domain:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete habit domain',
            error: error.message
        });
    }
};

// Export controllers
module.exports = {
    addHabit,
    getHabitById,
    getUserHabits,
    getHabitsByDate,
    getHabitsByDomain,
    logHabitCompletion,
    skipHabit,
    processHabitDailyReset,
    deleteHabitLog,
    updateHabit,
    deleteHabit,
    archiveHabit,
    restoreHabit,
    resetHabitStreak,
    setHabitStreak,
    toggleFavoriteHabit,
    getHabitStreakHistory,
    getHabitDomains,
    addHabitDomain,
    updateHabitDomain,
    deleteHabitDomain,
    getAllHabitDomains
};