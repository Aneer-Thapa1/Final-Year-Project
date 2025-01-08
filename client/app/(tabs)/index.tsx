import {Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {Link} from "expo-router";
import images from "@/constants/images";
import React from "react";

export default function Index() {
  return (
    <View>
        <SafeAreaView className='bg-white h-full'>
            <ScrollView contentContainerClassName='h-full'>
                <Image source={images.onBoarding} className='w-full h-4/6' resizeMode='contain' />
                <View className='px-10 flex items-center justify-between w-full gap-4'>
                    <Text className='text-base text-center'>
                        Welcome to habit pulse
                    </Text>

                    <Text className='text-2xl font-montserrat-extrabold text-center'>let's get you closer to {'\n'}

                        <Text className='text-2xl font-montserrat-extrabold text-primary-500 text-center mt-2 text-center'>
                            Build Your Best Self
                        </Text>
                    </Text>

                    <TouchableOpacity className='w-full bg-primary-500 py-3 px-2 flex h-12 justify-center items-center flex-row rounded-bl '>
                         <Text className='text-white'>  <Link href='/sign-in'>Sign In</Link> </Text>
                    </TouchableOpacity>


                    {/*<Link href='/profile'>Profile</Link>*/}
                    {/*<Link href='/explore'>Explore</Link>*/}

                </View>
            </ScrollView>
        </SafeAreaView>


    </View>
  );
}
