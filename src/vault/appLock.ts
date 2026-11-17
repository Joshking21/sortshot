import { create } from 'zustand';
import { getSetting, setSetting } from '../db/queries';
import { authenticateWithBiometrics } from './vault';

const SETTING_KEY_APP_LOCK = 'app_lock_biometric_enabled';

interface AppLockState {
  isAppLockEnabled: boolean;
  isSessionUnlocked: boolean;
  setAppLockEnabled: (enabled: boolean) => void;
  setSessionUnlocked: (unlocked: boolean) => void;
  initAppLock: () => Promise<void>;
  promptUnlock: () => Promise<boolean>;
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isAppLockEnabled: false,
  isSessionUnlocked: true,

  setAppLockEnabled: (enabled) => set({ isAppLockEnabled: enabled }),
  setSessionUnlocked: (unlocked) => set({ isSessionUnlocked: unlocked }),

  initAppLock: async () => {
    try {
      const val = await getSetting(SETTING_KEY_APP_LOCK);
      const isEnabled = val === 'true';
      set({
        isAppLockEnabled: isEnabled,
        isSessionUnlocked: !isEnabled,
      });
    } catch (err) {
      console.warn('[AppLock] Failed to load lock setting', err);
    }
  },

  promptUnlock: async () => {
    const success = await authenticateWithBiometrics('Unlock Sortshot');
    if (success) {
      set({ isSessionUnlocked: true });
    }
    return success;
  },
}));

export async function toggleAppLockSetting(enable: boolean): Promise<boolean> {
  if (enable) {
    const success = await authenticateWithBiometrics('Confirm Biometric Lock');
    if (!success) return false;
  }
  await setSetting(SETTING_KEY_APP_LOCK, enable ? 'true' : 'false');
  useAppLockStore.getState().setAppLockEnabled(enable);
  return true;
}
