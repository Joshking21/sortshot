import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, AppStateStatus, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { initDatabase } from '../src/db';
import { theme } from '../src/theme';
import { initPurchases } from '../src/pro/pro';
import { initGoogleAds } from '../src/ads/ads';
import { useAppLockStore } from '../src/vault/appLock';
import { Button } from '../src/ui';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;
  const [initReady, setInitReady] = useState(false);

  const { isAppLockEnabled, isSessionUnlocked, initAppLock, promptUnlock } = useAppLockStore();

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        await initPurchases();
        await initGoogleAds();
        await initAppLock();
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setInitReady(true);
      }
    }
    setup();

    // App lock lifecycle listener
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        const store = useAppLockStore.getState();
        if (store.isAppLockEnabled) {
          store.setSessionUnlocked(false);
        }
      } else if (nextState === 'active') {
        const store = useAppLockStore.getState();
        if (store.isAppLockEnabled && !store.isSessionUnlocked) {
          store.promptUnlock();
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, [initAppLock]);

  if (!initReady) {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.bg }]}>
        <ActivityIndicator size="large" color={currentTheme.brand} />
      </View>
    );
  }

  // If App Lock is enabled and current session is locked, show lock screen
  if (isAppLockEnabled && !isSessionUnlocked) {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.bg }]}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={[styles.lockTitle, { color: currentTheme.ink }]}>Sortshot Locked</Text>
        <Text style={[styles.lockSubtitle, { color: currentTheme.muted }]}>
          Authentication required to open Sortshot
        </Text>
        <Button
          title="Unlock with Biometrics"
          onPress={() => promptUnlock()}
          style={styles.lockBtn}
        />
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockEmoji: {
    fontSize: 54,
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  lockBtn: {
    minWidth: 220,
  },
});
