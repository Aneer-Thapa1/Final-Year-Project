const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
            // This is a simplified approach - in a real app, you would check actual scheduled records
            const scheduledDaysThisWeek =  getScheduledDaysInRange(
                habit.habit_id,
                startOfWeek,
                targetDate
            );

            // If we've already scheduled it enough times this week, don't schedule more
            if (scheduledDaysThisWeek >= habit.frequency_value) {
                return false;
            }

            // Otherwise, tentatively schedule it
            // In a real app, you might have more complex logic for which days of the week to pick
            return true;

        case 'X_TIMES_MONTH':
            // Get the start of the month
            const startOfMonth = new Date(targetDate);
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Check if this habit has already been scheduled enough times this month
            const scheduledDaysThisMonth =  getScheduledDaysInRange(
                habit.habit_id,
                startOfMonth,
                targetDate
            );

            // If we've already scheduled it enough times this month, don't schedule more
            if (scheduledDaysThisMonth >= habit.frequency_value) {
                return false;
            }

            // Otherwise, tentatively schedule it
            return true;

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
 * Helper function to get a formatted time display string for a habit
 * In a real app, this would use habit's actual time settings
 */
const getHabitTimeDisplay = (habit) => {
    // This is a placeholder - in a real app, you would use the habit's scheduled time
    // For now, we'll return a default value
    return "Anytime";
};

/**
 * Helper function to create a daily status record for a habit
 */
const createHabitDailyStatus = async (habitId, userId, date, isScheduled) => {
    try {
        await prisma.habitDailyStatus.create({
            data: {
                habit_id: habitId,
                user_id: userId,
                date: date,
                is_scheduled: isScheduled,
                is_completed: false,
                is_skipped: false
            }
        });
    } catch (error) {
        console.error('Error creating habit daily status:', error);
    }
};

