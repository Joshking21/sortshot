import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle, useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, count, style }: ChipProps) {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable
      onPress={onPress ? handlePress : undefined}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? currentTheme.brand : currentTheme.cardSubtle,
          borderColor: selected ? currentTheme.brand : currentTheme.line,
          opacity: pressed && onPress ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: selected ? '#FFFFFF' : currentTheme.ink,
            fontWeight: selected ? '600' : '400',
          },
        ]}
        numberOfLines={1}
      >
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
  },
});
