import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../src/theme';
import { strings } from '../src/strings';
import { ShotRow } from '../src/db/schema';
import { getVaultedShots } from '../src/db/queries';
import {
  authenticateWithBiometrics,
  restoreScreenshotFromVault,
} from '../src/vault/vault';
import { useProStore } from '../src/pro/pro';
import { Button, Card, EmptyState, Thumb } from '../src/ui';

export default function VaultScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;
  const isPro = useProStore((state) => state.isPro);

  const [unlocked, setUnlocked] = useState(false);
  const [vaultedShots, setVaultedShots] = useState<ShotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewShot, setPreviewShot] = useState<ShotRow | null>(null);

  const loadVault = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getVaultedShots();
      setVaultedShots(list);
    } catch (err) {
      console.warn('[Vault] Failed to load vaulted shots:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUnlock = useCallback(async () => {
    const success = await authenticateWithBiometrics(strings.vault.unlockPrompt);
    if (success) {
      setUnlocked(true);
      loadVault();
    }
  }, [loadVault]);

  useEffect(() => {
    handleUnlock();
  }, [handleUnlock]);

  const showToast = (message: string) => {
    if (ToastAndroid.show) {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const handleRestore = async (shot: ShotRow) => {
    Alert.alert(
      'Restore to Gallery',
      'This screenshot will be moved back to your phone gallery and removed from the Private Vault.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            const success = await restoreScreenshotFromVault(shot);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast(strings.vault.restoredToast);
              setPreviewShot(null);
              loadVault();
            } else {
              Alert.alert('Error', 'Failed to restore screenshot to gallery.');
            }
          },
        },
      ]
    );
  };

  // If locked, show biometric unlock gate
  if (!unlocked) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: currentTheme.bg }]}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={[styles.lockTitle, { color: currentTheme.ink }]}>
          {strings.vault.title}
        </Text>
        <Text style={[styles.lockSubtitle, { color: currentTheme.muted }]}>
          {strings.vault.unlockPrompt}
        </Text>
        <Button
          title="Unlock with Biometrics"
          onPress={handleUnlock}
          style={styles.unlockBtn}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      {/* Warning Notice */}
      <Card subtle style={styles.warningCard}>
        <Text style={[styles.warningText, { color: currentTheme.muted }]}>
          ⚠️ {strings.vault.warning}
        </Text>
      </Card>

      {/* Grid of Vaulted Screenshots */}
      {vaultedShots.length === 0 && !loading ? (
        <EmptyState
          icon="🛡️"
          title={strings.vault.emptyTitle}
          subtitle={strings.vault.emptyDesc}
        />
      ) : (
        <FlatList
          data={vaultedShots}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <Thumb
                uri={item.vault_path || item.uri}
                onPress={() => setPreviewShot(item)}
                aspectRatio={1}
              />
            </View>
          )}
        />
      )}

      {/* Vault Preview Modal */}
      {previewShot && (
        <Modal
          visible={true}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setPreviewShot(null)}
        >
          <View style={[styles.previewContainer, { backgroundColor: '#000000' }]}>
            <View style={styles.previewHeader}>
              <Pressable onPress={() => setPreviewShot(null)}>
                <Text style={styles.previewClose}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.previewImageWrapper}>
              <Image
                source={{ uri: previewShot.vault_path || previewShot.uri }}
                style={styles.previewImage}
                contentFit="contain"
              />
            </View>

            <View style={styles.previewFooter}>
              <Button
                title={strings.vault.restore}
                onPress={() => handleRestore(previewShot)}
                style={styles.restoreBtn}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing[6],
  },
  lockIcon: {
    fontSize: 54,
    marginBottom: theme.spacing[4],
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: theme.spacing[2],
  },
  lockSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: theme.spacing[6],
  },
  unlockBtn: {
    minWidth: 200,
  },
  warningCard: {
    margin: theme.spacing[4],
    marginBottom: theme.spacing[2],
    padding: theme.spacing[3],
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  gridContent: {
    padding: 6,
  },
  gridItem: {
    flex: 1 / 3,
    padding: 4,
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  previewClose: {
    color: '#FFFFFF',
    fontSize: 24,
    padding: 8,
  },
  previewImageWrapper: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFooter: {
    padding: theme.spacing[6],
  },
  restoreBtn: {
    width: '100%',
  },
});
