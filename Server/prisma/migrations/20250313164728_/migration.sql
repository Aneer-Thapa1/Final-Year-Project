-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChatRoomType" AS ENUM ('DM', 'GROUP');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'AUDIO', 'LOCATION', 'CONTACT', 'SYSTEM', 'HABIT', 'CHALLENGE');

-- CreateEnum
CREATE TYPE "FrequencyType" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKENDS', 'SPECIFIC_DAYS', 'INTERVAL', 'X_TIMES_WEEK', 'X_TIMES_MONTH');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD');

-- CreateEnum
CREATE TYPE "ReminderRepeat" AS ENUM ('ONCE', 'DAILY', 'WEEKDAYS', 'WEEKENDS', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('BOOLEAN', 'DURATION', 'COUNT', 'NUMERIC');

-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('STREAK_LENGTH', 'TOTAL_COMPLETIONS', 'CONSECUTIVE_DAYS', 'PERFECT_WEEK', 'PERFECT_MONTH', 'HABIT_DIVERSITY', 'DOMAIN_MASTERY', 'SOCIAL_ENGAGEMENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STREAK_MILESTONE', 'ACHIEVEMENT_UNLOCKED', 'FRIEND_REQUEST', 'CHALLENGE_INVITE', 'REMINDER', 'SYSTEM_MESSAGE', 'BLOG_COMMENT', 'NEW_MESSAGE', 'GROUP_INVITATION');

-- CreateEnum
CREATE TYPE "ResetReason" AS ENUM ('MISSED_COMPLETION', 'VACATION_ENDED', 'HABIT_MODIFIED', 'USER_RESET', 'SYSTEM_RESET');

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "avatar" TEXT,
    "points_gained" INTEGER NOT NULL,
    "password" TEXT NOT NULL,
    "gender" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "prefersNotifications" BOOLEAN NOT NULL DEFAULT true,
    "theme_preference" TEXT NOT NULL DEFAULT 'auto',
    "language" TEXT NOT NULL DEFAULT 'en',
    "premium_status" BOOLEAN NOT NULL DEFAULT false,
    "premium_until" TIMESTAMP(3),
    "onVacation" BOOLEAN NOT NULL DEFAULT false,
    "vacation_start" TIMESTAMP(3),
    "vacation_end" TIMESTAMP(3),
    "dailyGoal" INTEGER NOT NULL DEFAULT 3,
    "weeklyGoal" INTEGER NOT NULL DEFAULT 15,
    "monthlyGoal" INTEGER NOT NULL DEFAULT 60,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalHabitsCreated" INTEGER NOT NULL DEFAULT 0,
    "totalHabitsCompleted" INTEGER NOT NULL DEFAULT 0,
    "currentDailyStreak" INTEGER NOT NULL DEFAULT 0,
    "longestDailyStreak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "request_id" SERIAL NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "room_id" SERIAL NOT NULL,
    "type" "ChatRoomType" NOT NULL DEFAULT 'DM',
    "name" TEXT,
    "description" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER,
    "is_private" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "user_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "nickname" TEXT,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "lastRead" TIMESTAMP(3),

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("user_id","room_id")
);

