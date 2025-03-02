// components/home/CompletionFormModal.tsx
import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { X, Upload, MapPin, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CompletionFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: CompletionData) => void;
    habitName: string;
    isDark: boolean;
}

export interface CompletionData {
    completed_at: string;
    mood_rating?: number;
    energy_level?: number;
    difficulty_rating?: number;
    notes?: string;
    evidence_url?: string;
    location_name?: string;
}

const CompletionFormModal: React.FC<CompletionFormModalProps> = ({
                                                                     visible,
                                                                     onClose,
                                                                     onSubmit,
                                                                     habitName,
                                                                     isDark
                                                                 }) => {
    const [completionData, setCompletionData] = useState<CompletionData>({
        completed_at: new Date().toISOString(),
        mood_rating: 3,
        energy_level: 3,
        difficulty_rating: 3,
        notes: '',
        location_name: ''
    });

    const handleMoodChange = (rating: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCompletionData(prev => ({ ...prev, mood_rating: rating }));
    };

    const handleEnergyChange = (rating: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCompletionData(prev => ({ ...prev, energy_level: rating }));
    };

    const handleDifficultyChange = (rating: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCompletionData(prev => ({ ...prev, difficulty_rating: rating }));
    };

    const handleSubmit = () => {
        onSubmit(completionData);
    };

    const MoodEmojis = ['😞', '😐', '🙂', '😊', '😄'];
    const EnergyEmojis = ['🔋', '🔋', '🔋', '🔋', '🔋'];
    const DifficultyLabels = ['Very Easy', 'Easy', 'Average', 'Hard', 'Very Hard'];

    const RatingSelector = ({
                                title,
                                value,
                                onChange,
                                options,
                                type = 'emoji'
                            }) => (
        <View className="mb-4">
            <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {title}
            </Text>
            <View className="flex-row justify-between">
                {[1, 2, 3, 4, 5].map(rating => (
                    <TouchableOpacity
                        key={rating}
                        onPress={() => onChange(rating)}
                        className={`items-center justify-center p-2 rounded-full ${
                            value === rating
                                ? 'bg-primary-500'
                                : isDark ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                        style={{ width: 50, height: 50 }}
                        activeOpacity={0.7}
                    >
                        {type === 'emoji' ? (
                            <Text className="text-xl">{options[rating-1]}</Text>
                        ) : (
                            <Text
                                className={`text-xs font-montserrat-medium text-center ${
                                    value === rating ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'
                                }`}
                            >
                                {options[rating-1]}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1 justify-end">
                    <View
                        className={`rounded-t-3xl p-5 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                        style={{ maxHeight: '80%' }}
                    >
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Complete Habit
                            </Text>
                            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                                <X size={24} color={isDark ? '#E5E7EB' : '#4B5563'} />
                            </TouchableOpacity>
                        </View>

                        <Text className={`mb-4 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            You're completing: <Text className="font-montserrat-bold">{habitName}</Text>
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <RatingSelector
                                title="How are you feeling?"
                                value={completionData.mood_rating}
                                onChange={handleMoodChange}
                                options={MoodEmojis}
                            />

                            <RatingSelector
                                title="Energy level"
                                value={completionData.energy_level}
                                onChange={handleEnergyChange}
                                options={EnergyEmojis}
                            />

                            <RatingSelector
                                title="How difficult was it?"
                                value={completionData.difficulty_rating}
                                onChange={handleDifficultyChange}
                                options={DifficultyLabels}
                                type="text"
                            />

                            <Text className={`mb-2 font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Notes (Optional)
                            </Text>
                            <TextInput
                                className={`p-3 rounded-xl mb-4 font-montserrat ${
                                    isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                }`}
                                value={completionData.notes}
                                onChangeText={(text) => setCompletionData(prev => ({ ...prev, notes: text }))}
                                placeholder="Add notes about this completion..."
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                            />

                            <View className="flex-row mb-4">
                                <TouchableOpacity
                                    className={`flex-1 mr-2 flex-row items-center justify-center p-3 rounded-xl ${
                                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}
                                    activeOpacity={0.7}
                                >
                                    <Upload size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />
                                    <Text className={`ml-2 font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                                        Add Evidence
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className={`flex-1 ml-2 flex-row items-center justify-center p-3 rounded-xl ${
                                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}
                                    activeOpacity={0.7}
                                >
                                    <MapPin size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />
                                    <Text className={`ml-2 font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                                        Add Location
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            className="bg-primary-500 py-4 rounded-xl flex-row items-center justify-center mt-4"
                            onPress={handleSubmit}
                            activeOpacity={0.7}
                        >
                            <Check size={20} color="white" />
                            <Text className="ml-2 text-white font-montserrat-semibold">Complete Habit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default CompletionFormModal;