const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Creates default habits for newly registered users
 * @param {number} userId - The user ID to create habits for
 * @returns {Promise<Array>} - Array of created habits
 */
const createDefaultHabitsForUser = async (userId) => {
    try {
        // Get domain IDs
        const healthDomain = await prisma.habitDomain.findFirst({
            where: { name: 'Health' }
        });

        const mindfulnessDomain = await prisma.habitDomain.findFirst({
            where: { name: 'Mindfulness' }
        });

        const productivityDomain = await prisma.habitDomain.findFirst({
            where: { name: 'Productivity' }
        });

        if (!healthDomain || !mindfulnessDomain || !productivityDomain) {
            console.error('Required domains not found for default habits');
            return [];
        }

        // Today's date
        const today = new Date()  ;

        // Default habits configuration
        const defaultHabits = [
            {
                name: 'Drink Water',
                description: 'Drink 8 glasses of water throughout the day',
                icon: '💧',
                color: '#2196F3',
                start_date: today,
                frequency_type: 'DAILY',
                frequency_value: 1,
                frequency_interval: 1,
                specific_days: [],
                tracking_type: 'COUNT',
                count_goal: 8,
                units: 'glasses',
                difficulty: 'EASY',
                domain_id: healthDomain.domain_id,
                tags: JSON.stringify(['health', 'hydration']),
                cue: 'Keep a water bottle visible on your desk',
                reward: 'Better focus and energy throughout the day',
                skip_on_vacation: true,
                require_evidence: false,
                motivation_quote: "Staying hydrated improves focus, energy, and overall health.",
                is_favorite: true,
                points_per_completion: 5,
                bonus_points_streak: 2,
                reminder_time: new Date(today.setHours(9, 0, 0, 0)), // 9 AM
                reminder_message: "Time to drink a glass of water! 💧"
            },
            {
                name: 'Morning Meditation',
                description: 'Start your day with 5 minutes of mindfulness',
                icon: '🧘',
                color: '#9C27B0',
                start_date: today,
                frequency_type: 'DAILY',
                frequency_value: 1,
                frequency_interval: 1,
                specific_days: [],
                tracking_type: 'DURATION',
                duration_goal: 5,
                units: 'minutes',
                difficulty: 'MEDIUM',
                domain_id: mindfulnessDomain.domain_id,
                tags: JSON.stringify(['mindfulness', 'mental health']),
                cue: 'After waking up, before checking your phone',
                reward: 'Increased focus and reduced stress',
                skip_on_vacation: false,
                require_evidence: false,
                motivation_quote: "Just 5 minutes of meditation can reduce stress and improve focus.",
                is_favorite: false,
                points_per_completion: 10,
                bonus_points_streak: 3,
                reminder_time: new Date(today.setHours(7, 0, 0, 0)), // 7 AM
                reminder_message: "Take 5 minutes for your morning meditation 🧘"
            },
            {
                name: 'Daily Planning',
                description: 'Take 10 minutes to plan your day',
                icon: '📝',
                color: '#F44336',
                start_date: today,
                frequency_type: 'WEEKDAYS',
                frequency_value: 1,
                frequency_interval: 1,
                specific_days: [1, 2, 3, 4, 5], // Monday to Friday
                tracking_type: 'BOOLEAN',
                difficulty: 'EASY',
                domain_id: productivityDomain.domain_id,
                tags: JSON.stringify(['productivity', 'planning']),
                cue: 'When you first sit down at your desk',
                reward: 'More productive and organized day',
                skip_on_vacation: true,
                require_evidence: false,
                motivation_quote: "Planning your day can increase productivity by up to 25%.",
                is_favorite: false,
                points_per_completion: 8,
                bonus_points_streak: 2,
                reminder_time: new Date(today.setHours(8, 30, 0, 0)), // 8:30 AM
                reminder_message: "Time to plan your day for maximum productivity! 📝"
            }
        ];

        const createdHabits = [];

        // Create each default habit
        for (const habitData of defaultHabits) {
            // Create the habit
            const habit = await prisma.habit.create({
                data: {
                    name: habitData.name,
                    description: habitData.description,
                    start_date: habitData.start_date,
                    icon: habitData.icon,
                    color: habitData.color,
                    is_active: true,
                    is_favorite: habitData.is_favorite,
                    frequency_type: habitData.frequency_type,
                    frequency_value: habitData.frequency_value,
                    frequency_interval: habitData.frequency_interval,
                    specific_days: habitData.specific_days,
                    tracking_type: habitData.tracking_type,
                    duration_goal: habitData.tracking_type === 'DURATION' ? habitData.duration_goal : null,
                    count_goal: habitData.tracking_type === 'COUNT' ? habitData.count_goal : null,
                    units: habitData.units,
                    domain_id: habitData.domain_id,
                    user_id: userId,
                    tags: habitData.tags,
                    difficulty: habitData.difficulty,
                    cue: habitData.cue,
                    reward: habitData.reward,
                    skip_on_vacation: habitData.skip_on_vacation,
                    grace_period_enabled: true,
                    grace_period_hours: 24,
                    motivation_quote: habitData.motivation_quote,
                    require_evidence: habitData.require_evidence,
                    points_per_completion: habitData.points_per_completion,
                    bonus_points_streak: habitData.bonus_points_streak
                }
            });

            createdHabits.push(habit);

            // Create streak record
            await prisma.habitStreak.create({
                data: {
                    habit_id: habit.habit_id,
                    user_id: userId,
                    current_streak: 0,
                    longest_streak: 0,
                    missed_days_count: 0,
                    grace_period_used: false,
                    streak_history: JSON.stringify([])
                }
            });

            // Create a reminder
            await prisma.habitReminder.create({
                data: {
                    habit_id: habit.habit_id,
                    user_id: userId,
                    reminder_time: habitData.reminder_time,
                    repeat: habitData.frequency_type === 'DAILY' ? 'DAILY' :
                        habitData.frequency_type === 'WEEKDAYS' ? 'WEEKDAYS' :
                            habitData.frequency_type === 'SPECIFIC_DAYS' ? 'CUSTOM' : 'DAILY',
                    notification_message: habitData.reminder_message,
                    is_enabled: true,
                    smart_reminder: false,
                    snooze_count: 0,
                    pre_notification_minutes: 15,
                    follow_up_enabled: true,
                    follow_up_minutes: 30
                }
            });

            // Create daily status for today
            await prisma.habitDailyStatus.create({
                data: {
                    habit_id: habit.habit_id,
                    user_id: userId,
                    date: new Date(),
                    is_scheduled: true,
                    is_completed: false,
                    is_skipped: false
                }
            });
        }

        // Update user stats to reflect new habits
        await prisma.userStats.upsert({
            where: { user_id: userId },
            update: {},
            create: {
                user_id: userId,
                daily_completed: 0,
                weekly_completed: 0,
                monthly_completed: 0,
                total_completed: 0,
                current_streak: 0,
                longest_streak: 0
            }
        });

        // Create a welcome notification
        await prisma.notification.create({
            data: {
                user_id: userId,
                title: "Welcome to HabitPulse!",
                content: "We've created 3 starter habits to help you begin your journey. Check them out and start building positive routines!",
                type: "SYSTEM_MESSAGE",
                is_read: false
            }
        });

        console.log(`Created ${createdHabits.length} default habits for user ${userId}`);
        return createdHabits;
    } catch (error) {
        console.error('Error creating default habits:', error);
        return [];
    }
};

module.exports = {
    createDefaultHabitsForUser
};