-- CreateTable
CREATE TABLE "Message" (
    "message_id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "media_url" TEXT,
    "media_type" TEXT,
    "media_size" INTEGER,
    "media_width" INTEGER,
    "media_height" INTEGER,
    "media_duration" INTEGER,
    "reply_to_id" INTEGER,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "ReadReceipt" (
    "message_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadReceipt_pkey" PRIMARY KEY ("message_id","user_id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "habit_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "color" TEXT,
    "image" TEXT,
    "frequency_type" "FrequencyType" NOT NULL DEFAULT 'DAILY',
    "frequency_value" INTEGER NOT NULL,
    "frequency_interval" INTEGER NOT NULL,
    "custom_frequency" JSONB,
    "specific_days" INTEGER[],
    "tracking_type" "TrackingType" NOT NULL DEFAULT 'BOOLEAN',
    "duration_goal" INTEGER,
    "count_goal" INTEGER,
    "numeric_goal" DOUBLE PRECISION,
    "units" TEXT,
    "skip_on_vacation" BOOLEAN NOT NULL DEFAULT false,
    "require_evidence" BOOLEAN NOT NULL DEFAULT false,
    "require_verification" BOOLEAN NOT NULL DEFAULT false,
    "location_based" BOOLEAN NOT NULL DEFAULT false,
    "location_name" TEXT,
    "location_lat" DOUBLE PRECISION,
    "location_lng" DOUBLE PRECISION,
    "location_radius" INTEGER,
    "grace_period_enabled" BOOLEAN NOT NULL DEFAULT true,
    "grace_period_hours" INTEGER NOT NULL DEFAULT 24,
    "motivation_quote" TEXT,
    "external_resource_url" TEXT,
    "tags" JSONB,
    "cue" TEXT,
    "reward" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "domain_id" INTEGER NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("habit_id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "log_id" SERIAL NOT NULL,
    "habit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "completion_notes" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "mood" INTEGER,
    "auto_logged" BOOLEAN NOT NULL DEFAULT false,
    "logged_late" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,
    "duration_completed" INTEGER,
    "count_completed" INTEGER,
    "numeric_completed" DOUBLE PRECISION,
    "evidence_image" TEXT,
    "verified_by_user_id" INTEGER,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "HabitDomain" (
    "domain_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#4285F4',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitDomain_pkey" PRIMARY KEY ("domain_id")
);

-- CreateTable
CREATE TABLE "HabitStreak" (
    "streak_id" SERIAL NOT NULL,
    "habit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_completed" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "streak_history" JSONB,
    "missed_days_count" INTEGER NOT NULL DEFAULT 0,
    "last_reset_reason" TEXT,
    "grace_period_used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HabitStreak_pkey" PRIMARY KEY ("streak_id")
);

-- CreateTable
CREATE TABLE "HabitReminder" (
    "reminder_id" SERIAL NOT NULL,
    "habit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reminder_time" TIMESTAMP(3) NOT NULL,
    "repeat" "ReminderRepeat" NOT NULL DEFAULT 'DAILY',
    "notification_message" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "smart_reminder" BOOLEAN NOT NULL DEFAULT false,
    "snooze_count" INTEGER NOT NULL DEFAULT 0,
    "pre_notification_minutes" INTEGER NOT NULL DEFAULT 10,
    "follow_up_enabled" BOOLEAN NOT NULL DEFAULT true,
    "follow_up_minutes" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "HabitReminder_pkey" PRIMARY KEY ("reminder_id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "achievement_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "badge_image" TEXT,
    "criteria_type" "AchievementType" NOT NULL,
    "criteria_value" INTEGER NOT NULL,
    "xp_value" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("achievement_id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "user_id" INTEGER NOT NULL,
    "achievement_id" INTEGER NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("user_id","achievement_id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "challenge_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("challenge_id")
);

-- CreateTable
CREATE TABLE "HabitChallenge" (
    "challenge_id" INTEGER NOT NULL,
    "habit_id" INTEGER NOT NULL,

    CONSTRAINT "HabitChallenge_pkey" PRIMARY KEY ("challenge_id","habit_id")
);

-- CreateTable
CREATE TABLE "UserChallenge" (
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserChallenge_pkey" PRIMARY KEY ("user_id","challenge_id")
);

-- CreateTable
CREATE TABLE "Blog" (
    "blog_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("blog_id")
);

-- CreateTable
CREATE TABLE "Category" (
    "category_id" SERIAL NOT NULL,
    "category_name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "Like" (
    "like_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "blog_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("like_id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "comment_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "blog_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "action_url" TEXT,
    "related_id" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "stat_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_habits_completed" INTEGER NOT NULL DEFAULT 0,
    "total_duration_tracked" INTEGER NOT NULL DEFAULT 0,
    "streak_maintained" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("stat_id")
);

-- CreateTable
CREATE TABLE "HabitReset" (
    "reset_id" SERIAL NOT NULL,
    "habit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reset_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previous_streak" INTEGER NOT NULL,
    "reason" "ResetReason" NOT NULL,
    "user_initiated" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "HabitReset_pkey" PRIMARY KEY ("reset_id")
);

-- CreateTable
CREATE TABLE "HabitDailyStatus" (
    "status_id" SERIAL NOT NULL,
    "habit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "is_scheduled" BOOLEAN NOT NULL DEFAULT true,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "is_skipped" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,
    "completion_time" TIMESTAMP(3),

    CONSTRAINT "HabitDailyStatus_pkey" PRIMARY KEY ("status_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_user_email_key" ON "User"("user_email");

-- CreateIndex
CREATE INDEX "User_user_email_idx" ON "User"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_sender_id_receiver_id_key" ON "FriendRequest"("sender_id", "receiver_id");

-- CreateIndex
CREATE INDEX "ChatRoom_type_idx" ON "ChatRoom"("type");

-- CreateIndex
CREATE INDEX "ChatParticipant_user_id_idx" ON "ChatParticipant"("user_id");

-- CreateIndex
CREATE INDEX "ChatParticipant_room_id_idx" ON "ChatParticipant"("room_id");

-- CreateIndex
CREATE INDEX "Message_room_id_createdAt_idx" ON "Message"("room_id", "createdAt");

-- CreateIndex
CREATE INDEX "Message_sender_id_idx" ON "Message"("sender_id");

-- CreateIndex
CREATE INDEX "Habit_user_id_idx" ON "Habit"("user_id");

-- CreateIndex
CREATE INDEX "Habit_domain_id_idx" ON "Habit"("domain_id");

-- CreateIndex
CREATE INDEX "HabitLog_habit_id_completed_at_idx" ON "HabitLog"("habit_id", "completed_at");

-- CreateIndex
CREATE INDEX "HabitLog_user_id_completed_at_idx" ON "HabitLog"("user_id", "completed_at");

-- CreateIndex
CREATE INDEX "HabitStreak_habit_id_idx" ON "HabitStreak"("habit_id");

-- CreateIndex
CREATE INDEX "HabitStreak_user_id_idx" ON "HabitStreak"("user_id");

-- CreateIndex
CREATE INDEX "Blog_user_id_createdAt_idx" ON "Blog"("user_id", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Like_user_id_blog_id_key" ON "Like"("user_id", "blog_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserStats_user_id_key" ON "UserStats"("user_id");

-- CreateIndex
CREATE INDEX "HabitReset_habit_id_idx" ON "HabitReset"("habit_id");

-- CreateIndex
CREATE INDEX "HabitReset_user_id_idx" ON "HabitReset"("user_id");

-- CreateIndex
CREATE INDEX "HabitDailyStatus_habit_id_date_idx" ON "HabitDailyStatus"("habit_id", "date");

-- CreateIndex
CREATE INDEX "HabitDailyStatus_user_id_date_idx" ON "HabitDailyStatus"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitDailyStatus_habit_id_date_key" ON "HabitDailyStatus"("habit_id", "date");

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "ChatRoom"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "ChatRoom"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "Message"("message_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD CONSTRAINT "ReadReceipt_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "Message"("message_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD CONSTRAINT "ReadReceipt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "HabitDomain"("domain_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "Habit"("habit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitStreak" ADD CONSTRAINT "HabitStreak_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "Habit"("habit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitStreak" ADD CONSTRAINT "HabitStreak_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitReminder" ADD CONSTRAINT "HabitReminder_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "Habit"("habit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitReminder" ADD CONSTRAINT "HabitReminder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "Achievement"("achievement_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitChallenge" ADD CONSTRAINT "HabitChallenge_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenge"("challenge_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitChallenge" ADD CONSTRAINT "HabitChallenge_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "Habit"("habit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallenge" ADD CONSTRAINT "UserChallenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallenge" ADD CONSTRAINT "UserChallenge_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "Challenge"("challenge_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blog" ADD CONSTRAINT "Blog_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "Blog"("blog_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "Blog"("blog_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Comment"("comment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitReset" ADD CONSTRAINT "HabitReset_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "Habit"("habit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitReset" ADD CONSTRAINT "HabitReset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitDailyStatus" ADD CONSTRAINT "HabitDailyStatus_habit_id_fkey" FOREIGN KEY ("habit_id") REFERENCES "Habit"("habit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitDailyStatus" ADD CONSTRAINT "HabitDailyStatus_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
