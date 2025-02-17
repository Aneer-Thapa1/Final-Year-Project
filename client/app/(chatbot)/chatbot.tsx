import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, Animated, useColorScheme } from 'react-native';
import { Send, ArrowLeft, Bot, Sparkles, Brain } from 'lucide-react-native';
import { router } from "expo-router";
import { MotiView } from 'moti';

const INITIAL_MESSAGES = [
    {
        id: '1',
        text: 'Welcome to Mindful! 👋 I\'m your AI companion on the journey to better habits.',
        sender: 'bot'
    },
    {
        id: '2',
        text: 'I can help you develop mindful habits that stick. What would you like to work on today?',
        sender: 'bot',
        showSuggestions: true
    }
];

const HABIT_CATEGORIES = [
    {
        id: '1',
        title: 'Mental Wellness',
        habits: [
            { id: 'm1', text: 'Morning Meditation 🧘‍♂️', description: 'Start with 5-10 minutes of mindfulness' },
            { id: 'm2', text: 'Gratitude Journal ✍️', description: 'Write 3 things you\'re grateful for' }
        ]
    },
    {
        id: '2',
        title: 'Physical Health',
        habits: [
            { id: 'p1', text: 'Daily Movement 💪', description: '30 minutes of joyful activity' },
            { id: 'p2', text: 'Hydration Goals 💧', description: '8 glasses of water daily' }
        ]
    },
    {
        id: '3',
        title: 'Personal Growth',
        habits: [
            { id: 'g1', text: 'Daily Reading 📚', description: '30 minutes of focused reading' },
            { id: 'g2', text: 'Skill Practice 🎯', description: '20 minutes learning something new' }
        ]
    }
];

const BOT_RESPONSES = {
    meditation: [
        "Meditation is a wonderful foundation for mindfulness. When do you feel most calm during the day?",
        "Starting with just 5 minutes can create a lasting impact. Would you like some guided sessions?",
        "Many find mornings ideal for meditation. What time works best for your schedule?"
    ],
    gratitude: [
        "Practicing gratitude can transform your perspective. What made you smile today?",
        "Let's start with three simple things you're grateful for right now.",
        "Writing down gratitude helps make it a habit. Shall we create a simple journaling routine?"
    ]
};

