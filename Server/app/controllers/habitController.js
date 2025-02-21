const {PrismaClient} = require('@prisma/client');
const res = require("express/lib/response");
const {createLogger} = require("winston");
const prisma = new PrismaClient();

// Utility function to validate dates
const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

// Function to validate frequency values based on type
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
            start_date,
            end_date = null,
            specific_time = null,
            days_of_week = [], // For weekly habits [1,3,5] = Mon,Wed,Fri
            days_of_month = [], // For monthly habits [1,15] = 1st and 15th
            reminder_time = [],
        } = req.body;

        const user_id = req.user;

        // Basic validation
        if (!name || !domain_id || !frequency_type_id || !frequency_value || !frequency_interval || !start_date || !Array.isArray(reminder_time)) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields or invalid format",
                required: ['name', 'domain_id', 'frequency_type_id', 'frequency_value', 'frequency_interval', 'start_date', 'reminder_time (array)']
            });
        }

        // Validate dates
        if (!isValidDate(start_date) || (end_date && !isValidDate(end_date))) {
            return res.status(400).json({
                success: false, message: "Invalid date format", tip: "Use ISO date format (YYYY-MM-DD)"
            });
        }

        // Validate reminder times
        for (let time of reminder_time) {
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
                success: false, message: "Domain not found", tip: "Use GET /api/domains to see available domains"
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
                tip: "Use GET /api/frequency-types to see available options"
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

        // Check number of reminders for daily habits
        if (frequencyType.name.toLowerCase() === 'daily' && reminder_time.length > frequency_value) {
            return res.status(400).json({
                success: false,
                message: "Number of reminders exceeds daily frequency",
                tip: `For daily habits, ensure number of reminders doesn't exceed ${frequency_value}`
            });
        }

        // Create or update the habit
        const habit = await prisma.habit.create({
            data: {
                name,
                description,
                start_date: startDateObj,
                end_date: endDateObj,
                frequency_value: parseInt(frequency_value),
                frequency_interval: parseInt(frequency_interval),
                user: {connect: {user_id: parseInt(user_id)}},
                domain: {connect: {domain_id: parseInt(domain_id)}},
                frequencyType: {connect: {frequency_type_id: parseInt(frequency_type_id)}},
                is_active: true
            }
        });

        // Create schedule if specified
        if (days_of_week.length > 0 || days_of_month.length > 0 || specific_time) {
            await prisma.habitSchedule.create({
                data: {
                    habit_id: habit.habit_id,
                    day_of_week: days_of_week.length > 0 ? days_of_week : null,
                    day_of_month: days_of_month.length > 0 ? days_of_month : null,
                    specific_time: specific_time ? new Date(specific_time) : null
                }
            });
        }

        // Create reminders if specified
        if (reminder_time.length > 0) {
            const reminderData = reminder_time.map(time => ({
                habit_id:  habit.habit_id,
                reminder_time: new Date(time),
                is_enabled: true
            }));

            await prisma.habitReminder.createMany({
                data: reminderData
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
                last_completed_at: null
            }
        });

        return res.status(201).json({
            success: true, message: "Habit created successfully", data: {
                habit_id: habit.habit_id,
                name: habit.name,
                start_date: habit.start_date,
                frequency: `${frequency_value} times per ${frequencyType.name.toLowerCase()}`,
                reminders: reminder_time.length
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
                user_id: parseInt(user_id), // Ensure user_id is an integer
                is_active: true // Fetch only active habits
            }, include: {
                domain: true,         // Include associated domain details
                frequencyType: true,  // Include frequency type details
                schedules: true,       // Include habit schedule details
                streak: true,         // Include habit streak details
                reminders: true,      // Include associated reminders
                logs: {
                    orderBy: {
                        completed_at: 'desc' // Order logs by most recent completion time
                    }, take: 5 // Retrieve only the last 5 logs for each habit
                }
            }, orderBy: {
                createdAt: 'desc' // Order habits by most recent creation date
            }
        });

        // Send a successful response with the retrieved habits data
        return res.status(200).json({
            success: true, data: habits
        });
    } catch (error) {
        // Log the error for debugging purposes
        console.error('Error in getUserHabits:', error);

        // Return a 500 Internal Server Error response with a failure message
        return res.status(500).json({
            success: false, message: "Failed to fetch habits"
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
        const {habit_id} = req.params; // getting data from params
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

        console.log(habit)

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
            data:{
                points_gained : + 30
            }
        })

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
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch active habits with their schedules
        const upcomingHabits = await prisma.habit.findMany({
            where: {
                user_id: parseInt(user_id), is_active: true, start_date: {
                    lte: tomorrow  // Only habits that have started
                }, OR: [{end_date: null},  // Ongoing habits
                    {end_date: {gte: today}}  // Not yet ended habits
                ]
            }, include: {
                domain: true, frequencyType: true, schedules: true, reminders: true
            }
        });

        return res.status(200).json({
            success: true, data: upcomingHabits
        });
    } catch (error) {
        console.error('Error in getUpcomingHabits:', error);
        return res.status(500).json({
            success: false, message: "Failed to fetch upcoming habits"
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