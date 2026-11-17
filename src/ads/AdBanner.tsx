import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useProStore } from '../pro/pro';
import { BANNER_AD_UNIT_ID } from './ads';
import { CategoryId } from '../db/schema';

export interface AdBannerProps {
  category?: CategoryId;
}

const SENSITIVE_CATEGORIES: Set<CategoryId> = new Set([
  'bank_details',
  'code',
  'id_document',
]);

export function AdBanner({ category }: AdBannerProps) {
  const isPro = useProStore((state) => state.isPro);

  // Pro users never load or see ads
  if (isPro) return null;

  // Sensitive folders never display ads
  if (category && SENSITIVE_CATEGORIES.has(category)) {
    return null;
  }

  // Web does not support native mobile ads
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 4,
  },
});
