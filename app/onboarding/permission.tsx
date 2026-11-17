import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../src/theme';
import { strings } from '../../src/strings';
import { openSettings, requestPhotoPermission } from '../../src/scan/permissions';
import { setSetting } from '../../src/db/queries';
import { runScanner } from '../../src/scan/scanner';
import { Button, Card } from '../../src/ui';

export default function PermissionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleRequestAccess = async () => {
    setLoading(true);
    try {
      const res = await requestPhotoPermission();
      if (res.granted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await setSetting('onboarding_completed', 'true');
        // Start background scan and proceed into tabs
        runScanner(false);
        router.replace('/(tabs)');
      } else {
        setPermissionDenied(true);
      }
    } catch (err) {
      console.warn('[PermissionScreen] Error requesting permission:', err);
      setPermissionDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettings = async () => {
    await openSettings();
  };

  const handleSkipForNow = async () => {
    await setSetting('onboarding_completed', 'true');
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      <View style={styles.content}>
        {/* Permission Shield Icon */}
        <View style={[styles.iconContainer, { backgroundColor: currentTheme.brandSoft }]}>
          <Text style={styles.icon}>🛡️</Text>
        </View>

        <Text style={[styles.title, { color: currentTheme.ink }]}>
          {strings.onboarding.permissionTitle}
        </Text>

        <Text style={[styles.description, { color: currentTheme.muted }]}>
          {strings.onboarding.permissionDesc}
        </Text>

        {/* Guarantee Banner */}
        <Card subtle style={styles.guaranteeCard}>
          <Text style={[styles.guaranteeTitle, { color: currentTheme.ink }]}>
            🔒 100% On-Device & Private
          </Text>
          <Text style={[styles.guaranteeText, { color: currentTheme.muted }]}>
            Everything happens on your phone. Nothing is uploaded, tracked, or sent to the cloud.
          </Text>
        </Card>

        {/* Denied Warning If Denied */}
        {permissionDenied && (
          <Card style={[styles.deniedCard, { backgroundColor: currentTheme.dangerSoft, borderColor: currentTheme.danger }]}>
            <Text style={[styles.deniedTitle, { color: currentTheme.danger }]}>
              Permission Required
            </Text>
            <Text style={[styles.deniedText, { color: currentTheme.ink }]}>
              {strings.onboarding.permissionDenied}
            </Text>
          </Card>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.bottomBar}>
        {!permissionDenied ? (
          <>
            <Button
              title={strings.onboarding.allowAccess}
              size="lg"
              loading={loading}
              onPress={handleRequestAccess}
              accessibilityLabel={strings.onboarding.allowAccess}
              style={styles.primaryBtn}
            />
            <Button
              title="Maybe later"
              variant="ghost"
              onPress={handleSkipForNow}
              accessibilityLabel="Skip permission for now"
            />
          </>
        ) : (
          <>
            <Button
              title={strings.onboarding.openSettings}
              size="lg"
              onPress={handleOpenSettings}
              accessibilityLabel={strings.onboarding.openSettings}
              style={styles.primaryBtn}
            />
            <Button
              title="Continue without permission"
              variant="ghost"
              onPress={handleSkipForNow}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[6],
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing[3],
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing[6],
  },
  guaranteeCard: {
    width: '100%',
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
  },
  guaranteeTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  guaranteeText: {
    fontSize: 13,
    lineHeight: 18,
  },
  deniedCard: {
    width: '100%',
    padding: theme.spacing[4],
    borderWidth: 1,
  },
  deniedTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  deniedText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBar: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
  },
});
