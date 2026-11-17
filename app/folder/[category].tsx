import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library/legacy';
import { theme } from '../../src/theme';
import { strings } from '../../src/strings';
import { CategoryId, EntityRow, ShotRow } from '../../src/db/schema';
import { getEntitiesForShot, getShotsByCategory, markShotsGone } from '../../src/db/queries';
import { Button, Card, EmptyState, Sheet, Thumb } from '../../src/ui';

interface ShotWithEntity {
  shot: ShotRow;
  primaryEntity: EntityRow | null;
}

export default function FolderScreen() {
  const { category } = useLocalSearchParams<{ category: CategoryId }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const [items, setItems] = useState<ShotWithEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Receipts monthly totals
  const [monthlyOut, setMonthlyOut] = useState<number>(0);
  const [monthlyIn, setMonthlyIn] = useState<number>(0);

  const folderTitle = category && strings.folders[category] ? strings.folders[category] : 'Folder';

  useEffect(() => {
    navigation.setOptions({
      title: folderTitle,
    });
  }, [navigation, folderTitle]);

  const loadShots = useCallback(async () => {
    if (!category) return;
    setLoading(true);

    try {
      const shots = await getShotsByCategory(category, 200, 0);
      let totalOut = 0;
      let totalIn = 0;
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const combined: ShotWithEntity[] = await Promise.all(
        shots.map(async (shot) => {
          const entities = await getEntitiesForShot(shot.id);
          const primaryEntity = entities.length > 0 ? entities[0] : null;

          // For receipts folder, calculate this month's totals
          if (category === 'receipt') {
            for (const e of entities) {
              if (e.type === 'amount') {
                const shotDate = new Date(shot.created_at);
                if (shotDate.getMonth() === currentMonth && shotDate.getFullYear() === currentYear) {
                  const extra = e.extra ? JSON.parse(e.extra) : {};
                  const amtVal = parseFloat(e.value) || 0;
                  if (extra.currency === 'NGN' || !extra.currency) {
                    if (extra.direction === 'out') totalOut += amtVal;
                    if (extra.direction === 'in') totalIn += amtVal;
                  }
                }
              }
            }
          }

          return { shot, primaryEntity };
        })
      );

      setMonthlyOut(totalOut);
      setMonthlyIn(totalIn);
      setItems(combined);
    } catch (err) {
      console.warn('[FolderScreen] Failed loading shots:', err);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadShots();
  }, [loadShots]);

  const showToast = (message: string) => {
    if (ToastAndroid.show) {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      if (next.size === 0) setIsSelecting(false);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleLongPress = (id: string) => {
    setIsSelecting(true);
    const next = new Set(selectedIds);
    next.add(id);
    setSelectedIds(next);
  };

  const handleCopyNumber = async (accountNumber: string) => {
    await Clipboard.setStringAsync(accountNumber);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(strings.shot.copiedToast);
  };

  const handleCopyAll = async (bank: string, number: string, name?: string) => {
    const lines = [bank, number, name].filter(Boolean).join('\n');
    await Clipboard.setStringAsync(lines);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(strings.shot.copiedToast);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    Alert.alert(
      'Delete Screenshots',
      `Delete ${ids.length} screenshots from your device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MediaLibrary.deleteAssetsAsync(ids);
              await markShotsGone(ids);
              setIsSelecting(false);
              setSelectedIds(new Set());
              await loadShots();
              showToast(`Deleted ${ids.length} screenshots`);
            } catch (err) {
              console.warn('[Folder] Delete cancelled or failed:', err);
            }
          },
        },
      ]
    );
  };

  const handleShareSelected = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.shot.id));
    if (selectedItems.length === 0) return;
    try {
      await Share.share({
        message: `Sharing ${selectedItems.length} screenshots from Sortshot`,
        url: selectedItems[0].shot.uri,
      });
    } catch (err) {
      console.warn('[Folder] Share failed', err);
    }
  };

  // Render Bank Details Card View
  const renderBankDetailsItem = ({ item }: { item: ShotWithEntity }) => {
    const { shot, primaryEntity } = item;
    const extra = primaryEntity?.extra ? JSON.parse(primaryEntity.extra) : {};
    const bankName = extra.bank || 'Bank Account';
    const accountNumber = primaryEntity?.value || '—';
    const accountName = extra.accountName || '';

    return (
      <Card style={styles.bankCard}>
        <View style={styles.bankHeader}>
          <Text style={[styles.bankName, { color: currentTheme.brand }]}>{bankName}</Text>
          <Text style={[styles.bankDate, { color: currentTheme.muted }]}>
            {new Date(shot.created_at).toLocaleDateString()}
          </Text>
        </View>

        <Text style={[styles.bankNumber, { color: currentTheme.ink }]}>{accountNumber}</Text>
        {accountName ? (
          <Text style={[styles.bankAccountName, { color: currentTheme.muted }]}>{accountName}</Text>
        ) : null}

        <View style={styles.bankActionRow}>
          <Button
            title={strings.shot.copyAccount}
            size="sm"
            onPress={() => handleCopyNumber(accountNumber)}
            style={styles.flexBtn}
          />
          <Button
            title={strings.shot.copyAll}
            variant="secondary"
            size="sm"
            onPress={() => handleCopyAll(bankName, accountNumber, accountName)}
            style={styles.flexBtn}
          />
          <Button
            title="View"
            variant="ghost"
            size="sm"
            onPress={() => router.push(`/shot/${shot.id}`)}
          />
        </View>
      </Card>
    );
  };

  // Render Thumbnail Grid Item
  const renderGridItem = ({ item }: { item: ShotWithEntity }) => {
    const isSelected = selectedIds.has(item.shot.id);
    return (
      <View style={styles.gridItemWrapper}>
        <Thumb
          uri={item.shot.uri}
          badgeLabel={item.primaryEntity?.label}
          selected={isSelected}
          isSelecting={isSelecting}
          onPress={() => {
            if (isSelecting) {
              handleToggleSelect(item.shot.id);
            } else {
              router.push(`/shot/${item.shot.id}`);
            }
          }}
          onLongPress={() => handleLongPress(item.shot.id)}
          aspectRatio={1}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      {/* Receipts Month Summary Header */}
      {category === 'receipt' && (
        <Pressable
          onPress={() => router.push('/receipts-summary')}
          style={[styles.receiptsHeader, { backgroundColor: currentTheme.card, borderColor: currentTheme.line }]}
        >
          <Text style={[styles.receiptsSummaryText, { color: currentTheme.ink }]}>
            {strings.receipts.monthlySummary(
              `₦${monthlyOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              `₦${monthlyIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            )}
          </Text>
          <Text style={[styles.receiptsLink, { color: currentTheme.brand }]}>View summary →</Text>
        </Pressable>
      )}

      {/* Multi-Select Action Bar */}
      {isSelecting && (
        <View style={[styles.selectionBar, { backgroundColor: currentTheme.card, borderColor: currentTheme.line }]}>
          <Text style={[styles.selectionCount, { color: currentTheme.ink }]}>
            {selectedIds.size} selected
          </Text>
          <View style={styles.selectionActions}>
            <Button title="Actions" size="sm" onPress={() => setSheetVisible(true)} />
            <Button
              title="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => {
                setIsSelecting(false);
                setSelectedIds(new Set());
              }}
            />
          </View>
        </View>
      )}

      {/* Main Content */}
      {items.length === 0 && !loading ? (
        <EmptyState
          icon="📂"
          title="No screenshots in this folder"
          subtitle="New screenshots matching this category will be sorted here automatically."
        />
      ) : category === 'bank_details' ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.shot.id}
          renderItem={renderBankDetailsItem}
          contentContainerStyle={styles.bankListContent}
        />
      ) : (
        <FlatList
          data={items}
          numColumns={3}
          keyExtractor={(item) => item.shot.id}
          renderItem={renderGridItem}
          contentContainerStyle={styles.gridContent}
        />
      )}

      {/* Multi-Select Bottom Sheet */}
      <Sheet
        visible={sheetVisible}
        title={`${selectedIds.size} Screenshots Selected`}
        onClose={() => setSheetVisible(false)}
        actions={[
          {
            label: 'Share',
            icon: '📤',
            onPress: handleShareSelected,
          },
          {
            label: 'Delete',
            icon: '🗑️',
            destructive: true,
            onPress: handleDeleteSelected,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  receiptsHeader: {
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptsSummaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  receiptsLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectionBar: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  selectionCount: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  gridContent: {
    padding: 6,
  },
  gridItemWrapper: {
    flex: 1 / 3,
    padding: 4,
  },
  bankListContent: {
    padding: theme.spacing[4],
    gap: 12,
  },
  bankCard: {
    padding: theme.spacing[4],
  },
  bankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bankDate: {
    fontSize: 12,
  },
  bankNumber: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  bankAccountName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  bankActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
  },
});
