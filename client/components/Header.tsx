import {View, Text, Image} from 'react-native'
import React from 'react'
import {Feather} from "@expo/vector-icons";
import icons from '../constants/images'

const Header = () => {
    return (
        <View className='h-22 bg-white flex w-screen flwx-column'>
            <View className='flex  items-center w-screen flex-row justify-between px-4 '>
                <Feather name='menu' size={24}  />
                <Image source={icons.chatBotIcon} style={{ height: 24, width: 24 }} />
            </View>
            <View className="p-5 items-center">
                <Text className="text-lg italic text-center">
                    "Act as if what you do makes a difference. It does."
                </Text>
                <Text className="text-base font-bold mt-2">
                    - William James
                </Text>
            </View>
        </View>
    )
}

export default Header
