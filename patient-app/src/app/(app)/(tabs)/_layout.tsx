import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { colors } from '@/lib/theme/tokens';

import { useCart } from '@/features/cart/context/CartContext';

function TabIcon({ icon, focused, badge }: { icon: string; focused: boolean; badge?: number }) {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', height: 26, width: 26, position: 'relative' }}>
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
            {Boolean(badge && badge > 0) && (
                <View
                    style={{
                        position: 'absolute',
                        top: -4,
                        right: -10,
                        backgroundColor: colors.primaryGreen,
                        borderRadius: 10,
                        minWidth: 16,
                        height: 16,
                        paddingHorizontal: 3,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: colors.white,
                    }}
                >
                    <Text style={{ color: colors.white, fontSize: 9, fontWeight: '800' }}>
                        {badge! > 9 ? '9+' : badge}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function TabsLayout() {
    const { cartCount } = useCart();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primaryGreen,
                tabBarInactiveTintColor: colors.mutedForeground,
                tabBarStyle: {
                    backgroundColor: colors.white,
                    borderTopColor: 'rgba(0, 0, 0, 0.06)',
                    borderTopWidth: 1,
                    elevation: 8,
                    height: Platform.OS === 'ios' ? 86 : 64,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
                    paddingTop: 8,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                },
                tabBarItemStyle: {
                    alignItems: 'center',
                    flex: 1,
                    justifyContent: 'center',
                    paddingVertical: 2,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏠" /> }} />
            <Tabs.Screen name="consults" options={{ title: 'Consults', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🩺" /> }} />
            <Tabs.Screen name="scripts" options={{ title: 'Scripts', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="📄" /> }} />
            <Tabs.Screen name="products" options={{ title: 'Products', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🛍️" /> }} />
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Cart',
                    tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🛒" badge={cartCount} />,
                }}
            />
            <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="👤" /> }} />
            <Tabs.Screen name="orders" options={{ href: null, headerShown: false }} />
        </Tabs>
    );
}
