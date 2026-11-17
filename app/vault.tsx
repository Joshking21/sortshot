import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { theme } from '../src/theme';
import { strings } from '../src/strings';

export default function VaultScreen() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      <Text style={[styles.title, { color: currentTheme.ink }]}>{strings.vault.title}</Text>
      <Text style={[styles.subtitle, { color: currentTheme.muted }]}>{strings.vault.warning}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.titleLarge.fontSize,
    fontWeight: theme.typography.titleLarge.fontWeight,
    marginBottom: theme.spacing[2],
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    textAlign: 'center',
  },
});
