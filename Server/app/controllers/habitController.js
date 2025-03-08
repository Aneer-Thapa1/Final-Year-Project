// src/controllers/habitController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Add a new habit to the database
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with new habit data or error
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
            is_public,
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
            require_verification,
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
            reminders
        } = req.body;

        // Get user ID from authenticated request
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

        // Process tags - ensure they are in proper JSON format
        let processedTags = tags;
        if (tags && typeof tags === 'string') {
            try {
                // If tags is a string, try to parse it
                JSON.parse(tags);
            } catch (error) {
                // If parsing fails, convert comma-separated string to array and stringify
                processedTags = JSON.stringify(tags.split(',').map(tag => tag.trim()));
            }
        } else if (Array.isArray(tags)) {
            // If tags is already an array, stringify it
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
                is_public: is_public || false,
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
                require_verification: require_verification || false,
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
                user_id: parseInt(user_id,  10)
            }
        });

        // Initialize streak record for the new habit
        await prisma.habitStreak.create({
            data: {
                habit_id: newHabit.habit_id,
                user_id: user_id,
                current_streak: 0,
                longest_streak: 0
            }
        });

        // Add reminders if included
        if (reminders && Array.isArray(reminders) && reminders.length > 0) {
            const reminderData = reminders.map(reminder => ({
                habit_id: newHabit.habit_id,
                user_id: user_id,
                reminder_time: new Date(reminder.time),
                repeat: reminder.repeat || 'DAILY',
                notification_message: reminder.message || `Time to complete your habit: ${name}`,
                is_enabled: true
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

        // Check for "Habit Explorer" achievement eligibility
        const distinctDomainCount = await prisma.habit.findMany({
            where: { user_id: user_id },
            select: { domain_id: true },
            distinct: ['domain_id']
        });

        if (distinctDomainCount.length >= 5) {
            const explorerAchievement = await prisma.achievement.findFirst({
                where: { name: 'Habit Explorer' }
            });

            if (explorerAchievement) {
                // Check if user already has this achievement
                const existingAchievement = await prisma.userAchievement.findFirst({
                    where: {
                        user_id: user_id,
                        achievement_id: explorerAchievement.achievement_id
                    }
                });

                if (!existingAchievement) {
                    // Award the achievement
                    await prisma.userAchievement.create({
                        data: {
                            user_id: user_id,
                            achievement_id: explorerAchievement.achievement_id,
                            unlocked_at: new Date()
                        }
                    });

                    // Create notification for achievement
                    await prisma.notification.create({
                        data: {
                            user_id: user_id,
                            title: 'Achievement Unlocked!',
                            content: `You've unlocked the '${explorerAchievement.name}' achievement!`,
                            type: 'ACHIEVEMENT_UNLOCKED',
                            related_id: explorerAchievement.achievement_id
                        }
                    });
                }
            }
        }

        // Return the newly created habit with domain information
        const habitWithDomain = await prisma.habit.findUnique({
            where: { habit_id: newHabit.habit_id },
            include: {
                domain: true,
                reminders: true,
                streak: true
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
 * Get a single habit by ID
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with habit data or error
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

        // Convert to integer if string
        const habitIdInt = parseInt(habitId, 10);

        // Find the habit with related data
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: habitIdInt,
                // Only allow access to user's own habits or public habits
                OR: [
                    { user_id: userId },
                    { is_public: true }
                ]
            },
            include: {
                domain: true,
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                reminders: true,
                streak: true
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false,
                message: 'Habit not found or you do not have access to this habit'
            });
        }

        // Get recent logs for this habit
        const recentLogs = await prisma.habitLog.findMany({
            where: {
                habit_id: habitIdInt,
                user_id: habit.user_id
            },
            orderBy: {
                completed_at: 'desc'
            },
            take: 10 // Get 10 most recent logs
        });

        // Calculate completion statistics
        const totalLogs = await prisma.habitLog.count({
            where: {
                habit_id: habitIdInt,
                user_id: habit.user_id
            }
        });

        const completedLogs = await prisma.habitLog.count({
            where: {
                habit_id: habitIdInt,
                user_id: habit.user_id,
                completed: true
            }
        });

        const completionRate = totalLogs > 0 ? (completedLogs / totalLogs) * 100 : 0;

        return res.status(200).json({
            success: true,
            data: {
                habit,
                recentLogs,
                stats: {
                    totalLogs,
                    completedLogs,
                    completionRate: Math.round(completionRate * 10) / 10 // Round to 1 decimal place
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
 * Get all habits for the authenticated user
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with habit data or error
 */
const getUserHabits = async (req, res) => {
    try {
        const userId = req.user.user_id;
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

        // Add optional filters if provided
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

        // Handle different sort options
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
            // First get total count
            totalCount = await prisma.habit.count({
                where: whereConditions
            });

            // Get habits with their streaks
            const habitsWithStreaks = await prisma.habit.findMany({
                where: whereConditions,
                include: {
                    domain: true,
                    streak: true
                }
            });

            // Sort by streak
            habitsWithStreaks.sort((a, b) => {
                const streakA = a.streak[0]?.current_streak || 0;
                const streakB = b.streak[0]?.current_streak || 0;

                return sort_order.toLowerCase() === 'desc' ? streakB - streakA : streakA - streakB;
            });

            // Apply pagination manually
            habits = habitsWithStreaks.slice(skip, skip + take);
        } else {
            // Get total count
            totalCount = await prisma.habit.count({
                where: whereConditions
            });

            // Get habits with normal sorting
            habits = await prisma.habit.findMany({
                where: whereConditions,
                include: {
                    domain: true,
                    streak: true
                },
                orderBy,
                skip,
                take
            });
        }

        // Get today's completion status for habits
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const habitIds = habits.map(habit => habit.habit_id);

        const todayLogs = await prisma.habitLog.findMany({
            where: {
                habit_id: { in: habitIds },
                user_id: userId,
                completed_at: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        // Create log lookup map
        const habitLogMap = {};
        todayLogs.forEach(log => {
            habitLogMap[log.habit_id] = log;
        });

        // Add completion status
        const enhancedHabits = habits.map(habit => ({
            ...habit,
            completedToday: !!habitLogMap[habit.habit_id],
            todayLog: habitLogMap[habit.habit_id] || null
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
 * Get all habits for the given date
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with habit data or error
 */
const getHabitsByDate = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { date } = req.params; // Format: YYYY-MM-DD

        if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Valid date is required (YYYY-MM-DD format)'
            });
        }

        // Parse the date
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
                streak: true
            }
        });

        // Filter habits based on frequency type and schedule
        const applicableHabits = habits.filter(habit => {
            // For daily habits
            if (habit.frequency_type === 'DAILY') {
                return true;
            }

            // For weekly habits with specific days
            if (habit.frequency_type === 'WEEKLY' &&
                habit.specific_days &&
                Array.isArray(habit.specific_days) &&
                habit.specific_days.includes(dayOfWeek)) {
                return true;
            }

            // For X times per week
            if (habit.frequency_type === 'X_TIMES' && habit.frequency_interval === 7) {
                // Check if this habit still needs completions this week
                const weekStart = new Date(targetDate);
                weekStart.setDate(weekStart.getDate() - dayOfWeek); // Go back to start of week (Sunday)

                const completionsThisWeek =  prisma.habitLog.count({
                    where: {
                        habit_id: habit.habit_id,
                        user_id: userId,
                        completed: true,
                        completed_at: {
                            gte: weekStart,
                            lt: nextDate
                        }
                    }
                });

                // If we haven't reached the required number of completions
                return completionsThisWeek < habit.frequency_value;
            }

            // For interval-based habits
            if (habit.frequency_type === 'INTERVAL') {
                const startDate = new Date(habit.start_date);
                const diffTime = Math.abs(targetDate - startDate);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                return diffDays % habit.frequency_interval === 0;
            }

            return false;
        });

        // Get completion logs for the target date
        const habitIds = applicableHabits.map(habit => habit.habit_id);

        const completionLogs = await prisma.habitLog.findMany({
            where: {
                habit_id: { in: habitIds },
                user_id: userId,
                completed_at: {
                    gte: targetDate,
                    lt: nextDate
                }
            }
        });

        // Map logs to habits
        const completionMap = {};
        completionLogs.forEach(log => {
            completionMap[log.habit_id] = log;
        });

        // Add completion info to habits
        const habitsWithCompletionStatus = applicableHabits.map(habit => ({
            ...habit,
            completedToday: !!completionMap[habit.habit_id],
            completionLog: completionMap[habit.habit_id] || null
        }));

        // Calculate completion rate
        const totalHabits = habitsWithCompletionStatus.length;
        const completedHabits = habitsWithCompletionStatus.filter(h => h.completedToday).length;

        // Get user's daily goal
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            select: { dailyGoal: true }
        });

        return res.status(200).json({
            success: true,
            date: targetDate.toISOString().split('T')[0],
            data: habitsWithCompletionStatus,
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
 * Get public habits for discovery
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with public habits or error
 */
const getPublicHabits = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const {
            domain_id,
            search,
            sort_by = 'popularity',
            page = 1,
            limit = 20
        } = req.query;

        // Build filter conditions
        const whereConditions = {
            is_public: true
        };

        // Add domain filter if provided
        if (domain_id) {
            whereConditions.domain_id = parseInt(domain_id, 10);
        }

        // Add search filter if provided
        if (search) {
            whereConditions.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const take = parseInt(limit, 10);

        // Get total count
        const totalCount = await prisma.habit.count({
            where: whereConditions
        });

        // Get habits based on sort order
        let habits;

        if (sort_by === 'popularity') {
            // First get all habits
            habits = await prisma.habit.findMany({
                where: whereConditions,
                include: {
                    domain: true,
                    user: {
                        select: {
                            user_id: true,
                            user_name: true,
                            avatar: true
                        }
                    }
                }
            });

            // For each habit, count similar habits (popularity metric)
            const popularityMap = {};

            for (const habit of habits) {
                const count = await prisma.habit.count({
                    where: {
                        name: habit.name,
                        is_public: true
                    }
                });

                popularityMap[habit.habit_id] = count;
            }

            // Sort by popularity
            habits.sort((a, b) => popularityMap[b.habit_id] - popularityMap[a.habit_id]);

            // Apply pagination manually
            habits = habits.slice(skip, skip + take);

            // Add popularity count
            habits = habits.map(habit => ({
                ...habit,
                popularity: popularityMap[habit.habit_id]
            }));
        } else {
            // For other sort options
            let orderBy = {};

            switch (sort_by) {
                case 'recent':
                    orderBy.createdAt = 'desc';
                    break;
                case 'name':
                    orderBy.name = 'asc';
                    break;
                default:
                    orderBy.createdAt = 'desc';
            }

            // Get habits with sorting
            habits = await prisma.habit.findMany({
                where: whereConditions,
                include: {
                    domain: true,
                    user: {
                        select: {
                            user_id: true,
                            user_name: true,
                            avatar: true
                        }
                    }
                },
                orderBy,
                skip,
                take
            });
        }

        // Check if user has already adopted each habit
        const userHabits = await prisma.habit.findMany({
            where: { user_id: userId },
            select: { name: true }
        });

        const userHabitNames = userHabits.map(h => h.name.toLowerCase());

        // Add "alreadyAdopted" flag to each habit
        habits = habits.map(habit => ({
            ...habit,
            alreadyAdopted: userHabitNames.includes(habit.name.toLowerCase())
        }));

        return res.status(200).json({
            success: true,
            data: habits,
            pagination: {
                total: totalCount,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                pages: Math.ceil(totalCount / parseInt(limit, 10))
            }
        });
    } catch (error) {
        console.error('Error getting public habits:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve public habits',
            error: error.message
        });
    }
};

/**
 * Get habits by domain
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with habit data or error
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

        // Convert to integer
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

        // Get completion status for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const habitIds = habits.map(habit => habit.habit_id);

        const todayLogs = await prisma.habitLog.findMany({
            where: {
                habit_id: { in: habitIds },
                user_id: userId,
                completed_at: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        // Create lookup map
        const habitLogMap = {};
        todayLogs.forEach(log => {
            habitLogMap[log.habit_id] = log;
        });

        // Add completion status
        const habitsWithStatus = habits.map(habit => ({
            ...habit,
            completedToday: !!habitLogMap[habit.habit_id],
            todayLog: habitLogMap[habit.habit_id] || null
        }));

        // Get domain stats
        const domainStats = {
            totalHabits: habits.length,
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
 * Update an existing habit
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with updated habit data or error
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
                is_public: habitData.is_public !== undefined ? habitData.is_public : existingHabit.is_public,
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
                require_verification: habitData.require_verification !== undefined ?
                    habitData.require_verification : existingHabit.require_verification,
                motivation_quote: habitData.motivation_quote !== undefined ?
                    habitData.motivation_quote : existingHabit.motivation_quote,
                external_resource_url: habitData.external_resource_url !== undefined ?
                    habitData.external_resource_url : existingHabit.external_resource_url,
                tags: habitData.tags !== undefined ?
                    (typeof habitData.tags === 'string' ? habitData.tags : JSON.stringify(habitData.tags)) : existingHabit.tags,
                cue: habitData.cue !== undefined ? habitData.cue : existingHabit.cue,
                reward: habitData.reward !== undefined ? habitData.reward : existingHabit.reward,
                difficulty: habitData.difficulty || existingHabit.difficulty,
                domain_id: habitData.domain_id ? parseInt(habitData.domain_id, 10) : existingHabit.domain_id
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
                    is_enabled: true
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
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with updated status or error
 */
const toggleFavorite = async (req, res) => {
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
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with updated status or error
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
 * Log a habit completion
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with log data or error
 */
const logHabitCompletion = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = req.user.user_id;
        const {
            completed = true,
            completed_at,
            completion_notes,
            duration_completed,
            count_completed,
            numeric_completed,
            skipped = false,
            mood,
            evidence_image
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

        // Prepare log data based on tracking type
        const logData = {
            habit_id: parseInt(habitId, 10),
            user_id: userId,
            completed,
            skipped,
            completion_notes: completion_notes || null,
            completed_at: completed_at ? new Date(completed_at) : new Date(),
            mood: mood ? parseInt(mood, 10) : null,
            evidence_image: evidence_image || null
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

        // Update streak if habit was completed (not skipped)
        if (completed && !skipped) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // Get the last completion date from streak record
            const lastCompleted = habit.streak[0]?.last_completed || null;
            let currentStreak = habit.streak[0]?.current_streak || 0;
            let longestStreak = habit.streak[0]?.longest_streak || 0;

            // If there is a streak record
            if (habit.streak && habit.streak.length > 0) {
                // Check if last completion was yesterday or earlier today
                if (lastCompleted) {
                    const lastCompletedDate = new Date(lastCompleted);
                    lastCompletedDate.setHours(0, 0, 0, 0);

                    // If last completion was yesterday, increment streak
                    if (
                        lastCompletedDate.getTime() === yesterday.getTime() ||
                        lastCompletedDate.getTime() === today.getTime()
                    ) {
                        currentStreak += 1;
                    } else {
                        // Streak broken, reset to 1
                        currentStreak = 1;
                    }
                } else {
                    // No previous completion, start streak at 1
                    currentStreak = 1;
                }

                // Update longest streak if current streak is longer
                if (currentStreak > longestStreak) {
                    longestStreak = currentStreak;
                }

                // Update the streak record
                await prisma.habitStreak.update({
                    where: { streak_id: habit.streak[0].streak_id },
                    data: {
                        current_streak: currentStreak,
                        longest_streak: longestStreak,
                        last_completed: new Date()
                    }
                });
            } else {
                // Create a new streak record if none exists
                await prisma.habitStreak.create({
                    data: {
                        habit_id: parseInt(habitId, 10),
                        user_id: userId,
                        current_streak: 1,
                        longest_streak: 1,
                        last_completed: new Date()
                    }
                });
            }

            // Check for streak-related achievements
            if (currentStreak === 7) {
                const consistencyAchievement = await prisma.achievement.findFirst({
                    where: { name: 'Consistency King' }
                });

                if (consistencyAchievement) {
                    const existingAward = await prisma.userAchievement.findFirst({
                        where: {
                            user_id: userId,
                            achievement_id: consistencyAchievement.achievement_id
                        }
                    });

                    if (!existingAward) {
                        await prisma.userAchievement.create({
                            data: {
                                user_id: userId,
                                achievement_id: consistencyAchievement.achievement_id,
                                unlocked_at: new Date()
                            }
                        });

                        // Create notification for achievement
                        await prisma.notification.create({
                            data: {
                                user_id: userId,
                                title: 'Achievement Unlocked!',
                                content: `You've unlocked the '${consistencyAchievement.name}' achievement!`,
                                type: 'ACHIEVEMENT_UNLOCKED',
                                related_id: consistencyAchievement.achievement_id
                            }
                        });
                    }
                }
            }

            if (currentStreak === 30) {
                const masterAchievement = await prisma.achievement.findFirst({
                    where: { name: 'Habit Master' }
                });

                if (masterAchievement) {
                    const existingAward = await prisma.userAchievement.findFirst({
                        where: {
                            user_id: userId,
                            achievement_id: masterAchievement.achievement_id
                        }
                    });

                    if (!existingAward) {
                        await prisma.userAchievement.create({
                            data: {
                                user_id: userId,
                                achievement_id: masterAchievement.achievement_id,
                                unlocked_at: new Date()
                            }
                        });

                        // Create notification for achievement
                        await prisma.notification.create({
                            data: {
                                user_id: userId,
                                title: 'Achievement Unlocked!',
                                content: `You've unlocked the '${masterAchievement.name}' achievement!`,
                                type: 'ACHIEVEMENT_UNLOCKED',
                                related_id: masterAchievement.achievement_id
                            }
                        });
                    }
                }
            }

            // Update user's total habits completed
            await prisma.user.update({
                where: { user_id: userId },
                data: { totalHabitsCompleted: { increment: 1 } }
            });
        }

        // Get the updated habit with streak
        const updatedHabit = await prisma.habit.findUnique({
            where: { habit_id: parseInt(habitId, 10) },
            include: {
                streak: true
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Habit completion logged successfully',
            data: {
                log: newLog,
                streak: updatedHabit.streak[0] || null
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
 * Delete a habit log entry
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with status or error
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

        // Get the habit and streak data for updating
        const habit = await prisma.habit.findFirst({
            where: { habit_id: log.habit_id },
            include: { streak: true }
        });

        // Delete the log
        await prisma.habitLog.delete({
            where: { log_id: parseInt(logId, 10) }
        });

        // Recalculate streak if needed
        if (log.completed && habit.streak && habit.streak.length > 0) {
            // Get all logs for this habit
            const habitLogs = await prisma.habitLog.findMany({
                where: {
                    habit_id: log.habit_id,
                    user_id: userId,
                    completed: true
                },
                orderBy: { completed_at: 'desc' }
            });

            // Recalculate current streak
            let currentStreak = 0;
            if (habitLogs.length > 0) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let date = new Date(today);
                let consecutiveDays = 0;

                // Loop back through days to find consecutive completion days
                for (let i = 0; i <= 100; i++) { // Limit to 100 days back to prevent infinite loops
                    const dayStart = new Date(date);
                    const dayEnd = new Date(date);
                    dayEnd.setDate(dayEnd.getDate() + 1);

                    // Check if habit was completed on this day
                    const completedOnDay = habitLogs.some(log => {
                        const logDate = new Date(log.completed_at);
                        return logDate >= dayStart && logDate < dayEnd;
                    });

                    if (completedOnDay) {
                        consecutiveDays++;
                        date.setDate(date.getDate() - 1);
                    } else {
                        break;
                    }
                }

                currentStreak = consecutiveDays;
            }

            // Update the streak record
            await prisma.habitStreak.update({
                where: { streak_id: habit.streak[0].streak_id },
                data: {
                    current_streak: currentStreak,
                    last_completed: habitLogs.length > 0 ? habitLogs[0].completed_at : null
                }
            });
        }

        // Update user's total habits completed
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
 * Delete a habit
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with status or error
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

        // Delete all related records
        // This relies on cascading deletes in the database schema
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
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with new habit data or error
 */
const copyHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = req.user.user_id;
        const { newName } = req.body;

        // Validate habit exists
        const sourceHabit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                // Allow copying public habits or user's own habits
                OR: [
                    { user_id: userId },
                    { is_public: true }
                ]
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
                longest_streak: 0
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
                is_enabled: true
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
 * Add a reminder to a habit
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with reminder data or error
 */
const addReminder = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = req.user.user_id;
        const { time, repeat = 'DAILY', message } = req.body;

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

        // Create the reminder
        const newReminder = await prisma.habitReminder.create({
            data: {
                habit_id: parseInt(habitId, 10),
                user_id: userId,
                reminder_time: new Date(time),
                repeat,
                notification_message: message || `Time to complete your ${habit.name} habit!`,
                is_enabled: true
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
 * Delete a reminder
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with status or error
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

const adoptPublicHabit = async (req, res) => {
    try {
        const { habitId } = req.params;
        const userId = req.user.user_id;
        const { customizations } = req.body || {};

        // Validate habit exists and is public
        const sourceHabit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habitId, 10),
                is_public: true
            },
            include: {
                reminders: true
            }
        });

        if (!sourceHabit) {
            return res.status(404).json({
                success: false,
                message: 'Public habit not found'
            });
        }

        // Check if user already has a habit with the same name
        const existingHabit = await prisma.habit.findFirst({
            where: {
                user_id: userId,
                name: sourceHabit.name
            }
        });

        if (existingHabit) {
            return res.status(400).json({
                success: false,
                message: 'You already have a habit with this name'
            });
        }

        // Create new habit with data from source habit
        const { habit_id, user_id, createdAt, updatedAt, ...habitData } = sourceHabit;

        const newHabit = await prisma.habit.create({
            data: {
                ...habitData,
                // Apply any customizations
                name: customizations?.name || sourceHabit.name,
                color: customizations?.color || sourceHabit.color,
                icon: customizations?.icon || sourceHabit.icon,
                start_date: new Date(),
                user_id: userId,
                is_active: true,
                is_public: false, // Adopted habits are private by default
                reminders: undefined // We'll create reminders separately
            }
        });

        // Create streak record for the new habit
        await prisma.habitStreak.create({
            data: {
                habit_id: newHabit.habit_id,
                user_id: userId,
                current_streak: 0,
                longest_streak: 0
            }
        });

        // Copy reminders if requested
        if (customizations?.includeReminders && sourceHabit.reminders && sourceHabit.reminders.length > 0) {
            const reminderData = sourceHabit.reminders.map(reminder => ({
                habit_id: newHabit.habit_id,
                user_id: userId,
                reminder_time: reminder.reminder_time,
                repeat: reminder.repeat,
                notification_message: reminder.notification_message?.replace(sourceHabit.name, newHabit.name) ||
                    `Time to complete your ${newHabit.name} habit!`,
                is_enabled: true
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
            message: 'Habit adopted successfully',
            data: habitWithRelations
        });
    } catch (error) {
        console.error('Error adopting habit:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to adopt habit',
            error: error.message
        });
    }
};

module.exports = {
    addHabit,
    getHabitById,
    getUserHabits,
    getHabitsByDate,
    getPublicHabits,
    getHabitsByDomain,
    updateHabit,
    toggleFavorite,
    toggleActive,
    logHabitCompletion,
    deleteHabitLog,
    deleteHabit,
    copyHabit,
    addReminder,
    deleteReminder,
    adoptPublicHabit
}