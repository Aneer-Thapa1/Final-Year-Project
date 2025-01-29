import {View, Text, Image} from 'react-native'
import React from 'react'
import AsyncStorage from "@react-native-async-storage/async-storage";

const Home = () => {
    // @ts-ignore
    // @ts-ignore


    const user = AsyncStorage.getItem('user');
    return (
        <View className='h-screen w-screen flex justify-between items-center'>
            <View className='flex flex-row justify-between w-screen p-4'>
                <Text className='flex justify-center items-center  text-xl'> Suggestions for you </Text>
                <Text className='flex justify-center items-center font-bold text-sm text-blue-800' > VIEW ALL</Text>
            </View>

                <Text>{JSON.stringify(user)}</Text>

        </View>
    )
}
export default Home
