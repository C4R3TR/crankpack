import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { colors } from '@/src/theme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: useClientOnlyValue(false, false),
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.cardBorder,
          height: Platform.OS === 'web' ? 64 : 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Power',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'battery.100.bolt', android: 'battery_charging_full', web: 'battery_charging_full' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="environment"
        options={{
          title: 'Environment',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'thermometer.medium', android: 'device_thermostat', web: 'device_thermostat' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="hike"
        options={{
          title: 'Hike',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'figure.hiking', android: 'hiking', web: 'hiking' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="device"
        options={{
          title: 'Device',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
              tintColor={color}
              size={26}
            />
          ),
        }}
      />
    </Tabs>
  );
}
