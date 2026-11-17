import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../src/theme';
import { strings } from '../src/strings';
import { purchasePackage, restorePurchases, useProStore } from '../src/pro/pro';
import { Button, Card } from '../src/ui';

export default function ProPaywallScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const { isPro, currentOffering } = useProStore();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'lifetime'>('yearly');
  const [purchasing, setPurchasing] = useState(false);

  const availablePackages = currentOffering?.availablePackages || [];
  const yearlyPackage = availablePackages.find(
    (p) => p.identifier.includes('yearly') || p.packageType === 'ANNUAL'
  );
  const lifetimePackage = availablePackages.find(
    (p) => p.identifier.includes('lifetime') || p.packageType === 'LIFETIME'
  );

  const yearlyPrice = yearlyPackage?.product.priceString || '₦7,500 / year';
  const lifetimePrice = lifetimePackage?.product.priceString || '₦19,500 one-time';

  const handleBuy = async () => {
    const pkgToBuy = selectedPlan === 'yearly' ? yearlyPackage : lifetimePackage;

    if (!pkgToBuy) {
      // In development / demo environments without real RevenueCat keys, simulate Pro unlock
      Alert.alert(
        'Sortshot Pro Demo Mode',
        'In development mode, you can unlock Sortshot Pro immediately for testing.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate Pro',
            onPress: () => {
              useProStore.getState().setIsPro(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Sortshot Pro is now active!');
              router.back();
            },
          },
        ]
      );
      return;
    }

    setPurchasing(true);
    const success = await purchasePackage(pkgToBuy);
    setPurchasing(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Welcome to Sortshot Pro!', 'All Pro features have been unlocked.');
      router.back();
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const success = await restorePurchases();
    setPurchasing(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Purchases Restored', 'Your Pro entitlement has been restored.');
      router.back();
    } else {
      Alert.alert('No Purchases Found', 'No active Pro subscription was found for your account.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      {/* Header with Close Button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={[styles.closeIcon, { color: currentTheme.ink }]}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Pro Badge & Title */}
        <View style={styles.heroSection}>
          <View style={[styles.heroBadge, { backgroundColor: currentTheme.brandSoft }]}>
            <Text style={[styles.heroBadgeText, { color: currentTheme.brand }]}>
              PRO UPGRADE
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: currentTheme.ink }]}>
            {strings.pro.title}
          </Text>
          <Text style={[styles.heroSubtitle, { color: currentTheme.muted }]}>
            {strings.pro.subtitle}
          </Text>
        </View>

        {/* Feature List */}
        <Card style={styles.featuresCard}>
          {strings.pro.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <View style={[styles.featureCheck, { backgroundColor: currentTheme.brandSoft }]}>
                <Text style={{ color: currentTheme.brand, fontWeight: '700' }}>✓</Text>
              </View>
              <Text style={[styles.featureText, { color: currentTheme.ink }]}>
                {feature}
              </Text>
            </View>
          ))}
        </Card>

        {/* Plan Selection Cards */}
        <View style={styles.plansContainer}>
          {/* Yearly Plan */}
          <Pressable
            onPress={() => setSelectedPlan('yearly')}
            style={[
              styles.planCard,
              {
                backgroundColor: currentTheme.card,
                borderColor: selectedPlan === 'yearly' ? currentTheme.brand : currentTheme.line,
                borderWidth: selectedPlan === 'yearly' ? 2 : 1,
              },
            ]}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planTitle, { color: currentTheme.ink }]}>
                {strings.pro.yearly}
              </Text>
              <View style={[styles.popularBadge, { backgroundColor: currentTheme.brand }]}>
                <Text style={styles.popularText}>BEST VALUE</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: currentTheme.brand }]}>
              {yearlyPrice}
            </Text>
            <Text style={[styles.planPeriod, { color: currentTheme.muted }]}>
              Billed annually. Cancel anytime.
            </Text>
          </Pressable>

          {/* Lifetime Plan */}
          <Pressable
            onPress={() => setSelectedPlan('lifetime')}
            style={[
              styles.planCard,
              {
                backgroundColor: currentTheme.card,
                borderColor: selectedPlan === 'lifetime' ? currentTheme.brand : currentTheme.line,
                borderWidth: selectedPlan === 'lifetime' ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.planTitle, { color: currentTheme.ink }]}>
              {strings.pro.lifetime}
            </Text>
            <Text style={[styles.planPrice, { color: currentTheme.brand }]}>
              {lifetimePrice}
            </Text>
            <Text style={[styles.planPeriod, { color: currentTheme.muted }]}>
              One-time purchase. Pay once, own forever.
            </Text>
          </Pressable>
        </View>

        {/* Upgrade & Restore Buttons */}
        <View style={styles.buttonSection}>
          <Button
            title={purchasing ? 'Processing…' : strings.pro.buy}
            size="lg"
            loading={purchasing}
            onPress={handleBuy}
            style={styles.buyBtn}
          />
          <Pressable onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={[styles.restoreText, { color: currentTheme.muted }]}>
              {strings.pro.restore}
            </Text>
          </Pressable>
          <Text style={[styles.disclaimerText, { color: currentTheme.muted }]}>
            {strings.pro.disclaimer}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollContent: {
    padding: theme.spacing[4],
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing[2],
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: theme.spacing[2],
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  featuresCard: {
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  plansContainer: {
    gap: 12,
    marginBottom: theme.spacing[6],
  },
  planCard: {
    borderRadius: theme.radius.base,
    padding: theme.spacing[4],
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  planPeriod: {
    fontSize: 12,
  },
  buttonSection: {
    alignItems: 'center',
    gap: 12,
  },
  buyBtn: {
    width: '100%',
  },
  restoreBtn: {
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimerText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
});
