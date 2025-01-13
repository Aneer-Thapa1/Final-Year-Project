import {Image, Text, TouchableOpacity, View} from 'react-native'
import React from 'react'
import images from "../constants/images";
import {router} from "expo-router/build/rsc/exports";

const Header = () => {
    return (// main container of header
        <View className='h-22 bg-white flex w-screen flwx-column'>
            {/* name, notification and chatbot icon section */}
            <View className='bg-white p-6 flex flex-row justify-between w-screen'>
                {/* profile and name */}
                <View className='flex flex-row gap-3'>
                    <Image source={images.blogImage} className='w-9 h-9 rounded-full'/>
                    <Text className='text-xl font-medium'>Hi, Anir</Text>
                </View>
                {/* profile and name ends here */}

                {/*chatbot and notifications*/}
                <View className='flex flex-row gap-3'>
                    {/*view for adding number of notification*/}
                    <TouchableOpacity className='flex flex-row gap-3 '  >
                        {/*notification icons*/}
                        <Image source={images.notificationIcon} className='w-7 h-7 rounded-full relative'/>
                        <View className='absolute -top-2 left-4 bg-red-500 rounded-full  w-5 h-5 flex justify-center items-center'>
                            <Text
                                className='text-white font-bold text-xs'>3</Text>
                        </View>
                    </TouchableOpacity>
                    {/*view for adding number of notification ends here */}
                </View>
                {/*chatbot and notifications ends here*/}
            </View>
            {/* name, notification and chatbot icon section ends here*/}
        </View>)
}

export default Header
