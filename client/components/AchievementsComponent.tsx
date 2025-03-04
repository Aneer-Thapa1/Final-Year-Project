import { View, Text, Image } from 'react-native'
import React from 'react'
import { MotiView } from 'moti'
import { Trophy, Zap, BookOpen, Clock, Target } from 'lucide-react-native'

const AchievementsComponent = () => {
    // Static achievement data with badge images
    const achievements = [
        {
            id: '1',
            title: 'Quick Learner',
            description: 'Complete 5 courses in a month',
            icon: Zap,
            progress: 100,
            completed: true,
            points: 100,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/5219/5219398.png' }
        },
        {
            id: '2',
            title: 'JavaScript Ninja',
            description: 'Master advanced JavaScript concepts',
            icon: BookOpen,
            progress: 85,
            completed: false,
            points: 200,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/5968/5968292.png' }
        },
        {
            id: '3',
            title: 'React Pioneer',
            description: 'Build 5 React Native applications',
            icon: Clock,
            progress: 60,
            completed: false,
            points: 250,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/1126/1126012.png' }
        },
        {
            id: '4',
            title: 'UI Maestro',
            description: 'Create 10 stunning UI designs',
            icon: Target,
            progress: 40,
            completed: false,
            points: 300,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/1055/1055666.png' }
        },
        {
            id: '5',
            title: 'Bug Hunter',
            description: 'Fix 20 critical bugs in your projects',
            icon: Target,
            progress: 25,
            completed: false,
            points: 350,
            badgeUrl: { uri: 'https://cdn-icons-png.flaticon.com/512/2535/2535488.png' }
        },
    ]

    return (
        <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
        >
            <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-montserrat-semibold text-gray-800">
                    My Achievements
                </Text>
                <View className="flex-row items-center">
                    <Trophy size={16} color="#4F46E5" />
                    <Text className="ml-1 font-montserrat-medium text-primary-700">
                        3/12 Completed
                    </Text>
                </View>
            </View>

            {achievements.map((achievement) => (
                <MotiView
                    key={achievement.id}
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: parseInt(achievement.id) * 100 }}
                    className={`rounded-xl p-4 shadow-sm mb-4 ${achievement.completed ? 'bg-primary-50' : 'bg-white'}`}
                >
                    <View className="flex-row items-center mb-2">
                        {achievement.badgeUrl ? (
                            <Image
                                source={achievement.badgeUrl}
                                className="h-12 w-12 mr-3"
                                resizeMode="contain"
                            />
                        ) : (
                            <View className={`h-10 w-10 rounded-full items-center justify-center mr-3 ${achievement.completed ? 'bg-primary-100' : 'bg-gray-100'}`}>
                                <achievement.icon size={20} color={achievement.completed ? "#4F46E5" : "#6B7280"} />
                            </View>
                        )}

                        <View className="flex-1">
                            <Text className={`font-montserrat-bold ${achievement.completed ? 'text-primary-700' : 'text-gray-800'}`}>
                                {achievement.title}
                            </Text>
                            <Text className="font-montserrat-regular text-gray-500 text-sm">
                                {achievement.description}
                            </Text>
                        </View>

                        <View className="bg-white px-3 py-1 rounded-full flex-row items-center shadow-sm">
                            <Trophy size={14} color="#4F46E5" className="mr-1" />
                            <Text className="font-montserrat-medium text-primary-700">
                                {achievement.points}
                            </Text>
                        </View>
                    </View>

                    <View className="h-3 bg-gray-200 rounded-full mt-2">
                        <View
                            className="h-3 bg-primary-500 rounded-full"
                            style={{ width: `${achievement.progress}%` }}
                        />

                        {achievement.completed && (
                            <View className="absolute right-0 top-0 bottom-0 flex items-center justify-center px-2">
                                <View className="bg-white rounded-full p-0.5">
                                    <View className="h-4 w-4 rounded-full bg-green-500 items-center justify-center">
                                        <Trophy size={10} color="#FFFFFF" />
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    <Text className="text-right font-montserrat-medium text-xs mt-1 text-gray-500">
                        {achievement.progress}%
                    </Text>
                </MotiView>
            ))}
        </MotiView>
    )
}

export default AchievementsComponent