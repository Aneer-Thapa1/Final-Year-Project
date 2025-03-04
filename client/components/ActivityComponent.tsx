import { View, Text, Image } from 'react-native'
import React from 'react'
import { MotiView } from 'moti'
import { Calendar, Star, Book, Award } from 'lucide-react-native'

const ActivityComponent = () => {
    // Static activity data
    const activities = [
        {
            id: '1',
            type: 'course_completed',
            title: 'Completed Intro to React Native',
            icon: Book,
            points: 50,
            date: '2 days ago',
        },
        {
            id: '2',
            type: 'streak',
            title: 'Maintained a 7-day streak',
            icon: Calendar,
            points: 25,
            date: '4 days ago',
        },
        {
            id: '3',
            type: 'badge',
            title: 'Earned Code Master Badge',
            icon: Award,
            points: 75,
            date: '1 week ago',
        },
        {
            id: '4',
            type: 'quiz',
            title: 'Aced JavaScript Fundamentals Quiz',
            icon: Star,
            points: 30,
            date: '2 weeks ago',
        },
    ]

    return (
        <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
        >
            <Text className="text-lg font-montserrat-semibold text-gray-800 mb-2">
                Recent Activity
            </Text>

            {activities.map((activity) => (
                <View
                    key={activity.id}
                    className="bg-white rounded-xl p-4 shadow-sm flex-row items-center"
                >
                    <View className="h-10 w-10 rounded-full bg-primary-100 items-center justify-center mr-3">
                        <activity.icon size={20} color="#4F46E5" />
                    </View>

                    <View className="flex-1">
                        <Text className="font-montserrat-medium text-gray-800">
                            {activity.title}
                        </Text>
                        <Text className="font-montserrat-regular text-gray-500 text-sm">
                            {activity.date}
                        </Text>
                    </View>

                    <View className="bg-primary-50 px-3 py-1 rounded-full flex-row items-center">
                        <Star size={14} color="#4F46E5" className="mr-1" />
                        <Text className="font-montserrat-medium text-primary-700">
                            +{activity.points}
                        </Text>
                    </View>
                </View>
            ))}
        </MotiView>
    )
}

export default ActivityComponent