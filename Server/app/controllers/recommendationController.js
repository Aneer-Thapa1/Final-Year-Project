const axios = require('axios');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * System prompt for habit recommendations
 */
const RECOMMENDATION_PROMPT = `
You are Mindful, an intelligent habit recommendation system integrated into a habit-tracking app. 
Your goal is to suggest **3 personalized, realistic, and actionable habits** based on a user's profile, existing habits, and goals.

### Input Data:
- **User Profile**: Includes demographics, preferences, and goals (e.g., dailyGoal, weeklyGoal, monthlyGoal).
- **Existing Habits**: List of habits the user is currently tracking (from the Habit model).
- **Habit Domains**: Categories like health, productivity, mindfulness, etc. (from the HabitDomain model).
- **Tracking Preferences**: User's preferred tracking types (boolean, duration, count, numeric) and frequency (daily, weekly, etc.).

### Approach:
1. **Analyze the User's Profile**:
   - Review their current habits, domains, and goals (e.g., dailyGoal, weeklyGoal).
   - Identify gaps or areas for improvement based on their existing habits and preferences.
   - Consider their difficulty level preferences (from the Habit model's DifficultyLevel enum).

2. **Suggest Balanced Habits**:
   - Recommend habits that align with the user's goals and existing patterns.
   - Ensure diversity across different life domains (e.g., health, productivity, relationships).
   - Prioritize habits that are realistic and achievable based on their lifestyle.

3. **Provide Detailed Structure for Each Habit**:
   - **Habit Name**: Clear and concise name for the habit.
   - **Description**: Brief explanation of the habit's purpose and benefits.
   - **Frequency**: Recommended frequency (e.g., daily, 3x/week).
   - **Tracking Type**: Suggested tracking method (boolean, duration, count, numeric).
   - **Domain**: Appropriate habit domain category (e.g., health, mindfulness).
   - **Difficulty Level**: Beginner, intermediate, or advanced.
   - **Implementation Tips**: 1-2 actionable steps to help the user start.

4. **Ensure Consistency with Schema**:
   - Align recommendations with the schema's structure (e.g., Habit, HabitDomain, TrackingType, DifficultyLevel).
   - Use realistic values for fields like frequency, tracking type, and difficulty level.

### Output Format:
Return the recommendations as a structured JSON array, where each object represents a habit recommendation. Only provide 3 habits, no more, no less.

Example Output:
[
  {
    "habit_name": "Morning Hydration",
    "description": "Start your day by drinking a glass of water to boost metabolism and energy levels.",
    "frequency": "daily",
    "tracking_type": "boolean",
    "domain": "health",
    "difficulty": "beginner",
    "implementation_tips": "Keep a glass or bottle of water by your bedside to drink as soon as you wake up."
  },
  {
    "habit_name": "Evening Gratitude Journal",
    "description": "Reflect on 3 things you're grateful for each day to improve mental well-being and positivity.",
    "frequency": "daily",
    "tracking_type": "boolean",
    "domain": "mindfulness",
    "difficulty": "beginner",
    "implementation_tips": "Place a notebook on your nightstand and write in it before going to bed."
  },
  {
    "habit_name": "10-Minute Stretch Break",
    "description": "Take a short break to stretch and improve flexibility, reduce stress, and prevent muscle stiffness.",
    "frequency": "3x/week",
    "tracking_type": "duration",
    "domain": "health",
    "difficulty": "beginner",
    "implementation_tips": "Set a reminder on your phone to stretch during work breaks or after waking up."
  }
]

### Constraints:
- Only suggest 3 habits.
- Ensure the output is in the exact same JSON structure as the example above.
- Align recommendations with the schema's fields and enums (e.g., TrackingType, DifficultyLevel, HabitDomain).

Now, generate 3 personalized habit recommendations for the user based on their profile, goals, and existing habits. Ensure the output is consistent with the schema and tailored to the user's needs.
`;


/**
 * Get habit recommendations based on user profile and existing habits
 */
const getHabitRecommendations = async (req, res) => {
    try {
        const userId = parseInt(req.user); // Get user ID from middleware

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Fetch comprehensive user profile from database
        const userProfile = await fetchUserProfile(userId);

        if (!userProfile) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate AI recommendations based on user profile
        const recommendations = await generateRecommendations(userProfile);

        res.status(200).json({
            success: true,
            data: {
                recommendations,
                user: {
                    name: userProfile.user_name,
                    totalHabits: userProfile.habits.length,
                    currentDailyStreak: userProfile.currentDailyStreak
                }
            }
        });
    } catch (error) {
        console.error('Recommendation Error:', error);
        res.status(500).json({ success: false, message: 'Server error. Try again later.' });
    }
};

