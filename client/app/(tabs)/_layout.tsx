import {View, Text, Image} from 'react-native'
import React from 'react'
import {Tabs} from "expo-router";
import Home from "@/app/(tabs)/home";


const TabIcon = ({focused, icon, title } : {focused:boolean ; icon: any; title: string}) => (
    <View>
        <Image source={icon}/>
    </View>
)


const TabsLayout = () => {
    return (
        <Tabs
        screenOptions={{tabBarShowLabel: false, tabBarStyle:{
        backgroundColor: `white`,position: 'absolute', borderTopColor: '#0061FF1A', borderTopWidth:1,minHeight:70,

        }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarIcon: () => (
                        <View></View>
                    )
                }}
            />
        </Tabs>
    )
}
export default TabsLayout
