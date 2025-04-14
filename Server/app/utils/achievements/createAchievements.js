const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


// This function sets up achievement tracking for new users
const createAchievementProgressForUser = async (userId) => {
    try {
        // Get all achievements from the database
        const achievements = await prisma.achievement.findMany();

        // If there are no achievements, log a warning and exit
        if (!achievements.length) {
            console.warn('No achievements found in the database to track progress for');
            return 0;
        }

        // Prepare a record for each achievement with starting values
        const progressRecords = achievements.map(achievement => ({
            user_id: userId,
            achievement_id: achievement.achievement_id,
            current_value: 0, // User starts with no progress
            target_value: achievement.criteria_value, // Goal they need to reach
            percent_complete: 0, // 0% complete at the beginning
        }));

        // Add all records at once for better performance
        const result = await prisma.achievementProgress.createMany({
            data: progressRecords,
            skipDuplicates: true, // Avoid errors if records already exist
        });

        // Log how many records were created
        console.log(`Created ${result.count} achievement progress records for user ${userId}`);

        return result.count;
    } catch (error) {
        // If something goes wrong, log the error
        console.error('Error creating achievement progress for user:', error);
        throw error; // Pass the error up so it can be handled
    }
};

module.exports = { createAchievementProgressForUser };