/**
 * Add a new habit to the database with enhanced reminder support
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
                grace_period_hours: grace_period_hours ? parseInt(grace_period_hours, 10) : 24
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

        await prisma.habitDailyStatus.create({
            data: {
                habit_id: newHabit.habit_id,
                user_id: user_id,
                date: today,
                is_scheduled: isHabitScheduledForDate(newHabit, today),
                is_completed: false,
                is_skipped: false
            }
        });

        // Add reminders with enhanced features
        if (reminders && Array.isArray(reminders) && reminders.length > 0) {
            const reminderData = reminders.map(reminder => ({
                habit_id: newHabit.habit_id,
                user_id: user_id,
                reminder_time: new Date(reminder.time),
                repeat: reminder.repeat || 'DAILY',
                notification_message: reminder.message || `Time to complete your habit: ${name}`,
                is_enabled: true,
                pre_notification_minutes: reminder.pre_notification_minutes || 10,
                follow_up_enabled: reminder.follow_up_enabled !== undefined ? reminder.follow_up_enabled : true,
                follow_up_minutes: reminder.follow_up_minutes || 30
            }));

            await prisma.habitReminder.createMany({
                data: reminderData
            });
        }

        // Update user's totalHabitsCreated stat
        await prisma.user.update({
            where: { user_id: user_id },
            data: { totalHabitsCreated: { increment: 1 } }
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
        const userId = req.user.user_id;

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
                    completionRate: Math.round(completionRate * 10) / 10
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

        // Add completion and scheduled status
        const enhancedHabits = habits.map(habit => {
            const todayStatus = habitStatusMap[habit.habit_id];

            // If no status exists yet, determine if it should be scheduled
            const isScheduled = todayStatus ?
                todayStatus.is_scheduled :
                isHabitScheduledForDate(habit, today);

            return {
                ...habit,
                scheduledToday: isScheduled,
                completedToday: todayStatus ? todayStatus.is_completed : false,
                skippedToday: todayStatus ? todayStatus.is_skipped : false,
                todayStatus: todayStatus || null,
                nextOccurrence: todayStatus && !todayStatus.is_scheduled ?
                    getNextOccurrence(habit) : null
            };
        });

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

        // Get day of week (0-6, Sunday is 0)
        const dayOfWeek = targetDate.getDay();

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
                const isScheduled = isHabitScheduledForDate(habit, targetDate);

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

        // Get user's daily goal
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { dailyGoal: true }
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
                goalAchieved: completedHabits >= (user?.dailyGoal || 0)
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
        const userId = req.user.user_id;
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
        const habitsWithStatus = habits.map(habit => {
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
            const isScheduled = isHabitScheduledForDate(habit, today);

            // Create status if needed (async - no await)
            if (isScheduled) {
                createHabitDailyStatus(habit.habit_id, userId, today, true);
            }

            return {
                ...habit,
                isScheduledToday: isScheduled,
                completedToday: false,
                skippedToday: false,
                todayStatus: null
            };
        });

        // Get domain stats
        const domainStats = {
            totalHabits: habits.length,
            scheduledToday: habitsWithStatus.filter(h => h.isScheduledToday).length,
            completedToday: habitsWithStatus.filter(h => h.completedToday).length,
            averageStreak: habits.length > 0
                ? Math.round(habits.reduce((sum, habit) => sum + (habit.streak[0]?.current_streak || 0), 0) / habits.length)
                : 0
        };

        return res.status(200).json({
            success: true,
            domain,
            data: habitsWithStatus,
            stats: domainStats
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
 * Log a habit completion with enhanced streak management
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
                streak: true
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
            const isScheduled = isHabitScheduledForDate(habit, completionDay);

            dailyStatus = await prisma.habitDailyStatus.create({
                data: {
                    habit_id: parseInt(habitId, 10),
                    user_id: userId,
                    date: completionDay,
                    is_scheduled: isScheduled,
                    is_completed: false,
                    is_skipped: false
                }
            });
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
            skip_reason: skipped ? skip_reason : null
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
        const newLog = await prisma.habitLog.create({
            data: logData
        });

        // Update streak based on enhanced rules
        if (completed && !skipped) {
            // Handle streak calculation with more sophisticated rules
            await updateHabitStreak(habit, userId, completionDay);
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
            where: { user_id: userId }
        });

        // If daily goal is completed, increment daily streak
        if (completedHabitsToday >= user.dailyGoal) {
            await prisma.user.update({
                where: { user_id: userId },
                data: {
                    currentDailyStreak: { increment: 1 },
                    totalHabitsCompleted: { increment: 1 },
                    longestDailyStreak: {
                        set: {
                            connectOrCreate: {
                                where: {
                                    currentDailyStreak: {
                                        gt: user.longestDailyStreak
                                    }
                                },
                                update: user.currentDailyStreak + 1,
                                create: user.currentDailyStreak + 1
                            }
                        }
                    }
                }
            });
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
                dailyGoalMet: completedHabitsToday >= user.dailyGoal
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
 * Process daily habit reset for habits that were due but not completed
 * This should be run every day at midnight for each user's timezone
 */
