import React from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

export interface ActionCardProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onPress: () => void;
  secondaryActionLabel?: string;
  onSecondaryPress?: () => void;
}

export function ActionCard({
  icon,
  title,
  subtitle,
  actionLabel = 'Tap to act',
  onPress,
  secondaryActionLabel,
  onSecondaryPress,
}: ActionCardProps) {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const handlePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPress();
  };

  const handleSecondaryPress = () => {
    if (onSecondaryPress) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSecondaryPress();
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: currentTheme.card,
          borderColor: currentTheme.line,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={[styles.iconContainer, { backgroundColor: currentTheme.brandSoft }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: currentTheme.ink }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: currentTheme.muted }]} numberOfLines={2}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              backgroundColor: currentTheme.brand,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </Pressable>

        {secondaryActionLabel && onSecondaryPress && (
          <Pressable
            onPress={handleSecondaryPress}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: currentTheme.cardSubtle,
                borderColor: currentTheme.line,
                borderWidth: 1,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: currentTheme.ink }]}>
              {secondaryActionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.base,
    borderWidth: 1,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing[3],
  },
  iconText: {
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
