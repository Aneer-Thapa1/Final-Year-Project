// Concise seed file for Habit Tracker App
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting database initialization...');

    // Default password for test users
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // ====================================================
    // PART 1: CREATE SYSTEM USER
    // ====================================================
    let systemUser = await prisma.user.findFirst({ where: { user_email: 'system@habittracker.app' } });

    if (!systemUser) {
        systemUser = await prisma.user.create({
            data: {
                user_name: 'System',
                user_email: 'system@habittracker.app',
                gender: 'Other',
                password: hashedPassword,
                premium_status: true,
                theme_preference: 'auto',
                points_gained: 100,
                dailyGoal: 5,
                weeklyGoal: 20,
                monthlyGoal: 60
            }
        });
    }

    // ====================================================
    // PART 2: CREATE HABIT DOMAINS
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
    // PART 3: CREATE BLOG CATEGORIES
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
    // PART 4: CREATE DEMO USERS
    // ====================================================
    const demoUsers = [
        {
            user_name: 'Alex Davis',
            user_email: 'alex@example.com',
            gender: 'Male',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
            theme_preference: 'dark',
            points_gained: 100,
            premium_status: true
        },
        {
            user_name: 'Samantha Wong',
            user_email: 'samantha@example.com',
            gender: 'Female',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
            theme_preference: 'light',
            points_gained: 100,
        },
        {
            user_name: 'Jamie Smith',
            user_email: 'jamie@example.com',
            gender: 'Non-binary',
            avatar: 'https://randomuser.me/api/portraits/lego/5.jpg',
            theme_preference: 'auto',
            points_gained: 100,
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
    // PART 5: CREATE ACHIEVEMENTS
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
    // PART 6: CREATE EXAMPLE HABITS
    // ====================================================
    // Get domain IDs for reference
    const healthDomain = await prisma.habitDomain.findFirst({ where: { name: 'Health' } });
    const fitnessDomain = await prisma.habitDomain.findFirst({ where: { name: 'Fitness' } });
    const mindfulnessDomain = await prisma.habitDomain.findFirst({ where: { name: 'Mindfulness' } });
    const educationDomain = await prisma.habitDomain.findFirst({ where: { name: 'Education' } });

    if (!healthDomain || !fitnessDomain || !mindfulnessDomain || !educationDomain) {
        console.error('Required domains not found');
        return;
    }

    // Template habits for system user
    const templateHabits = [
        {
            name: 'Morning Meditation',
            description: 'Start the day with mindfulness meditation',
            icon: '🧘',
            color: '#9C27B0',
            frequency_type: 'DAILY',
            tracking_type: 'DURATION',
            duration_goal: 10,
            units: 'minutes',
            motivation_quote: 'A calm mind brings inner strength and self-confidence.',
            domain_id: mindfulnessDomain.domain_id,
            tags: JSON.stringify(['mindfulness', 'morning'])
        },
        {
            name: 'Drink Water',
            description: 'Drink 8 glasses of water throughout the day',
            icon: '💧',
            color: '#2196F3',
            frequency_type: 'DAILY',
            tracking_type: 'COUNT',
            count_goal: 8,
            units: 'glasses',
            domain_id: healthDomain.domain_id,
            tags: JSON.stringify(['health', 'hydration'])
        },
        {
            name: 'Daily Exercise',
            description: 'Get active for at least 30 minutes',
            icon: '🏃',
            color: '#FF5722',
            frequency_type: 'DAILY',
            tracking_type: 'DURATION',
            duration_goal: 30,
            units: 'minutes',
            domain_id: fitnessDomain.domain_id,
            tags: JSON.stringify(['fitness', 'health'])
        }
    ];

    // Create template habits for the system user
    for (const habit of templateHabits) {
        const existingHabit = await prisma.habit.findFirst({
            where: { name: habit.name, user_id: systemUser.user_id }
        });

        if (!existingHabit) {
            await prisma.habit.create({
                data: {
                    ...habit,
                    user_id: systemUser.user_id,
                    start_date: new Date(),
                    is_active: true,
                    is_favorite: true,
                    is_public: true,
                    frequency_value: 1,
                    frequency_interval: 1,
                    skip_on_vacation: false,
                    difficulty: 'MEDIUM'
                }
            });
        }
    }

    // Create a habit for the first demo user (Alex)
    if (createdUsers.length > 0) {
        const alexUser = createdUsers[0];

        const userHabit = {
            name: 'Morning Run',
            description: '5K morning run for energy and fitness',
            icon: '🏃',
            color: '#FF5722',
            start_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // Started 30 days ago
            is_favorite: true,
            frequency_type: 'WEEKLY',
            frequency_value: 3,
            frequency_interval: 7,
            specific_days: [1, 3, 5], // Monday, Wednesday, Friday
            tracking_type: 'NUMERIC',
            numeric_goal: 5,
            units: 'kilometers',
            domain_id: fitnessDomain.domain_id,
            user_id: alexUser.user_id,
            tags: JSON.stringify(['running', 'cardio'])
        };

        const existingHabit = await prisma.habit.findFirst({
            where: { name: userHabit.name, user_id: alexUser.user_id }
        });

        if (!existingHabit) {
            const habit = await prisma.habit.create({
                data: {
                    ...userHabit,
                    is_active: true,
                    is_public: false,
                    skip_on_vacation: true,
                    difficulty: 'MEDIUM'
                }
            });

            // Create sample habit logs
            const dates = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26];
            for (const day of dates) {
                await prisma.habitLog.create({
                    data: {
                        habit_id: habit.habit_id,
                        user_id: alexUser.user_id,
                        completed: true,
                        completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * day),
                        numeric_completed: 5 + Math.random(),
                        completion_notes: "Completed run"
                    }
                });
            }

            // Create streak record
            await prisma.habitStreak.create({
                data: {
                    habit_id: habit.habit_id,
                    user_id: alexUser.user_id,
                    current_streak: 3,
                    longest_streak: 4,
                    last_completed: new Date(Date.now() - 1000 * 60 * 60 * 24)
                }
            });

            // Create reminder
            await prisma.habitReminder.create({
                data: {
                    habit_id: habit.habit_id,
                    user_id: alexUser.user_id,
                    reminder_time: new Date(new Date().setHours(6, 30, 0, 0)),
                    repeat: 'WEEKDAYS',
                    notification_message: "Time for your morning run!",
                    is_enabled: true
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