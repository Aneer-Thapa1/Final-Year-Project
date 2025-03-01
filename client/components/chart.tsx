import React from 'react';
import { View, useColorScheme, Text } from 'react-native';
import { LineChart, BarChart } from 'recharts';

interface WeeklyData {
    name: string;
    value: number;
}

interface ChartProps {
    data: WeeklyData[];
}

export const WeeklyProgressChart: React.FC<ChartProps> = ({ data }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={{ height: 200 }}>
            <LineChart
                data={data}
                width={350}
                height={200}
                margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <XAxis
                    dataKey="name"
                    tick={{ fill: isDark ? '#E2E8F0' : '#374151' }}
                />
                <YAxis
                    tick={{ fill: isDark ? '#E2E8F0' : '#374151' }}
                    domain={[0, 100]}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: isDark ? '#1F2937' : 'white',
                        borderColor: isDark ? '#374151' : '#E5E7EB',
                    }}
                    labelStyle={{
                        color: isDark ? '#E2E8F0' : '#374151',
                    }}
                />
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{
                        fill: '#3B82F6',
                        stroke: '#3B82F6',
                        strokeWidth: 2,
                    }}
                />
            </LineChart>
        </View>
    );
};

export const MonthlyComparisonChart: React.FC<ChartProps> = ({ data }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={{ height: 200 }}>
            <BarChart
                data={data}
                width={350}
                height={200}
                margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <XAxis
                    dataKey="name"
                    tick={{ fill: isDark ? '#E2E8F0' : '#374151' }}
                />
                <YAxis
                    tick={{ fill: isDark ? '#E2E8F0' : '#374151' }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: isDark ? '#1F2937' : 'white',
                        borderColor: isDark ? '#374151' : '#E5E7EB',
                    }}
                    labelStyle={{
                        color: isDark ? '#E2E8F0' : '#374151',
                    }}
                />
                <Bar
                    dataKey="completed"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                />
                <Bar
                    dataKey="total"
                    fill="#93C5FD"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </View>
    );
};