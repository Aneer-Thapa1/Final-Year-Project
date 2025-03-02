const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllData() {
    console.log('⏳ Starting database cleanup...');

    try {
        // The order matters - delete tables with foreign key relationships first

        // Delete habit-related data
        console.log('Clearing habit logs and related data...');
        await prisma.checklistItem.deleteMany({});
        await prisma.habitLog.deleteMany({});
        await prisma.habitMilestone.deleteMany({});
        await prisma.habitTagRelation.deleteMany({});
        await prisma.habitGroupItem.deleteMany({});
        await prisma.habitChallengeItem.deleteMany({});
        await prisma.habitChallengeParticipant.deleteMany({});
        await prisma.habitReminder.deleteMany({});
        await prisma.habitSchedule.deleteMany({});
        await prisma.habitSubtask.deleteMany({});
        await prisma.habitStreak.deleteMany({});

        // Delete habits
        await prisma.habit.deleteMany({});

        // Delete categories and reference data
        console.log('Clearing categories and reference data...');
        await prisma.habitTag.deleteMany({});
        await prisma.habitGroup.deleteMany({});
        await prisma.habitChallenge.deleteMany({});
        await prisma.habitJournalEntry.deleteMany({});
        await prisma.habitBackup.deleteMany({});

        // Delete user statistics
        await prisma.habitStatistics.deleteMany({});
        await prisma.notificationSettings.deleteMany({});

        // Delete social content
        console.log('Clearing social data...');
        await prisma.messageReaction.deleteMany({});
        await prisma.message.deleteMany({});
        await prisma.chatParticipant.deleteMany({});
        await prisma.chatRoom.deleteMany({});
        await prisma.like.deleteMany({});
        await prisma.blog.deleteMany({});
        await prisma.friendRequest.deleteMany({});

        // You might want to keep these for reference
        // await prisma.habitDomain.deleteMany({});
        // await prisma.frequencyType.deleteMany({});
        // await prisma.difficultyLevel.deleteMany({});
        // await prisma.category.deleteMany({});

        // Finally delete users
        console.log('Clearing users...');
        await prisma.user.deleteMany({});

        console.log('✅ Database cleared successfully');
    } catch (error) {
        console.error('❌ Error during database cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearAllData()
    .then(() => console.log('💾 Database reset complete'))
    .catch(e => console.error('❌ Database reset failed:', e));