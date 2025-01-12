import {View, Text} from 'react-native'
import React from 'react'
import {Link} from "expo-router";


const AppLayout = () => {
    return (
        <View>
            <Link href='/login'>Login Now</Link>
            <Link href='/explore'>Explore Now</Link>
        </View>
    )
}

export default AppLayout
