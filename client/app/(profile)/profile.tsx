import {Image, Text, View} from 'react-native'
import React from 'react'
import images from '../../constants/images'
import {useSelector} from 'react-redux';

const Profile = () => {

    const userDetails = useSelector((state) => state.user);

    // @ts-ignore


    return (<View className='h-screen w-screen flex flex-col gap-6 items-center'>

        <View className='flex flex-row gap-4 items-center p-4 w-screen bg-white'>
            <Text className=' font-bold'>Back</Text>
            <Text className='text-2xl font-bold'>Profile</Text>
        </View>
        <View className='flex flex-col  p-4 w-[95%] bg-primary-200 mx-auto rounded-lg '>
            <View className='flex flex-row items-center'>
                <Image source={images.maleProfile} className='h-24 w-24'/>
                <View className='flex justify-between'>
                    <View className='flex flex-col gap-2'>
                        <Text className=' font-medium text-xl'>{userDetails?.user?.user_name}</Text>
                        <View className='flex flex-row gap-2 bg-secondary-400 rounded-md w-full h-fit '>
                            <Image source={images.maleProfile} className='h-6 w-6'/>
                            <Text className='font-light'>{userDetails?.user?.points_gained}</Text>
                        </View>
                    </View>
                    {/*    add settings or edit icon here*/}
                </View>
            </View>
            {/* options to view various info of profile*/}
            <View className='flex justify-between items-center bg-white h-9 w-[99%] rounded-3xl '>
                <View className='flex flex-row justify-between items-center h-full px-3  w-full'>
                    <Text className=' font-montserrat-light text-x text-center '>
                        Activity
                    </Text>
                    <Text className=' font-montserrat-light text-x text-center bg-primary-200 px-8 rounded-3xl'>
                        Achievements
                    </Text>
                    <Text className=' font-montserrat-light text-x text-center '>
                        Friends
                    </Text>
                </View>

            </View>
        </View>

        <View className='flex flex-row gap-4'>

        </View>
    </View>)
}


export default Profile
