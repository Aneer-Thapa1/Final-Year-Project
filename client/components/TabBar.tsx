import { View, Platform ,StyleSheet } from 'react-native';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { Text, PlatformPressable } from '@react-navigation/elements';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import {Feather} from "@expo/vector-icons";

export function TabBar({ state, descriptors, navigation } : BottomTabBarButtonProps) {
    const { colors } = useTheme();
    const { buildHref } = useLinkBuilder();

    const icon = {
        index:  (props) =>  <Feather name='home'  size={ 24} {...props} />,
        add:  (props) =>  <Feather name='plus'  size={ 24} {...props} />,
        explore:  (props) =>  <Feather name='compass' size={ 24} {...props} />,


    }


    return (
        <View style={styles.tabBar}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
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
                    <PlatformPressable
                        key={route.name}
                        href={buildHref(route.name, route.params)}
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarButtonTestID}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        style={styles.tabBarItems}
                    >
                        {icon[route.name] ({
                             color: isFocused ? colors.primary : colors.text
                        })}
                        <Text style={{ color: isFocused ? colors.primary : colors.text }}>
                            {label}
                        </Text>
                    </PlatformPressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: "absolute",
        flexDirection: 'row',
        bottom : 50,
        alignItems: 'center',
        justifyContent: "space-between",
        marginHorizontal: 80,
        backgroundColor: '#fff',
        borderRadius: 35,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        paddingVertical: 15,
        shadowRadius: 10,
    }, tabBarItems: {
        flex: 1, justifyContent: 'center', alignItems: 'center', gap: 5,
    }

})
