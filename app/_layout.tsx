import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { initDatabase } from '../src/db';
import { theme } from '../src/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
      } catch (err) {
        console.error('Failed to initialize database:', err);
      } finally {
        setDbReady(true);
      }
    }
    setup();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: currentTheme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={currentTheme.brand} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: currentTheme.card },
          headerTintColor: currentTheme.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: currentTheme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/welcome" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/permission" options={{ headerShown: false }} />
        <Stack.Screen name="folder/[category]" options={{ title: 'Folder' }} />
        <Stack.Screen name="shot/[id]" options={{ title: 'Screenshot' }} />
        <Stack.Screen name="search" options={{ title: 'Search' }} />
        <Stack.Screen name="vault" options={{ title: 'Private Vault' }} />
        <Stack.Screen name="pro" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="receipts-summary" options={{ title: 'Receipts Summary' }} />
      </Stack>
    </>
  );
}
