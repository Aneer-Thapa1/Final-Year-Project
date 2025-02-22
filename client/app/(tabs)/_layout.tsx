import { useColorScheme } from 'react-native';
import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from "@/components/TabBar";
import Header from "@/components/Header";

const TabsLayout = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <>
            <Header />
            <Tabs tabBar={props => <TabBar {...props} options={{ headerShown: false }} />}>
                <Tabs.Screen name='index' options={{ title: 'Home', headerShown: false }} />
                <Tabs.Screen name='explore' options={{ title: 'Explore', headerShown: false }} />
                <Tabs.Screen name='add' options={{ title: 'Add', headerShown: false }} />
                <Tabs.Screen name='analytics' options={{ title: 'Analytics', headerShown: false }} />
                <Tabs.Screen name='rank' options={{ title: 'Rank', headerShown: false }} />
            </Tabs>
        </>
    );
};

export default TabsLayout;