const processHabitDailyReset = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get yesterday's date in user's timezone
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { timezone: true }
        });

        // Get yesterday in user's timezone
        const userTimezone = user.timezone || 'UTC';
        const yesterday = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

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
            // Check if this habit was scheduled for yesterday
            const isScheduled = isHabitScheduledForDate(habit, yesterday);

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
                dailyStatus = await prisma.habitDailyStatus.create({
                    data: {
                        habit_id: habit.habit_id,
                        user_id: userId,
                        date: yesterday,
                        is_scheduled: true,
                        is_completed: false,
                        is_skipped: false
                    }
                });
            }

            // If not completed or skipped, mark as missed and reset streak if needed
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

                // Reset streak if grace period is not enabled or already used
                if (!habit.grace_period_enabled || habit.streak[0]?.grace_period_used) {
                    // Get the current streak
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

                    results.push({
                        habit_id: habit.habit_id,
                        name: habit.name,
                        action: 'streak_reset',
                        previous_streak: currentStreak
                    });
                } else {
                    // Use grace period instead of resetting
                    await prisma.habitStreak.update({
                        where: { streak_id: habit.streak[0].streak_id },
                        data: {
                            grace_period_used: true,
                            missed_days_count: habit.streak[0].missed_days_count + 1
                        }
                    });

                    results.push({
                        habit_id: habit.habit_id,
                        name: habit.name,
                        action: 'grace_period_used',
                        current_streak: habit.streak[0].current_streak
                    });
                }
            }
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

        if (!dailyStatus) {
            const isScheduled = isHabitScheduledForDate(habit, skipDate);

            dailyStatus = await prisma.habitDailyStatus.create({
                data: {
                    habit_id: parseInt(habitId, 10),
                    user_id: userId,
                    date: skipDate,
                    is_scheduled: isScheduled,
                    is_completed: false,
                    is_skipped: false
                }
            });
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

        // Handle streak based on habit settings
        if (habit.skip_on_vacation || (reason && reason.toLowerCase().includes('vacation'))) {
            // Vacation skip doesn't affect streak
            await handleSkippedHabit(habit, userId, skipDate, reason, true);
        } else {
            // Regular skip - may affect streak based on settings
            await handleSkippedHabit(habit, userId, skipDate, reason, false);
        }

        return res.status(200).json({
            success: true,
            message: 'Habit skipped successfully',
            data: {
                habit_id: parseInt(habitId, 10),
                date: skipDate.toISOString().split('T')[0],
                status: 'skipped',
                reason: reason || 'User skipped',
                log: skipLog
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
 * Delete a habit log entry with streak recalculation
 */
const deleteHabitLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const userId = req.user.user_id;

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
        if (log.completed) {
            await recalculateHabitStreak(log.habit_id, userId);
        }

        // Update user's total habits completed if needed
        if (log.completed) {
            await prisma.user.update({
                where: { user_id: userId },
                data: { totalHabitsCompleted: { decrement: 1 } }
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Habit log deleted successfully'
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
 * Add a reminder to a habit with enhanced notification settings
 */
const addReminder = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = req.user.user_id;
        const {
            time,
            repeat = 'DAILY',
            message,
            pre_notification_minutes = 10,
            follow_up_enabled = true,
            follow_up_minutes = 30
        } = req.body;

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
                message: 'Habit not found or you do not have permission to add a reminder'
            });
        }

        if (!time) {
            return res.status(400).json({
                success: false,
                message: 'Reminder time is required'
            });
        }

        // Create the reminder with enhanced features
        const newReminder = await prisma.habitReminder.create({
            data: {
                habit_id: parseInt(habitId, 10),
                user_id: userId,
                reminder_time: new Date(time),
                repeat,
                notification_message: message || `Time to complete your ${habit.name} habit!`,
                is_enabled: true,
                pre_notification_minutes,
                follow_up_enabled,
                follow_up_minutes
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Reminder added successfully',
            data: newReminder
        });
    } catch (error) {
        console.error('Error adding reminder:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add reminder',
            error: error.message
        });
    }
};

/**
 * Updates a habit's streak based on completion
 */
async function updateHabitStreak(habit, userId, completionDate) {
    try {
        const habitId = habit.habit_id;
        const streak = habit.streak[0];

        if (!streak) {
            // Create new streak record if none exists
            await prisma.habitStreak.create({
                data: {
                    habit_id: habitId,
                    user_id: userId,
                    current_streak: 1,
                    longest_streak: 1,
                    last_completed: completionDate,
                    start_date: completionDate,
                    missed_days_count: 0,
                    grace_period_used: false
                }
            });
            return;
        }

        // Get the previous completion date
        const lastCompleted = streak.last_completed ? new Date(streak.last_completed) : null;
        lastCompleted?.setHours(0, 0, 0, 0);

        // Determine if this completion continues a streak
        if (!lastCompleted) {
            // First completion ever
            await prisma.habitStreak.update({
                where: { streak_id: streak.streak_id },
                data: {
                    current_streak: 1,
                    longest_streak: Math.max(1, streak.longest_streak),
                    last_completed: completionDate,
                    start_date: completionDate,
                    missed_days_count: 0,
                    grace_period_used: false
                }
            });
            return;
        }

        // Handle streak continuation based on habit frequency
        const newStreakValue = await determineNewStreakValue(
            habit,
            streak,
            lastCompleted,
            completionDate
        );

        // Update the streak record
        await prisma.habitStreak.update({
            where: { streak_id: streak.streak_id },
            data: {
                current_streak: newStreakValue,
                longest_streak: Math.max(newStreakValue, streak.longest_streak),
                last_completed: completionDate,
                missed_days_count: 0,
                grace_period_used: false,
                // If we're starting a new streak, update the start date
                ...(newStreakValue === 1 ? { start_date: completionDate } : {})
            }
        });
    } catch (error) {
        console.error('Error updating habit streak:', error);
    }
}

/**
 * Determines the new streak value based on completion date and habit frequency
 */
async function determineNewStreakValue(habit, streak, lastCompleted, completionDate) {
    const currentStreak = streak.current_streak || 0;

    // For daily habits
    if (habit.frequency_type === 'DAILY') {
        const oneDayAfterLastCompleted = new Date(lastCompleted);
        oneDayAfterLastCompleted.setDate(lastCompleted.getDate() + 1);
        oneDayAfterLastCompleted.setHours(0, 0, 0, 0);

        // Check if this completion is on the same day or the day after
        if (completionDate.getTime() === lastCompleted.getTime() ||
            completionDate.getTime() === oneDayAfterLastCompleted.getTime()) {
            return currentStreak + 1;
        }

        // Check if this is within grace period
        if (habit.grace_period_enabled && !streak.grace_period_used) {
            const gracePeriodEnd = new Date(lastCompleted);
            gracePeriodEnd.setHours(gracePeriodEnd.getHours() + habit.grace_period_hours);

            if (completionDate <= gracePeriodEnd) {
                // Mark grace period as used
                await prisma.habitStreak.update({
                    where: { streak_id: streak.streak_id },
                    data: { grace_period_used: true }
                });
                return currentStreak + 1;
            }
        }

        // Otherwise, start a new streak
        return 1;
    }

    // For non-daily habits, we need to check if this is the next expected date
    const nextScheduledDate = getNextScheduledDate(habit, lastCompleted);

    if (!nextScheduledDate) {
        // If we can't determine next date, be lenient
        return currentStreak + 1;
    }

    // Check if completion is on or before the next scheduled date
    if (completionDate <= nextScheduledDate) {
        return currentStreak + 1;
    }

    // Check for grace period
    if (habit.grace_period_enabled && !streak.grace_period_used) {
        const gracePeriodEnd = new Date(nextScheduledDate);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + habit.grace_period_hours);

        if (completionDate <= gracePeriodEnd) {
            await prisma.habitStreak.update({
                where: { streak_id: streak.streak_id },
                data: { grace_period_used: true }
            });
            return currentStreak + 1;
        }
    }

    // Otherwise, start a new streak
    return 1;
}

/**
 * Get the next scheduled date for a habit
 */
function getNextScheduledDate(habit, fromDate) {
    // For daily habits
    if (habit.frequency_type === 'DAILY') {
        const nextDate = new Date(fromDate);
        nextDate.setDate(fromDate.getDate() + 1);
        return nextDate;
    }

    // For weekdays
    if (habit.frequency_type === 'WEEKDAYS') {
        const nextDate = new Date(fromDate);
        nextDate.setDate(fromDate.getDate() + 1);

        // If it's Friday, the next weekday is Monday (+3 days)
        if (fromDate.getDay() === 5) { // Friday
            nextDate.setDate(fromDate.getDate() + 3);
        }

        return nextDate;
    }

    // For weekends
    if (habit.frequency_type === 'WEEKENDS') {
        const day = fromDate.getDay();
        const nextDate = new Date(fromDate);

        if (day === 0) { // Sunday -> next is Saturday (+6)
            nextDate.setDate(fromDate.getDate() + 6);
        } else if (day === 6) { // Saturday -> next is Sunday (+1)
            nextDate.setDate(fromDate.getDate() + 1);
        } else { // Weekday -> next is Saturday
            nextDate.setDate(fromDate.getDate() + (6 - day));
        }

        return nextDate;
    }

    // For specific days, find the next occurrence
    if (habit.frequency_type === 'SPECIFIC_DAYS' && Array.isArray(habit.specific_days)) {
        const currentDay = fromDate.getDay();
        const specificDays = [...habit.specific_days].sort();

        // Find the next day in the cycle
        const nextDayIndex = specificDays.findIndex(day => day > currentDay);

        if (nextDayIndex !== -1) {
            // Found a day later in the week
            const daysToAdd = specificDays[nextDayIndex] - currentDay;
            const nextDate = new Date(fromDate);
            nextDate.setDate(fromDate.getDate() + daysToAdd);
            return nextDate;
        } else {
            // Wrap around to the first day next week
            const daysToAdd = 7 - currentDay + specificDays[0];
            const nextDate = new Date(fromDate);
            nextDate.setDate(fromDate.getDate() + daysToAdd);
            return nextDate;
        }
    }

    // For interval-based habits
    if (habit.frequency_type === 'INTERVAL') {
        const nextDate = new Date(fromDate);
        nextDate.setDate(fromDate.getDate() + habit.frequency_interval);
        return nextDate;
    }

    // For other types, default to next day
    const nextDate = new Date(fromDate);
    nextDate.setDate(fromDate.getDate() + 1);
    return nextDate;
}

/**
 * Handle skipped habit logic
 */
async function handleSkippedHabit(habit, userId, skipDate, reason, isVacation) {
    try {
        const streak = await prisma.habitStreak.findFirst({
            where: {
                habit_id: habit.habit_id,
                user_id: userId
            }
        });

        if (!streak) {
            return;
        }

        // Vacation skips and skip_on_vacation don't affect streak
        if (isVacation || habit.skip_on_vacation) {
            // Just update the last skip reason, don't change streak
            await prisma.habitStreak.update({
                where: { streak_id: streak.streak_id },
                data: {
                    last_reset_reason: `SKIPPED_${isVacation ? 'VACATION' : 'USER'}`
                }
            });

            return;
        }

        // For regular skips, reset the streak
        await prisma.habitReset.create({
            data: {
                habit_id: habit.habit_id,
                user_id: userId,
                reset_date: new Date(),
                previous_streak: streak.current_streak,
                reason: 'USER_RESET',
                user_initiated: true,
                notes: reason || 'User skipped habit'
            }
        });

        // Reset the streak
        await prisma.habitStreak.update({
            where: { streak_id: streak.streak_id },
            data: {
                current_streak: 0,
                last_reset_reason: 'USER_SKIPPED',
                grace_period_used: false
            }
        });
    } catch (error) {
        console.error('Error handling skipped habit:', error);
    }
}

/**
 * Recalculate a habit's streak from scratch based on completion history
 */
async function recalculateHabitStreak(habitId, userId) {
    try {
        // Get all completed logs for this habit
        const completedLogs = await prisma.habitLog.findMany({
            where: {
                habit_id: habitId,
                user_id: userId,
                completed: true,
                skipped: false
            },
            orderBy: { completed_at: 'asc' }
        });

        // Get the habit data for frequency info
        const habit = await prisma.habit.findUnique({
            where: { habit_id: habitId },
            include: { streak: true }
        });

        if (!habit || completedLogs.length === 0) {
            // Reset to 0 if no completions
            if (habit?.streak?.length > 0) {
                await prisma.habitStreak.update({
                    where: { streak_id: habit.streak[0].streak_id },
                    data: {
                        current_streak: 0,
                        last_completed: null,
                        start_date: null,
                        grace_period_used: false
                    }
                });
            }
            return;
        }

        // Process logs to find the current streak
        let currentStreak = 1;
        let longestStreak = 1;
        let streakStart = new Date(completedLogs[0].completed_at);
        let lastCompleted = new Date(completedLogs[0].completed_at);

        for (let i = 1; i < completedLogs.length; i++) {
            const currentLogDate = new Date(completedLogs[i].completed_at);
            currentLogDate.setHours(0, 0, 0, 0);

            const previousLogDate = new Date(completedLogs[i-1].completed_at);
            previousLogDate.setHours(0, 0, 0, 0);

            // Check if this log continues the streak based on habit frequency
            const nextExpectedDate = getNextScheduledDate(habit, previousLogDate);

            if (currentLogDate <= nextExpectedDate) {
                // This log continues the streak
                currentStreak++;
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                }
            } else {
                // Streak is broken, start a new one
                currentStreak = 1;
                streakStart = currentLogDate;
            }

            lastCompleted = currentLogDate;
        }

        // Update the streak record
        if (habit.streak && habit.streak.length > 0) {
            await prisma.habitStreak.update({
                where: { streak_id: habit.streak[0].streak_id },
                data: {
                    current_streak: currentStreak,
                    longest_streak: Math.max(longestStreak, habit.streak[0].longest_streak),
                    last_completed: lastCompleted,
                    start_date: streakStart,
                    grace_period_used: false
                }
            });
        } else {
            // Create a new streak record if none exists
            await prisma.habitStreak.create({
                data: {
                    habit_id: habitId,
                    user_id: userId,
                    current_streak: currentStreak,
                    longest_streak: longestStreak,
                    last_completed: lastCompleted,
                    start_date: streakStart,
                    missed_days_count: 0,
                    grace_period_used: false
                }
            });
        }
    } catch (error) {
        console.error('Error recalculating habit streak:', error);
    }
}

