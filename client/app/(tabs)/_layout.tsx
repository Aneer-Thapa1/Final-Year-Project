import {View, Text} from 'react-native'
import React from 'react'
import {Tabs} from 'expo-router'
import Explore from "@/app/(tabs)/explore";
import {TabBar} from "@/components/TabBar";

const TabsLayout = () => {
    return (
        <View className='flex h-screen w-screen '>
           <Tabs tabBar={props => <TabBar children={undefined} {...props} />} >
               <Tabs.Screen name='index' options={{title: 'Home'}}/>
               <Tabs.Screen name='add' options={{title: 'Add'}}/>
               <Tabs.Screen name='explore' options={{title: 'Explore'}}/>
           </Tabs>
        </View>
    )
}
export default TabsLayout
