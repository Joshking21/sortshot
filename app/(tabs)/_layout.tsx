import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, Text } from 'react-native';
import { theme } from '../../src/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  let symbol = '📱';
  if (label === 'Home') symbol = '🏠';
  if (label === 'Clean') symbol = '🧹';
  if (label === 'Settings') symbol = '⚙️';

  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>
      {symbol}
    </Text>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: currentTheme.card },
        headerTintColor: currentTheme.ink,
        tabBarStyle: {
          backgroundColor: currentTheme.tabBarBg,
          borderTopColor: currentTheme.line,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: currentTheme.brand,
        tabBarInactiveTintColor: currentTheme.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Sortshot',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clean"
        options={{
          title: 'Clean',
          headerTitle: 'Clean Up',
          tabBarIcon: ({ focused }) => <TabIcon label="Clean" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
