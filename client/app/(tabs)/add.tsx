import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { Plus, List, ArrowLeft } from 'lucide-react-native';
import HabitForm from '../../components/HabitForm';

const HabitManagementScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State to control which tab is active
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'form'
  const [editingHabit, setEditingHabit] = useState(null);

  const handleEditHabit = (habit) => {
    setEditingHabit(habit);
    setActiveTab('form');
  };

  const handleCreateNewHabit = () => {
    setEditingHabit(null);
    setActiveTab('form');
  };

  const handleFormSuccess = () => {
    // Reset and go back to list view
    setEditingHabit(null);
    setActiveTab('list');
    // Here you would typically refetch or update your habit list
  };

  const handleFormCancel = () => {
    // Go back to list view
    setEditingHabit(null);
    setActiveTab('list');
  };

  return (
      <SafeAreaView className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Stack.Screen
            options={{
              headerShown: false,
            }}
        />

        {/* Custom Header */}
        <View className={`px-4 py-3 flex-row items-center justify-between border-b ${
            isDark ? 'border-gray-800' : 'border-gray-200'
        }`}>
          {activeTab === 'form' ? (
              <TouchableOpacity
                  onPress={handleFormCancel}
                  className="p-2"
              >
                <ArrowLeft size={24} color={isDark ? "#E5E7EB" : "#1F2937"} />
              </TouchableOpacity>
          ) : (
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                My Habits
              </Text>
          )}

          {activeTab === 'list' && (
              <TouchableOpacity
                  onPress={handleCreateNewHabit}
                  className={`p-2 rounded-full ${isDark ? 'bg-primary-700' : 'bg-primary-500'}`}
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
          )}
        </View>

        {/* Main Content */}
        <View className="flex-1">

              <HabitForm
                  existingHabit={editingHabit}
                  onSubmitSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  isEditMode={!!editingHabit}
              />
        </View>
      </SafeAreaView>
  );
};

export default HabitManagementScreen;