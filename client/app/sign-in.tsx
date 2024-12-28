import {View, Text, SafeAreaView, ScrollView, Image} from 'react-native'
import React from 'react'

import images from '@/constants/images'

const SignIn = () => {
    return (
       <SafeAreaView className='bg-white h-full'>
<ScrollView contentContainerClassName='h-full'>
    <Image source={images.icon} className='w-full h-4/6' resizeMode='contain' />
<View className='px-10 flex items-center justify-between w-full gap-3'>
    <Text className='text-base text-center'>

Welcome to habit pulse
    </Text>

    <Text className='text-2xl font-montserrat-extrabold text-center'>let's get you closer to {'\n'}

    <Text className='text-2xl font-montserrat-extrabold text-primary-500 text-center mt-2 text-center'>
        Build Your Best Self
    </Text>
    </Text>

</View>
</ScrollView>
       </SafeAreaView>
    )
}
export default SignIn
