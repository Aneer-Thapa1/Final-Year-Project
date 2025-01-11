import {View, Text} from 'react-native'
import React from 'react'

const Header = () => {
    return (
        <View className='h-20 bg-white flex w-screen flwx-column'>
            <View className='flex bg-red-500 items-center w-screen flex-row justify-around '>
                <Text >Menu Icon here </Text>
                <Text >Chatbot Icon here </Text>
            </View>
            <View className=''></View>
        </View>
    )
}
export default Header
