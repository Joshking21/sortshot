import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, useColorScheme } from 'react-native';
import { theme } from '../theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  subtle?: boolean;
}

export function Card({ children, style, subtle = false }: CardProps) {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: subtle ? currentTheme.cardSubtle : currentTheme.card,
          borderColor: currentTheme.line,
          borderRadius: theme.radius.base,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing[4],
    borderWidth: 1,
    overflow: 'hidden',
  },
});
