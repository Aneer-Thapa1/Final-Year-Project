const {PrismaClient} = require('@prisma/client');
const res = require("express/lib/response");
const {createLogger} = require("winston");
const prisma = new PrismaClient();
// const {validateFrequency} = require("../utils/validators");
// Utility function to validate dates
const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};


const validateFrequency = (frequencyType, frequencyValue, frequencyInterval) => {
    switch (frequencyType) {
        case 'Daily':
            return frequencyValue <= 24; // Max 24 times per day
        case 'Weekly':
            return frequencyValue <= frequencyInterval * 7; // Can't do more times than days in interval
        case 'Monthly':
            return frequencyValue <= frequencyInterval * 30; // Approximate month length
        case 'Custom':
            return true; // Custom frequencies are more flexible
        default:
            return false;
    }
};

// Main handler for adding or updating habits
const addHabit = async (req, res) => {
    try {
        const {
            name,
            description,
            domain_id,
            frequency_type_id,
            frequency_value,
            frequency_interval,
            frequency_text,
            custom_frequency,
            start_date,
            end_date = null,
            tracking_type = 'BOOLEAN',
            duration_goal = null,
            count_goal = null,
            numeric_goal = null,
            units = null,
            skip_on_vacation = false,
            allow_backfill = true,
            roll_over = false,
            require_evidence = false,
            require_verification = false,
            color = null,
            icon = null,
            image = null,
            difficulty_id = null,
            motivation_quote = null,
            motivation_image = null,
            external_resource_url = null,
            is_smart_schedule = false,
            has_location_trigger = false,
            location_lat = null,
            location_long = null,
            location_radius = null,
            location_name = null,

            // Schedule parameters
            day_of_week = [], // For weekly habits [1,3,5] = Mon,Wed,Fri
            day_of_month = [], // For monthly habits [1,15] = 1st and 15th
            month_of_year = [], // For yearly habits [1,6,12] = Jan,Jun,Dec
            week_of_month = [], // For "first Monday" type schedules [1,3] = 1st and 3rd week
            times_of_day = [], // Times for daily habits
            time_window_start = null,
            time_window_end = null,
            is_all_day = false,

            // Reminder parameters
            reminder_times = [],
            reminder_type = 'PUSH',
            reminder_sound = null,
            smart_reminder = false,
            adaptive_timing = false,
            reminder_message = null,
            snooze_enabled = true,
            snooze_duration = 10,
            only_when_due = true,
            reminder_days = [],

            // Tags and groups
            tags = [],
            group_ids = [],

            // Subtasks for checklist habits
            subtasks = [],
        } = req.body;

        const user_id = req.user;

        // Basic validation
        if (!name || !domain_id || !frequency_type_id || !frequency_value || !frequency_interval || !start_date) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
                required: ['name', 'domain_id', 'frequency_type_id', 'frequency_value', 'frequency_interval', 'start_date']
            });
        }

        // Validate dates
        if (!isValidDate(start_date) || (end_date && !isValidDate(end_date))) {
            return res.status(400).json({
                success: false, message: "Invalid date format", tip: "Use ISO date format (YYYY-MM-DD)"
            });
        }

        // Validate reminder times
        for (let time of reminder_times) {
            if (!isValidDate(time)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid reminder time format",
                    tip: "Use ISO date format for reminder times"
                });
            }
        }

        // Check if dates are logical
        const startDateObj = new Date(start_date);
        const endDateObj = end_date ? new Date(end_date) : null;
        if (endDateObj && startDateObj >= endDateObj) {
            return res.status(400).json({
                success: false, message: "End date must be after start date"
            });
        }

        // Verify domain exists
        const domain = await prisma.habitDomain.findUnique({
            where: {domain_id: parseInt(domain_id)}
        });
        if (!domain) {
            return res.status(404).json({
                success: false, message: "Domain not found", tip: "Use GET /api/habits/domains to see available domains"
            });
        }

        // Verify frequency type exists
        const frequencyType = await prisma.frequencyType.findUnique({
            where: {frequency_type_id: parseInt(frequency_type_id)}
        });
        if (!frequencyType) {
            return res.status(404).json({
                success: false,
                message: "Frequency type not found",
                tip: "Use GET /api/habits/frequency-types to see available options"
            });
        }

        // Validate frequency values
        if (!validateFrequency(frequencyType.name, frequency_value, frequency_interval)) {
            return res.status(400).json({
                success: false,
                message: "Invalid frequency configuration",
                tip: `For ${frequencyType.name} habits, ensure frequency value is logical`
            });
        }

        // Check tracking type
        if (!['BOOLEAN', 'COUNTABLE', 'TIMER', 'NUMERIC', 'CHECKLIST'].includes(tracking_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tracking type",
                valid_types: ['BOOLEAN', 'COUNTABLE', 'TIMER', 'NUMERIC', 'CHECKLIST']
            });
        }

        // Validate tracking type specific parameters
        if (tracking_type === 'COUNTABLE' && !count_goal) {
            return res.status(400).json({
                success: false,
                message: "Count goal is required for COUNTABLE habits"
            });
        }

        if (tracking_type === 'TIMER' && !duration_goal) {
            return res.status(400).json({
                success: false,
                message: "Duration goal is required for TIMER habits"
            });
        }

        if (tracking_type === 'NUMERIC' && !numeric_goal) {
            return res.status(400).json({
                success: false,
                message: "Numeric goal is required for NUMERIC habits"
            });
        }

        // Check reminder type
        if (reminder_times.length > 0 && !['PUSH', 'EMAIL', 'SMS', 'CALENDAR', 'WIDGET'].includes(reminder_type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid reminder type",
                valid_types: ['PUSH', 'EMAIL', 'SMS', 'CALENDAR', 'WIDGET']
            });
        }

        // Create the habit
        const habit = await prisma.habit.create({
            data: {
                name,
                description,
                start_date: startDateObj,
                end_date: endDateObj,
                frequency_value: parseInt(frequency_value),
                frequency_interval: parseInt(frequency_interval),
                frequency_text,
                custom_frequency: custom_frequency ?
                    (typeof custom_frequency === 'string' ? custom_frequency : JSON.stringify(custom_frequency))
                    : null,
                tracking_type,
                duration_goal: duration_goal ? parseInt(duration_goal) : null,
                count_goal: count_goal ? parseInt(count_goal) : null,
                numeric_goal: numeric_goal ? parseFloat(numeric_goal) : null,
                units,
                skip_on_vacation,
                allow_backfill,
                roll_over,
                require_evidence,
                require_verification,
                color,
                icon,
                image,
                motivation_quote,
                motivation_image,
                external_resource_url,
                is_smart_schedule,
                has_location_trigger,
                location_lat: location_lat ? parseFloat(location_lat) : null,
                location_long: location_long ? parseFloat(location_long) : null,
                location_radius: location_radius ? parseInt(location_radius) : null,
                location_name,
                user: {connect: {user_id: parseInt(user_id)}},
                domain: {connect: {domain_id: parseInt(domain_id)}},
                frequencyType: {connect: {frequency_type_id: parseInt(frequency_type_id)}},
                difficulty: difficulty_id ? {connect: {difficulty_id: parseInt(difficulty_id)}} : undefined,
                is_active: true
            }
        });

        // Create schedule
        await prisma.habitSchedule.create({
            data: {
                habit_id: habit.habit_id,
                day_of_week: day_of_week.length > 0 ? day_of_week.map(d => parseInt(d)) : [],
                day_of_month: day_of_month.length > 0 ? day_of_month.map(d => parseInt(d)) : [],
                month_of_year: month_of_year.length > 0 ? month_of_year.map(m => parseInt(m)) : [],
                week_of_month: week_of_month.length > 0 ? week_of_month.map(w => parseInt(w)) : [],
                times_of_day: times_of_day.length > 0 ? times_of_day.map(t => new Date(t)) : [],
                time_window_start: time_window_start ? new Date(time_window_start) : null,
                time_window_end: time_window_end ? new Date(time_window_end) : null,
                is_all_day
            }
        });

        // Create reminders if specified
        if (reminder_times.length > 0) {
            await prisma.habitReminder.create({
                data: {
                    habit_id: habit.habit_id,
                    reminder_times: reminder_times.map(time => new Date(time)),
                    is_enabled: true,
                    reminder_type,
                    sound: reminder_sound,
                    smart_reminder,
                    adaptive_timing,
                    message: reminder_message,
                    snooze_enabled,
                    snooze_duration,
                    only_when_due,
                    reminder_days: reminder_days.length > 0 ? reminder_days.map(d => parseInt(d)) : []
                }
            });
        }

        // Create initial streak record
        await prisma.habitStreak.create({
            data: {
                habit: {connect: {habit_id: habit.habit_id}},
                user: {connect: {user_id: parseInt(user_id)}},
                start_date: new Date(),
                current_streak: 0,
                longest_streak: 0,
                last_completed_at: null,
                current_week_streak: 0,
                longest_week_streak: 0,
                current_month_streak: 0,
                longest_month_streak: 0,
                total_completions: 0,
                success_rate: 0,
                freeze_count: 0
            }
        });

        // Create subtasks for checklist habits
        if (tracking_type === 'CHECKLIST' && subtasks.length > 0) {
            const subtaskData = subtasks.map((subtask, index) => ({
                habit_id: habit.habit_id,
                name: subtask.name,
                description: subtask.description,
                is_required: subtask.is_required !== undefined ? subtask.is_required : true,
                sort_order: index
            }));

            await prisma.habitSubtask.createMany({
                data: subtaskData
            });
        }

        // Add tags if specified
        if (tags.length > 0) {
            // Process each tag
            for (const tag of tags) {
                let dbTag = await prisma.habitTag.findFirst({
                    where: {
                        name: tag.name,
                        user_id: parseInt(user_id)
                    }
                });

                if (!dbTag) {
                    dbTag = await prisma.habitTag.create({
                        data: {
                            name: tag.name,
                            color: tag.color || "#808080",
                            icon: tag.icon,
                            user: {connect: {user_id: parseInt(user_id)}}
                        }
                    });
                }

                // Create relation
                await prisma.habitTagRelation.create({
                    data: {
                        habit_id: habit.habit_id,
                        tag_id: dbTag.tag_id
                    }
                });
            }
        }

        // Add to groups if specified
        if (group_ids.length > 0) {
            const groupItems = group_ids.map((group_id, index) => ({
                habit_id: habit.habit_id,
                group_id: parseInt(group_id),
                sort_order: index
            }));

            await prisma.habitGroupItem.createMany({
                data: groupItems
            });
        }

        // Update user statistics
        const userStats = await prisma.habitStatistics.findUnique({
            where: {user_id: parseInt(user_id)}
        });

        if (userStats) {
            await prisma.habitStatistics.update({
                where: {user_id: parseInt(user_id)},
                data: {
                    habits_created: userStats.habits_created + 1,
                    habits_active: userStats.habits_active + 1
                }
            });
        } else {
            await prisma.habitStatistics.create({
                data: {
                    user_id: parseInt(user_id),
                    habits_created: 1,
                    habits_active: 1
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: "Habit created successfully",
            data: {
                habit_id: habit.habit_id,
                name: habit.name,
                start_date: habit.start_date,
                tracking_type: habit.tracking_type,
                frequency: `${frequency_value} times per ${frequencyType.name.toLowerCase()}`,
                reminders: reminder_times.length
            }
        });

    } catch (error) {
        console.error('Error in addHabit:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


//  Main handler for getting users habits
const getUserHabits = async (req, res) => {
    try {
        // Extract user_id from request parameters
        const user_id = req.user;

        // Fetch habits from the database for the given user_id
        const habits = await prisma.habit.findMany({
            where: {
                user_id: parseInt(user_id),
                is_active: true
            },
            include: {
                domain: true,
                frequencyType: true,
                schedules: true,
                streak: true,
                reminders: true,
                subtasks: true,
                difficulty: true,
                habitTagRelations: {
                    include: {
                        tag: true
                    }
                },
                habitGroupItems: {
                    include: {
                        group: true
                    }
                },
                logs: {
                    orderBy: {
                        completed_at: 'desc'
                    },
                    take: 5
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Process the habits data to format for frontend use
        const formattedHabits = habits.map(habit => {
            // Calculate completion status for today
            const today = new Date();
            const todayStart = new Date(today.setHours(0, 0, 0, 0));
            const todayEnd = new Date(today.setHours(23, 59, 59, 999));

            const isCompletedToday = habit?.logs?.some(log => {
                const logDate = new Date(log.completed_at);
                return logDate >= todayStart && logDate <= todayEnd;
            });

            // Format tags
            const tags = habit.habitTagRelations.map(relation => relation.tag);

            // Format groups
            const groups = habit.habitGroupItems.map(item => item.group);

            // Return formatted habit
            return {
                ...habit,
                tags,
                groups,
                isCompletedToday,
                habitTagRelations: undefined, // Remove relation objects
                habitGroupItems: undefined,   // Remove relation objects
            };
        });

        // Send a successful response with the retrieved and formatted habits data
        return res.status(200).json({
            success: true,
            data: formattedHabits
        });
    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error in getUserHabits:', error);

        // Return a 500 Internal Server Error response with a failure message
        return res.status(500).json({
            success: false,
            message: "Failed to fetch habits",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Main handler to Get a single habit's details
const getSingleHabit = async (req, res) => {
    try {
        // Extract habit_id from request parameters
        const {habit_id} = req.params;

        // Fetch a single habit from the database using the habit_id
        const habit = await prisma.habit.findUnique({
            where: {
                habit_id: parseInt(habit_id) // Convert habit_id to an integer
            }, include: {
                domain: true,         // Include associated domain details
                frequencyType: true,  // Include frequency type details
                schedule: true,       // Include habit schedule details
                streak: true,         // Include habit streak details
                reminders: true,      // Include associated reminders
                logs: {
                    orderBy: {
                        completed_at: 'desc' // Order logs by most recent completion date
                    }, take: 30 // Retrieve logs for the last 30 completed days
                }
            }
        });

        // If the habit is not found, return a 404 error response
        if (!habit) {
            return res.status(404).json({
                success: false, message: "Habit not found"
            });
        }

        // Send a successful response with the habit details
        return res.status(200).json({
            success: true, data: habit
        });
    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error in getHabitDetails:', error);

        // Return a 500 Internal Server Error response with a failure message
        return res.status(500).json({
            success: false, message: "Failed to fetch habit details"
        });
    }
};

// Main handler for Deleting a habit
const deleteHabit = async (req, res) => {

    //adding try catch for error handling
    try {
        // getting habit id from params
        const {habit_id} = req.params;

        // setting is_active value to false so that it can be set as archived
        await prisma.habit.update({
            where: {
                habit_id: parseInt(habit_id)
            }, data: {
                is_active: false
            }
        });

        // returning a success message after successful deletion
        return res.status(200).json({
            success: true, message: "Habit archived successfully"
        });
    } catch (error) {
        // error handling and clg for debugging
        console.error('Error in deleteHabit:', error);
        return res.status(500).json({
            success: false, message: "Failed to archive habit"
        });
    }
};

// Main handler for getting habit statistics
const getHabitStats = async (req, res) => {
    try {
        // getting habit_id from params
        const {habit_id} = req.params;

        // getting start and end date from query
        const {start_date, end_date} = req.query;


        // fetching habit logs from database of a particular habit
        const logs = await prisma.habitLog.findMany({
            where: {
                habit_id: parseInt(habit_id), completed_at: {
                    gte: start_date ? new Date(start_date) : undefined, lte: end_date ? new Date(end_date) : undefined
                }
            }, orderBy: {
                completed_at: 'asc'
            }
        });

        // fetching streak of that particular habit
        const streak = await prisma.habitStreak.findUnique({
            where: {habit_id: parseInt(habit_id)}
        });

        // setting up variables and making them suitable according to requirement
        const stats = {
            total_completions: logs.length,
            current_streak: streak?.current_streak || 0,
            longest_streak: streak?.longest_streak || 0,
            average_mood: logs.length > 0 ? (logs.reduce((sum, log) => sum + (log.mood_rating || 0), 0) / logs.length).toFixed(1) : 0,
            completion_dates: logs.map(log => ({
                date: log.completed_at, mood: log.mood_rating, notes: log.notes
            }))
        };


        // returning success message and also data
        return res.status(200).json({
            success: true, data: stats
        });
    } catch (error) {
        // error handling and clg for debugging
        console.error('Error in getHabitStats:', error);
        return res.status(500).json({
            success: false, message: "Failed to fetch habit statistics"
        });
    }
};

// Main handler for logging habit completion
const logHabitCompletion = async (req, res) => {
    try {
        const habit_id = req.params.habit_id; // getting data from params
        console.log(habit_id);
        const {completed_at, notes, mood_rating} = req.body; // getting data from frontend
        const user_id = req.user; // getting user_id from auth middleware


        // Validate habit ID
        if (!habit_id || isNaN(parseInt(habit_id))) {
            return res.status(400).json({
                success: false, message: "Invalid habit ID"
            });
        }

        // Verify habit exists and user owns it
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habit_id), user_id: parseInt(user_id), is_active: true
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false, message: "Habit not found"
            });
        }

        // Validate mood rating range
        if (mood_rating && (mood_rating < 1 || mood_rating > 5)) {
            return res.status(400).json({
                success: false, message: "Mood rating must be between 1 and 5"
            });
        }

        // Check for future dates
        const completionDate = new Date(completed_at || new Date());
        if (completionDate > new Date()) {
            return res.status(400).json({
                success: false, message: "Cannot log completion for future dates"
            });
        }



        // For daily habits, check if already logged today
        if (habit.frequency_type_id === 1) {
            const existingLog = await prisma.habitLog.findFirst({
                where: {
                    habit_id: parseInt(habit_id), user_id: parseInt(user_id), completed_at: {
                        gte: new Date(completionDate.setHours(0, 0, 0, 0)),
                        lte: new Date(completionDate.setHours(23, 59, 59, 999))
                    }
                }
            });

            // Validate mood rating format
            if (mood_rating !== undefined) {
                if (!Number.isInteger(Number(mood_rating)) || mood_rating < 1 || mood_rating > 5) {
                    return res.status(400).json({
                        success: false, message: "Mood rating must be a whole number between 1 and 5"
                    });
                }
            }

            // Check notes length
            if (notes && notes.length > 500) {
                return res.status(400).json({
                    success: false, message: "Notes cannot exceed 500 characters"
                });
            }

            if (existingLog) {
                return res.status(400).json({
                    success: false, message: "Habit already logged for today"
                });
            }
        }

        // Create new log entry
        const habitLog = await prisma.habitLog.create({
            data: {
                habit_id: parseInt(habit_id),
                user_id: parseInt(user_id),
                completed_at: new Date(completed_at || new Date()),
                notes,
                mood_rating: mood_rating ? parseInt(mood_rating) : null
            }
        });

        const user = await prisma.user.update({
            where: {
                user_id: parseInt(user_id),
            },
            data: {
                points_gained: {
                    increment: 30, // Increments the existing value by 30
                },
            },
        });


        // Get current streak info
        const streak = await prisma.habitStreak.findUnique({
            where: {habit_id: parseInt(habit_id)}
        });

        if (streak) {
            // Calculate days between completions
            const lastCompleted = new Date(streak.last_completed_at);
            const currentCompletion = new Date(completed_at || new Date());
            const dayDifference = Math.floor((currentCompletion - lastCompleted) / (1000 * 60 * 60 * 24));

            // Update streak count
            let newCurrentStreak = streak.current_streak;
            if (dayDifference <= 1) {
                newCurrentStreak += 1;
            } else {
                newCurrentStreak = 1;
            }

            // Save updated streak
            await prisma.habitStreak.update({
                where: {habit_id: parseInt(habit_id)}, data: {
                    current_streak: newCurrentStreak,
                    longest_streak: Math.max(newCurrentStreak, streak.longest_streak),
                    last_completed_at: currentCompletion
                }
            });
        }

        // Send success response
        return res.status(201).json({
            success: true, message: "Habit completion logged successfully", data: habitLog
        });
    } catch (error) {
        // Handle any errors
        console.error('Error in logHabitCompletion:', error);
        return res.status(500).json({
            success: false, message: "Failed to log habit completion"
        });
    }
};

// Main handler to Update a habit
const updateHabit = async (req, res) => {
    try {
        const {habit_id} = req.params;
        const {
            name,
            description,
            domain_id,
            frequency_type_id,
            frequency_value,
            frequency_interval,
            start_date,
            end_date,
            is_active
        } = req.body;

        // Verify habit exists and belongs to user
        const existingHabit = await prisma.habit.findUnique({
            where: {habit_id: parseInt(habit_id)}
        });

        if (!existingHabit) {
            return res.status(404).json({
                success: false, message: "Habit not found"
            });
        }

        // Update the habit
        const updatedHabit = await prisma.habit.update({
            where: {
                habit_id: parseInt(habit_id)
            }, data: {
                name,
                description,
                domain_id: domain_id ? parseInt(domain_id) : undefined,
                frequency_type_id: frequency_type_id ? parseInt(frequency_type_id) : undefined,
                frequency_value: frequency_value ? parseInt(frequency_value) : undefined,
                frequency_interval: frequency_interval ? parseInt(frequency_interval) : undefined,
                start_date: start_date ? new Date(start_date) : undefined,
                end_date: end_date ? new Date(end_date) : null,
                is_active: is_active !== undefined ? is_active : undefined
            }, include: {
                domain: true, frequencyType: true
            }
        });

        return res.status(200).json({
            success: true, message: "Habit updated successfully", data: updatedHabit
        });
    } catch (error) {
        console.error('Error in updateHabit:', error);
        return res.status(500).json({
            success: false, message: "Failed to update habit"
        });
    }
};

// Main handler to get user's upcoming habits for today and tomorrow
const getUpcomingHabits = async (req, res) => {
    try {
        const user_id = req?.user;  // Get authenticated user's ID

        // Get current date and time
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);

        // Get current day of week (1-7, where 1 is Monday and 7 is Sunday)
        // First convert JavaScript's 0-6 (where 0 is Sunday) to our 1-7 format
        const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

        // Calculate next day of week (handling wrap-around from 7 to 1)
        const nextDayOfWeek = dayOfWeek === 7 ? 1 : dayOfWeek + 1;

        // Get current day of month (1-31)
        const dayOfMonth = now.getDate();

        // Calculate next day of month (handling month boundary)
        const nextDayOfMonth = dayOfMonth < 28 ? dayOfMonth + 1 : 1;

        // Get current month (1-12)
        const monthOfYear = now.getMonth() + 1;

        // Calculate week of month (1-5)
        const weekOfMonth = Math.ceil(dayOfMonth / 7);

        // Fetch active habits with upcoming schedules
        const upcomingHabits = await prisma.habit.findMany({
            where: {
                user_id: parseInt(user_id),
                is_active: true,
                is_archived: false,
                start_date: {
                    lte: endOfTomorrow  // Only habits that have started or will start tomorrow
                },
                OR: [
                    { end_date: null },  // Ongoing habits
                    { end_date: { gte: today } }  // Not yet ended habits
                ]
            },
            include: {
                domain: true,
                frequencyType: true,
                schedules: {
                    where: {
                        OR: [
                            // Daily habits
                            {
                                habit: {
                                    frequency_type_id: 1
                                }
                            },
                            // Weekly habits for today or tomorrow
                            {
                                day_of_week: {
                                    hasSome: [dayOfWeek, nextDayOfWeek]
                                }
                            },
                            // Monthly habits for today or tomorrow
                            {
                                day_of_month: {
                                    hasSome: [dayOfMonth, nextDayOfMonth]
                                }
                            },
                            // Yearly habits for today or tomorrow's month and day
                            {
                                month_of_year: {
                                    hasSome: [monthOfYear]
                                },
                                day_of_month: {
                                    hasSome: [dayOfMonth, nextDayOfMonth]
                                }
                            },
                            // Specific week of month
                            {
                                week_of_month: {
                                    hasSome: [weekOfMonth]
                                },
                                day_of_week: {
                                    hasSome: [dayOfWeek, nextDayOfWeek]
                                }
                            }
                        ]
                    }
                },
                reminders: true,
                streak: true,
                difficulty: true,
                logs: {
                    orderBy: {
                        completed_at: 'desc'
                    },
                    take: 1 // Just get the most recent log
                }
            },
            // Order simply by name instead of trying to order by times_of_day
            orderBy: {
                name: 'asc'
            }
        });

        // Process habits to detect which ones are already completed today
        const processedHabits = upcomingHabits.map(habit => {
            // Check if habit is completed today
            const isCompletedToday = habit.logs.some(log => {
                const logDate = new Date(log.completed_at);
                return logDate.toDateString() === today.toDateString();
            });

            // Return habit with completion status
            return {
                ...habit,
                is_completed_today: isCompletedToday
            };
        });

        // Filter out habits that don't have valid schedules after applying filters
        const filteredHabits = processedHabits.filter(habit =>
            habit.schedules && habit.schedules.length > 0
        );

        return res.status(200).json({
            success: true,
            data: filteredHabits
        });
    } catch (error) {
        console.error('Error in getUpcomingHabits:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch upcoming habits",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Main handler to get user's habits by domain
const getHabitsByDomain = async (req, res) => {
    try {
        const {domain_id} = req.params;
        const user_id = req.user.id;

        // Validate domain ID
        if (!domain_id || isNaN(parseInt(domain_id))) {
            return res.status(400).json({
                success: false, message: "Invalid domain ID"
            });
        }

        // Fetch habits for specific domain
        const habits = await prisma.habit.findMany({
            where: {
                user_id: parseInt(user_id), domain_id: parseInt(domain_id), is_active: true
            }, include: {
                domain: true, streak: true, logs: {
                    take: 5, orderBy: {
                        completed_at: 'desc'
                    }
                }
            }
        });

        return res.status(200).json({
            success: true, data: habits
        });
    } catch (error) {
        console.error('Error in getHabitsByDomain:', error);
        return res.status(500).json({
            success: false, message: "Failed to fetch habits by domain"
        });
    }
};

// Main handler to Update habit reminder settings
const updateHabitReminders = async (req, res) => {
    try {
        const {habit_id} = req.params;
        const {reminder_time, is_enabled} = req.body;
        const user_id = req.user.id;

        // Validate inputs
        if (!habit_id || isNaN(parseInt(habit_id))) {
            return res.status(400).json({
                success: false, message: "Invalid habit ID"
            });
        }

        // Check if habit exists and belongs to user
        const habit = await prisma.habit.findFirst({
            where: {
                habit_id: parseInt(habit_id), user_id: parseInt(user_id), is_active: true
            }
        });

        if (!habit) {
            return res.status(404).json({
                success: false, message: "Habit not found or unauthorized"
            });
        }

        // Update or create reminder
        const reminder = await prisma.habitReminder.upsert({
            where: {
                habit_id: parseInt(habit_id)
            }, update: {
                reminder_time: reminder_time ? new Date(reminder_time) : undefined,
                is_enabled: is_enabled !== undefined ? is_enabled : true
            }, create: {
                habit_id: parseInt(habit_id),
                reminder_time: new Date(reminder_time),
                is_enabled: is_enabled !== undefined ? is_enabled : true
            }
        });

        return res.status(200).json({
            success: true, message: "Reminder settings updated successfully", data: reminder
        });
    } catch (error) {
        console.error('Error in updateHabitReminders:', error);
        return res.status(500).json({
            success: false, message: "Failed to update reminder settings"
        });
    }
};

// Main handler to get user's habit completion history
const getHabitHistory = async (req, res) => {
    try {
        const {habit_id} = req.params;
        const {start_date, end_date} = req.query;
        const user_id = req.user.id;

        // Validate dates if provided
        if (start_date && !isValidDate(start_date)) {
            return res.status(400).json({
                success: false, message: "Invalid start date format"
            });
        }

        if (end_date && !isValidDate(end_date)) {
            return res.status(400).json({
                success: false, message: "Invalid end date format"
            });
        }

        // Fetch habit logs with date range
        const history = await prisma.habitLog.findMany({
            where: {
                habit_id: parseInt(habit_id), user_id: parseInt(user_id), completed_at: {
                    gte: start_date ? new Date(start_date) : undefined, lte: end_date ? new Date(end_date) : undefined
                }
            }, orderBy: {
                completed_at: 'desc'
            }, include: {
                habit: {
                    select: {
                        name: true, domain: true
                    }
                }
            }
        });

        return res.status(200).json({
            success: true, data: history
        });
    } catch (error) {
        console.error('Error in getHabitHistory:', error);
        return res.status(500).json({
            success: false, message: "Failed to fetch habit history"
        });
    }
};


// exporting all the functions of this controller
module.exports = {
    addHabit,
    getUserHabits,
    getSingleHabit,
    getHabitStats,
    logHabitCompletion,
    updateHabit,
    deleteHabit,
    getUpcomingHabits,
    getHabitsByDomain,
    updateHabitReminders,
    getHabitHistory
}