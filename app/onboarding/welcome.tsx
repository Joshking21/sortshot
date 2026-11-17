import React, { useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../src/theme';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '📂',
    title: strings.onboarding.slide1Title,
    body: strings.onboarding.slide1Body,
  },
  {
    icon: '⚡',
    title: strings.onboarding.slide2Title,
    body: strings.onboarding.slide2Body,
  },
  {
    icon: '🧹',
    title: strings.onboarding.slide3Title,
    body: strings.onboarding.slide3Body,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/onboarding/permission');
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/onboarding/permission');
  };

  const currentSlide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      {/* Top Header / Skip */}
      <View style={styles.topBar}>
        <View style={[styles.brandBadge, { backgroundColor: currentTheme.brandSoft }]}>
          <Text style={[styles.brandBadgeText, { color: currentTheme.brand }]}>
            {strings.appName.toUpperCase()}
          </Text>
        </View>

        {!isLast ? (
          <Pressable
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            style={styles.skipBtn}
          >
            <Text style={[styles.skipText, { color: currentTheme.muted }]}>
              {strings.onboarding.skip}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      {/* Main Slide Content */}
      <View style={styles.slideContent}>
        <View style={[styles.iconCircle, { backgroundColor: currentTheme.brandSoft }]}>
          <Text style={styles.slideIcon}>{currentSlide.icon}</Text>
        </View>

        <Text style={[styles.slideTitle, { color: currentTheme.ink }]}>
          {currentSlide.title}
        </Text>

        <Text style={[styles.slideBody, { color: currentTheme.muted }]}>
          {currentSlide.body}
        </Text>
      </View>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {SLIDES.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                backgroundColor: idx === currentIndex ? currentTheme.brand : currentTheme.line,
                width: idx === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <Button
          title={isLast ? strings.onboarding.getStarted : strings.onboarding.next}
          size="lg"
          onPress={handleNext}
          accessibilityLabel={isLast ? strings.onboarding.getStarted : strings.onboarding.next}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing[6],
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  brandBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skipBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing[2],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing[6],
  },
  slideIcon: {
    fontSize: 48,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: theme.spacing[3],
    lineHeight: 32,
  },
  slideBody: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing[2],
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: theme.spacing[4],
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    width: '100%',
  },
  actionBtn: {
    width: '100%',
  },
});
