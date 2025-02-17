import { View, Platform, useColorScheme } from 'react-native';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import TabBarButton from "@/components/TabBarButton";

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors } = useTheme();
    const { buildHref } = useLinkBuilder();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const isIOS = Platform.OS === 'ios';

    return (
        <View className={`
            absolute
            flex-row
            ${isIOS ? 'bottom-12' : 'bottom-8'}
            mx-5
            items-center
            justify-between
            ${isDark ? 'bg-gray-800' : 'bg-white'}
            rounded-[35px]
            py-4
            px-3
        `}
              style={{
                  shadowColor: isDark ? '#000' : colors.primary,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isDark ? 0.3 : 0.1,
                  shadowRadius: 10,
                  elevation: 8
              }}
        >
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
                    <TabBarButton
                        key={route.key}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        isFocused={isFocused}
                        routeName={route.name}
                        color={isFocused ? colors.primary : colors.text}
                        label={label.toString()}
                        style={{
                            overflow: 'hidden',
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 5
                        }}
                    />
                );
            })}
        </View>
    );
}