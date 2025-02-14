import {View, Text} from 'react-native'
import React from 'react'
import {Link} from "expo-router";

const Index = () => {
    return (
        <View className=' mt-32 '>
            <Link href='/login'>Login Now</Link>
            <Link href='/explore'>Explore Now</Link>
        </View>
    )
}

export default Index
