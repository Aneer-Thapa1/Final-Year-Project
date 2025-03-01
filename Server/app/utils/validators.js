// utils/validators.js
const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

const validateFrequency = (frequencyType, frequencyValue, frequencyInterval) => {
    // Implementation
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