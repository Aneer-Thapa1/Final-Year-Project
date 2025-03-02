// screens/AddHabit.js
import React, { useState, useRef } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { ArrowLeft } from "lucide-react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addHabit } from "../../services/habitService";
import { defaultHabitState } from "../../constants/habit";

// Import our section components
import BasicInfoSection from "../../components/BasicInfoSection";
import DomainSection from "../../components/DomainSection";
import TrackingMethodSection from "../../components/TrackingMethodSection";
import FrequencySection from "../../components/FrequencySection";
import ScheduleSection from "../../components/ScheduleSection";
import RemindersSection from "../../components/RemindersSection";
import AdvancedOptionsSection from "../../components/AdvancedOptionsSection";
import CustomizationSection from "../../components/CustomizationSection";
import SuccessModal from "../../components/SuccessModal";
import ErrorToast from "../../components/ErrorToast";

const Add = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const scrollViewRef = useRef(null);

  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    domain: true,
    trackingType: true,
    frequency: true,
    schedule: true,
    reminders: false,
    advanced: false,
    customization: false,
  });

  // State for loading status during form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for success modal and error toast
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Comprehensive habit data state
  const [habitData, setHabitData] = useState(defaultHabitState);

  // Date picker states
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showTimeWindowStart, setShowTimeWindowStart] = useState(false);
  const [showTimeWindowEnd, setShowTimeWindowEnd] = useState(false);
  const [showReminderTime, setShowReminderTime] = useState(false);
  const [editingReminderIndex, setEditingReminderIndex] = useState(null);

  // Toggle section expansion
  const toggleSection = (sectionName) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  // Form validation
  const validateForm = () => {
    // Basic validation
    if (!habitData.name) {
      setErrorMessage("Please provide a name for your habit");
      setShowErrorToast(true);
      return false;
    }

    if (!habitData.domain_id) {
      setErrorMessage("Please select a category for your habit");
      setShowErrorToast(true);
      return false;
    }

    // Tracking type specific validation
    if (habitData.tracking_type === "COUNTABLE" && !habitData.count_goal) {
      setErrorMessage("Please provide a count goal for this countable habit");
      setShowErrorToast(true);
      return false;
    }

    if (habitData.tracking_type === "TIMER" && !habitData.duration_goal) {
      setErrorMessage("Please provide a duration goal for this timer habit");
      setShowErrorToast(true);
      return false;
    }

    if (habitData.tracking_type === "NUMERIC" && !habitData.numeric_goal) {
      setErrorMessage("Please provide a numeric goal for this numeric habit");
      setShowErrorToast(true);
      return false;
    }

    // Validate date ranges
    if (habitData.end_date && habitData.start_date >= habitData.end_date) {
      setErrorMessage("End date must be after start date");
      setShowErrorToast(true);
      return false;
    }

    // Validate time windows
    if (
      habitData.time_window_start &&
      habitData.time_window_end &&
      habitData.time_window_start >= habitData.time_window_end
    ) {
      setErrorMessage("End time must be after start time");
      setShowErrorToast(true);
      return false;
    }

    return true;
  };

  // Handle date changes
  const handleDateChange = (event, selectedDate, dateType) => {
    if (event.type === "set" && selectedDate) {
      setHabitData({ ...habitData, [dateType]: selectedDate });
    }
  };

  // Submit the form
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      // Format the data for API submission
      const formattedData = {
        ...habitData,
        frequency_value: parseInt(habitData.frequency_value),
        frequency_interval: parseInt(habitData.frequency_interval),
        frequency_type_id: parseInt(habitData.frequency_type_id),
        frequency_text: `${habitData.frequency_value} times per ${
          habitData.frequency_type_id === "1"
            ? "day"
            : habitData.frequency_type_id === "2"
            ? "week"
            : "month"
        }`,
        difficulty_id: parseInt(habitData.difficulty_id),
        reminder_times: habitData.reminder_times.map((time) =>
          time.toISOString()
        ),
        start_date: habitData.start_date.toISOString(),
        end_date: habitData.end_date ? habitData.end_date.toISOString() : null,
        times_of_day: habitData.times_of_day.map((time) => time.toISOString()),
        time_window_start: habitData.time_window_start
          ? habitData.time_window_start.toISOString()
          : null,
        time_window_end: habitData.time_window_end
          ? habitData.time_window_end.toISOString()
          : null,
      };

      // Send to API
      const response = await addHabit(formattedData);

      // Show success modal
      setShowSuccessModal(true);
    } catch (error) {
      setErrorMessage(
        error.message || "Something went wrong. Please try again."
      );
      setShowErrorToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date picker renderer
  const renderDatePicker = (
    visible,
    currentDate,
    onChange,
    onClose,
    mode = "date"
  ) => {
    if (Platform.OS === "ios") {
      return (
        <Modal
          animationType="slide"
          transparent={true}
          visible={visible}
          onRequestClose={onClose}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{
                backgroundColor: isDark ? "#1F2937" : "white",
                padding: 20,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
              }}
            >
              <DateTimePicker
                value={currentDate || new Date()}
                mode={mode}
                display="spinner"
                onChange={onChange}
                style={{ backgroundColor: isDark ? "#1F2937" : "white" }}
                textColor={isDark ? "white" : "black"}
              />
              <TouchableOpacity
                onPress={onClose}
                className="mt-4 bg-primary-500 py-3 rounded-xl"
              >
                <Text className="text-white text-center font-montserrat-semibold">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    } else {
      return (
        visible && (
          <DateTimePicker
            value={currentDate || new Date()}
            mode={mode}
            display="default"
            onChange={(event, selectedDate) => {
              onChange(event, selectedDate);
              onClose();
            }}
          />
        )
      );
    }
  };

  // Handle success confirmation
  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    router.back();
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Error Toast */}
        <ErrorToast
          visible={showErrorToast}
          message={errorMessage}
          onClose={() => setShowErrorToast(false)}
        />

        {/* Success Modal */}
        <SuccessModal
          visible={showSuccessModal}
          message="Your new habit has been created. Start building your streak today!"
          onClose={() => setShowSuccessModal(false)}
          onConfirm={handleSuccessConfirm}
        />

        <ScrollView
          className="flex-1"
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View
            className={`px-5 pt-2 pb-4 flex-row items-center ${
              isDark ? "bg-gray-900" : "bg-white"
            }`}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-2 -ml-2"
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={isDark ? "#E2E8F0" : "#374151"} />
            </TouchableOpacity>
            <View>
              <Text
                className={`text-xl font-montserrat-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Create New Habit
              </Text>
              <Text
                className={`text-sm font-montserrat ${
                  isDark ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Build a new healthy habit
              </Text>
            </View>
          </View>

          {/* Form Sections */}
          <View className="px-5 py-4">
            {/* Use our section components with animation */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 100 }}
            >
              <BasicInfoSection
                habitData={habitData}
                setHabitData={setHabitData}
                isExpanded={expandedSections.basicInfo}
                toggleSection={toggleSection}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 150 }}
            >
              <DomainSection
                habitData={habitData}
                setHabitData={setHabitData}
                isExpanded={expandedSections.domain}
                toggleSection={toggleSection}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 200 }}
            >
              <TrackingMethodSection
                habitData={habitData}
                setHabitData={setHabitData}
                isExpanded={expandedSections.trackingType}
                toggleSection={toggleSection}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 250 }}
            >
              <FrequencySection
                habitData={habitData}
                setHabitData={setHabitData}
                isExpanded={expandedSections.frequency}
                toggleSection={toggleSection}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 300 }}
            >
              <ScheduleSection
                habitData={habitData}
                setHabitData={setHabitData}
                isExpanded={expandedSections.schedule}
                toggleSection={toggleSection}
                showStartDate={showStartDate}
                setShowStartDate={setShowStartDate}
                showEndDate={showEndDate}
                setShowEndDate={setShowEndDate}
                showTimeWindowStart={showTimeWindowStart}
                setShowTimeWindowStart={setShowTimeWindowStart}
                showTimeWindowEnd={showTimeWindowEnd}
                setShowTimeWindowEnd={setShowTimeWindowEnd}
                renderDatePicker={renderDatePicker}
                handleDateChange={handleDateChange}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 350 }}
            >
              <RemindersSection
                habitData={habitData}
                setHabitData={setHabitData}
                isExpanded={expandedSections.reminders}
                toggleSection={toggleSection}
                showReminderTime={showReminderTime}
                setShowReminderTime={setShowReminderTime}
                editingReminderIndex={editingReminderIndex}
                setEditingReminderIndex={setEditingReminderIndex}
                renderDatePicker={renderDatePicker}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 400 }}
            >
              <AdvancedOptionsSection
                habitData={habitData}
                setHabitData={setHabitData}
                isExpanded={expandedSections.advanced}
                toggleSection={toggleSection}
              />
            </MotiView>

            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: 450 }}
            >
              <CustomizationSection
                habitData={habitData}
                setHabitData={setHabitData}
                isExpanded={expandedSections.customization}
                toggleSection={toggleSection}
              />
            </MotiView>

            {/* Submit Button */}
            <View className="py-6 pb-20">
              <TouchableOpacity
                className={`rounded-xl py-4 ${
                  isSubmitting ? "bg-primary-400" : "bg-primary-500"
                }`}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-montserrat-semibold text-center text-lg">
                    Create Habit
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Add;
