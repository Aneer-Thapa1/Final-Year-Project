import {View, Platform, StyleSheet} from 'react-native';
import {useLinkBuilder, useTheme} from '@react-navigation/native';

import { BottomTabBarProps} from '@react-navigation/bottom-tabs';

import TabBarButton from "@/components/TabBarButton";

export function TabBar({state, descriptors, navigation}: BottomTabBarProps) {
    const {colors} = useTheme();
    const {buildHref} = useLinkBuilder();


    return (
        <View style={styles.tabBar}>
            {state.routes.map((route, index) => {
                const {options} = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({
                        type: 'tabLongPress',
                        target: route.key,
                    });
                };

                return (
                    <TabBarButton
                        key={route.key}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        isFocused={isFocused}
                        routeName={route.name}
                        color={isFocused ? colors.primary : colors.text}
                        label={label}
                        style={styles.tabBarItems}
                    />
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        flexDirection: 'row',
        bottom: 50,
        alignItems: 'center',
        justifyContent: "space-between",
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 35,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.1,
        paddingVertical: 15,
        shadowRadius: 10,
    }, tabBarItems: {
        overflow: 'hidden',
        flex: 1, justifyContent: 'center', alignItems: 'center', gap: 5,
    }

})
