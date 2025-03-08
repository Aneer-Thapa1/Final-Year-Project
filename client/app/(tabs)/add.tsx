// screens/add/index.js - Completely fixed with attractive design
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Switch,
  Modal,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Check,
  Clock,
  Calendar,
  Bell,
  Star,
  Tag,
  Bookmark,
  Umbrella,
  Info,
  ChevronDown,
  ChevronUp,
  Share2 as Share,
  Plus,
  X
} from 'lucide-react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import TextInputFocusable from '../../components/TextInputFocusable';
import { addHabit } from '../../services/habitService';
import { getDomains } from '../../services/domainService';

const defaultHabitState = {
  name: "",
  description: "",
  domain_id: null,
  icon: "🏃",
  color: "#4285F4",
  start_date: new Date(),
  end_date: null,
  is_favorite: false,
  is_public: false,
  frequency_type: "DAILY",
  frequency_value: 1,
  frequency_interval: 1,
  specific_days: [],
  tracking_type: "BOOLEAN",
  duration_goal: null,
  count_goal: null,
  numeric_goal: null,
  units: "",
  skip_on_vacation: false,
  require_evidence: false,
  motivation_quote: "",
  cue: "",
  reward: "",
  difficulty: "MEDIUM",
  tags: [],
  reminders: []
};

