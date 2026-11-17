import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  View,
  useColorScheme,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Haptics from 'expo-haptics';
import { theme } from '../../src/theme';
import { strings } from '../../src/strings';
import { ShotRow } from '../../src/db/schema';
import { getActiveShotsForCleanup, markShotsGone } from '../../src/db/queries';
import {
  CleanSuggestionCardData,
  buildAllCleanupSuggestions,
} from '../../src/clean/suggestions';
import {
  addRewardedCleanBonus,
  getDailyCleanLimitInfo,
  recordCleanDeletions,
} from '../../src/clean/limits';
import { Button, Card, Chip, EmptyState, Thumb } from '../../src/ui';

export default function CleanScreen() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const [shots, setShots] = useState<ShotRow[]>([]);
  const [cards, setCards] = useState<CleanSuggestionCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Daily limit state
  const [usedToday, setUsedToday] = useState(0);
  const [limitToday, setLimitToday] = useState(100);
  const [remainingToday, setRemainingToday] = useState(100);

  // Options for "Everything older than..."
  const [olderAgeMonths, setOlderAgeMonths] = useState<number>(6);
  const [includeSensitive, setIncludeSensitive] = useState<boolean>(false);

  // Active Review State
  const [reviewCard, setReviewCard] = useState<CleanSuggestionCardData | null>(null);
  const [reviewSelectedIds, setReviewSelectedIds] = useState<Set<string>>(new Set());

  const loadCleanData = useCallback(async () => {
    try {
      const active = await getActiveShotsForCleanup();
      setShots(active);

      const limitInfo = await getDailyCleanLimitInfo(false);
      setUsedToday(limitInfo.usedToday);
      setLimitToday(limitInfo.totalLimitToday);
      setRemainingToday(limitInfo.remainingToday);

      const suggestions = buildAllCleanupSuggestions(active, olderAgeMonths, includeSensitive);
      setCards(suggestions);
    } catch (err) {
      console.warn('[CleanScreen] Failed to load clean data:', err);
    } finally {
      setLoading(false);
    }
  }, [olderAgeMonths, includeSensitive]);

  useEffect(() => {
    loadCleanData();
  }, [loadCleanData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCleanData();
    setRefreshing(false);
  };

  const showToast = (message: string) => {
    if (ToastAndroid.show) {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const handleOpenReview = (card: CleanSuggestionCardData) => {
    setReviewCard(card);
    setReviewSelectedIds(new Set(card.preSelectedIds));
  };

  const handleToggleReviewItem = (id: string) => {
    const next = new Set(reviewSelectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setReviewSelectedIds(next);
  };

  const handleSelectAllReview = () => {
    if (!reviewCard) return;
    const all = new Set(reviewCard.shots.map((s) => s.id));
    setReviewSelectedIds(all);
  };

  const handleDeselectAllReview = () => {
    setReviewSelectedIds(new Set());
  };

  const handleWatchAdBonus = async () => {
    // In Phase 3 mock/prepare rewarded ad; in Phase 4 AdMob is linked
    await addRewardedCleanBonus(100);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Bonus unlocked! You can clean 100 more today.');
    await loadCleanData();
  };

  const handleConfirmDelete = async () => {
    const idsToDelete = Array.from(reviewSelectedIds);
    if (idsToDelete.length === 0) return;

    if (idsToDelete.length > remainingToday) {
      Alert.alert(
        'Daily Limit Reached',
        `Free tier limit allows up to ${remainingToday} more deletions today. Watch a short ad to clean 100 more today, or upgrade to Sortshot Pro.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Watch Ad (+100)', onPress: handleWatchAdBonus },
        ]
      );
      return;
    }

    Alert.alert(
      'Delete Screenshots',
      `Delete ${idsToDelete.length} screenshots from your device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MediaLibrary.deleteAssetsAsync(idsToDelete);
              await markShotsGone(idsToDelete);
              await recordCleanDeletions(idsToDelete.length);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast(`Deleted ${idsToDelete.length} screenshots`);
              setReviewCard(null);
              await loadCleanData();
            } catch (err) {
              console.warn('[Clean] Deletion was cancelled or failed in OS dialog:', err);
            }
          },
        },
      ]
    );
  };

  const totalFreeableMb = cards.reduce((acc, c) => acc + c.estimatedMb, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentTheme.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.brand} />
      }
    >
      {/* Overview Card */}
      <Card style={styles.overviewCard}>
        <View style={styles.overviewRow}>
          <View>
            <Text style={[styles.overviewTitle, { color: currentTheme.ink }]}>
              {strings.clean.title}
            </Text>
            <Text style={[styles.overviewSubtitle, { color: currentTheme.muted }]}>
              {strings.clean.freeUpEstimate(totalFreeableMb)}
            </Text>
          </View>
          <View style={[styles.mbBadge, { backgroundColor: currentTheme.brandSoft }]}>
            <Text style={[styles.mbBadgeText, { color: currentTheme.brand }]}>
              ~{totalFreeableMb} MB
            </Text>
          </View>
        </View>

        {/* Free Tier Daily Limit Tracker */}
        <View style={[styles.limitBox, { backgroundColor: currentTheme.cardSubtle, borderColor: currentTheme.line }]}>
          <View style={styles.limitHeader}>
            <Text style={[styles.limitTitle, { color: currentTheme.ink }]}>
              Daily free deletions: {usedToday} of {limitToday} used
            </Text>
            <Text style={[styles.limitRemaining, { color: remainingToday === 0 ? currentTheme.danger : currentTheme.success }]}>
              {remainingToday} left
            </Text>
          </View>

          {remainingToday <= 0 && (
            <View style={styles.rewardedPromptRow}>
              <Text style={[styles.rewardedPromptText, { color: currentTheme.ink }]}>
                {strings.clean.rewardedPrompt}
              </Text>
              <Button
                title={strings.clean.watchAd}
                size="sm"
                onPress={handleWatchAdBonus}
              />
            </View>
          )}
        </View>
      </Card>

      {/* Suggestion Cards */}
      {cards.length === 0 && !loading ? (
        <EmptyState
          icon="✨"
          title="All clean!"
          subtitle="No duplicates, expired OTPs, or junk screenshots found right now."
        />
      ) : (
        cards.map((card) => (
          <Card key={card.id} style={styles.suggestionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={[styles.cardTitle, { color: currentTheme.ink }]}>
                  {card.title}
                </Text>
                <Text style={[styles.cardSubtitle, { color: currentTheme.muted }]}>
                  {card.description}
                </Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: currentTheme.cardSubtle }]}>
                <Text style={[styles.countBadgeText, { color: currentTheme.ink }]}>
                  {card.count}
                </Text>
              </View>
            </View>

            {/* Thumbnail Preview Row (up to 6) */}
            <View style={styles.previewRow}>
              {card.previewUris.map((uri, idx) => (
                <View key={idx} style={styles.previewThumb}>
                  <Thumb uri={uri} onPress={() => handleOpenReview(card)} />
                </View>
              ))}
            </View>

            {/* Age Filter Controls if "Older than..." card */}
            {card.id === 'older_than' && (
              <View style={styles.filterControls}>
                <View style={styles.ageChips}>
                  {[6, 12, 24].map((m) => (
                    <Chip
                      key={m}
                      label={m >= 12 ? `${m / 12} yr` : `${m} mos`}
                      selected={olderAgeMonths === m}
                      onPress={() => setOlderAgeMonths(m)}
                    />
                  ))}
                </View>
                <View style={styles.sensitiveToggleRow}>
                  <Text style={[styles.sensitiveLabel, { color: currentTheme.muted }]}>
                    Include bank details, receipts, & IDs:
                  </Text>
                  <Switch
                    value={includeSensitive}
                    onValueChange={setIncludeSensitive}
                    trackColor={{ false: currentTheme.line, true: currentTheme.brand }}
                  />
                </View>
              </View>
            )}

            {/* Review Button */}
            <View style={styles.cardFooter}>
              <Text style={[styles.cardSizeText, { color: currentTheme.muted }]}>
                Frees ~{card.estimatedMb} MB
              </Text>
              <Button
                title={strings.clean.review}
                size="sm"
                onPress={() => handleOpenReview(card)}
              />
            </View>
          </Card>
        ))
      )}

      {/* Review Modal */}
      {reviewCard && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setReviewCard(null)}
        >
          <View style={[styles.reviewContainer, { backgroundColor: currentTheme.bg }]}>
            {/* Modal Header */}
            <View style={[styles.reviewHeader, { backgroundColor: currentTheme.card, borderBottomColor: currentTheme.line }]}>
              <View>
                <Text style={[styles.reviewTitle, { color: currentTheme.ink }]}>
                  {reviewCard.title}
                </Text>
                <Text style={[styles.reviewSubtitle, { color: currentTheme.muted }]}>
                  {reviewSelectedIds.size} of {reviewCard.shots.length} selected
                </Text>
              </View>
              <Button
                title="Close"
                variant="ghost"
                size="sm"
                onPress={() => setReviewCard(null)}
              />
            </View>

            {/* Quick Select Actions */}
            <View style={[styles.quickSelectBar, { backgroundColor: currentTheme.cardSubtle }]}>
              <Pressable onPress={handleSelectAllReview}>
                <Text style={[styles.quickSelectText, { color: currentTheme.brand }]}>Select all</Text>
              </Pressable>
              <Pressable onPress={handleDeselectAllReview}>
                <Text style={[styles.quickSelectText, { color: currentTheme.muted }]}>Deselect all</Text>
              </Pressable>
            </View>

            {/* 3-Column Review Grid */}
            <FlatList
              data={reviewCard.shots}
              numColumns={3}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.reviewGrid}
              renderItem={({ item }) => {
                const isSelected = reviewSelectedIds.has(item.id);
                return (
                  <View style={styles.gridItemWrapper}>
                    <Thumb
                      uri={item.uri}
                      selected={isSelected}
                      isSelecting={true}
                      onPress={() => handleToggleReviewItem(item.id)}
                      aspectRatio={1}
                    />
                  </View>
                );
              }}
            />

            {/* Sticky Bottom Action */}
            <View style={[styles.reviewFooter, { backgroundColor: currentTheme.card, borderTopColor: currentTheme.line }]}>
              <View style={styles.footerLimitInfo}>
                <Text style={[styles.footerLimitText, { color: currentTheme.muted }]}>
                  {remainingToday} deletions remaining today
                </Text>
              </View>
              <Button
                title={strings.clean.deleteN(reviewSelectedIds.size)}
                variant="danger"
                size="lg"
                disabled={reviewSelectedIds.size === 0}
                onPress={handleConfirmDelete}
              />
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing[4],
    gap: 16,
    paddingBottom: 40,
  },
  overviewCard: {
    padding: theme.spacing[4],
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  overviewTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
  },
  mbBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  mbBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  limitBox: {
    padding: theme.spacing[3],
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  limitRemaining: {
    fontSize: 13,
    fontWeight: '700',
  },
  rewardedPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  rewardedPromptText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  suggestionCard: {
    padding: theme.spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: theme.spacing[4],
  },
  previewThumb: {
    flex: 1,
    aspectRatio: 1,
  },
  filterControls: {
    marginBottom: theme.spacing[3],
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  ageChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sensitiveToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sensitiveLabel: {
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  cardSizeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reviewContainer: {
    flex: 1,
  },
  reviewHeader: {
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  reviewSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  quickSelectBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: 8,
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reviewGrid: {
    padding: 6,
  },
  gridItemWrapper: {
    flex: 1 / 3,
    padding: 4,
  },
  reviewFooter: {
    padding: theme.spacing[4],
    borderTopWidth: 1,
  },
  footerLimitInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  footerLimitText: {
    fontSize: 12,
  },
});
