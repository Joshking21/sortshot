import React from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { theme } from '../theme';

export interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
}

export function ProgressBar({ progress, height = 8 }: ProgressBarProps) {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor: currentTheme.line,
          borderRadius: height / 2,
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            height,
            backgroundColor: currentTheme.brand,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
