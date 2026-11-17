import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../src/theme';
import { strings } from '../../src/strings';
import { getSetting, setSetting } from '../../src/db/queries';
import { useProStore, restorePurchases } from '../../src/pro/pro';
import { toggleAppLockSetting, useAppLockStore } from '../../src/vault/appLock';
import { showAdConsentForm } from '../../src/ads/ads';
import { runScanner } from '../../src/scan/scanner';
import { Button, Card } from '../../src/ui';

const SETTING_AUTO_DELETE_CODES = 'auto_delete_codes_enabled';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const isPro = useProStore((state) => state.isPro);
  const isAppLockEnabled = useAppLockStore((state) => state.isAppLockEnabled);
  const [autoSuggestCodes, setAutoSuggestCodes] = useState(true);
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const val = await getSetting(SETTING_AUTO_DELETE_CODES);
      if (val !== null) {
        setAutoSuggestCodes(val === 'true');
      }
    }
    loadSettings();
  }, []);

  const showToast = (message: string) => {
    if (ToastAndroid.show) {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const handleToggleAutoSuggestCodes = async (value: boolean) => {
    setAutoSuggestCodes(value);
    await setSetting(SETTING_AUTO_DELETE_CODES, value ? 'true' : 'false');
  };

  const handleToggleAppLock = async (value: boolean) => {
    if (!isPro && value) {
      router.push('/pro');
      return;
    }
    const success = await toggleAppLockSetting(value);
    if (!success) {
      Alert.alert('Authentication Failed', 'Could not verify biometrics to change app lock setting.');
    }
  };

  const handleRescanAll = () => {
    Alert.alert(
      strings.settings.rescanAll,
      strings.settings.rescanConfirm,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rescan',
          onPress: async () => {
            setRescanning(true);
            try {
              await runScanner(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast('Rescan completed successfully');
            } catch (err) {
              console.warn('Rescan error:', err);
            } finally {
              setRescanning(false);
            }
          },
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    const success = await restorePurchases();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Purchases restored');
    } else {
      Alert.alert('No Purchases Found', 'No previous purchases found for this account.');
    }
  };

  const handleOpenPrivacyPolicy = async () => {
    await Linking.openURL('https://sortshot.app/privacy');
  };

  const handleSendFeedback = async () => {
    await Linking.openURL('mailto:support@sortshot.app?subject=Sortshot%20Feedback');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.bg }]} contentContainerStyle={styles.content}>
      {/* Pro Status Card */}
      <Card style={styles.proCard}>
        <View style={styles.proRow}>
          <View>
            <Text style={[styles.proTitle, { color: currentTheme.ink }]}>
              {isPro ? strings.settings.proActive : strings.settings.proStatus}
            </Text>
            <Text style={[styles.proSubtitle, { color: currentTheme.muted }]}>
              {isPro
                ? 'Unlimited cleanings, biometric vault & ad-free'
                : 'Unlock unlimited cleanup, Private Vault & zero ads'}
            </Text>
          </View>
          {!isPro ? (
            <Button
              title="Upgrade"
              size="sm"
              onPress={() => router.push('/pro')}
            />
          ) : (
            <View style={[styles.proBadge, { backgroundColor: currentTheme.brandSoft }]}>
              <Text style={[styles.proBadgeText, { color: currentTheme.brand }]}>ACTIVE</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Security & Vault Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.muted }]}>Security & Privacy</Text>
        <Card style={styles.card}>
          <Pressable
            onPress={() => router.push('/vault')}
            style={[styles.row, { borderBottomColor: currentTheme.line }]}
          >
            <Text style={[styles.rowLabel, { color: currentTheme.ink }]}>Private Vault</Text>
            <Text style={[styles.rowArrow, { color: currentTheme.muted }]}>🔒 Open →</Text>
          </Pressable>

          <View style={styles.row}>
            <View style={styles.rowLabelGroup}>
              <Text style={[styles.rowLabel, { color: currentTheme.ink }]}>
                {strings.settings.biometricLock}
              </Text>
              {!isPro && (
                <Text style={[styles.proTag, { color: currentTheme.brand }]}>PRO</Text>
              )}
            </View>
            <Switch
              value={isAppLockEnabled}
              onValueChange={handleToggleAppLock}
              trackColor={{ false: currentTheme.line, true: currentTheme.brand }}
            />
          </View>
        </Card>
      </View>

      {/* Organization Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.muted }]}>Organization</Text>
        <Card style={styles.card}>
          <View style={[styles.row, { borderBottomColor: currentTheme.line }]}>
            <Text style={[styles.rowLabel, { color: currentTheme.ink, flex: 1, paddingRight: 8 }]}>
              {strings.settings.autoSuggestDeleteCodes}
            </Text>
            <Switch
              value={autoSuggestCodes}
              onValueChange={handleToggleAutoSuggestCodes}
              trackColor={{ false: currentTheme.line, true: currentTheme.brand }}
            />
          </View>

          <Pressable
            onPress={handleRescanAll}
            disabled={rescanning}
            style={styles.row}
          >
            <Text style={[styles.rowLabel, { color: currentTheme.brand }]}>
              {rescanning ? 'Scanning screenshots…' : strings.settings.rescanAll}
            </Text>
            <Text style={[styles.rowArrow, { color: currentTheme.brand }]}>🔄</Text>
          </Pressable>
        </Card>
      </View>

      {/* Support & Legal Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: currentTheme.muted }]}>General & Support</Text>
        <Card style={styles.card}>
          <Pressable
            onPress={() => showAdConsentForm()}
            style={[styles.row, { borderBottomColor: currentTheme.line }]}
          >
            <Text style={[styles.rowLabel, { color: currentTheme.ink }]}>
              {strings.settings.adConsent}
            </Text>
            <Text style={[styles.rowArrow, { color: currentTheme.muted }]}>→</Text>
          </Pressable>

          <Pressable
            onPress={handleRestorePurchases}
            style={[styles.row, { borderBottomColor: currentTheme.line }]}
          >
            <Text style={[styles.rowLabel, { color: currentTheme.ink }]}>
              {strings.settings.restorePurchases}
            </Text>
            <Text style={[styles.rowArrow, { color: currentTheme.muted }]}>→</Text>
          </Pressable>

          <Pressable
            onPress={handleOpenPrivacyPolicy}
            style={[styles.row, { borderBottomColor: currentTheme.line }]}
          >
            <Text style={[styles.rowLabel, { color: currentTheme.ink }]}>
              {strings.settings.privacyPolicy}
            </Text>
            <Text style={[styles.rowArrow, { color: currentTheme.muted }]}>→</Text>
          </Pressable>

          <Pressable onPress={handleSendFeedback} style={styles.row}>
            <Text style={[styles.rowLabel, { color: currentTheme.ink }]}>
              {strings.settings.sendFeedback}
            </Text>
            <Text style={[styles.rowArrow, { color: currentTheme.muted }]}>✉️</Text>
          </Pressable>
        </Card>
      </View>

      {/* App Version Info */}
      <View style={styles.footer}>
        <Text style={[styles.versionText, { color: currentTheme.muted }]}>
          Sortshot v1.0.0
        </Text>
        <Text style={[styles.mottoText, { color: currentTheme.muted }]}>
          {strings.tagline}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[4],
    gap: 16,
    paddingBottom: 40,
  },
  proCard: {
    padding: theme.spacing[4],
  },
  proRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  proSubtitle: {
    fontSize: 13,
    maxWidth: 220,
  },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    fontSize: 15,
  },
  proTag: {
    fontSize: 11,
    fontWeight: '800',
  },
  rowArrow: {
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing[4],
    gap: 4,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mottoText: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
