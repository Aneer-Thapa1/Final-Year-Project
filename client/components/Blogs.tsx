import {Image, Text, View} from 'react-native'
import React from 'react'
import images from '../constants/images'
import {Feather} from "@expo/vector-icons";

const Blogs = () => {
    return (
        <View className='bg-white mt-6 rounded-2xl w-[80%] flex flex-col  p-4 gap-6'>
            <View className='flex flex-row gap-4 '>
                <Image source={images.blogImage} className='w-9 h-9 rounded-full'/>
                <Text className='flex text-xl font-medium'>Anir Jung Thapa</Text>
            </View>

            <View className='flex flex-col gap-4'>
                <Text>
                    Embark on your personal growth journey with Habit Pulse. Track habits, celebrate achievements, <Text
                    className='text-gray-500'>... see more</Text>
                </Text>

                <Image source={images.blogImage}/>

                <View className='flex flex-row gap-3'>
                    <Feather name='heart' size={24}  />
                    <Feather name='message-circle' size={24}  />
                </View>
            </View>


        </View>)
}

export default Blogs
