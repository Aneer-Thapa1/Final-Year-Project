import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    SafeAreaView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Animated,
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet
} from 'react-native';
import { Send, ArrowLeft, Sparkles, Brain, AlertCircle, Mic, Trash2 } from 'lucide-react-native';
import { router } from "expo-router";
import { MotiView } from 'moti';
import { useColorScheme } from 'nativewind';
import chatbotService, { ChatMessage } from '../../services/chatbotService';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';

// Suggestion categories with detailed habit information
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

// Initial welcome messages
const getInitialMessages = () => [
    {
        id: 'welcome-1',
        content: 'Welcome to Mindful! 👋 I\'m your AI companion on the journey to better habits.',
        role: 'bot',
        timestamp: new Date()
    },
    {
        id: 'welcome-2',
        content: 'I can help you develop mindful habits that stick. What would you like to work on today?',
        role: 'bot',
        timestamp: new Date(),
        showSuggestions: true
    }
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const MindfulChatbot = () => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isNetworkAvailable, setIsNetworkAvailable] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [showClearConfirmation, setShowClearConfirmation] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const inputRef = useRef<TextInput>(null);

    // Animation and initial data loading
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
        }).start();

        const loadChatHistory = async () => {
            try {
                setIsLoading(true);
                const history = await chatbotService.loadChatHistory();

                // If no chat history, use initial welcome messages
                if (history.length === 0) {
                    const initialMessages = getInitialMessages();
                    setMessages(initialMessages);
                    await chatbotService.saveChatHistory(initialMessages);
                } else {
                    setMessages(history);
                }
            } catch (error) {
                console.error('Error loading chat history:', error);
                // Fallback to initial messages if error occurs
                setMessages(getInitialMessages());
            } finally {
                setIsLoading(false);
            }
        };

        // Check network connectivity
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsNetworkAvailable(state.isConnected ?? false);
        });

        loadChatHistory();

        return () => {
            unsubscribe();
        };
    }, []);

    // Save chat history whenever messages change
    useEffect(() => {
        if (messages.length > 0 && !isLoading) {
            chatbotService.saveChatHistory(messages);
        }
    }, [messages, isLoading]);

    // Placeholder for future voice functionality
    const handleVoicePress = () => {
        // Provide haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // This is a placeholder for future voice functionality
        Alert.alert(
            "Coming Soon",
            "Voice input will be available in a future update.",
            [{ text: "OK" }]
        );
    };

    // Handle category selection
    const handleCategorySelect = (category: any) => {
        // Provide haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        setSelectedCategory(category);

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            content: `Great! Let's explore ${category.title.toLowerCase()} habits. Choose one to focus on:`,
            role: 'bot',
            timestamp: new Date(),
            showHabits: true,
            category: category
        };

        setMessages(prev => [...prev, newMessage]);

        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    // Handle habit selection
    const handleHabitSelection = async (habit: any) => {
        // Provide haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!isNetworkAvailable) {
            showNetworkError();
            return;
        }

        // Add user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content: habit.text,
            role: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);

        // Scroll to bottom immediately after adding user message
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        // Get response from AI
        await getBotResponse(habit.text);
    };

    // Send message to chatbot API
    const getBotResponse = async (prompt: string) => {
        if (!isNetworkAvailable) {
            showNetworkError();
            return;
        }

        setIsTyping(true);

        try {
            // Send to chatbot API
            const response = await chatbotService.sendMessageToChatbot(prompt);

            // Add response to messages
            setMessages(prev => [...prev, response]);

            // Reset retry count on success
            setRetryCount(0);
        } catch (error) {
            console.error('Error getting bot response:', error);

            // Increment retry count
            const newRetryCount = retryCount + 1;
            setRetryCount(newRetryCount);

            // Add error message after 2 failed attempts
            if (newRetryCount >= 2) {
                const errorMessage: ChatMessage = {
                    id: `error-${Date.now()}`,
                    content: "I'm having trouble connecting. Please check your connection or try again later.",
                    role: 'bot',
                    timestamp: new Date(),
                    isError: true
                };

                setMessages(prev => [...prev, errorMessage]);
                setRetryCount(0);
            }
        } finally {
            setIsTyping(false);
            // Scroll to bottom after getting response
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    // Handle sending user message
    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        // Provide haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!isNetworkAvailable) {
            showNetworkError();
            return;
        }

        // Create user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content: inputText,
            role: 'user',
            timestamp: new Date()
        };

        // Add to messages
        setMessages(prev => [...prev, userMessage]);

        // Clear input
        const messageText = inputText;
        setInputText('');

        // Scroll to bottom immediately after adding user message
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        // Get response from AI
        await getBotResponse(messageText);
    };

    // Network error handler
    const showNetworkError = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        Alert.alert(
            "Connection Error",
            "Please check your internet connection and try again.",
            [{ text: "OK" }]
        );
    };

    // Show clear chat confirmation
    const confirmClearChat = () => {
        // Provide haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        Alert.alert(
            "Clear Conversation",
            "Are you sure you want to clear this conversation?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: handleClearChat
                }
            ]
        );
    };

    // Clear chat history
    const handleClearChat = async () => {
        try {
            setIsLoading(true);
            await chatbotService.clearChatHistory();
            const initialMessages = getInitialMessages();
            setMessages(initialMessages);
            await chatbotService.saveChatHistory(initialMessages);

            // Provide success haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error clearing chat:', error);
            Alert.alert(
                "Error",
                "Failed to clear chat history. Please try again.",
                [{ text: "OK" }]
            );

            // Provide error haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    };

    // Format timestamp
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Render a message
    const renderMessage = ({ item, index }: { item: ChatMessage, index: number }) => (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 50, duration: 300 }}
            className={`max-w-[85%] my-2 ${item.role === 'bot' ? 'self-start' : 'self-end'}`}
        >
            {item.role === 'bot' && (
                <View className="flex-row items-end mb-1 ml-2">
                    <View className={`w-8 h-8 rounded-full mr-2 items-center justify-center ${isDark ? 'bg-secondary-800' : 'bg-secondary-100'}`}>
                        <Brain size={18} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                    </View>
                    <Text className={`text-xs font-montserrat-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Mindful AI
                    </Text>
                </View>
            )}

            <View className={`
                rounded-2xl p-4
                ${item.role === 'bot'
                ? `${isDark ? 'bg-theme-card-dark' : 'bg-white'} rounded-tl-none shadow-sm ${item.isError ? 'border border-red-500' : ''}`
                : 'bg-primary-500 rounded-tr-none'}
            `}>
                {item.isError && (
                    <View className="flex-row items-center mb-2">
                        <AlertCircle size={16} color="#EF4444" />
                        <Text className="text-red-500 font-montserrat-bold ml-2">Connection Error</Text>
                    </View>
                )}

                <Text className={`
                    text-base font-montserrat
                    ${item.role === 'bot'
                    ? `${isDark ? 'text-theme-text-primary-dark' : 'text-theme-text-primary'}`
                    : 'text-white'}
                `}>
                    {item.content}
                </Text>

                {/* Timestamp for messages */}
                <Text className={`
                    text-xs mt-2 text-right
                    ${item.role === 'bot'
                    ? isDark ? 'text-gray-500' : 'text-gray-400'
                    : 'text-white/70'}
                `}>
                    {formatTime(item.timestamp)}
                </Text>

                {/* Suggestions Section with improved spacing */}
                {item.showSuggestions && (
                    <View className="mt-5 space-y-3">
                        <Text className={`font-montserrat-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Suggested Categories:
                        </Text>
                        {HABIT_CATEGORIES.map(category => (
                            <TouchableOpacity
                                key={category.id}
                                className={`
                                    p-3 rounded-xl border flex-row items-center
                                    ${isDark ? 'border-secondary-700 bg-secondary-900/20' : 'border-secondary-200 bg-secondary-50'}
                                `}
                                onPress={() => handleCategorySelect(category)}
                                activeOpacity={0.7}
                            >
                                <View className={`w-10 h-10 rounded-full items-center justify-center ${isDark ? 'bg-secondary-800' : 'bg-secondary-100'}`}>
                                    <Sparkles size={20} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                                </View>
                                <View className="flex-1 ml-3">
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

                {/* Habits Section with improved spacing */}
                {item.showHabits && item.category && (
                    <View className="mt-5 space-y-3">
                        <Text className={`font-montserrat-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            Suggested Habits:
                        </Text>
                        {item.category.habits.map((habit: any) => (
                            <TouchableOpacity
                                key={habit.id}
                                className={`
                                    p-4 rounded-xl
                                    ${isDark ? 'bg-secondary-900/20' : 'bg-secondary-50'}
                                `}
                                onPress={() => handleHabitSelection(habit)}
                                activeOpacity={0.7}
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

    // Main loading screen
    if (isLoading) {
        return (
            <SafeAreaView className={`flex-1 items-center justify-center ${isDark ? 'bg-theme-background-dark' : 'bg-theme-background'}`}>
                <View className="items-center">
                    <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-secondary-800' : 'bg-secondary-100'}`}>
                        <Brain size={32} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                    </View>
                    <ActivityIndicator size="large" color={isDark ? '#C4B5FD' : '#7C3AED'} />
                    <Text className={`mt-4 text-lg font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        Loading your mindful assistant...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            className={`flex-1 ${isDark ? 'bg-theme-background-dark' : 'bg-theme-background'}`}
            style={{ height: SCREEN_HEIGHT }}
        >
            <Animated.View style={{ opacity: fadeAnim }}>
                {/* Header with improved clear button */}
                <View className={`px-4 py-4 flex-row items-center justify-between ${isDark ? 'bg-theme-card-dark' : 'bg-white'} shadow-sm`}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="p-2 mr-2"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ArrowLeft size={24} color={isDark ? '#E2E8F0' : '#374151'} />
                    </TouchableOpacity>

                    <View className="flex-row items-center flex-1">
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

                    {/* Enhanced clear button */}
                    <TouchableOpacity
                        onPress={confirmClearChat}
                        className={`p-2 rounded-full ${isDark ? 'bg-gray-800/80' : 'bg-gray-100'} flex-row items-center`}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Trash2 size={16} color={isDark ? '#E2E8F0' : '#64748B'} />
                        <Text className={`text-xs font-montserrat ml-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Clear
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Network status indicator */}
                {!isNetworkAvailable && (
                    <View className={`px-4 py-3 bg-red-500 flex-row items-center justify-center`}>
                        <AlertCircle size={18} color="white" />
                        <Text className="text-white font-montserrat-medium ml-2">No internet connection</Text>
                    </View>
                )}
            </Animated.View>

            {/* Messages list with improved spacing */}
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                className="flex-1 px-4"
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={10}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />

            {/* Typing indicator with improved styling */}
            {isTyping && (
                <View className="px-4 pb-3">
                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        className={`self-start rounded-2xl p-3 max-w-[60%] ${isDark ? 'bg-theme-card-dark' : 'bg-white'}`}
                    >
                        <View className="flex-row items-center">
                            <ActivityIndicator size="small" color={isDark ? '#C4B5FD' : '#7C3AED'} />
                            <Text className={`ml-2 font-montserrat ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Mindful is thinking...
                            </Text>
                        </View>
                    </MotiView>
                </View>
            )}

            {/* Enhanced input area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                style={styles.keyboardAvoid}
            >
                <View className={`flex-row items-center px-4 py-3 ${isDark ? 'bg-theme-card-dark' : 'bg-white'} border-t ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <TextInput
                        ref={inputRef}
                        className={`
                            flex-1 rounded-xl px-4 py-3 text-base font-montserrat min-h-[45px] max-h-[100px]
                            ${isDark ? 'bg-theme-surface-dark text-white' : 'bg-gray-50 text-gray-900'}
                        `}
                        placeholder="Type your message..."
                        placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        editable={!isTyping}
                        returnKeyType="send"
                        onSubmitEditing={inputText.trim() ? handleSendMessage : null}
                    />

                    {/* Voice button */}
                    <TouchableOpacity
                        className={`
                            p-3 rounded-xl shadow-sm mx-2
                            ${isDark ? 'bg-gray-800' : 'bg-gray-200'}
                        `}
                        onPress={handleVoicePress}
                        disabled={isTyping}
                        activeOpacity={0.7}
                    >
                        <Mic size={20} color={isDark ? '#94A3B8' : '#64748B'} />
                    </TouchableOpacity>

                    {/* Send button */}
                    <TouchableOpacity
                        className={`
                            p-3 rounded-xl shadow-sm
                            ${(inputText.trim() && !isTyping)
                            ? 'bg-primary-500'
                            : isDark ? 'bg-gray-800' : 'bg-gray-200'}
                        `}
                        onPress={handleSendMessage}
                        disabled={!inputText.trim() || isTyping}
                        activeOpacity={0.7}
                    >
                        {isTyping ? (
                            <ActivityIndicator size="small" color={isDark ? '#94A3B8' : '#64748B'} />
                        ) : (
                            <Send
                                size={20}
                                color={inputText.trim() ? 'white' : isDark ? '#94A3B8' : '#64748B'}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// Additional styles with improved bottom spacing
const styles = StyleSheet.create({
    flexSpacer: {
        flex: 1
    },
    keyboardAvoid: {
        marginBottom: 0,
        paddingBottom: Platform.OS === 'ios' ? 0 : 0,
    }
});

export default MindfulChatbot;