const MindfulChatbot = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
        }).start();
    }, []);

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        const newMessage = {
            id: String(messages.length + 1),
            text: `Great! Let's explore ${category.title.toLowerCase()} habits. Choose one to focus on:`,
            sender: 'bot',
            showHabits: true,
            category: category
        };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleHabitSelection = (habit) => {
        setMessages(prev => [
            ...prev,
            { id: String(prev.length + 1), text: habit.text, sender: 'user' }
        ]);
        simulateBotResponse(habit);
    };

    const simulateBotResponse = (habit) => {
        setIsTyping(true);
        setTimeout(() => {
            const responses = habit.text.includes('Meditation') ?
                BOT_RESPONSES.meditation : BOT_RESPONSES.gratitude;
            const response = responses[Math.floor(Math.random() * responses.length)];

            setMessages(prev => [...prev, {
                id: String(prev.length + 1),
                text: response,
                sender: 'bot'
            }]);
            setIsTyping(false);
        }, 1500);
    };

    const handleSendMessage = () => {
        if (!inputText.trim()) return;

        setMessages(prev => [...prev, {
            id: String(prev.length + 1),
            text: inputText,
            sender: 'user'
        }]);
        setInputText('');
        simulateBotResponse({ text: inputText });
    };

    const renderMessage = ({ item, index }) => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 100 }}
            className={`max-w-[85%] my-1 ${item.sender === 'bot' ? 'self-start' : 'self-end'}`}
        >
            {item.sender === 'bot' && (
                <View className="flex-row items-end mb-1">
                    <View className={`w-8 h-8 rounded-full mr-2 items-center justify-center ${isDark ? 'bg-secondary-800' : 'bg-secondary-100'}`}>
                        <Brain size={18} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                    </View>
                    <Text className={`text-xs font-montserrat-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Mindful AI</Text>
                </View>
            )}
            <View className={`
                rounded-2xl p-4
                ${item.sender === 'bot'
                ? `${isDark ? 'bg-theme-card-dark' : 'bg-white'} rounded-tl-none shadow-sm`
                : 'bg-primary-500 rounded-tr-none'}
            `}>
                <Text className={`
                    text-base font-montserrat
                    ${item.sender === 'bot'
                    ? `${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`
                    : 'text-white'}
                `}>
                    {item.text}
                </Text>

                {item.showSuggestions && (
                    <View className="mt-4 space-y-2">
                        {HABIT_CATEGORIES.map(category => (
                            <TouchableOpacity
                                key={category.id}
                                className={`
                                    p-3 rounded-xl border flex-row items-center space-x-3
                                    ${isDark ? 'border-secondary-700 bg-secondary-900/20' : 'border-secondary-200 bg-secondary-50'}
                                `}
                                onPress={() => handleCategorySelect(category)}
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-secondary-800' : 'bg-secondary-100'}`}>
                                    <Sparkles size={20} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                                </View>
                                <View className="flex-1">
                                    <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                        {category.title}
                                    </Text>
                                    <Text className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {category.habits.length} habits available
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {item.showHabits && (
                    <View className="mt-4 space-y-2">
                        {item.category.habits.map(habit => (
                            <TouchableOpacity
                                key={habit.id}
                                className={`
                                    p-3 rounded-xl
                                    ${isDark ? 'bg-secondary-900/20' : 'bg-secondary-50'}
                                `}
                                onPress={() => handleHabitSelection(habit)}
                            >
                                <Text className={`font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {habit.text}
                                </Text>
                                <Text className={`text-sm font-montserrat mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {habit.description}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>
        </MotiView>
    );

    return (
        <SafeAreaView className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-theme-background'}`}>
            <Animated.View style={{ opacity: fadeAnim }}>
                <View className={`px-4 py-4 flex-row items-center ${isDark ? 'bg-theme-card-dark' : 'bg-white'} shadow-sm`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mr-3"
                    >
                        <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#374151'} />
                    </TouchableOpacity>
                    <View className="flex-row items-center">
                        <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isDark ? 'bg-secondary-800' : 'bg-secondary-100'}`}>
                            <Brain size={24} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                        </View>
                        <View>
                            <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Mindful
                            </Text>
                            <Text className={`text-sm font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Your Habit AI Assistant
                            </Text>
                        </View>
                    </View>
                </View>
            </Animated.View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                className="flex-1 px-4 pt-4"
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                onLayout={() => flatListRef.current?.scrollToEnd()}
            />

            {isTyping && (
                <View className="px-4 pb-2">
                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        className={`self-start rounded-2xl p-3 ${isDark ? 'bg-theme-card-dark' : 'bg-white'}`}
                    >
                        <Text className={`font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Mindful is typing...
                        </Text>
                    </MotiView>
                </View>
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                className={`border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
            >
                <View className={`flex-row items-end p-4 ${isDark ? 'bg-theme-card-dark' : 'bg-white'}`}>
                    <TextInput
                        className={`
                            flex-1 rounded-xl px-4 py-3 mr-2 text-base font-montserrat min-h-[44px]
                            ${isDark ? 'bg-theme-surface-dark text-white' : 'bg-gray-50 text-gray-900'}
                        `}
                        placeholder="Type your message..."
                        placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxHeight={100}
                    />
                    <TouchableOpacity
                        className={`
                            p-3 rounded-xl shadow-sm
                            ${inputText.trim() ? 'bg-primary-500' : isDark ? 'bg-gray-800' : 'bg-gray-100'}
                        `}
                        onPress={handleSendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Send size={20} color={inputText.trim() ? 'white' : isDark ? '#94A3B8' : '#64748B'} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default MindfulChatbot;