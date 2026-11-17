import * as MediaLibrary from 'expo-media-library/legacy';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export interface PhotoPermissionStatus {
  granted: boolean;
  isPartial: boolean;
  canAskAgain: boolean;
}

export async function checkPhotoPermission(): Promise<PhotoPermissionStatus> {
  try {
    const status = await MediaLibrary.getPermissionsAsync();
    const isPartial = status.accessPrivileges === 'limited';
    const granted = status.granted || isPartial;

    return {
      granted,
      isPartial,
      canAskAgain: status.canAskAgain,
    };
  } catch (err) {
    console.warn('[Permissions] Failed to check photo permission', err);
    return {
      granted: false,
      isPartial: false,
      canAskAgain: true,
    };
  }
}

export async function requestPhotoPermission(): Promise<PhotoPermissionStatus> {
  try {
    const status = await MediaLibrary.requestPermissionsAsync();
    const isPartial = status.accessPrivileges === 'limited';
    const granted = status.granted || isPartial;

    return {
      granted,
      isPartial,
      canAskAgain: status.canAskAgain,
    };
  } catch (err) {
    console.warn('[Permissions] Failed to request photo permission', err);
    return {
      granted: false,
      isPartial: false,
      canAskAgain: false,
    };
  }
}

export async function openSettings(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openURL('app-settings:');
  } else {
    await Linking.openSettings();
  }
}
