// src/services/chatbotService.tsx
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchData, postData, updateData } from './api';

// Interface for chat messages
export interface ChatMessage {
    id: string;
    content: string;
    role: 'user' | 'bot';
    timestamp: Date;
}

// Interface for the response from the API
interface ChatbotResponse {
    success: boolean;
    data: string;
    message?: string;
}

// Function to get the JWT token from AsyncStorage
const getToken = async (): Promise<string | null> => {
    try {
        const token = await AsyncStorage.getItem('token');
        return token;
    } catch (error) {
        console.error('Error retrieving token:', error);
        return null;
    }
};

/**
 * Sends a message to the chatbot API
 * @param content - The message content to send to the chatbot
 * @returns Promise with the chatbot's response
 */
export const sendMessageToChatbot = async (content: string): Promise<ChatMessage> => {
    try {
        // Using postData from api service instead of direct axios call
        const response = await postData<ChatbotResponse>(
            '/api/chatbot/sendMessageToChatbotAgent',
            { content }
        );

        if (response.success) {
            return {
                id: Date.now().toString(),
                content: response.data,
                role: 'bot',
                timestamp: new Date()
            };
        } else {
            throw new Error(response.message || 'Failed to get response from chatbot');
        }
    } catch (error) {
        console.error('Error in chatbot service:', error);
        throw error;
    }
};

/**
 * Saves chat history to AsyncStorage
 * @param messages - Array of chat messages to save
 */
export const saveChatHistory = async (messages: ChatMessage[]): Promise<void> => {
    try {
        await AsyncStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
};

/**
 * Loads chat history from AsyncStorage
 * @returns Promise with array of chat messages
 */
export const loadChatHistory = async (): Promise<ChatMessage[]> => {
    try {
        const history = await AsyncStorage.getItem('chatHistory');
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Error loading chat history:', error);
        return [];
    }
};

/**
 * Clears chat history from AsyncStorage
 */
export const clearChatHistory = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('chatHistory');
    } catch (error) {
        console.error('Error clearing chat history:', error);
    }
};

/**
 * Gets habit suggestions from the chatbot
 * @param currentHabits - Array of current habit titles
 * @returns Promise with suggested habits
 */
export const getHabitSuggestions = async (currentHabits: string[]): Promise<string[]> => {
    try {
        const habitList = currentHabits.join(', ');
        const prompt = `Based on these current habits: ${habitList}, can you suggest 3 complementary habits that would help create a balanced routine?`;

        const response = await sendMessageToChatbot(prompt);

        // Parse the response to extract habit suggestions
        // This is a simple implementation - you might need more sophisticated parsing
        const suggestions = response.content
            .split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 3);

        return suggestions;
    } catch (error) {
        console.error('Error getting habit suggestions:', error);
        return [];
    }
};

/**
 * Gets personalized advice for maintaining a specific habit
 * @param habitTitle - The title of the habit
 * @param streak - Current streak count
 * @returns Promise with personalized advice
 */
export const getHabitAdvice = async (habitTitle: string, streak: number): Promise<string> => {
    try {
        const prompt = `I've been maintaining my "${habitTitle}" habit for ${streak} days. Can you give me specific advice on how to maintain this momentum and overcome potential obstacles?`;

        const response = await sendMessageToChatbot(prompt);
        return response.content;
    } catch (error) {
        console.error('Error getting habit advice:', error);
        return 'Unable to get personalized advice at this time. Try to maintain consistency and celebrate your progress!';
    }
};

/**
 * Gets insights based on a user's habit completion data
 * @param habitData - Object containing habit completion data
 * @returns Promise with habit insights
 */
export const getHabitInsights = async (habitData: any): Promise<string> => {
    try {
        // Convert habitData to a readable format for the AI
        const habitSummary = Object.entries(habitData)
            .map(([habit, stats]) => `${habit}: ${JSON.stringify(stats)}`)
            .join('\n');

        const prompt = `Based on my habit tracking data:\n${habitSummary}\n\nCan you provide insights about my patterns and suggestions for improvement?`;

        const response = await sendMessageToChatbot(prompt);
        return response.content;
    } catch (error) {
        console.error('Error getting habit insights:', error);
        return 'Unable to analyze habit data at this time. Please try again later.';
    }
};

export default {
    sendMessageToChatbot,
    saveChatHistory,
    loadChatHistory,
    clearChatHistory,
    getHabitSuggestions,
    getHabitAdvice,
    getHabitInsights
};