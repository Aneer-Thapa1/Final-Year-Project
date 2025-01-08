import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function Home() {
    const today = format(new Date(), 'EEE, d MMMM yyyy');

    const suggestedTasks = [
        { id: 1, title: 'Task 1', color: '#E0FFE0' },
        { id: 2, title: 'Task 2', color: '#4338CA' },
        { id: 3, title: 'Task 3', color: '#F3E8FF' }
    ];

    const metrics = [
        { id: 1, value: '2' },
        { id: 2, value: '2' },
        { id: 3, value: '2' },
        { id: 4, value: '2' },
        { id: 5, value: '2' }
    ];

    const pendingTasks = [
        { id: 1, title: 'Drink the water', amount: '500/2000 ML' },
        { id: 2, title: 'Drink the water', amount: '500/2000 ML' },
        { id: 3, title: 'Drink the water', amount: '500/2000 ML' },
        { id: 4, title: 'Drink the water', amount: '500/2000 ML' }
    ];

    return (
        <ScrollView className="flex-1 bg-white px-4 pt-8">
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold">Good Morning, Anir</Text>
                <View className="flex-row gap-3">
                    <TouchableOpacity>
                        <Ionicons name="notifications-outline" size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="settings-outline" size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <View className="flex-row justify-between mb-6">
                {suggestedTasks.map(task => (
                    <View
                        key={task.id}
                        style={{ backgroundColor: task.color }}
                        className="w-[30%] h-24 rounded-lg p-3"
                    >
                        <Ionicons name="flame" size={24} />
                        <Text className="mt-2">Title</Text>
                        <Text className="text-sm text-gray-600">Text</Text>
                    </View>
                ))}
            </View>

            <View className="flex-row justify-between border border-dashed border-blue-500 rounded-lg p-4 mb-6">
                {metrics.map(metric => (
                    <View key={metric.id} className="items-center">
                        <Text className="text-xl font-bold">{metric.value}</Text>
                    </View>
                ))}
            </View>

            <Text className="text-lg font-bold mb-4">Pending tasks</Text>
            {pendingTasks.map(task => (
                <View key={task.id} className="flex-row items-center justify-between bg-gray-50 p-4 rounded-lg mb-3">
                    <View className="flex-row items-center gap-3">
                        <Ionicons name="musical-note" size={24} color="#4338CA" />
                        <View>
                            <Text>{task.title}</Text>
                            <Text className="text-sm text-gray-600">{task.amount}</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                        <Image
                            source={require('../../assets/images/logo.png')}
                            className="w-6 h-6 rounded-full"
                        />
                        <TouchableOpacity>
                            <Ionicons name="add" size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Ionicons name="checkmark" size={24} color="green" />
                        </TouchableOpacity>
                    </View>
                </View>
            ))}


        </ScrollView>
    );
}