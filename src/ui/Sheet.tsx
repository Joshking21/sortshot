import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { theme } from '../theme';

export interface SheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: string;
}

export interface SheetProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  actions: SheetAction[];
}

export function Sheet({ visible, title, onClose, actions }: SheetProps) {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheetContainer}>
          <Pressable
            style={[styles.sheet, { backgroundColor: currentTheme.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.dragHandle, { backgroundColor: currentTheme.line }]} />

            {title && (
              <Text style={[styles.title, { color: currentTheme.ink }]}>
                {title}
              </Text>
            )}

            {actions.map((action, idx) => (
              <Pressable
                key={idx}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                style={({ pressed }) => [
                  styles.actionItem,
                  {
                    borderBottomColor: currentTheme.line,
                    backgroundColor: pressed ? currentTheme.cardSubtle : 'transparent',
                  },
                ]}
              >
                {action.icon && <Text style={styles.actionIcon}>{action.icon}</Text>}
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: action.destructive ? currentTheme.danger : currentTheme.ink,
                      fontWeight: action.destructive ? '600' : '500',
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  backgroundColor: currentTheme.cardSubtle,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.cancelText, { color: currentTheme.muted }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[8],
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: theme.spacing[4],
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
  },
  cancelButton: {
    marginTop: theme.spacing[4],
    height: 48,
    borderRadius: theme.radius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
