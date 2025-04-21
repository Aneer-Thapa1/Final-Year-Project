import React, { useState } from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import NotificationManager from '../../services/NotificationManager';

const NotificationTestScreen = () => {
    const [notificationStatus, setNotificationStatus] = useState('');

    // Function to send a test habit reminder notification
    const sendHabitReminderNotification = async () => {
        try {
            // Request permissions first (if not already requested)
            const token = await NotificationManager.requestPermissions();

            if (token) {
                // Schedule a notification with sound
                await NotificationManager.scheduleNotification(
                    'Habit Reminder',
                    'Time to complete your daily meditation! 🧘‍♀️',
                    5 // Notification will appear in 5 seconds for testing
                );

                setNotificationStatus('Notification sent successfully!');
            } else {
                setNotificationStatus('Failed to get notification permissions.');
            }
        } catch (error) {
            console.error('Error sending notification:', error);
            setNotificationStatus('Error sending notification');
        }
    };

    // Function to send a motivational notification
    const sendMotivationalNotification = async () => {
        try {
            // Request permissions first (if not already requested)
            const token = await NotificationManager.requestPermissions();

            if (token) {
                // Schedule a notification with a motivational message
                await NotificationManager.scheduleNotification(
                    'Stay Motivated! 💪',
                    'You\'ve got this! Keep building those amazing habits.',
                    5 // Notification will appear in 5 seconds for testing
                );

                setNotificationStatus('Motivational notification sent successfully!');
            } else {
                setNotificationStatus('Failed to get notification permissions.');
            }
        } catch (error) {
            console.error('Error sending motivational notification:', error);
            setNotificationStatus('Error sending notification');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Notification Test Screen</Text>

            <Button
                title="Send Habit Reminder Notification"
                onPress={sendHabitReminderNotification}
                color="#15803D" // primary-700 from your theme
            />

            <View style={styles.spacer} />

            <Button
                title="Send Motivational Notification"
                onPress={sendMotivationalNotification}
                color="#166534" // primary-800 from your theme
            />

            {notificationStatus ? (
                <Text style={styles.statusText}>{notificationStatus}</Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#F0FDF4', // primary-50 from your theme
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#15803D', // primary-700 from your theme
        textAlign: 'center',
        marginBottom: 20,
    },
    spacer: {
        height: 20,
    },
    statusText: {
        marginTop: 20,
        color: '#166534', // primary-800 from your theme
        textAlign: 'center',
    },
});

export default NotificationTestScreen;