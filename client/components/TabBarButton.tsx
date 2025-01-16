import React from 'react'
import { Text, PlatformPressable } from '@react-navigation/elements';
import { icon } from "@/constants/icons";
import {StyleProp, ViewStyle} from 'react-native';


type TabBarButtonProps = {
    onPress: Function;     // Changed to Function
    onLongPress: Function; // Changed to Function
    isFocused: boolean;
    routeName: string;     // Changed to string
    color: string;         // Already string
    label: string;         // Already string
    style?: StyleProp<ViewStyle>;
}

const TabBarButton = ({
                          onPress,
                          onLongPress,
                          isFocused,
                          routeName,
                          color,
                          label,
                          style
                      }: TabBarButtonProps) => {

    return (
        <PlatformPressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={style}
        >
            {icon[routeName]({
                color: color
            })}
            <Text style={{color: isFocused ? 'red' : 'black'}}>
                {label}
            </Text>
        </PlatformPressable>
    )
}

export default TabBarButton;