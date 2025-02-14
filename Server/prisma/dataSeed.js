// This file sets up the initial data for your habit tracking app
// It adds default categories (domains) and frequency options for habits
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // ====================================================
    // PART 1: SETTING UP HABIT CATEGORIES (DOMAINS)
    // ====================================================
    // These are the main categories users can choose from when creating a habit
    // Each category has:
    // - domain_id: A unique number to identify the category
    // - name: What we call this category
    // - description: Explains what kind of habits belong here
    // - icon: A friendly emoji to represent this category
    const defaultDomains = [
        {
            domain_id: 1,
            name: 'Health',
            description: 'For tracking diet, sleep, and medical care habits',
            icon: '🏥',
            // Example habits: Taking vitamins, drinking water, getting 8 hours sleep
        },
        {
            domain_id: 2,
            name: 'Fitness',
            description: 'For tracking exercise and workout habits',
            icon: '💪',
            // Example habits: Daily walk, gym sessions, morning yoga
        },
        {
            domain_id: 3,
            name: 'Education',
            description: 'For tracking study and learning habits',
            icon: '📚',
            // Example habits: Reading books, learning a language, studying
        },
        {
            domain_id: 4,
            name: 'Finance',
            description: 'For tracking saving and spending habits',
            icon: '💰',
            // Example habits: Saving money, tracking expenses, investment review
        },
        {
            domain_id: 5,
            name: 'Career',
            description: 'For tracking work and skill development habits',
            icon: '💼',
            // Example habits: Networking, skill practice, job applications
        },
        {
            domain_id: 6,
            name: 'Mindfulness',
            description: 'For tracking meditation and mental wellness habits',
            icon: '🧘',
            // Example habits: Meditation, journaling, gratitude practice
        },
        {
            domain_id: 7,
            name: 'Social',
            description: 'For tracking social and relationship habits',
            icon: '👥',
            // Example habits: Calling family, meeting friends, community service
        },
        {
            domain_id: 8,
            name: 'Productivity',
            description: 'For tracking work and time management habits',
            icon: '⏰',
            // Example habits: Todo list review, inbox zero, time blocking
        },
        {
            domain_id: 9,
            name: 'Hobbies',
            description: 'For tracking hobby-related habits',
            icon: '🎨',
            // Example habits: Practice music, gardening, crafting
        },
        {
            domain_id: 10,
            name: 'Custom',
            description: 'For any other types of habits',
            icon: '📌',
            // For habits that don't fit in other categories
        }
    ];

    // ====================================================
    // PART 2: SETTING UP FREQUENCY TYPES
    // ====================================================
    // These are the different schedule options users can choose for their habits
    // Each frequency type has:
    // - frequency_type_id: A unique number to identify the frequency type
    // - name: What we call this frequency type
    // - description: Explains when habits should be done
    const defaultFrequencyTypes = [
        {
            frequency_type_id: 1,
            name: 'Daily',
            description: 'Habits you want to do every day',
            // Example: Drinking water, taking vitamins
        },
        {
            frequency_type_id: 2,
            name: 'Weekly',
            description: 'Habits you want to do certain days each week',
            // Example: Gym on Monday/Wednesday/Friday
        },
        {
            frequency_type_id: 3,
            name: 'Monthly',
            description: 'Habits you want to do certain days each month',
            // Example: Monthly budget review, house cleaning
        },
        {
            frequency_type_id: 4,
            name: 'Custom',
            description: 'Habits with special timing patterns',
            // Example: Every other day, twice per week, etc.
        }
    ];

    // ====================================================
    // PART 3: ADDING DATA TO THE DATABASE
    // ====================================================

    console.log('⏳ Starting to add habit categories to the database...');

    // Loop through each domain (category) and add it to the database
    // If a domain already exists (based on domain_id), it will be skipped
    for (const domain of defaultDomains) {
        await prisma.habitDomain.upsert({
            where: { domain_id: domain.domain_id },  // Find by ID
            update: {},  // If found, don't change anything
            create: domain,  // If not found, create new with all the information
        });
    }

    console.log('✅ Successfully added all habit categories');
    console.log('⏳ Starting to add frequency types to the database...');

    // Loop through each frequency type and add it to the database
    // If a frequency type already exists (based on frequency_type_id), it will be skipped
    for (const frequencyType of defaultFrequencyTypes) {
        await prisma.frequencyType.upsert({
            where: { frequency_type_id: frequencyType.frequency_type_id },
            update: {},  // If found, don't change anything
            create: frequencyType,  // If not found, create new with all the information
        });
    }

    console.log('✅ Successfully added all frequency types');
    console.log('🎉 Database setup completed! Your app is ready to use');
}

// ====================================================
// PART 4: RUN THE SETUP
// ====================================================
// This section runs all the above code and handles any errors that might occur

main()
    .catch((e) => {
        console.error('❌ Error during setup:', e);
        process.exit(1);
    })
    .finally(async () => {
        // Clean up by disconnecting from the database
        await prisma.$disconnect();
    });