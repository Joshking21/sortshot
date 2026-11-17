import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import * as MediaLibrary from 'expo-media-library/legacy';
import { markShotRestored, markShotVaulted } from '../db/queries';
import { ShotRow } from '../db/schema';

const VAULT_FOLDER = `${FileSystem.documentDirectory}vault/`;

export async function ensureVaultDirectoryExists(): Promise<void> {
  const info = await FileSystem.getInfoAsync(VAULT_FOLDER);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_FOLDER, { intermediates: true });
  }
}

export async function authenticateWithBiometrics(
  promptMessage = 'Unlock Private Vault'
): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      // If biometrics not enrolled on device, allow fallback or pass
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (err) {
    console.warn('[Vault] Biometric authentication error:', err);
    return false;
  }
}

export async function moveScreenshotToVault(shot: ShotRow): Promise<boolean> {
  try {
    await ensureVaultDirectoryExists();

    // Determine extension
    const ext = shot.filename && shot.filename.includes('.')
      ? shot.filename.slice(shot.filename.lastIndexOf('.'))
      : '.jpg';

    const vaultFilename = `vault_${shot.id}${ext}`;
    const destinationPath = `${VAULT_FOLDER}${vaultFilename}`;

    // Get asset local URI if needed
    let sourceUri = shot.uri;
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(shot.id);
      if (assetInfo?.localUri) {
        sourceUri = assetInfo.localUri;
      }
    } catch {
      // fallback to shot.uri
    }

    // 1. Copy into private document folder
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationPath,
    });

    // 2. Mark vaulted in local database
    await markShotVaulted(shot.id, destinationPath);

    // 3. Delete original asset from device gallery (prompts OS dialog)
    try {
      await MediaLibrary.deleteAssetsAsync([shot.id]);
    } catch (err) {
      console.warn('[Vault] Original asset deletion warning in gallery:', err);
    }

    return true;
  } catch (err) {
    console.error('[Vault] Failed to move screenshot to vault:', err);
    return false;
  }
}

export async function restoreScreenshotFromVault(shot: ShotRow): Promise<boolean> {
  if (!shot.vault_path) return false;

  try {
    const fileInfo = await FileSystem.getInfoAsync(shot.vault_path);
    if (!fileInfo.exists) {
      console.warn('[Vault] Vault file not found:', shot.vault_path);
      return false;
    }

    // 1. Save back to device media library
    const newAsset = await MediaLibrary.createAssetAsync(shot.vault_path);

    // 2. Update database record
    await markShotRestored(shot.id, newAsset.uri);

    // 3. Delete from vault folder
    await FileSystem.deleteAsync(shot.vault_path, { idempotent: true });

    return true;
  } catch (err) {
    console.error('[Vault] Failed to restore screenshot from vault:', err);
    return false;
  }
}