/**
 * Update an existing habit
 */
const updateHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = req.user.user_id;
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
                motivation_quote: habitData.motivation_quote !== undefined ?
                    habitData.motivation_quote : existingHabit.motivation_quote,
                external_resource_url: habitData.external_resource_url !== undefined ?
                    habitData.external_resource_url : existingHabit.external_resource_url,
                tags: habitData.tags !== undefined ?
                    (typeof habitData.tags === 'string' ? habitData.tags : JSON.stringify(habitData.tags)) : existingHabit.tags,
                cue: habitData.cue !== undefined ? habitData.cue : existingHabit.cue,
                reward: habitData.reward !== undefined ? habitData.reward : existingHabit.reward,
                difficulty: habitData.difficulty || existingHabit.difficulty,
                domain_id: habitData.domain_id ? parseInt(habitData.domain_id, 10) : existingHabit.domain_id,
                grace_period_enabled: habitData.grace_period_enabled !== undefined ?
                    habitData.grace_period_enabled : existingHabit.grace_period_enabled,
                grace_period_hours: habitData.grace_period_hours ?
                    parseInt(habitData.grace_period_hours, 10) : existingHabit.grace_period_hours
            },
            include: {
                domain: true,
                streak: true
            }
        });

        // Update reminders if provided
        if (habitData.reminders && Array.isArray(habitData.reminders)) {
            // Delete existing reminders first
            await prisma.habitReminder.deleteMany({
                where: { habit_id: parseInt(habitId, 10) }
            });

            // Add new reminders
            if (habitData.reminders.length > 0) {
                const reminderData = habitData.reminders.map(reminder => ({
                    habit_id: parseInt(habitId, 10),
                    user_id: userId,
                    reminder_time: new Date(reminder.time),
                    repeat: reminder.repeat || 'DAILY',
                    notification_message: reminder.message || `Time to complete your ${updatedHabit.name} habit!`,
                    is_enabled: true,
                    pre_notification_minutes: reminder.pre_notification_minutes || 10,
                    follow_up_enabled: reminder.follow_up_enabled !== undefined ? reminder.follow_up_enabled : true,
                    follow_up_minutes: reminder.follow_up_minutes || 30
                }));

                await prisma.habitReminder.createMany({
                    data: reminderData
                });
            }
        }

        // Get the habit with all related data (including new reminders)
        const habitWithRelations = await prisma.habit.findUnique({
            where: { habit_id: parseInt(habitId, 10) },
            include: {
                domain: true,
                reminders: true,
                streak: true
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit updated successfully',
            data: habitWithRelations
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
 * Toggle a habit's favorite status
 */
const toggleFavorite = async (req, res) => {
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
            where: { habit_id: parseInt(habitId, 10) },
            data: { is_favorite: !habit.is_favorite }
        });

        return res.status(200).json({
            success: true,
            message: `Habit ${updatedHabit.is_favorite ? 'added to' : 'removed from'} favorites`,
            data: { is_favorite: updatedHabit.is_favorite }
        });
    } catch (error) {
        console.error('Error toggling favorite status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update favorite status',
            error: error.message
        });
    }
};

