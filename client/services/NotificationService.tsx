import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handling
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export interface PushNotificationSettings {
    habitId: string;
    time: Date;
    message: string;
}

class NotificationService {
    // Request permissions for sending notifications
    async requestPermissions(): Promise<boolean> {
        if (!Device.isDevice) {
            alert('Must use physical device for push notifications');
            return false;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // If no existing permission, ask for it
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // Failed to get permissions
        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return false;
        }

        return true;
    }

    // Get the push token for the device
    async getPushToken(): Promise<string | null> {
        try {
            const token = await Notifications.getExpoPushTokenAsync({
                projectId: 'YOUR_PROJECT_ID', // Replace with your Expo project ID
            });
            return token.data;
        } catch (error) {
            console.error('Error getting push token', error);
            return null;
        }
    }

    // Schedule a notification for a specific habit
    async scheduleHabitReminder(settings: PushNotificationSettings) {
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "HabitPulse Reminder 🏆",
                    body: settings.message,
                    data: { habitId: settings.habitId },
                },
                trigger: {
                    date: settings.time,
                },
            });
        } catch (error) {
            console.error('Error scheduling notification', error);
        }
    }

    // Cancel a specific notification by habit ID
    async cancelHabitNotification(habitId: string) {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const notificationToCancel = scheduledNotifications.find(
            notification => notification.content.data.habitId === habitId
        );

        if (notificationToCancel) {
            await Notifications.cancelScheduledNotificationAsync(notificationToCancel.identifier);
        }
    }

    // Handle notification interactions
    setupNotificationListeners() {
        // Fired when a notification is received while the app is foregrounded
        Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
            // You can add custom handling here
        });

        // Fired when user taps on a notification
        Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification tapped:', response);
            const habitId = response.notification.request.content.data.habitId;
            // Handle navigation or action based on the habit
        });
    }
}

export default new NotificationService();