const AddHabitScreen = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef(null);

  // State for habit data
  const [habitData, setHabitData] = useState(defaultHabitState);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [currentTag, setCurrentTag] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    tracking: true,
    frequency: true,
    schedule: false,
    reminders: false,
    motivation: false,
    advanced: false,
  });

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [editingReminderIndex, setEditingReminderIndex] = useState(null);

  // Dropdown states
  const [showDomainPicker, setShowDomainPicker] = useState(false);
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);

  // Fetch domains on component mount
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const domainsData = await getDomains();
        setDomains(domainsData);
      } catch (error) {
        console.error("Failed to fetch domains:", error);
      }
    };

    fetchDomains();
  }, []);

  // Toggle section expansion
  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Form validation
  const validateForm = () => {
    if (!habitData.name.trim()) {
      setErrorMessage("Please enter a habit name");
      setShowErrorToast(true);
      return false;
    }

    if (!habitData.domain_id) {
      setErrorMessage("Please select a category for your habit");
      setShowErrorToast(true);
      return false;
    }

    if (habitData.tracking_type === "DURATION" && !habitData.duration_goal) {
      setErrorMessage("Please enter a duration goal");
      setShowErrorToast(true);
      return false;
    }

    if (habitData.tracking_type === "COUNT" && !habitData.count_goal) {
      setErrorMessage("Please enter a count goal");
      setShowErrorToast(true);
      return false;
    }

    if (habitData.tracking_type === "NUMERIC" && !habitData.numeric_goal) {
      setErrorMessage("Please enter a numeric goal");
      setShowErrorToast(true);
      return false;
    }

    if (habitData.frequency_type === "WEEKLY" && habitData.specific_days.length === 0) {
      setErrorMessage("Please select at least one day of the week");
      setShowErrorToast(true);
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      Keyboard.dismiss();

      // Prepare data for submission
      const formData = {
        ...habitData,
        start_date: habitData.start_date.toISOString(),
        end_date: habitData.end_date ? habitData.end_date.toISOString() : null,
        duration_goal: habitData.tracking_type === "DURATION" ? Number(habitData.duration_goal) : null,
        count_goal: habitData.tracking_type === "COUNT" ? Number(habitData.count_goal) : null,
        numeric_goal: habitData.tracking_type === "NUMERIC" ? Number(habitData.numeric_goal) : null,
        frequency_value: Number(habitData.frequency_value),
        frequency_interval: Number(habitData.frequency_interval),
        tags: habitData.tags.length > 0 ? habitData.tags : null,
        reminders: habitData.reminders.length > 0 ? habitData.reminders.map(reminder => ({
          time: reminder.time,
          repeat: reminder.repeat || "DAILY",
          message: reminder.message || `Time to complete your ${habitData.name} habit!`
        })) : null
      };

      const response = await addHabit(formData);

      if (response.success) {
        setShowSuccessModal(true);
      } else {
        throw new Error(response.message || "Failed to create habit");
      }
    } catch (error) {
      console.error("Error creating habit:", error);
      setErrorMessage(error.message || "Something went wrong. Please try again.");
      setShowErrorToast(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle text input changes with preserved keyboard
  const handleTextChange = (text, field) => {
    setHabitData(prev => ({
      ...prev,
      [field]: text
    }));
  };

  // Handle date changes
  const handleDateChange = (event, selectedDate, dateType) => {
    if (Platform.OS === "android" && event.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      setHabitData(prev => ({
        ...prev,
        [dateType]: selectedDate
      }));
    }

    // Close date pickers
    if (dateType === "start_date") setShowStartDatePicker(false);
    if (dateType === "end_date") setShowEndDatePicker(false);
  };

  // Handle reminder time change
  const handleReminderTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android" && event.type === "dismissed") {
      setShowReminderTimePicker(false);
      return;
    }

    if (selectedTime) {
      setReminderTime(selectedTime);
    }

    if (Platform.OS === "android") {
      setShowReminderTimePicker(false);
    }
  };

  // Add reminder
  const addReminder = () => {
    const newReminder = {
      time: reminderTime.toISOString(),
      repeat: "DAILY",
      message: `Time to complete your ${habitData.name} habit!`
    };

    if (editingReminderIndex !== null) {
      // Edit existing reminder
      const updatedReminders = [...habitData.reminders];
      updatedReminders[editingReminderIndex] = newReminder;
      setHabitData(prev => ({ ...prev, reminders: updatedReminders }));
      setEditingReminderIndex(null);
    } else {
      // Add new reminder
      setHabitData(prev => ({
        ...prev,
        reminders: [...prev.reminders, newReminder]
      }));
    }

    setShowReminderTimePicker(false);
  };

  // Delete reminder
  const deleteReminder = (index) => {
    const updatedReminders = [...habitData.reminders];
    updatedReminders.splice(index, 1);
    setHabitData(prev => ({ ...prev, reminders: updatedReminders }));
  };

  // Toggle day selection for weekly habits
  const toggleDaySelection = (dayIndex) => {
    const updatedDays = [...habitData.specific_days];
    const dayPosition = updatedDays.indexOf(dayIndex);

    if (dayPosition >= 0) {
      updatedDays.splice(dayPosition, 1);
    } else {
      updatedDays.push(dayIndex);
    }

    setHabitData(prev => ({
      ...prev,
      specific_days: updatedDays
    }));
  };

  // Add tag
  const addTag = () => {
    if (currentTag.trim() && !habitData.tags.includes(currentTag.trim())) {
      setHabitData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag("");
    }
  };

  // Remove tag
  const removeTag = (tagToRemove) => {
    setHabitData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Format time for display
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle success modal completion
  const handleSuccessConfirmation = () => {
    setShowSuccessModal(false);
    router.back();
  };

  // Render date picker based on platform
  const renderDatePicker = (visible, currentDate, onChange, mode = "date") => {
    if (!visible) return null;

    if (Platform.OS === "ios") {
      return (
          <Modal
              animationType="slide"
              transparent={true}
              visible={visible}
          >
            <View className="flex-1 justify-end bg-black/40">
              <View className={`p-4 rounded-t-3xl ${isDark ? "bg-gray-800" : "bg-white"}`}>
                <DateTimePicker
                    value={currentDate || new Date()}
                    mode={mode}
                    display="spinner"
                    onChange={onChange}
                    textColor={isDark ? "white" : "black"}
                />
                <TouchableOpacity
                    onPress={() => {
                      if (mode === "time" && onChange === handleReminderTimeChange) {
                        setShowReminderTimePicker(false);
                        addReminder();
                      } else if (mode === "date" && onChange === ((e, d) => handleDateChange(e, d, "start_date"))) {
                        setShowStartDatePicker(false);
                      } else if (mode === "date" && onChange === ((e, d) => handleDateChange(e, d, "end_date"))) {
                        setShowEndDatePicker(false);
                      }
                    }}
                    className="mt-4 bg-primary-500 py-4 rounded-xl"
                >
                  <Text className="text-white text-center font-bold">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
      );
    } else {
      return (
          <DateTimePicker
              value={currentDate || new Date()}
              mode={mode}
              display="default"
              onChange={onChange}
          />
      );
    }
  };

  // Style helpers
  const getBackgroundColor = () => isDark ? "bg-theme-background-dark" : "bg-gray-50";
  const getCardColor = () => isDark ? "bg-gray-800" : "bg-white";
  const getInputBgColor = () => isDark ? "bg-gray-700" : "bg-white";
  const getTextColor = () => isDark ? "text-white" : "text-gray-900";
  const getSecondaryTextColor = () => isDark ? "text-gray-300" : "text-gray-700";
  const getMutedTextColor = () => isDark ? "text-gray-400" : "text-gray-500";
  const getBorderColor = () => isDark ? "border-gray-700" : "border-gray-200";
  const getPrimaryColor = () => isDark ? "bg-primary-600" : "bg-primary-500";
  const getIconBgColor = () => isDark ? "bg-gray-700" : "bg-primary-100";
  const getAccentTextColor = () => isDark ? "text-primary-400" : "text-primary-500";

  // Section component
  const Section = ({ title, icon, expanded, onToggle, children }) => (
      <View className={`mb-3 rounded-xl overflow-hidden shadow-sm ${getCardColor()}`}>
        <TouchableOpacity
            onPress={onToggle}
            className="flex-row items-center justify-between p-3"
            activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <View className={`w-8 h-8 rounded-full items-center justify-center ${getIconBgColor()}`}>
              {icon}
            </View>
            <Text className={`ml-2.5 font-bold text-base ${getTextColor()}`}>{title}</Text>
          </View>
          {expanded ? (
              <ChevronUp size={18} color={isDark ? "#E2E8F0" : "#4B5563"} />
          ) : (
              <ChevronDown size={18} color={isDark ? "#E2E8F0" : "#4B5563"} />
          )}
        </TouchableOpacity>

        {expanded && (
            <View className={`px-3 py-3 border-t ${getBorderColor()}`}>
              {children}
            </View>
        )}
      </View>
  );

  // Styled Input Field
  const InputField = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = "default", required = false }) => (
      <View className="mb-3">
        <View className="flex-row items-center mb-1.5">
          <Text className={`font-medium ${getSecondaryTextColor()}`}>{label}</Text>
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </View>
        <TextInputFocusable
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            keyboardType={keyboardType}
            className={`p-3 rounded-lg border ${getBorderColor()} ${getTextColor()} ${
                multiline ? "min-h-[80px] text-top" : ""
            } ${getInputBgColor()}`}
        />
      </View>
  );

  // Radio Option
  const RadioOption = ({ label, selected, onSelect }) => (
      <TouchableOpacity
          onPress={onSelect}
          className={`flex-row items-center p-3 mb-2 rounded-lg border ${
              selected ? "border-primary-500" : getBorderColor()
          } ${getInputBgColor()}`}
          activeOpacity={0.7}
      >
        <View className={`w-5 h-5 rounded-full border items-center justify-center mr-3 ${
            selected ? "border-primary-500 bg-primary-500" : getBorderColor()
        }`}>
          {selected && <Check size={12} color="white" />}
        </View>
        <Text className={getTextColor()}>{label}</Text>
      </TouchableOpacity>
  );

  // Select Field
  const SelectField = ({ label, value, placeholder, onPress, required = false }) => (
      <View className="mb-3">
        <View className="flex-row items-center mb-1.5">
          <Text className={`font-medium ${getSecondaryTextColor()}`}>{label}</Text>
          {required && <Text className="text-red-500 ml-1">*</Text>}
        </View>
        <TouchableOpacity
            onPress={onPress}
            className={`p-3 rounded-lg flex-row justify-between items-center border ${getBorderColor()} ${getInputBgColor()}`}
        >
          <Text className={value ? getTextColor() : getMutedTextColor()}>
            {value || placeholder}
          </Text>
          <ChevronDown size={18} color={isDark ? "#E2E8F0" : "#4B5563"} />
        </TouchableOpacity>
      </View>
  );

  // Tag component
  const TagBadge = ({ text, onRemove }) => (
      <View className={`flex-row items-center ${isDark ? "bg-gray-700" : "bg-primary-100"} rounded-full px-3 py-1 mr-2 mb-2`}>
        <Text className={isDark ? "text-primary-300" : "text-primary-800"}>{text}</Text>
        <TouchableOpacity onPress={onRemove} className="ml-1.5">
          <View className={`${isDark ? "bg-gray-600" : "bg-primary-200"} rounded-full w-5 h-5 items-center justify-center`}>
            <X size={10} color={isDark ? "#93C5FD" : "#3B82F6"} />
          </View>
        </TouchableOpacity>
      </View>
  );

  // Error toast component
  const ErrorToast = () => (
      showErrorToast && (
          <View className="absolute top-6 left-5 right-5 bg-red-500 rounded-lg p-4 z-50 shadow-lg">
            <Text className="text-white font-medium">{errorMessage}</Text>
            <TouchableOpacity
                className="absolute top-2 right-2"
                onPress={() => setShowErrorToast(false)}
            >
              <Text className="text-white text-lg">×</Text>
            </TouchableOpacity>
          </View>
      )
  );

  // Success modal component
  const SuccessModal = () => (
      <Modal
          visible={showSuccessModal}
          transparent={true}
          animationType="fade"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className={`w-4/5 p-6 rounded-2xl ${getCardColor()} shadow-xl`}>
            <View className="items-center mb-4">
              <View className={`w-16 h-16 rounded-full ${isDark ? "bg-green-900" : "bg-green-100"} items-center justify-center mb-4`}>
                <Check size={32} color={isDark ? "#4ADE80" : "#22C55E"} />
              </View>
              <Text className={`text-xl font-bold text-center ${getTextColor()}`}>Success!</Text>
            </View>
            <Text className={`text-center mb-6 ${getSecondaryTextColor()}`}>
              Your new habit has been created. Start building your streak today!
            </Text>
            <TouchableOpacity
                onPress={handleSuccessConfirmation}
                className={`${getPrimaryColor()} py-3.5 rounded-xl`}
            >
              <Text className="text-white text-center font-bold">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
  );

  // Dropdown modal component
  const DropdownModal = ({ visible, options, onSelect, onClose, title }) => (
      visible && (
          <View className="absolute left-0 right-0 top-0 bottom-0 bg-black/50 z-50" onTouchStart={onClose}>
            <View
                className={`mx-5 mt-20 rounded-xl ${getCardColor()} shadow-lg overflow-hidden`}
                onTouchStart={(e) => e.stopPropagation()}
            >
              {title && (
                  <View className={`px-4 py-3 border-b ${getBorderColor()}`}>
                    <Text className={`font-bold ${getTextColor()}`}>{title}</Text>
                  </View>
              )}

              {options.map((option, index) => (
                  <TouchableOpacity
                      key={option.value}
                      onPress={() => onSelect(option)}
                      className={`px-4 py-3.5 ${index !== options.length - 1 ? `border-b ${getBorderColor()}` : ''}`}
                  >
                    <View className="flex-row items-center">
                      {option.icon && <View className="mr-3">{option.icon}</View>}
                      <Text className={getTextColor()}>{option.label}</Text>
                    </View>
                  </TouchableOpacity>
              ))}
            </View>
          </View>
      )
  );

  return (
      <View className={`flex-1 ${getBackgroundColor()}`}>
        <ErrorToast />
        <SuccessModal />

        {/* Domain Picker Modal */}
        <DropdownModal
            visible={showDomainPicker}
            title="Select Category"
            options={domains.map(domain => ({
              label: domain.name,
              value: domain.domain_id,
              icon: <Text style={{ fontSize: 20 }}>{domain.icon}</Text>
            }))}
            onSelect={(option) => {
              setHabitData(prev => ({ ...prev, domain_id: option.value }));
              setSelectedDomain(domains.find(d => d.domain_id === option.value));
              setShowDomainPicker(false);
            }}
            onClose={() => setShowDomainPicker(false)}
        />

        {/* Difficulty Picker Modal */}
        <DropdownModal
            visible={showDifficultyPicker}
            title="Select Difficulty"
            options={[
              { label: "Very Easy", value: "VERY_EASY" },
              { label: "Easy", value: "EASY" },
              { label: "Medium", value: "MEDIUM" },
              { label: "Hard", value: "HARD" },
              { label: "Very Hard", value: "VERY_HARD" }
            ]}
            onSelect={(option) => {
              setHabitData(prev => ({ ...prev, difficulty: option.value }));
              setShowDifficultyPicker(false);
            }}
            onClose={() => setShowDifficultyPicker(false)}
        />

        {/* Date Pickers */}
        {renderDatePicker(
            showStartDatePicker,
            habitData.start_date,
            (e, d) => handleDateChange(e, d, "start_date"),
            "date"
        )}

        {renderDatePicker(
            showEndDatePicker,
            habitData.end_date || new Date(),
            (e, d) => handleDateChange(e, d, "end_date"),
            "date"
        )}

        {renderDatePicker(
            showReminderTimePicker,
            reminderTime,
            handleReminderTimeChange,
            "time"
        )}

        {/* Content Area */}
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <ScrollView
              ref={scrollViewRef}
              className="flex-1 px-4"
              contentContainerClassName="pb-20 pt-4"
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="mb-4">
              <Text className={`text-xl font-bold ${getTextColor()}`}>Create New Habit</Text>
              <Text className={getMutedTextColor()}>Set up a habit to track</Text>
            </View>

            {/* Basic Information Section */}
            <Section
                title="Basic Information"
                icon={<Info size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                expanded={expandedSections.basicInfo}
                onToggle={() => toggleSection("basicInfo")}
            >
              <InputField
                  label="Habit Name"
                  value={habitData.name}
                  onChangeText={(text) => handleTextChange(text, "name")}
                  placeholder="What habit do you want to build?"
                  required={true}
              />

              <InputField
                  label="Description"
                  value={habitData.description}
                  onChangeText={(text) => handleTextChange(text, "description")}
                  placeholder="Add some details about this habit"
                  multiline
              />

              <SelectField
                  label="Category"
                  value={selectedDomain?.name}
                  placeholder="Select a category"
                  onPress={() => setShowDomainPicker(true)}
                  required={true}
              />
            </Section>

            {/* Tracking Method Section */}
            <Section
                title="Tracking Method"
                icon={<Check size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                expanded={expandedSections.tracking}
                onToggle={() => toggleSection("tracking")}
            >
              <Text className={`mb-2 ${getSecondaryTextColor()}`}>How would you like to track this habit?</Text>

              <RadioOption
                  label="Simple completion (yes/no)"
                  selected={habitData.tracking_type === "BOOLEAN"}
                  onSelect={() => setHabitData(prev => ({ ...prev, tracking_type: "BOOLEAN" }))}
              />

              <RadioOption
                  label="Duration (time-based)"
                  selected={habitData.tracking_type === "DURATION"}
                  onSelect={() => setHabitData(prev => ({ ...prev, tracking_type: "DURATION" }))}
              />

              <RadioOption
                  label="Count (quantity-based)"
                  selected={habitData.tracking_type === "COUNT"}
                  onSelect={() => setHabitData(prev => ({ ...prev, tracking_type: "COUNT" }))}
              />

              <RadioOption
                  label="Numeric (with units)"
                  selected={habitData.tracking_type === "NUMERIC"}
                  onSelect={() => setHabitData(prev => ({ ...prev, tracking_type: "NUMERIC" }))}
              />

              {habitData.tracking_type === "DURATION" && (
                  <View className="mt-3">
                    <View className="flex-row items-center mb-1.5">
                      <Text className={`font-medium ${getSecondaryTextColor()}`}>Duration Goal</Text>
                      <Text className="text-red-500 ml-1">*</Text>
                    </View>
                    <View className="flex-row">
                      <TextInputFocusable
                          value={habitData.duration_goal?.toString() || ""}
                          onChangeText={(text) => handleTextChange(text.replace(/[^0-9]/g, ""), "duration_goal")}
                          keyboardType="numeric"
                          placeholder="e.g., 30"
                          placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                          className={`flex-1 p-3 rounded-lg mr-2 border ${getBorderColor()} ${getTextColor()} ${getInputBgColor()}`}
                      />
                      <TouchableOpacity
                          className={`${isDark ? "bg-gray-700" : "bg-primary-100"} p-3 rounded-lg`}
                          onPress={() => {
                            setHabitData(prev => ({
                              ...prev,
                              units: prev.units === "minutes" ? "hours" : "minutes"
                            }));
                          }}
                      >
                        <Text className={isDark ? "text-primary-300" : "text-primary-800"} style={{minWidth: 80, textAlign: 'center'}}>
                          {habitData.units || "minutes"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
              )}

              {habitData.tracking_type === "COUNT" && (
                  <View className="mt-3">
                    <InputField
                        label="Count Goal"
                        value={habitData.count_goal?.toString() || ""}
                        onChangeText={(text) => handleTextChange(text.replace(/[^0-9]/g, ""), "count_goal")}
                        placeholder="e.g., 8 glasses of water"
                        keyboardType="numeric"
                        required={true}
                    />
                  </View>
              )}

              {habitData.tracking_type === "NUMERIC" && (
                  <View className="mt-3">
                    <View className="flex-row items-center mb-1.5">
                      <Text className={`font-medium ${getSecondaryTextColor()}`}>Numeric Goal</Text>
                      <Text className="text-red-500 ml-1">*</Text>
                    </View>
                    <View className="flex-row">
                      <TextInputFocusable
                          value={habitData.numeric_goal?.toString() || ""}
                          onChangeText={(text) => handleTextChange(text.replace(/[^0-9.]/g, ""), "numeric_goal")}
                          keyboardType="numeric"
                          placeholder="e.g., 5"
                          placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                          className={`flex-1 p-3 rounded-lg mr-2 border ${getBorderColor()} ${getTextColor()} ${getInputBgColor()}`}
                      />
                      <TextInputFocusable
                          value={habitData.units}
                          onChangeText={(text) => handleTextChange(text, "units")}
                          placeholder="units"
                          placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                          className={`p-3 rounded-lg border ${getBorderColor()} ${getTextColor()} ${getInputBgColor()} w-24`}
                      />
                    </View>
                  </View>
              )}
            </Section>

            {/* Frequency Section */}
            <Section
                title="Frequency"
                icon={<Calendar size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                expanded={expandedSections.frequency}
                onToggle={() => toggleSection("frequency")}
            >
              <Text className={`mb-2 ${getSecondaryTextColor()}`}>How often do you want to do this habit?</Text>

              <RadioOption
                  label="Daily"
                  selected={habitData.frequency_type === "DAILY"}
                  onSelect={() => setHabitData(prev => ({ ...prev, frequency_type: "DAILY" }))}
              />

              <RadioOption
                  label="Weekly (specific days)"
                  selected={habitData.frequency_type === "WEEKLY"}
                  onSelect={() => setHabitData(prev => ({ ...prev, frequency_type: "WEEKLY" }))}
              />

              <RadioOption
                  label="X times per week"
                  selected={habitData.frequency_type === "X_TIMES"}
                  onSelect={() => setHabitData(prev => ({ ...prev, frequency_type: "X_TIMES" }))}
              />

              <RadioOption
                  label="Every X days"
                  selected={habitData.frequency_type === "INTERVAL"}
                  onSelect={() => setHabitData(prev => ({ ...prev, frequency_type: "INTERVAL" }))}
              />

              {habitData.frequency_type === "WEEKLY" && (
                  <View className="mt-3">
                    <View className="flex-row items-center mb-1.5">
                      <Text className={`font-medium ${getSecondaryTextColor()}`}>Select Days</Text>
                      <Text className="text-red-500 ml-1">*</Text>
                    </View>
                    <View className="flex-row justify-between">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                          <TouchableOpacity
                              key={index}
                              onPress={() => toggleDaySelection(index)}
                              className={`w-10 h-10 rounded-full items-center justify-center ${
                                  habitData.specific_days.includes(index)
                                      ? isDark ? "bg-primary-600" : "bg-primary-500"
                                      : `border ${getBorderColor()} ${getInputBgColor()}`
                              }`}
                          >
                            <Text
                                className={
                                  habitData.specific_days.includes(index)
                                      ? "text-white font-bold"
                                      : getTextColor()
                                }
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                      ))}
                    </View>
                  </View>
              )}

              {habitData.frequency_type === "X_TIMES" && (
                  <View className="mt-3">
                    <View className="flex-row items-center mb-1.5">
                      <Text className={`font-medium ${getSecondaryTextColor()}`}>How many times per week?</Text>
                      <Text className="text-red-500 ml-1">*</Text>
                    </View>
                    <View className="flex-row items-center">
                      <TextInputFocusable
                          value={habitData.frequency_value?.toString() || ""}
                          onChangeText={(text) => handleTextChange(text.replace(/[^0-9]/g, ""), "frequency_value")}
                          keyboardType="numeric"
                          placeholder="e.g., 3"
                          placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                          className={`p-3 rounded-lg border w-1/3 ${getBorderColor()} ${getTextColor()} ${getInputBgColor()}`}
                      />
                      <Text className={`ml-3 ${getTextColor()}`}>times per week</Text>
                    </View>
                  </View>
              )}

              {habitData.frequency_type === "INTERVAL" && (
                  <View className="mt-3">
                    <View className="flex-row items-center mb-1.5">
                      <Text className={`font-medium ${getSecondaryTextColor()}`}>Every how many days?</Text>
                      <Text className="text-red-500 ml-1">*</Text>
                    </View>
                    <View className="flex-row items-center">
                      <TextInputFocusable
                          value={habitData.frequency_interval?.toString() || ""}
                          onChangeText={(text) => handleTextChange(text.replace(/[^0-9]/g, ""), "frequency_interval")}
                          keyboardType="numeric"
                          placeholder="e.g., 3"
                          placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                          className={`p-3 rounded-lg border w-1/3 ${getBorderColor()} ${getTextColor()} ${getInputBgColor()}`}
                      />
                      <Text className={`ml-3 ${getTextColor()}`}>days</Text>
                    </View>
                  </View>
              )}
            </Section>

            {/* Schedule Section */}
            <Section
                title="Schedule"
                icon={<Clock size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                expanded={expandedSections.schedule}
                onToggle={() => toggleSection("schedule")}
            >
              <View className="mb-3">
                <Text className={`mb-1.5 font-medium ${getSecondaryTextColor()}`}>Start Date</Text>
                <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setTimeout(() => setShowStartDatePicker(true), 100);
                    }}
                    className={`p-3 rounded-lg flex-row justify-between items-center border ${getBorderColor()} ${getInputBgColor()}`}
                >
                  <View className="flex-row items-center">
                    <Calendar size={16} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-2" />
                    <Text className={getTextColor()}>
                      {habitData.start_date.toDateString()}
                    </Text>
                  </View>
                  <ChevronDown size={16} color={isDark ? "#E2E8F0" : "#4B5563"} />
                </TouchableOpacity>
              </View>

              <View className="mb-2">
                <View className="flex-row justify-between items-center mb-1.5">
                  <Text className={`font-medium ${getSecondaryTextColor()}`}>End Date (Optional)</Text>
                  <Switch
                      value={!!habitData.end_date}
                      onValueChange={(value) => {
                        setHabitData(prev => ({
                          ...prev,
                          end_date: value ? new Date(prev.start_date.getTime() + 30 * 24 * 60 * 60 * 1000) : null
                        }));
                      }}
                      trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                      thumbColor="#FFFFFF"
                  />
                </View>

                {habitData.end_date && (
                    <TouchableOpacity
                        onPress={() => {
                          Keyboard.dismiss();
                          setTimeout(() => setShowEndDatePicker(true), 100);
                        }}
                        className={`p-3 rounded-lg flex-row justify-between items-center border ${getBorderColor()} ${getInputBgColor()}`}
                    >
                      <View className="flex-row items-center">
                        <Calendar size={16} color={isDark ? "#60A5FA" : "#3B82F6"} className="mr-2" />
                        <Text className={getTextColor()}>
                          {habitData.end_date.toDateString()}
                        </Text>
                      </View>
                      <ChevronDown size={16} color={isDark ? "#E2E8F0" : "#4B5563"} />
                    </TouchableOpacity>
                )}
              </View>
            </Section>

            {/* Reminders Section */}
            <Section
                title="Reminders"
                icon={<Bell size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                expanded={expandedSections.reminders}
                onToggle={() => toggleSection("reminders")}
            >
              <Text className={`mb-2 ${getSecondaryTextColor()}`}>Set reminders to help you remember your habit</Text>

              {habitData.reminders.map((reminder, index) => (
                  <View
                      key={index}
                      className={`mb-2 p-3 rounded-lg border ${getBorderColor()} flex-row justify-between items-center ${getInputBgColor()}`}
                  >
                    <View className="flex-row items-center">
                      <Bell size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />
                      <Text className={`ml-2 ${getTextColor()}`}>
                        {formatTime(reminder.time)}
                      </Text>
                    </View>
                    <View className="flex-row">
                      <TouchableOpacity
                          onPress={() => {
                            Keyboard.dismiss();
                            setEditingReminderIndex(index);
                            setReminderTime(new Date(reminder.time));
                            setTimeout(() => setShowReminderTimePicker(true), 100);
                          }}
                          className="mr-2 p-1"
                      >
                        <Text className={getAccentTextColor()}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                          onPress={() => deleteReminder(index)}
                          className="p-1"
                      >
                        <Text className="text-red-500">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
              ))}

              <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setEditingReminderIndex(null);
                    setReminderTime(new Date());
                    setTimeout(() => setShowReminderTimePicker(true), 100);
                  }}
                  className={`flex-row items-center justify-center mt-1 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-primary-50"}`}
              >
                <Plus size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />
                <Text className={`ml-2 ${getAccentTextColor()} font-medium`}>Add Reminder</Text>
              </TouchableOpacity>
            </Section>

            {/* Motivation Section */}
            <Section
                title="Motivation"
                icon={<Star size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                expanded={expandedSections.motivation}
                onToggle={() => toggleSection("motivation")}
            >
              <InputField
                  label="Motivational Quote (Optional)"
                  value={habitData.motivation_quote}
                  onChangeText={(text) => handleTextChange(text, "motivation_quote")}
                  placeholder="Add a quote to keep you motivated"
                  multiline
              />

              <InputField
                  label="Cue (What triggers this habit?)"
                  value={habitData.cue}
                  onChangeText={(text) => handleTextChange(text, "cue")}
                  placeholder="e.g., After brushing teeth in the morning"
              />

              <InputField
                  label="Reward (What will you gain?)"
                  value={habitData.reward}
                  onChangeText={(text) => handleTextChange(text, "reward")}
                  placeholder="e.g., More energy, better health"
              />

              <SelectField
                  label="Difficulty Level"
                  value={
                    habitData.difficulty === "VERY_EASY" ? "Very Easy" :
                        habitData.difficulty === "EASY" ? "Easy" :
                            habitData.difficulty === "MEDIUM" ? "Medium" :
                                habitData.difficulty === "HARD" ? "Hard" :
                                    habitData.difficulty === "VERY_HARD" ? "Very Hard" :
                                        "Medium"
                  }
                  placeholder="Select difficulty"
                  onPress={() => setShowDifficultyPicker(true)}
              />
            </Section>

            {/* Advanced Options Section */}
            <Section
                title="Advanced Options"
                icon={<Tag size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />}
                expanded={expandedSections.advanced}
                onToggle={() => toggleSection("advanced")}
            >
              <View className="mb-3">
                <Text className={`mb-1.5 font-medium ${getSecondaryTextColor()}`}>Tags</Text>

                <View className="flex-row flex-wrap mb-2">
                  {habitData.tags.map((tag, index) => (
                      <TagBadge
                          key={index}
                          text={tag}
                          onRemove={() => removeTag(tag)}
                      />
                  ))}
                </View>

                <View className="flex-row">
                  <TextInputFocusable
                      value={currentTag}
                      onChangeText={setCurrentTag}
                      placeholder="Add a tag"
                      placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                      className={`flex-1 p-3 rounded-lg mr-2 border ${getBorderColor()} ${getTextColor()} ${getInputBgColor()}`}
                      onSubmitEditing={addTag}
                  />
                  <TouchableOpacity
                      onPress={addTag}
                      className={`${getPrimaryColor()} rounded-lg px-4 items-center justify-center`}
                  >
                    <Text className="text-white font-medium">Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className={`p-3 rounded-lg border ${getBorderColor()} mb-2 ${getInputBgColor()}`}>
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Bookmark size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />
                    <Text className={`ml-2 ${getTextColor()}`}>Add to Favorites</Text>
                  </View>
                  <Switch
                      value={habitData.is_favorite}
                      onValueChange={(value) => setHabitData(prev => ({ ...prev, is_favorite: value }))}
                      trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                      thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <View className={`p-3 rounded-lg border ${getBorderColor()} mb-2 ${getInputBgColor()}`}>
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Share size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />
                    <Text className={`ml-2 ${getTextColor()}`}>Make Public</Text>
                  </View>
                  <Switch
                      value={habitData.is_public}
                      onValueChange={(value) => setHabitData(prev => ({ ...prev, is_public: value }))}
                      trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                      thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              <View className={`p-3 rounded-lg border ${getBorderColor()} ${getInputBgColor()}`}>
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Umbrella size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />
                    <Text className={`ml-2 ${getTextColor()}`}>Skip on Vacation</Text>
                  </View>
                  <Switch
                      value={habitData.skip_on_vacation}
                      onValueChange={(value) => setHabitData(prev => ({ ...prev, skip_on_vacation: value }))}
                      trackColor={{ false: isDark ? "#374151" : "#D1D5DB", true: "#3B82F6" }}
                      thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </Section>

            {/* Submit Button */}
            <View className="mt-6 mb-16">
              <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  className={`${getPrimaryColor()} py-4 rounded-xl shadow-sm ${isSubmitting ? 'opacity-70' : ''}`}
                  activeOpacity={0.8}
              >
                {isSubmitting ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white text-center font-bold text-base">Create Habit</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
  );
};

export default AddHabitScreen;