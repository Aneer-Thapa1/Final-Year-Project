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
import * as ImagePicker from 'expo-image-picker';

// Completion Data Interface
export interface CompletionData {
    completed_at?: string;
    mood_rating?: number;
    energy_level?: number;
    difficulty_rating?: number;
    notes?: string;
    evidence_url?: string;
    location_name?: string;
}

// Props Interface
interface CompletionFormModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (data: CompletionData) => void;
    habitName: string;
    isDark: boolean;
}

const CompletionFormModal: React.FC<CompletionFormModalProps> = ({
                                                                     visible,
                                                                     onClose,
                                                                     onSubmit,
                                                                     habitName,
                                                                     isDark
                                                                 }) => {
    // State for completion data
    const [completionData, setCompletionData] = useState<CompletionData>({
        completed_at: new Date().toISOString(),
        mood_rating: 3,
        energy_level: 3,
        difficulty_rating: 3,
        notes: '',
        evidence_url: '',
        location_name: ''
    });

    // Mood, Energy, and Difficulty Emojis/Labels
    const MoodEmojis = ['😞', '😐', '🙂', '😊', '😄'];
    const EnergyEmojis = ['🔋', '⚡', '🔋', '⚡', '🔋'];
    const DifficultyLabels = ['Very Easy', 'Easy', 'Average', 'Hard', 'Very Hard'];

    // Handle rating changes with haptic feedback
    const handleRatingChange = (
        key: 'mood_rating' | 'energy_level' | 'difficulty_rating',
        rating: number
    ) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCompletionData(prev => ({ ...prev, [key]: rating }));
    };

    // Pick image for evidence
    const pickEvidenceImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                alert('Sorry, we need camera roll permissions to make this work!');
                return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                // Assuming the first asset (as we allow single image selection)
                setCompletionData(prev => ({
                    ...prev,
                    evidence_url: result.assets[0].uri
                }));
            }
        } catch (error) {
            console.error('Image picker error:', error);
            alert('Failed to pick image');
        }
    };

    // Rating Selector Component
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

    // Handle form submission
    const handleSubmit = () => {
        // Perform any final validations if needed
        onSubmit(completionData);
    };

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
                        style={{ maxHeight: '90%' }}
                    >
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className={`text-xl font-montserrat-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Complete Habit
                            </Text>
                            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                                <X size={24} color={isDark ? '#E5E7EB' : '#4B5563'} />
                            </TouchableOpacity>
                        </View>

                        {/* Habit Name */}
                        <Text className={`mb-4 font-montserrat ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            You're completing: <Text className="font-montserrat-bold">{habitName}</Text>
                        </Text>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Mood Rating */}
                            <RatingSelector
                                title="How are you feeling?"
                                value={completionData.mood_rating}
                                onChange={(rating) => handleRatingChange('mood_rating', rating)}
                                options={MoodEmojis}
                            />

                            {/* Energy Level */}
                            <RatingSelector
                                title="Energy level"
                                value={completionData.energy_level}
                                onChange={(rating) => handleRatingChange('energy_level', rating)}
                                options={EnergyEmojis}
                            />

                            {/* Difficulty Rating */}
                            <RatingSelector
                                title="How difficult was it?"
                                value={completionData.difficulty_rating}
                                onChange={(rating) => handleRatingChange('difficulty_rating', rating)}
                                options={DifficultyLabels}
                                type="text"
                            />

                            {/* Notes */}
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

                            {/* Evidence and Location */}
                            <View className="flex-row mb-4">
                                {/* Add Evidence */}
                                <TouchableOpacity
                                    onPress={pickEvidenceImage}
                                    className={`flex-1 mr-2 flex-row items-center justify-center p-3 rounded-xl ${
                                        isDark ? 'bg-gray-700' : 'bg-gray-100'
                                    }`}
                                    activeOpacity={0.7}
                                >
                                    <Upload size={20} color={isDark ? '#E5E7EB' : '#4B5563'} />
                                    <Text className={`ml-2 font-montserrat-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                                        {completionData.evidence_url ? 'Image Added' : 'Add Evidence'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Add Location */}
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

                        {/* Submit Button */}
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