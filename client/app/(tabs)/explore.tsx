import {Image, TextInput, View} from 'react-native'
import React from 'react'
import icons from '../../constants/images'
import Blogs from "@/components/Blogs";

const Explore = () => {
    return (
        <View className='flex flex-col justify-center items-center '>
            <View className='flex flex-row bg-white mt-6 p-6 w-[95%] gap-4 rounded-2xl items-center'>
                <View className='w-12 h-12 bg-red-500 rounded-full'></View>
                <TextInput className='w-[78%] bg-gray-200 py-2.5 rounded-2xl px-4'
                           placeholder="What’s Your Progress Today?"/>
                <Image source={icons.chatBotIcon} className='w-6 h-6'/>
            </View>

            <View className='overflow-y-scroll h-60vh'>
                <Blogs/>
            </View>

        </View>
    )
}

export default Explore