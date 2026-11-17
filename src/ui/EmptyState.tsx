import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { theme } from '../theme';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📂', title, subtitle, actionTitle, onAction }: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: currentTheme.ink }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: currentTheme.muted }]}>{subtitle}</Text>
      {actionTitle && onAction && (
        <View style={styles.action}>
          <Button title={actionTitle} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: theme.typography.titleMedium.fontSize,
    fontWeight: theme.typography.titleMedium.fontWeight,
    textAlign: 'center',
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: {
    marginTop: theme.spacing[6],
  },
});
