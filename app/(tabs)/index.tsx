import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/theme';
import { strings } from '../../src/strings';
import { CategoryId, ShotRow } from '../../src/db/schema';
import { getFolderCounts, getRecentShots } from '../../src/db/queries';
import { useScannerStore } from '../../src/scan/scannerStore';
import { initScannerLifecycle, runScanner } from '../../src/scan/scanner';
import { checkPhotoPermission, openSettings, requestPhotoPermission } from '../../src/scan/permissions';
import { Card, ProgressBar, Thumb } from '../../src/ui';
import { AdBanner } from '../../src/ads/AdBanner';

interface FolderTileConfig {
  id: CategoryId;
  name: string;
  icon: string;
}

const FOLDER_TILES: FolderTileConfig[] = [
  { id: 'bank_details', name: strings.folders.bank_details, icon: '🏦' },
  { id: 'receipt', name: strings.folders.receipt, icon: '🧾' },
  { id: 'chat', name: strings.folders.chat, icon: '💬' },
  { id: 'event', name: strings.folders.event, icon: '📅' },
  { id: 'address', name: strings.folders.address, icon: '📍' },
  { id: 'link', name: strings.folders.link, icon: '🔗' },
  { id: 'code', name: strings.folders.code, icon: '🔑' },
  { id: 'id_document', name: strings.folders.id_document, icon: '🪪' },
  { id: 'shopping', name: strings.folders.shopping, icon: '🛍️' },
  { id: 'other', name: strings.folders.other, icon: '📁' },
  { id: 'little_text', name: strings.folders.little_text, icon: '🖼️' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const [refreshing, setRefreshing] = useState(false);
  const [recentShots, setRecentShots] = useState<ShotRow[]>([]);

  const {
    isScanning,
    totalScreenshots,
    processedCount,
    folderCounts,
    isPartialAccess,
    setFolderCounts,
    setPartialAccess,
  } = useScannerStore();

  const loadData = useCallback(async () => {
    try {
      const counts = await getFolderCounts();
      setFolderCounts(counts);

      const recent = await getRecentShots(20);
      setRecentShots(recent);

      const perm = await checkPhotoPermission();
      setPartialAccess(perm.isPartial);
    } catch (err) {
      console.warn('[Home] Failed to load data:', err);
    }
  }, [setFolderCounts, setPartialAccess]);

  useEffect(() => {
    initScannerLifecycle();
    loadData();
    // Trigger initial scan
    runScanner(false).then(() => loadData());
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await runScanner(true);
    await loadData();
    setRefreshing(false);
  };

  const handleFixPartialAccess = async () => {
    const res = await requestPhotoPermission();
    if (!res.granted || res.isPartial) {
      await openSettings();
    } else {
      setPartialAccess(false);
      runScanner(false);
    }
  };

  const progressPercent = totalScreenshots > 0 ? processedCount / totalScreenshots : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentTheme.bg }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.brand} />
      }
    >
      {/* Partial Access Banner */}
      {isPartialAccess && (
        <View style={[styles.partialBanner, { backgroundColor: currentTheme.warningSoft, borderColor: currentTheme.warning }]}>
          <Text style={[styles.partialText, { color: currentTheme.ink }]}>
            {strings.home.partialAccessBanner}
          </Text>
          <Pressable
            onPress={handleFixPartialAccess}
            style={[styles.partialBtn, { backgroundColor: currentTheme.warning }]}
          >
            <Text style={styles.partialBtnText}>{strings.home.allowAllPhotos}</Text>
          </Pressable>
        </View>
      )}

      {/* Search Bar Bar Tap */}
      <View style={styles.searchSection}>
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel={strings.home.searchPlaceholder}
          style={[styles.searchBar, { backgroundColor: currentTheme.card, borderColor: currentTheme.line }]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={[styles.searchPlaceholder, { color: currentTheme.muted }]}>
            {strings.home.searchPlaceholder}
          </Text>
        </Pressable>
      </View>

      {/* Progress Card During Scan */}
      {isScanning && (
        <View style={styles.progressSection}>
          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressTitle, { color: currentTheme.ink }]}>
                {strings.home.scanningStatus(processedCount, totalScreenshots)}
              </Text>
              <Text style={[styles.progressPercent, { color: currentTheme.brand }]}>
                {Math.round(progressPercent * 100)}%
              </Text>
            </View>
            <ProgressBar progress={progressPercent} height={8} />
          </Card>
        </View>
      )}

      {/* Folders Grid */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: currentTheme.ink }]}>Smart Folders</Text>
      </View>

      <View style={styles.foldersGrid}>
        {FOLDER_TILES.map((tile) => {
          const count = folderCounts[tile.id] || 0;
          return (
            <Pressable
              key={tile.id}
              onPress={() => router.push(`/folder/${tile.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${tile.name}, ${count} screenshots`}
              style={({ pressed }) => [
                styles.tile,
                {
                  backgroundColor: currentTheme.card,
                  borderColor: currentTheme.line,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: currentTheme.brandSoft }]}>
                <Text style={styles.tileIcon}>{tile.icon}</Text>
              </View>
              <Text style={[styles.tileName, { color: currentTheme.ink }]} numberOfLines={1}>
                {tile.name}
              </Text>
              <Text style={[styles.tileCount, { color: currentTheme.muted }]}>
                {count.toLocaleString()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Recently Added Strip */}
      {recentShots.length > 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTheme.ink }]}>
              {strings.home.recentlyAdded}
            </Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recentShots}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.recentList}
            renderItem={({ item }) => (
              <View style={styles.recentThumbWrapper}>
                <Thumb
                  uri={item.uri}
                  onPress={() => router.push(`/shot/${item.id}`)}
                  aspectRatio={0.75}
                />
              </View>
            )}
          />
        </View>
      )}

      {/* Banner Ad (Free Users Only) */}
      <View style={{ marginTop: theme.spacing[4], alignItems: 'center' }}>
        <AdBanner />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
    paddingBottom: theme.spacing[2],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: theme.radius.base,
    borderWidth: 1,
    paddingHorizontal: theme.spacing[3],
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchPlaceholder: {
    fontSize: 15,
  },
  partialBanner: {
    margin: theme.spacing[4],
    marginBottom: 0,
    padding: theme.spacing[3],
    borderRadius: theme.radius.base,
    borderWidth: 1,
  },
  partialText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  partialBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
  },
  partialBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressSection: {
    paddingHorizontal: theme.spacing[4],
    marginTop: theme.spacing[2],
  },
  progressCard: {
    padding: theme.spacing[4],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[2],
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  foldersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing[3],
    gap: 8,
  },
  tile: {
    width: '31.5%',
    borderRadius: theme.radius.base,
    borderWidth: 1,
    padding: theme.spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 104,
  },
  tileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileIcon: {
    fontSize: 20,
  },
  tileName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  tileCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  recentSection: {
    marginTop: theme.spacing[2],
  },
  recentList: {
    paddingHorizontal: theme.spacing[4],
    gap: 10,
  },
  recentThumbWrapper: {
    width: 84,
  },
});
