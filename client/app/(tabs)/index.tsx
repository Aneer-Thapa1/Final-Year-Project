import {View, Text, Image} from 'react-native'
import React from 'react'

const Home = () => {
    // @ts-ignore
    // @ts-ignore
    return (
        <View className='h-screen w-screen flex justify-between items-center'>
            <View className='flex flex-row justify-between w-screen p-4'>
            <Text className='flex justify-center items-center  text-xl'> Suggestions for you </Text>
            <Text className='flex justify-center items-center font-bold text-sm text-blue-800' > VIEW ALL</Text>
            </View>

            <View className='flex flex-row justify-between w-screen p-4 '>
                <View className='flex flex-col gap-4 bg-green-400 h-fit w-fit'>
                    <Text className='font-medium text-3xl'>Title here</Text>
                </View>
            </View>
        </View>
    )
}
export default Home
