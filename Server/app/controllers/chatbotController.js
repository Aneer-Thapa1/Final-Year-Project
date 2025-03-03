const axios = require('axios');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

// Store conversation history for each user
const userConversations = new Map();

/**
 * Clear, focused system prompt
 */
const SYSTEM_PROMPT = `
You are Mindful, an AI assistant in a habit tracking app. Follow these guidelines:

1. Identity and Basic Interactions:
   - When asked about your name or identity, simply respond that you're Mindful, an AI assistant focused on helping with habits.
   - For questions like "How are you?", respond naturally and conversationally (e.g., "I'm doing well, thanks for asking! How can I help you today?")
   - Keep these responses friendly and vary them slightly for a more natural feel.

2. Habit-related Questions:
   - Provide practical, actionable advice for habit-related questions.
   - Tailor your response length to match the complexity of the question.
   - Be encouraging and positive about the user's habit journey.
   - Share evidence-based approaches when relevant.

3. Off-topic Handling:
   - For questions unrelated to habits, provide a helpful response when possible.
   - If appropriate, gently redirect with: "I'm primarily designed to help with habits and routines. Is there a specific habit you're working on?"
   - Never force habit connections where they don't naturally fit.

Keep all responses friendly, conversational, and human-like. Avoid sounding robotic or overly formal. Respond in a way that feels natural and helpful rather than constrained by strict rules.
`;

/**
 * Send a message to the AI
 */
const sendMessageToAI = async (userId, messageContent) => {
    try {
        // Ensure conversation exists
        if (!userConversations.has(userId)) {
            userConversations.set(userId, {
                messages: [{ role: 'system', content: SYSTEM_PROMPT }],
                lastUpdated: Date.now()
            });
        }

        const conversation = userConversations.get(userId);
        conversation.messages.push({ role: 'user', content: messageContent });
        conversation.lastUpdated = Date.now();

        // Keep history manageable
        if (conversation.messages.length > 10) {
            const systemPrompt = conversation.messages[0];
            conversation.messages = [systemPrompt, ...conversation.messages.slice(-9)];
        }

        // API request
        const apiKey = process.env.MISTRAL_API_KEY || process.env.LECHAT_API_KEY;
        if (!apiKey) throw new Error('Missing API key');

        const response = await axios.post(
            'https://api.mistral.ai/v1/chat/completions',
            {
                model: 'mistral-tiny',
                messages: conversation.messages,
                max_tokens: 1000, // Increase from 500
                temperature: 0.8, // Slight increase for more verbosity
                presence_penalty: 0.6, // Encourages the model to talk more about different topics
                frequency_penalty: 0.1 // Discourages repetition
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

        const aiMessage = response.data.choices[0].message.content;
        conversation.messages.push({ role: 'assistant', content: aiMessage });

        return aiMessage;
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        return 'I encountered an error. Please try again later.';
    }
};

/**
 * Main controller function
 */
const chatWithAI = async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.user?.id || req.session?.userId || uuidv4();

        if (!content || content.trim() === '') {
            return res.status(400).json({ success: false, message: 'Please provide a message' });
        }

        const aiResponse = await sendMessageToAI(userId, content);

        res.status(200).json({ success: true, data: aiResponse });
    } catch (error) {
        console.error('Chat Error:', error.message);
        res.status(500).json({ success: false, message: 'Server error. Try again later.' });
    }
};

/**
 * Clear conversation history
 */
const clearChat = async (req, res) => {
    try {
        const userId = req.user?.id || req.session?.userId || uuidv4();

        if (userConversations.has(userId)) {
            userConversations.set(userId, {
                messages: [{ role: 'system', content: SYSTEM_PROMPT }],
                lastUpdated: Date.now()
            });
        }

        res.status(200).json({ success: true, message: 'Chat cleared successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error clearing chat' });
    }
};

// Auto-clean old conversations (every hour)
setInterval(() => {
    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

    for (const [userId, conversation] of userConversations.entries()) {
        if (conversation.lastUpdated < threeDaysAgo) {
            userConversations.delete(userId);
        }
    }
}, 60 * 60 * 1000);

module.exports = { chatWithAI, clearChat };