/**
 * Toggle a habit's active status
 */
const toggleActive = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = req.user.user_id;

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

        // Toggle the active status
        const updatedHabit = await prisma.habit.update({
            where: { habit_id: parseInt(habitId, 10) },
            data: { is_active: !habit.is_active }
        });

        return res.status(200).json({
            success: true,
            message: `Habit ${updatedHabit.is_active ? 'activated' : 'paused'}`,
            data: { is_active: updatedHabit.is_active }
        });
    } catch (error) {
        console.error('Error toggling active status:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update active status',
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
        const userId = req.user.user_id;

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

        // Delete habit and related records will cascade delete
        await prisma.habit.delete({
            where: { habit_id: parseInt(habitId, 10) }
        });

        // Update user's total habits created
        await prisma.user.update({
            where: { user_id: userId },
            data: { totalHabitsCreated: { decrement: 1 } }
        });

        return res.status(200).json({
            success: true,
            message: 'Habit deleted successfully'
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
 * Copy/clone an existing habit
 */
const copyHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = req.user.user_id;
        const { newName } = req.body;

        // Validate habit exists and belongs to user
        const sourceHabit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                user_id: userId
            },
            include: {
                reminders: true
            }
        });

        if (!sourceHabit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have permission to copy it'
            });
        }

        // Create new habit with data from source habit
        const { habit_id, user_id, createdAt, updatedAt, ...habitData } = sourceHabit;

        const newHabit = await prisma.habit.create({
            data: {
                ...habitData,
                name: newName || `Copy of ${sourceHabit.name}`,
                user_id: userId,
                start_date: new Date(),
                is_active: true,
                reminders: undefined // We'll create reminders separately
            }
        });

        // Create streak record for the new habit
        await prisma.habitStreak.create({
            data: {
                habit_id: newHabit.habit_id,
                user_id: userId,
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

        await prisma.habitDailyStatus.create({
            data: {
                habit_id: newHabit.habit_id,
                user_id: userId,
                date: today,
                is_scheduled: isHabitScheduledForDate(newHabit, today),
                is_completed: false,
                is_skipped: false
            }
        });

        // Copy reminders if they exist
        if (sourceHabit.reminders && sourceHabit.reminders.length > 0) {
            const reminderData = sourceHabit.reminders.map(reminder => ({
                habit_id: newHabit.habit_id,
                user_id: userId,
                reminder_time: reminder.reminder_time,
                repeat: reminder.repeat,
                notification_message: reminder.notification_message?.replace(sourceHabit.name, newHabit.name) ||
                    `Time to complete your ${newHabit.name} habit!`,
                is_enabled: true,
                pre_notification_minutes: reminder.pre_notification_minutes || 10,
                follow_up_enabled: reminder.follow_up_enabled !== undefined ? reminder.follow_up_enabled : true,
                follow_up_minutes: reminder.follow_up_minutes || 30
            }));

            await prisma.habitReminder.createMany({
                data: reminderData
            });
        }

        // Update user's total habits created
        await prisma.user.update({
            where: { user_id: userId },
            data: { totalHabitsCreated: { increment: 1 } }
        });

        // Return the new habit with related data
        const habitWithRelations = await prisma.habit.findUnique({
            where: { habit_id: newHabit.habit_id },
            include: {
                domain: true,
                reminders: true,
                streak: true
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Habit copied successfully',
            data: habitWithRelations
        });
    } catch (error) {
        console.error('Error copying habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to copy habit',
            error: error.message
        });
    }
};

/**
 * Delete a reminder
 */
const deleteReminder = async (req, res) => {
    try {
        const { reminderId } = req.params;
        const userId = req.user.user_id;

        // Validate reminder exists and belongs to user
        const reminder = await prisma.habitReminder.findFirst({
            where: {
                reminder_id: parseInt(reminderId, 10),
                user_id: userId
            }
        });

        if (!reminder) {
            return res.status(404).json({
                success: false,
                message: 'Reminder not found or you do not have permission to delete it'
            });
        }

        // Delete the reminder
        await prisma.habitReminder.delete({
            where: { reminder_id: parseInt(reminderId, 10) }
        });

        return res.status(200).json({
            success: true,
            message: 'Reminder deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete reminder',
            error: error.message
        });
    }
};

/**
 * Get next occurrence for a habit
 */
function getNextOccurrence(habit) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextDate = today;
    let daysToAdd = 1;

    while (daysToAdd <= 30) {  // Limit to next 30 days
        nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysToAdd);

        if (isHabitScheduledForDate(habit, nextDate)) {
            return {
                date: nextDate.toISOString().split('T')[0],
                daysAway: daysToAdd
            };
        }

        daysToAdd++;
    }

    return null;  // No occurrence found in the next 30 days
}

module.exports = {
    addHabit,
    getHabitById,
    getUserHabits,
    getHabitsByDate,
    getHabitsByDomain,
    updateHabit,
    toggleFavorite,
    toggleActive,
    logHabitCompletion,
    skipHabit,
    processHabitDailyReset,
    deleteHabitLog,
    deleteHabit,
    copyHabit,
    addReminder,
    deleteReminder
};