import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    SafeAreaView
} from 'react-native';
import { Camera, CheckCircle, Search, UserPlus, Users, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CreateGroupModal = ({
                              visible,
                              onClose,
                              friends = [],
                              onCreateGroup,
                              loading = false
                          }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    // Group form state
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupImage, setGroupImage] = useState(null);
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Refs
    const nameInputRef = useRef(null);
    const scrollViewRef = useRef(null);

    // Theme colors based on your Tailwind config
    const colors = {
        // Primary - Sage Green
        primary: isDark ? '#4ADE80' : '#22C55E',
        primaryLight: isDark ? '#86EFAC' : '#4ADE80',
        primaryDark: isDark ? '#16A34A' : '#15803D',
        primaryBg: isDark ? 'rgba(74, 222, 128, 0.1)' : 'rgba(34, 197, 94, 0.05)',

        // Secondary - Deep Purple
        secondary: isDark ? '#A78BFA' : '#8B5CF6',
        secondaryLight: isDark ? '#C4B5FD' : '#A78BFA',
        secondaryDark: isDark ? '#7C3AED' : '#6D28D9',

        // Background
        background: isDark ? '#0F172A' : '#FFFFFF',
        card: isDark ? '#1E293B' : '#F8FAFC',
        surface: isDark ? '#334155' : '#FFFFFF',
        input: isDark ? '#475569' : '#F1F5F9',

        // Text
        textPrimary: isDark ? '#F8FAFC' : '#0F172A',
        textSecondary: isDark ? '#E2E8F0' : '#334155',
        textMuted: isDark ? '#94A3B8' : '#64748B',

        // Border
        border: isDark ? '#475569' : '#E2E8F0',

        // Success color for online status
        success: isDark ? '#4ADE80' : '#22C55E'
    };

    // Reset form when modal opens
    useEffect(() => {
        if (visible) {
            setGroupName('');
            setGroupDescription('');
            setGroupImage(null);
            setSelectedFriends([]);
            setSearchQuery('');

            // Focus on name input after a brief delay
            setTimeout(() => {
                if (nameInputRef.current) {
                    nameInputRef.current.focus();
                }
            }, 300);
        }
    }, [visible]);

    // Filter friends based on search
    const filteredFriends = friends.filter(friend => {
        if (!searchQuery) return true;
        return friend.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Handle selecting/deselecting a friend
    const toggleFriendSelection = (friend) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFriends(prevSelected => {
            const isSelected = prevSelected.some(f => f.user_id === friend.user_id);
            if (isSelected) {
                return prevSelected.filter(f => f.user_id !== friend.user_id);
            } else {
                return [...prevSelected, friend];
            }
        });
    };

    // Pick image from gallery
    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert("Permission Required", "You need to allow access to your photos to set a group image.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setGroupImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert("Error", "Could not select image. Please try again.");
        }
    };

    // Validate and submit
    const handleCreateGroup = () => {
        // Validate inputs
        if (!groupName.trim()) {
            Alert.alert("Required Field", "Please enter a group name.");
            return;
        }

        if (selectedFriends.length === 0) {
            Alert.alert("Required Field", "Please select at least one friend for the group.");
            return;
        }

        // Create group data
        const groupData = {
            name: groupName.trim(),
            description: groupDescription.trim(),
            participants: selectedFriends.map(friend => friend.user_id),
            avatar: groupImage
        };

        // Call the provided callback
        onCreateGroup(groupData);
    };

    // Clean close (no confirmation if no changes)
    const handleClose = () => {
        if (groupName || groupDescription || selectedFriends.length > 0 || groupImage) {
            Alert.alert(
                "Discard Changes?",
                "You have unsaved changes. Are you sure you want to discard them?",
                [
                    { text: "Continue Editing", style: "cancel" },
                    { text: "Discard", style: "destructive", onPress: onClose }
                ]
            );
        } else {
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleClose}
        >
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <SafeAreaView style={{ flex: 1 }}>
                    {/* Header */}
                    <View
                        style={{
                            paddingVertical: 16,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: colors.card,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: 1,
                            },
                            shadowOpacity: 0.1,
                            shadowRadius: 1.41,
                            elevation: 2,
                        }}
                    >
                        <TouchableOpacity
                            onPress={handleClose}
                            style={{
                                padding: 8,
                                borderRadius: 8,
                                backgroundColor: isDark ? colors.surface : '#f3f4f6',
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <X size={22} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <Text
                            style={{
                                fontSize: 18,
                                fontWeight: 'bold',
                                fontFamily: 'montserrat-bold',
                                color: colors.textPrimary,
                            }}
                        >
                            Create New Group
                        </Text>

                        <TouchableOpacity
                            onPress={handleCreateGroup}
                            disabled={loading}
                            style={{
                                padding: 8,
                                borderRadius: 8,
                                backgroundColor: colors.primary,
                                opacity: loading ? 0.5 : 1,
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text
                                    style={{
                                        fontWeight: '600',
                                        fontFamily: 'montserrat-semibold',
                                        color: '#ffffff',
                                    }}
                                >
                                    Create
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                    >
                        <ScrollView
                            ref={scrollViewRef}
                            style={{ flex: 1 }}
                            contentContainerStyle={{ padding: 16 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Group Image */}
                            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <TouchableOpacity
                                    onPress={pickImage}
                                    style={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: 50,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isDark ? colors.surface : colors.input,
                                        shadowColor: "#000",
                                        shadowOffset: {
                                            width: 0,
                                            height: 2,
                                        },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 3.84,
                                        elevation: 5,
                                    }}
                                >
                                    {groupImage ? (
                                        <Image
                                            source={{ uri: groupImage }}
                                            style={{
                                                width: 100,
                                                height: 100,
                                                borderRadius: 50,
                                            }}
                                        />
                                    ) : (
                                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                            <Camera size={32} color={colors.textMuted} />
                                            <Text
                                                style={{
                                                    marginTop: 6,
                                                    fontSize: 12,
                                                    fontFamily: 'montserrat',
                                                    color: colors.textMuted,
                                                }}
                                            >
                                                Add photo
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Group Name */}
                            <View style={{ marginBottom: 16 }}>
                                <Text
                                    style={{
                                        marginBottom: 8,
                                        fontFamily: 'montserrat-medium',
                                        fontSize: 15,
                                        color: colors.textPrimary,
                                    }}
                                >
                                    Group Name*
                                </Text>
                                <TextInput
                                    ref={nameInputRef}
                                    style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        fontFamily: 'montserrat',
                                        fontSize: 15,
                                        color: colors.textPrimary,
                                    }}
                                    placeholder="Enter group name"
                                    placeholderTextColor={colors.textMuted}
                                    value={groupName}
                                    onChangeText={setGroupName}
                                    maxLength={50}
                                />
                            </View>

                            {/* Group Description */}
                            <View style={{ marginBottom: 24 }}>
                                <Text
                                    style={{
                                        marginBottom: 8,
                                        fontFamily: 'montserrat-medium',
                                        fontSize: 15,
                                        color: colors.textPrimary,
                                    }}
                                >
                                    Description (Optional)
                                </Text>
                                <TextInput
                                    style={{
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        fontFamily: 'montserrat',
                                        fontSize: 15,
                                        minHeight: 80,
                                        textAlignVertical: 'top',
                                        color: colors.textPrimary,
                                    }}
                                    placeholder="What's this group about?"
                                    placeholderTextColor={colors.textMuted}
                                    value={groupDescription}
                                    onChangeText={setGroupDescription}
                                    multiline
                                    numberOfLines={3}
                                    maxLength={200}
                                />
                            </View>

                            {/* Member Selection */}
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text
                                        style={{
                                            fontFamily: 'montserrat-medium',
                                            fontSize: 15,
                                            color: colors.textPrimary,
                                        }}
                                    >
                                        Add Members*
                                    </Text>

                                    {selectedFriends.length > 0 && (
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontFamily: 'montserrat-medium',
                                                color: colors.primary,
                                            }}
                                        >
                                            {selectedFriends.length} selected
                                        </Text>
                                    )}
                                </View>

                                {/* Selected Members */}
                                {selectedFriends.length > 0 && (
                                    <View style={{ marginBottom: 16 }}>
                                        <ScrollView
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            style={{ flexDirection: 'row', marginBottom: 16 }}
                                            contentContainerStyle={{ paddingRight: 8 }}
                                        >
                                            {selectedFriends.map((friend) => (
                                                <Pressable
                                                    key={friend.user_id}
                                                    onPress={() => toggleFriendSelection(friend)}
                                                    style={{ alignItems: 'center', marginRight: 16 }}
                                                >
                                                    <View style={{ position: 'relative' }}>
                                                        <Image
                                                            source={{
                                                                uri: friend.avatar ||
                                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.user_name || 'User')}`
                                                            }}
                                                            style={{
                                                                height: 56,
                                                                width: 56,
                                                                borderRadius: 28,
                                                                borderWidth: 2,
                                                                borderColor: colors.primary,
                                                            }}
                                                        />
                                                        <View
                                                            style={{
                                                                position: 'absolute',
                                                                bottom: -5,
                                                                right: -5,
                                                                backgroundColor: colors.primary,
                                                                borderRadius: 12,
                                                                padding: 4,
                                                                borderWidth: 2,
                                                                borderColor: colors.background,
                                                            }}
                                                        >
                                                            <X size={12} color="white" />
                                                        </View>
                                                    </View>
                                                    <Text
                                                        style={{
                                                            marginTop: 6,
                                                            fontSize: 12,
                                                            fontFamily: 'montserrat',
                                                            textAlign: 'center',
                                                            color: colors.textSecondary,
                                                            width: 60,
                                                        }}
                                                        numberOfLines={1}
                                                    >
                                                        {friend.user_name}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Search Friends */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 12,
                                        paddingVertical: 10,
                                        marginBottom: 12,
                                        borderRadius: 12,
                                        backgroundColor: colors.surface,
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <Search size={18} color={colors.textMuted} />
                                    <TextInput
                                        style={{
                                            flex: 1,
                                            marginLeft: 8,
                                            fontFamily: 'montserrat',
                                            fontSize: 15,
                                            color: colors.textPrimary,
                                        }}
                                        placeholder="Search friends..."
                                        placeholderTextColor={colors.textMuted}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                </View>

                                {/* Friends List */}
                                <View
                                    style={{
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                    }}
                                >
                                    {filteredFriends.length === 0 ? (
                                        <View
                                            style={{
                                                padding: 20,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: colors.surface,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontFamily: 'montserrat',
                                                    fontSize: 14,
                                                    color: colors.textMuted,
                                                }}
                                            >
                                                {searchQuery ? 'No friends match your search' : 'No friends available'}
                                            </Text>
                                        </View>
                                    ) : (
                                        filteredFriends.map((friend, index) => {
                                            const isSelected = selectedFriends.some(f => f.user_id === friend.user_id);
                                            return (
                                                <TouchableOpacity
                                                    key={friend.user_id}
                                                    onPress={() => toggleFriendSelection(friend)}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        paddingVertical: 12,
                                                        paddingHorizontal: 16,
                                                        borderBottomWidth: index < filteredFriends.length - 1 ? 1 : 0,
                                                        borderBottomColor: colors.border,
                                                        backgroundColor: isSelected
                                                            ? colors.primaryBg
                                                            : colors.surface,
                                                    }}
                                                >
                                                    <Image
                                                        source={{
                                                            uri: friend.avatar ||
                                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.user_name || 'User')}`
                                                        }}
                                                        style={{
                                                            height: 40,
                                                            width: 40,
                                                            borderRadius: 20,
                                                        }}
                                                    />
                                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                                        <Text
                                                            style={{
                                                                fontFamily: 'montserrat-medium',
                                                                fontSize: 15,
                                                                color: colors.textPrimary,
                                                            }}
                                                        >
                                                            {friend.user_name}
                                                        </Text>
                                                        <Text
                                                            style={{
                                                                fontSize: 12,
                                                                fontFamily: 'montserrat',
                                                                color: friend.isOnline || isRecentlyActive(friend.lastActive)
                                                                    ? colors.success
                                                                    : colors.textMuted,
                                                            }}
                                                        >
                                                            {friend.isOnline || isRecentlyActive(friend.lastActive) ? 'Online' : 'Offline'}
                                                        </Text>
                                                    </View>
                                                    {isSelected ? (
                                                        <CheckCircle size={22} color={colors.primary} />
                                                    ) : (
                                                        <UserPlus size={20} color={colors.textMuted} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>

                    {/* Bottom Action Buttons */}
                    <View
                        style={{
                            padding: 16,
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                            backgroundColor: colors.card,
                            paddingBottom: Math.max(16, insets.bottom),
                        }}
                    >
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={{
                                    flex: 1,
                                    marginRight: 8,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: 'montserrat-semibold',
                                        fontSize: 15,
                                        color: colors.textSecondary,
                                    }}
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleCreateGroup}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    marginLeft: 8,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: loading ? colors.primaryLight : colors.primary,
                                }}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Users size={18} color="white" />
                                        <Text
                                            style={{
                                                marginLeft: 8,
                                                color: 'white',
                                                fontFamily: 'montserrat-semibold',
                                                fontSize: 15,
                                            }}
                                        >
                                            Create Group
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

// Helper function to check if a user was recently active
function isRecentlyActive(lastActive) {
    if (!lastActive) return false;

    const lastActiveTime = new Date(lastActive).getTime();
    const now = new Date().getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    return now - lastActiveTime < fifteenMinutes;
}

export default CreateGroupModal;