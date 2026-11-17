import React from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

export interface ThumbProps {
  uri: string;
  badgeLabel?: string | null;
  selected?: boolean;
  isSelecting?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  aspectRatio?: number;
}

export function Thumb({
  uri,
  badgeLabel,
  selected = false,
  isSelecting = false,
  onPress,
  onLongPress,
  aspectRatio = 1,
}: ThumbProps) {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.container,
        {
          borderColor: selected ? currentTheme.brand : currentTheme.line,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.imageWrapper, { aspectRatio }]}>
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />

        {isSelecting && (
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: selected ? currentTheme.brand : 'rgba(0,0,0,0.4)',
                borderColor: '#FFFFFF',
              },
            ]}
          >
            {selected && <Text style={styles.checkmark}>✓</Text>}
          </View>
        )}
      </View>

      {badgeLabel && (
        <View style={[styles.badge, { backgroundColor: currentTheme.cardSubtle }]}>
          <Text
            style={[styles.badgeText, { color: currentTheme.ink }]}
            numberOfLines={1}
          >
            {badgeLabel}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#000000',
  },
  imageWrapper: {
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  checkbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
