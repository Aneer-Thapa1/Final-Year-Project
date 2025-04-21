// src/services/NotificationManager.js
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Tell Expo how to handle incoming notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,   // Show a visible alert
        shouldPlaySound: true,   // Play a sound
        shouldSetBadge: false,   // Don't add a badge number on iOS
    }),
});

class NotificationManager {
    // Method to request permission to send notifications
    static async requestPermissions() {
        // Check if running on a real device
        if (!Device.isDevice) {
            alert('Push notifications need a physical device');
            return null;
        }

        // Check if we already have permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // If we don't have permission, ask for it
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // If permission was denied, alert the user
        if (finalStatus !== 'granted') {
            alert('Failed to get push notification permissions!');
            return null;
        }

        // Create a notification channel (Android only)
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.HIGH,
            });
        }

        // Get the device's push token (unique identifier)
        try {
            // Get Expo project ID
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ??
                Constants?.easConfig?.projectId;

            if (!projectId) {
                throw new Error('Project ID not found');
            }

            // Get the push token
            const pushToken = await Notifications.getExpoPushTokenAsync({
                projectId,
            });

            return pushToken.data;
        } catch (error) {
            console.error('Error getting push token:', error);
            return null;
        }
    }

    // Method to schedule a local notification
    static async scheduleNotification(title, body, seconds = 5) {
        return await Notifications.scheduleNotificationAsync({
            content: {
                title: title,      // Notification title
                body: body,        // Notification message
            },
            trigger: {
                seconds: seconds,  // How many seconds to wait before showing
            },
        });
    }
}

export default NotificationManager;