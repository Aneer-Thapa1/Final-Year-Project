// Updated seed file for Habit Tracker App
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting database initialization...');

    // Default password for test users
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // ====================================================
    // PART 1: CREATE HABIT DOMAINS
    // ====================================================
    const domains = [
        { name: 'Health', icon: '🏥', color: '#4CAF50', sortOrder: 1, is_default: true },
        { name: 'Fitness', icon: '💪', color: '#FF5722', sortOrder: 2 },
        { name: 'Education', icon: '📚', color: '#3F51B5', sortOrder: 3 },
        { name: 'Finance', icon: '💰', color: '#8BC34A', sortOrder: 4 },
        { name: 'Career', icon: '💼', color: '#009688', sortOrder: 5 },
        { name: 'Mindfulness', icon: '🧘', color: '#9C27B0', sortOrder: 6 },
        { name: 'Social', icon: '👥', color: '#2196F3', sortOrder: 7 },
        { name: 'Productivity', icon: '⏰', color: '#F44336', sortOrder: 8 },
        { name: 'Hobbies', icon: '🎨', color: '#FF9800', sortOrder: 9 },
        { name: 'Self-Development', icon: '🌱', color: '#795548', sortOrder: 10 },
        { name: 'Environment', icon: '🌍', color: '#00BCD4', sortOrder: 11 },
        { name: 'Custom', icon: '📌', color: '#607D8B', sortOrder: 12 }
    ];

    for (const domain of domains) {
        const existingDomain = await prisma.habitDomain.findFirst({ where: { name: domain.name } });
        if (!existingDomain) {
            await prisma.habitDomain.create({
                data: {
                    name: domain.name,
                    description: `For tracking ${domain.name.toLowerCase()} habits`,
                    icon: domain.icon,
                    color: domain.color,
                    sortOrder: domain.sortOrder,
                    is_default: domain.is_default || false
                }
            });
        }
    }

    // ====================================================
    // PART 2: CREATE BLOG CATEGORIES
    // ====================================================
    // Get all domains to use as blog categories
    const allDomains = await prisma.habitDomain.findMany();

    // Additional blog-specific categories
    const additionalCategories = [
        { name: 'Success Stories', icon: '🏆', color: '#E91E63' },
        { name: 'Tips & Tricks', icon: '💡', color: '#FFC107' },
        { name: 'Scientific Research', icon: '🔬', color: '#9E9E9E' }
    ];

    // Create domain-based categories
    for (const domain of allDomains) {
        const existingCategory = await prisma.category.findFirst({
            where: { category_name: domain.name }
        });

        if (!existingCategory) {
            await prisma.category.create({
                data: {
                    category_name: domain.name,
                    icon: domain.icon,
                    color: domain.color
                }
            });
        }
    }

    // Create additional categories
    for (const category of additionalCategories) {
        const existingCategory = await prisma.category.findFirst({
            where: { category_name: category.name }
        });

        if (!existingCategory) {
            await prisma.category.create({
                data: {
                    category_name: category.name,
                    icon: category.icon,
                    color: category.color
                }
            });
        }
    }

    // ====================================================
    // PART 3: CREATE DEMO USERS
    // ====================================================
    const demoUsers = [
        {
            user_name: 'Alex Davis',
            user_email: 'alex@example.com',
            gender: 'Male',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            theme_preference: 'dark',
            points_gained: 150,
            premium_status: true
        },
        {
            user_name: 'Samantha Wong',
            user_email: 'samantha@example.com',
            gender: 'Female',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            theme_preference: 'light',
            points_gained: 120,
        },
        {
            user_name: 'Jamie Smith',
            user_email: 'jamie@example.com',
            gender: 'Non-binary',
            avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
            theme_preference: 'auto',
            points_gained: 95,
        }
    ];

    const createdUsers = [];
    for (const userData of demoUsers) {
        const existingUser = await prisma.user.findFirst({
            where: { user_email: userData.user_email }
        });

        if (!existingUser) {
            const newUser = await prisma.user.create({
                data: {
                    ...userData,
                    password: hashedPassword,
                    timezone: 'UTC',
                    language: 'en',
                    dailyGoal: 3,
                    weeklyGoal: 15,
                    monthlyGoal: 60
                }
            });
            createdUsers.push(newUser);
        } else {
            createdUsers.push(existingUser);
        }
    }

    // ====================================================
    // PART 4: CREATE ACHIEVEMENTS
    // ====================================================
    const achievements = [
        {
            name: 'First Step',
            description: 'Complete your first habit',
            icon: '🏁',
            criteria_type: 'TOTAL_COMPLETIONS',
            criteria_value: 1,
            xp_value: 10
        },
        {
            name: 'Consistency King',
            description: 'Maintain a 7-day streak on any habit',
            icon: '👑',
            criteria_type: 'STREAK_LENGTH',
            criteria_value: 7,
            xp_value: 50
        },
        {
            name: 'Habit Master',
            description: 'Maintain a 30-day streak on any habit',
            icon: '🌟',
            criteria_type: 'STREAK_LENGTH',
            criteria_value: 30,
            xp_value: 200
        },
        {
            name: 'Early Bird',
            description: 'Complete 5 habits before 9 AM',
            icon: '🌅',
            criteria_type: 'TOTAL_COMPLETIONS',
            criteria_value: 5,
            xp_value: 25
        },
        {
            name: 'Domain Explorer',
            description: 'Create habits in 3 different domains',
            icon: '🧭',
            criteria_type: 'HABIT_DIVERSITY',
            criteria_value: 3,
            xp_value: 30
        }
    ];

    for (const achievement of achievements) {
        const existingAchievement = await prisma.achievement.findFirst({
            where: { name: achievement.name }
        });

        if (!existingAchievement) {
            await prisma.achievement.create({
                data: {
                    ...achievement,
                    badge_image: `badges/${achievement.name.toLowerCase().replace(/\s+/g, '_')}.png`,
                    is_hidden: false
                }
            });
        }
    }

    // ====================================================
    // PART 5: CREATE EXAMPLE HABITS
    // ====================================================
    // Get domain IDs for reference
    const healthDomain = await prisma.habitDomain.findFirst({ where: { name: 'Health' } });
    const fitnessDomain = await prisma.habitDomain.findFirst({ where: { name: 'Fitness' } });
    const mindfulnessDomain = await prisma.habitDomain.findFirst({ where: { name: 'Mindfulness' } });
    const educationDomain = await prisma.habitDomain.findFirst({ where: { name: 'Education' } });
    const productivityDomain = await prisma.habitDomain.findFirst({ where: { name: 'Productivity' } });

    if (!healthDomain || !fitnessDomain || !mindfulnessDomain || !educationDomain || !productivityDomain) {
        console.error('Required domains not found');
        return;
    }

    // Create habits for demo users
    if (createdUsers.length > 0) {
        const alexUser = createdUsers[0]; // Alex
        const samanthaUser = createdUsers[1]; // Samantha
        const jamieUser = createdUsers[2]; // Jamie

        // ====================================================
        // Habits for Alex
        // ====================================================
        const alexHabits = [
            {
                name: 'Morning Run',
                description: '5K morning run for energy and fitness',
                icon: '🏃',
                color: '#FF5722',
                start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // Started 30 days ago
                is_favorite: true,
                frequency_type: 'SPECIFIC_DAYS',
                frequency_value: 3,
                frequency_interval: 7,
                specific_days: [1, 3, 5], // Monday, Wednesday, Friday
                tracking_type: 'NUMERIC',
                numeric_goal: 5,
                units: 'kilometers',
                domain_id: fitnessDomain.domain_id,
                user_id: alexUser.user_id,
                tags: JSON.stringify(['running', 'cardio']),
                difficulty: 'MEDIUM',
                is_active: true,
                cue: 'After waking up',
                reward: 'Morning energy boost and healthy mindset',
                completedDays: 12,
                targetDays: 30
            },
            {
                name: 'Drink Water',
                description: 'Drink 8 glasses of water throughout the day',
                icon: '💧',
                color: '#2196F3',
                start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45), // Started 45 days ago
                is_favorite: true,
                frequency_type: 'DAILY',
                frequency_value: 1,
                frequency_interval: 1,
                tracking_type: 'COUNT',
                count_goal: 8,
                units: 'glasses',
                domain_id: healthDomain.domain_id,
                user_id: alexUser.user_id,
                tags: JSON.stringify(['health', 'hydration']),
                difficulty: 'EASY',
                is_active: true,
                cue: 'Place water bottle on desk',
                reward: 'Better focus and energy throughout day',
                completedDays: 40,
                targetDays: 45
            },
            {
                name: 'Read Books',
                description: 'Read for personal growth and learning',
                icon: '📚',
                color: '#3F51B5',
                start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15), // Started 15 days ago
                is_favorite: false,
                frequency_type: 'DAILY',
                frequency_value: 1,
                frequency_interval: 1,
                tracking_type: 'DURATION',
                duration_goal: 30,
                units: 'minutes',
                domain_id: educationDomain.domain_id,
                user_id: alexUser.user_id,
                tags: JSON.stringify(['reading', 'learning']),
                difficulty: 'MEDIUM',
                is_active: true,
                cue: 'After dinner',
                reward: 'New insights and knowledge',
                completedDays: 10,
                targetDays: 15
            }
        ];

        for (const habitData of alexHabits) {
            const existingHabit = await prisma.habit.findFirst({
                where: { name: habitData.name, user_id: alexUser.user_id }
            });

            if (!existingHabit) {
                const habit = await prisma.habit.create({
                    data: {
                        name: habitData.name,
                        description: habitData.description,
                        start_date: habitData.start_date,
                        icon: habitData.icon,
                        color: habitData.color,
                        is_active: habitData.is_active,
                        is_favorite: habitData.is_favorite,
                        frequency_type: habitData.frequency_type,
                        frequency_value: habitData.frequency_value,
                        frequency_interval: habitData.frequency_interval,
                        specific_days: habitData.specific_days || [],
                        tracking_type: habitData.tracking_type,
                        duration_goal: habitData.duration_goal,
                        count_goal: habitData.count_goal,
                        numeric_goal: habitData.numeric_goal,
                        units: habitData.units,
                        domain_id: habitData.domain_id,
                        user_id: habitData.user_id,
                        tags: habitData.tags,
                        difficulty: habitData.difficulty,
                        cue: habitData.cue,
                        reward: habitData.reward,
                        skip_on_vacation: true,
                        grace_period_enabled: true,
                        grace_period_hours: 24,
                        require_evidence: false
                    }
                });

                // Create streak record
                await prisma.habitStreak.create({
                    data: {
                        habit_id: habit.habit_id,
                        user_id: alexUser.user_id,
                        current_streak: habitData.name === 'Drink Water' ? 25 : habitData.name === 'Morning Run' ? 3 : 7,
                        longest_streak: habitData.name === 'Drink Water' ? 25 : habitData.name === 'Morning Run' ? 10 : 7,
                        last_completed: new Date(Date.now() - 1000 * 60 * 60 * 24),
                        streak_history: JSON.stringify([
                            { start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), end: new Date(), length: habitData.name === 'Drink Water' ? 25 : habitData.name === 'Morning Run' ? 3 : 7 }
                        ])
                    }
                });

                // Create sample habit logs - more for favorites
                const logCount = habitData.is_favorite ? 15 : 10;
                for (let i = 0; i < logCount; i++) {
                    const randomDay = Math.floor(Math.random() * (habitData.name === 'Morning Run' ? 30 : 15)) + 1;
                    const completionValue = habitData.tracking_type === 'NUMERIC' ?
                        (habitData.numeric_goal + (Math.random() - 0.5)) :
                        habitData.tracking_type === 'COUNT' ?
                            habitData.count_goal :
                            habitData.tracking_type === 'DURATION' ?
                                habitData.duration_goal : null;

                    await prisma.habitLog.create({
                        data: {
                            habit_id: habit.habit_id,
                            user_id: alexUser.user_id,
                            completed: true,
                            completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * randomDay),
                            duration_completed: habitData.tracking_type === 'DURATION' ? completionValue : null,
                            count_completed: habitData.tracking_type === 'COUNT' ? completionValue : null,
                            numeric_completed: habitData.tracking_type === 'NUMERIC' ? completionValue : null,
                            completion_notes: `Completed ${habitData.name}`,
                            mood: Math.floor(Math.random() * 3) + 3 // 3-5 rating
                        }
                    });
                }

                // Create reminders
                await prisma.habitReminder.create({
                    data: {
                        habit_id: habit.habit_id,
                        user_id: alexUser.user_id,
                        reminder_time: new Date(
                            habitData.name === 'Morning Run' ?
                                new Date().setHours(6, 30, 0, 0) :
                                habitData.name === 'Read Books' ?
                                    new Date().setHours(20, 0, 0, 0) :
                                    new Date().setHours(9, 0, 0, 0)
                        ),
                        repeat: habitData.frequency_type === 'DAILY' ? 'DAILY' :
                            habitData.frequency_type === 'SPECIFIC_DAYS' ? 'CUSTOM' : 'DAILY',
                        notification_message: `Time for your ${habitData.name.toLowerCase()}!`,
                        is_enabled: true,
                        smart_reminder: habitData.name === 'Morning Run',
                        pre_notification_minutes: 15
                    }
                });

                // Create daily statuses for visualization
                for (let i = 0; i < 7; i++) {
                    const date = new Date(Date.now() - 1000 * 60 * 60 * 24 * i);
                    const isScheduled = habitData.frequency_type === 'DAILY' ||
                        (habitData.frequency_type === 'SPECIFIC_DAYS' &&
                            habitData.specific_days.includes(date.getDay()));

                    // Randomly determine completion status for demo purposes
                    const isCompleted = isScheduled && (Math.random() > 0.3);

                    await prisma.habitDailyStatus.create({
                        data: {
                            habit_id: habit.habit_id,
                            user_id: alexUser.user_id,
                            date: date,
                            is_scheduled: isScheduled,
                            is_completed: isCompleted,
                            is_skipped: isScheduled && !isCompleted && (Math.random() > 0.7),
                            completion_time: isCompleted ? new Date(date.setHours(
                                habitData.name === 'Morning Run' ? 7 :
                                    habitData.name === 'Read Books' ? 21 :
                                        14, Math.floor(Math.random() * 60), 0, 0)) : null
                        }
                    });
                }
            }
        }

        // ====================================================
        // Habits for Samantha - simpler setup for brevity
        // ====================================================
        const samanthaHabits = [
            {
                name: 'Morning Meditation',
                description: 'Start the day with 10 minutes of mindfulness',
                icon: '🧘‍♀️',
                color: '#9C27B0',
                domain_id: mindfulnessDomain.domain_id
            },
            {
                name: 'Journal Writing',
                description: 'Reflect on the day and practice gratitude',
                icon: '📔',
                color: '#00BCD4',
                domain_id: mindfulnessDomain.domain_id
            },
            {
                name: 'Daily Planning',
                description: 'Plan tasks and priorities for the day',
                icon: '📝',
                color: '#F44336',
                domain_id: productivityDomain.domain_id
            }
        ];

        // Create basic habits for Samantha
        for (const habitData of samanthaHabits) {
            const existingHabit = await prisma.habit.findFirst({
                where: { name: habitData.name, user_id: samanthaUser.user_id }
            });

            if (!existingHabit) {
                await prisma.habit.create({
                    data: {
                        name: habitData.name,
                        description: habitData.description,
                        start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * Math.floor(Math.random() * 20 + 5)),
                        icon: habitData.icon,
                        color: habitData.color,
                        is_active: true,
                        is_favorite: Math.random() > 0.5,
                        frequency_type: 'DAILY',
                        frequency_value: 1,
                        frequency_interval: 1,
                        tracking_type: 'BOOLEAN',
                        domain_id: habitData.domain_id,
                        user_id: samanthaUser.user_id,
                        tags: JSON.stringify([habitData.name.toLowerCase().split(' ')[0]]),
                        difficulty: 'MEDIUM',
                        skip_on_vacation: true
                    }
                });
            }
        }

        // ====================================================
        // Habits for Jamie - just one example habit
        // ====================================================
        const existingJamieHabit = await prisma.habit.findFirst({
            where: { name: 'Learn Programming', user_id: jamieUser.user_id }
        });

        if (!existingJamieHabit) {
            await prisma.habit.create({
                data: {
                    name: 'Learn Programming',
                    description: 'Study programming for 1 hour daily',
                    start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
                    icon: '💻',
                    color: '#3F51B5',
                    is_active: true,
                    is_favorite: true,
                    frequency_type: 'WEEKDAYS',
                    frequency_value: 1,
                    frequency_interval: 1,
                    tracking_type: 'DURATION',
                    duration_goal: 60,
                    units: 'minutes',
                    domain_id: educationDomain.domain_id,
                    user_id: jamieUser.user_id,
                    tags: JSON.stringify(['coding', 'education']),
                    difficulty: 'HARD',
                    skip_on_vacation: false
                }
            });
        }
    }

    // ====================================================
    // PART 6: CREATE FRIEND CONNECTIONS
    // ====================================================
    if (createdUsers.length >= 2) {
        // Alex and Samantha are friends
        const existingFriendship = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { sender_id: createdUsers[0].user_id, receiver_id: createdUsers[1].user_id },
                    { sender_id: createdUsers[1].user_id, receiver_id: createdUsers[0].user_id }
                ]
            }
        });

        if (!existingFriendship) {
            await prisma.friendRequest.create({
                data: {
                    sender_id: createdUsers[0].user_id, // Alex
                    receiver_id: createdUsers[1].user_id, // Samantha
                    status: 'ACCEPTED'
                }
            });
        }
    }

    console.log('✅ Database initialization complete!');
}

// Run the setup
main()
    .catch((e) => {
        console.error('❌ Error during setup:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });