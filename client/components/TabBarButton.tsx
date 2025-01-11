import React from 'react'
import { Text, PlatformPressable } from '@react-navigation/elements';
import { icon } from "@/constants/icons";
import { StyleProp, ViewStyle } from 'react-native';


type TabBarButtonProps = {
    onPress: Function;
    onLongPress: Function;
    isFocused: boolean;
    routeName: string;
    color: string;
    label: string;

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
            <Text style={{color: isFocused ? 'blue' : 'black'}}>
                {label}
            </Text>
        </PlatformPressable>
    )
}

export default TabBarButton;