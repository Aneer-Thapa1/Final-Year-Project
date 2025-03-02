// utils/validators.js
const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

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

module.exports = {
    isValidDate,
    validateFrequency
};

// utils/habitUtils.js
const checkAndAwardMilestones = async (user_id, habit_id, streak_length) => {
    // Implementation
};

const calculateDueStatus = (habit, today) => {
    // Implementation
};

module.exports = {
    checkAndAwardMilestones,
    calculateDueStatus
};

// utils/statsUtils.js
const updateUserStatistics = async (user_id) => {
    // Implementation
};

module.exports = {
    updateUserStatistics
};