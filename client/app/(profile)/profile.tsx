import {View, Text, Image} from 'react-native'
import React from 'react'
import images from '../../constants/images'
import {useSelector} from 'react-redux';

const Profile = () => {

    const userDetails = useSelector((state) => state.user);

    // @ts-ignore


    return (
        <View className='h-screen w-screen flex flex-col gap-6 items-center'>

            <View className='flex flex-row gap-4 items-center p-4 w-screen bg-white'>
            <Text className=' font-bold'>Back</Text>
            <Text className='text-2xl font-bold'>Profile</Text>
            </View>

            <View className='flex flex-row items-center p-4 w-[95%] bg-primary-500 mx-auto rounded'>
                <Image source={images.maleProfile} className='h-24 w-24' />
                <View className='flex justify-between'>
                    <View>
                    <Text className=' font-medium text-xl'>{userDetails?.user?.user_name}</Text>
                    <Text className=' font-light  '>{userDetails?.user?.points_gained}</Text>
                    </View>

                </View>
            </View>


        </View>
    )
}


export default Profile
