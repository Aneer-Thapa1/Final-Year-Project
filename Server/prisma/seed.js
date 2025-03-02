// This file sets up the initial data for your enhanced habit tracking app
// It adds default categories (domains), frequency options, difficulty levels, and more
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // ====================================================
    // PART 1: SETTING UP HABIT CATEGORIES (DOMAINS)
    // ====================================================
    const defaultDomains = [
        {
            domain_id: 1,
            name: 'Health',
            description: 'For tracking diet, sleep, and medical care habits',
            icon: '🏥',
            color: '#4CAF50',
            sortOrder: 1,
            is_default: true
        },
        {
            domain_id: 2,
            name: 'Fitness',
            description: 'For tracking exercise and workout habits',
            icon: '💪',
            color: '#FF5722',
            sortOrder: 2,
            is_default: false
        },
        {
            domain_id: 3,
            name: 'Education',
            description: 'For tracking study and learning habits',
            icon: '📚',
            color: '#3F51B5',
            sortOrder: 3,
            is_default: false
        },
        {
            domain_id: 4,
            name: 'Finance',
            description: 'For tracking saving and spending habits',
            icon: '💰',
            color: '#8BC34A',
            sortOrder: 4,
            is_default: false
        },
        {
            domain_id: 5,
            name: 'Career',
            description: 'For tracking work and skill development habits',
            icon: '💼',
            color: '#009688',
            sortOrder: 5,
            is_default: false
        },
        {
            domain_id: 6,
            name: 'Mindfulness',
            description: 'For tracking meditation and mental wellness habits',
            icon: '🧘',
            color: '#9C27B0',
            sortOrder: 6,
            is_default: false
        },
        {
            domain_id: 7,
            name: 'Social',
            description: 'For tracking social and relationship habits',
            icon: '👥',
            color: '#2196F3',
            sortOrder: 7,
            is_default: false
        },
        {
            domain_id: 8,
            name: 'Productivity',
            description: 'For tracking work and time management habits',
            icon: '⏰',
            color: '#F44336',
            sortOrder: 8,
            is_default: false
        },
        {
            domain_id: 9,
            name: 'Hobbies',
            description: 'For tracking hobby-related habits',
            icon: '🎨',
            color: '#FF9800',
            sortOrder: 9,
            is_default: false
        },
        {
            domain_id: 10,
            name: 'Custom',
            description: 'For any other types of habits',
            icon: '📌',
            color: '#607D8B',
            sortOrder: 10,
            is_default: false
        }
    ];

    // ====================================================
    // PART 2: SETTING UP FREQUENCY TYPES
    // ====================================================
    const defaultFrequencyTypes = [
        {
            frequency_type_id: 1,
            name: 'Daily',
            description: 'Habits you want to do every day',
            interval_type: 'day',
            is_default: true
        },
        {
            frequency_type_id: 2,
            name: 'Weekly',
            description: 'Habits you want to do certain days each week',
            interval_type: 'week',
            is_default: false
        },
        {
            frequency_type_id: 3,
            name: 'Monthly',
            description: 'Habits you want to do certain days each month',
            interval_type: 'month',
            is_default: false
        },
        {
            frequency_type_id: 4,
            name: 'Custom',
            description: 'Habits with special timing patterns',
            interval_type: 'custom',
            is_default: false
        }
    ];

    // ====================================================
    // PART 3: SETTING UP DIFFICULTY LEVELS
    // ====================================================
    const defaultDifficultyLevels = [
        {
            difficulty_id: 1,
            name: 'Easy',
            description: 'Requires minimal effort or time (under 5 minutes)',
            points_value: 5,
            color: '#4CAF50',
            icon: '😊',
            sortOrder: 1,
            is_default: true
        },
        {
            difficulty_id: 2,
            name: 'Medium',
            description: 'Requires moderate effort (5-15 minutes)',
            points_value: 10,
            color: '#FFC107',
            icon: '😐',
            sortOrder: 2,
            is_default: false
        },
        {
            difficulty_id: 3,
            name: 'Hard',
            description: 'Requires significant effort (15-30 minutes)',
            points_value: 20,
            color: '#FF5722',
            icon: '😓',
            sortOrder: 3,
            is_default: false
        },
        {
            difficulty_id: 4,
            name: 'Very Hard',
            description: 'Requires major effort and commitment (30+ minutes)',
            points_value: 30,
            color: '#F44336',
            icon: '😰',
            sortOrder: 4,
            is_default: false
        }
    ];

    // ====================================================
    // PART 4: DEFAULT HABIT GROUPS
    // ====================================================
    const defaultHabitGroups = [
        {
            // Remove group_id - let it be auto-generated
            name: 'Morning Routine',
            description: 'Habits to complete in the morning',
            icon: '🌅',
            color: '#FF9800',
            is_active: true,
            is_default: true,
            sort_order: 1
        },
        {
            name: 'Evening Routine',
            description: 'Habits to complete before bed',
            icon: '🌙',
            color: '#3F51B5',
            is_active: true,
            is_default: true,
            sort_order: 2
        },
        {
            name: 'Workday Habits',
            description: 'Habits to complete during work hours',
            icon: '💼',
            color: '#607D8B',
            is_active: true,
            is_default: true,
            sort_order: 3
        },
        {
            name: 'Weekend Habits',
            description: 'Habits to complete on weekends',
            icon: '🏡',
            color: '#8BC34A',
            is_active: true,
            is_default: true,
            sort_order: 4
        }
    ];

    // ====================================================
    // PART 5: DEFAULT TAGS
    // ====================================================
    const defaultTags = [
        {
            // Remove tag_id - let it be auto-generated
            name: 'High Priority',
            color: '#F44336',
            icon: '⭐',
            is_default: true
        },
        {
            name: 'Self-Care',
            color: '#9C27B0',
            icon: '💆',
            is_default: true
        },
        {
            name: 'Quick Win',
            color: '#4CAF50',
            icon: '⚡',
            is_default: true
        },
        {
            name: 'Health',
            color: '#2196F3',
            icon: '❤️',
            is_default: true
        },
        {
            name: 'Learning',
            color: '#FF9800',
            icon: '🧠',
            is_default: true
        }
    ];

    // ====================================================
    // PART 6: ADDING DATA TO THE DATABASE
    // ====================================================

    console.log('⏳ Starting to add habit categories to the database...');

    // Add domains (categories)
    for (const domain of defaultDomains) {
        await prisma.habitDomain.upsert({
            where: { domain_id: domain.domain_id },
            update: {},
            create: domain,
        });
    }
    console.log('✅ Successfully added all habit categories');

    // Add frequency types
    console.log('⏳ Starting to add frequency types to the database...');
    for (const frequencyType of defaultFrequencyTypes) {
        await prisma.frequencyType.upsert({
            where: { frequency_type_id: frequencyType.frequency_type_id },
            update: {},
            create: frequencyType,
        });
    }
    console.log('✅ Successfully added all frequency types');

    // Add difficulty levels
    console.log('⏳ Starting to add difficulty levels to the database...');
    for (const difficultyLevel of defaultDifficultyLevels) {
        await prisma.difficultyLevel.upsert({
            where: { difficulty_id: difficultyLevel.difficulty_id },
            update: {},
            create: difficultyLevel,
        });
    }
    console.log('✅ Successfully added all difficulty levels');

    // Add default habit groups
    console.log('⏳ Starting to add default habit groups...');
    // For groups and tags, we need a user_id. Let's create a system user if needed
    let systemUser = await prisma.user.findFirst({
        where: { user_name: 'System' }
    });

    if (!systemUser) {
        systemUser = await prisma.user.create({
            data: {
                user_name: 'System',
                user_email: 'system@habittracker.app',
                gender: 'Other',
                password: 'not_usable_password' // This is just a placeholder
            }
        });
        console.log('✅ Created system user for default content');
    }

    // Add default groups with the system user - changed from upsert to create
    console.log('⏳ Creating default habit groups...');
    for (const group of defaultHabitGroups) {
        await prisma.habitGroup.create({
            data: {
                ...group,
                user_id: systemUser.user_id,
                created_at: new Date()
            },
        });
    }
    console.log('✅ Successfully added default habit groups');

    // Add default tags - changed from upsert to create
    console.log('⏳ Creating default tags...');
    for (const tag of defaultTags) {
        await prisma.habitTag.create({
            data: {
                ...tag,
                user_id: systemUser.user_id,
                created_at: new Date()
            },
        });
    }
    console.log('✅ Successfully added default tags');

    // Create default notification settings entry for system user
    await prisma.notificationSettings.upsert({
        where: { user_id: systemUser.user_id },
        update: {},
        create: {
            user_id: systemUser.user_id,
            general_enabled: true,
            morning_summary: true,
            morning_time: new Date(new Date().setHours(8, 0, 0, 0)),
            evening_summary: true,
            evening_time: new Date(new Date().setHours(20, 0, 0, 0)),
            streak_alerts: true,
            achievement_alerts: true,
            friend_activity: false,
            challenge_updates: true
        }
    });
    console.log('✅ Created default notification settings');

    console.log('🎉 Database setup completed! Your app is ready to use');
}

// ====================================================
// PART 7: RUN THE SETUP
// ====================================================
main()
    .catch((e) => {
        console.error('❌ Error during setup:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });