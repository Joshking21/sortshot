import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

export const BANNER_AD_UNIT_ID = Platform.select({
  ios: __DEV__ ? TestIds.BANNER : 'ca-app-pub-3940256099942544/2934735716',
  android: __DEV__ ? TestIds.BANNER : 'ca-app-pub-3940256099942544/6300978111',
  default: TestIds.BANNER,
}) || TestIds.BANNER;

export const REWARDED_AD_UNIT_ID = Platform.select({
  ios: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3940256099942544/1712485313',
  android: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-3940256099942544/5224354917',
  default: TestIds.REWARDED,
}) || TestIds.REWARDED;

let isAdsInitialized = false;

export async function initGoogleAds(): Promise<void> {
  if (isAdsInitialized || Platform.OS === 'web') return;

  try {
    // 1. Request UMP Consent info
    const consentInfo = await AdsConsent.requestInfoUpdate();
    if (consentInfo.isConsentFormAvailable && consentInfo.status === 'REQUIRED') {
      await AdsConsent.loadAndShowConsentFormIfRequired();
    }

    // 2. Initialize Mobile Ads SDK
    await mobileAds().initialize();
    isAdsInitialized = true;
  } catch (err) {
    console.warn('[Ads] AdMob initialization warning (expected in dev without ad config):', err);
  }
}

export async function showAdConsentForm(): Promise<void> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
  } catch (err) {
    console.warn('[Ads] Failed to show privacy options form:', err);
  }
}

export function showRewardedAd(onEarnedReward: () => void, onFailed?: () => void): void {
  if (Platform.OS === 'web') {
    onEarnedReward();
    return;
  }

  try {
    const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewarded.show();
    });

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        onEarnedReward();
      }
    );

    rewarded.load();

    // Auto clean up listener after timeout if not shown
    setTimeout(() => {
      unsubscribeLoaded();
      unsubscribeEarned();
    }, 15000);
  } catch (err) {
    console.warn('[Ads] Rewarded ad failed to load, granting bonus directly:', err);
    onEarnedReward();
  }
}