/**
 * Fetch comprehensive user profile from database
 */
const fetchUserProfile = async (userId) => {
    try {
        // Fetch user with relationships
        const user = await prisma.user.findUnique({
            where: { user_id: userId },
            include: {
                habits: {
                    include: {
                        domain: true,
                        habitLogs: {
                            take: 30, // Get recent logs for analysis
                            orderBy: { completed_at: 'desc' }
                        },
                        streak: true,
                        reminders: true
                    }
                },
                achievements: {
                    include: {
                        achievement: true
                    }
                },
                challenges: {
                    include: {
                        challenge: true
                    }
                },
                habitStreaks: {
                    orderBy: { longest_streak: 'desc' },
                    take: 5 // Top streaks
                }
            }
        });

        if (!user) return null;

        // Get all habit domains for context
        const allDomains = await prisma.habitDomain.findMany();

        // Calculate domain distribution
        const domainDistribution = calculateDomainDistribution(user.habits, allDomains);

        // Analyze habit patterns and completion rates
        const habitAnalysis = analyzeHabitPatterns(user.habits);

        // Enrich user profile with analysis
        const enrichedProfile = {
            ...user,
            domainDistribution,
            habitAnalysis,
            allDomains
        };

        return enrichedProfile;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};

/**
 * Calculate distribution of habits across domains
 */
const calculateDomainDistribution = (habits, allDomains) => {
    // Initialize counts for all domains
    const domainCounts = allDomains.reduce((acc, domain) => {
        acc[domain.domain_id] = { count: 0, name: domain.name };
        return acc;
    }, {});

    // Count habits in each domain
    habits.forEach(habit => {
        if (domainCounts[habit.domain_id]) {
            domainCounts[habit.domain_id].count++;
        }
    });

    return domainCounts;
};

/**
 * Analyze habit patterns and completion rates
 */
const analyzeHabitPatterns = (habits) => {
    // Default analysis object
    const analysis = {
        completionRate: 0,
        habitsByDifficulty: {
            VERY_EASY: 0,
            EASY: 0,
            MEDIUM: 0,
            HARD: 0,
            VERY_HARD: 0
        },
        habitsByFrequency: {
            DAILY: 0,
            WEEKDAYS: 0,
            WEEKENDS: 0,
            SPECIFIC_DAYS: 0,
            INTERVAL: 0,
            X_TIMES_WEEK: 0,
            X_TIMES_MONTH: 0
        },
        habitsByTracking: {
            BOOLEAN: 0,
            DURATION: 0,
            COUNT: 0,
            NUMERIC: 0
        },
        topPerformingHabits: [],
        underperformingHabits: []
    };

    if (!habits || habits.length === 0) {
        return analysis;
    }

    // Calculate completion stats
    let totalLogs = 0;
    let completedLogs = 0;

    // Analyze habits
    habits.forEach(habit => {
        // Count by difficulty
        analysis.habitsByDifficulty[habit.difficulty]++;

        // Count by frequency
        analysis.habitsByFrequency[habit.frequency_type]++;

        // Count by tracking type
        analysis.habitsByTracking[habit.tracking_type]++;

        // Calculate completion rate
        const habitLogs = habit.habitLogs || [];
        totalLogs += habitLogs.length;
        completedLogs += habitLogs.filter(log => log.completed).length;

        // Analyze habit performance
        const completionRate = habitLogs.length > 0
            ? habitLogs.filter(log => log.completed).length / habitLogs.length
            : 0;

        if (completionRate >= 0.8) {
            analysis.topPerformingHabits.push({
                id: habit.habit_id,
                name: habit.name,
                completionRate,
                domain: habit.domain.name
            });
        } else if (completionRate <= 0.3 && habitLogs.length > 0) {
            analysis.underperformingHabits.push({
                id: habit.habit_id,
                name: habit.name,
                completionRate,
                domain: habit.domain.name
            });
        }
    });

    // Calculate overall completion rate
    analysis.completionRate = totalLogs > 0 ? completedLogs / totalLogs : 0;

    // Sort top and underperforming habits
    analysis.topPerformingHabits.sort((a, b) => b.completionRate - a.completionRate);
    analysis.underperformingHabits.sort((a, b) => a.completionRate - b.completionRate);

    return analysis;
};

/**
 * Generate AI recommendations based on user profile
 */
const generateRecommendations = async (userProfile) => {
    try {
        // Prepare a simplified version of the user profile for the AI
        const simplifiedProfile = {
            user_id: userProfile.user_id,
            name: userProfile.user_name,
            gender: userProfile.gender,
            timezone: userProfile.timezone,
            dailyGoal: userProfile.dailyGoal,
            weeklyGoal: userProfile.weeklyGoal,
            monthlyGoal: userProfile.monthlyGoal,
            currentHabitCount: userProfile.habits.length,
            currentDailyStreak: userProfile.currentDailyStreak,
            longestDailyStreak: userProfile.longestDailyStreak,
            premium: userProfile.premium_status,
            existingHabits: userProfile.habits.map(habit => ({
                name: habit.name,
                domain: habit.domain.name,
                frequency: habit.frequency_type,
                difficulty: habit.difficulty,
                trackingType: habit.tracking_type,
                isActive: habit.is_active,
                isFavorite: habit.is_favorite
            })),
            domainDistribution: Object.values(userProfile.domainDistribution),
            habitAnalysis: userProfile.habitAnalysis,
            availableDomains: userProfile.allDomains.map(domain => ({
                id: domain.domain_id,
                name: domain.name,
                description: domain.description
            }))
        };

        // Send to AI API
        const apiKey = process.env.MISTRAL_API_KEY || process.env.LECHAT_API_KEY;
        if (!apiKey) throw new Error('Missing API key');

        const response = await axios.post(
            'https://api.mistral.ai/v1/chat/completions',
            {
                model: 'mistral-tiny',
                messages: [
                    { role: 'system', content: RECOMMENDATION_PROMPT },
                    {
                        role: 'user',
                        content: `Please provide personalized habit recommendations for this user profile: ${JSON.stringify(simplifiedProfile, null, 2)}`
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data || !response.data.choices || response.data.choices.length === 0) {
            throw new Error('Invalid AI response');
        }

        // Parse and clean the AI response
        let aiResponse = response.data.choices[0].message.content;

        // Try to extract JSON from the response
        let recommendations = [];
        try {
            // Check if response contains JSON
            const jsonMatch = aiResponse.match(/\[\s*{.*}\s*\]/s);
            if (jsonMatch) {
                // Extract just the JSON array part
                recommendations = JSON.parse(jsonMatch[0]);
            } else {
                // If no JSON found, try to parse the entire response
                recommendations = JSON.parse(aiResponse);
            }
        } catch (error) {
            console.error('Error parsing AI response as JSON:', error);
            // If parsing fails, return the raw text
            return [{
                name: "Error in recommendation format",
                description: "Please try again later. " + aiResponse.substring(0, 200) + "..."
            }];
        }

        return recommendations;
    } catch (error) {
        console.error('Error generating recommendations:', error);
        return [{
            name: "Error generating recommendations",
            description: "Please try again later."
        }];
    }
};

/**
 * Get recommended habit domains based on current distribution
 */
const getRecommendedHabitDomains = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Fetch user profile
        const userProfile = await fetchUserProfile(userId);

        if (!userProfile) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Find underrepresented domains
        const domainCounts = userProfile.domainDistribution;
        const allDomains = userProfile.allDomains;

        // Calculate average habits per domain
        const totalHabits = userProfile.habits.length;
        const averageHabitsPerDomain = totalHabits / allDomains.length || 0;

        // Find domains with fewer than average habits
        const underrepresentedDomains = allDomains
            .filter(domain => {
                const count = domainCounts[domain.domain_id]?.count || 0;
                return count < averageHabitsPerDomain;
            })
            .map(domain => ({
                domain_id: domain.domain_id,
                name: domain.name,
                description: domain.description,
                currentCount: domainCounts[domain.domain_id]?.count || 0
            }))
            .sort((a, b) => a.currentCount - b.currentCount);

        res.status(200).json({
            success: true,
            data: {
                recommendedDomains: underrepresentedDomains,
                domainDistribution: Object.values(domainCounts),
                averageHabitsPerDomain
            }
        });
    } catch (error) {
        console.error('Domain Recommendation Error:', error);
        res.status(500).json({ success: false, message: 'Server error. Try again later.' });
    }
};

module.exports = {
    getHabitRecommendations,
    getRecommendedHabitDomains
};