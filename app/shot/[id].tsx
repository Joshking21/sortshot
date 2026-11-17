import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Calendar from 'expo-calendar';
import * as MediaLibrary from 'expo-media-library/legacy';
import { theme } from '../../src/theme';
import { strings } from '../../src/strings';
import { CategoryId, EntityRow, ShotRow } from '../../src/db/schema';
import { getEntitiesForShot, getShotById, markShotsGone, updateShotCategory } from '../../src/db/queries';
import { moveScreenshotToVault } from '../../src/vault/vault';
import { useProStore } from '../../src/pro/pro';
import { ActionCard, Button, Chip } from '../../src/ui';

const ALL_CATEGORIES: CategoryId[] = [
  'bank_details',
  'receipt',
  'chat',
  'event',
  'address',
  'link',
  'code',
  'id_document',
  'shopping',
  'other',
  'little_text',
];

export default function ShotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? theme.dark : theme.light;

  const [shot, setShot] = useState<ShotRow | null>(null);
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShotData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getShotById(id);
      if (data) {
        setShot(data);
        const ents = await getEntitiesForShot(data.id);
        setEntities(ents);
      }
    } catch (err) {
      console.warn('[ShotScreen] Error loading shot data', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadShotData();
  }, [loadShotData]);

  const showToast = (message: string) => {
    if (ToastAndroid.show) {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const handleCopy = async (text: string, label: string = 'Copied') => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(label);
  };

  const handleOpenLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.warn('Failed to open link:', err);
    }
  };

  const handleOpenMaps = async (address: string) => {
    const encoded = encodeURIComponent(address);
    const url = Platform.OS === 'ios' ? `http://maps.apple.com/?q=${encoded}` : `geo:0,0?q=${encoded}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('Failed to open maps:', err);
    }
  };

  const handleWhatsApp = async (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('Failed to open WhatsApp:', err);
    }
  };

  const handleCall = async (phone: string) => {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (err) {
      console.warn('Failed to start call:', err);
    }
  };

  const handleAddToCalendar = async (entity: EntityRow) => {
    try {
      const perm = await Calendar.requestCalendarPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Calendar access is required to add this event.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find((c) => c.allowsModifications) || calendars[0];
      if (!defaultCal) {
        Alert.alert('Error', 'No writable calendar found on device.');
        return;
      }

      // Title: first line of text
      const firstLine = shot?.ocr_text?.split('\n').find((l) => l.trim().length > 3) || 'Event from Screenshot';
      const eventDate = new Date(entity.value);

      const startDate = isNaN(eventDate.getTime()) ? new Date() : eventDate;
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      await Calendar.createEventAsync(defaultCal.id, {
        title: firstLine,
        startDate,
        endDate,
        notes: `Saved from Sortshot\n\n${shot?.ocr_text || ''}`,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Event added to calendar');
    } catch (err) {
      console.warn('Failed to add to calendar:', err);
      Alert.alert('Calendar Error', 'Could not create calendar event.');
    }
  };

  const handleChangeCategory = async (newCat: CategoryId) => {
    if (!shot) return;
    await updateShotCategory(shot.id, newCat);
    setShot({ ...shot, primary_cat: newCat });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showToast(`Folder changed to ${strings.folders[newCat]}`);
  };

  const handleDelete = async () => {
    if (!shot) return;
    Alert.alert('Delete Screenshot', 'Are you sure you want to delete this screenshot from your phone?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await MediaLibrary.deleteAssetsAsync([shot.id]);
            await markShotsGone([shot.id]);
            showToast(strings.shot.deletedToast);
            router.back();
          } catch (err) {
            console.warn('Failed to delete shot:', err);
          }
        },
      },
    ]);
  };

  const handleMoveToVault = async () => {
    if (!shot) return;
    const isPro = useProStore.getState().isPro;
    if (!isPro) {
      router.push('/pro');
      return;
    }

    Alert.alert(
      strings.shot.moveToVault,
      strings.vault.warning,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: async () => {
            const success = await moveScreenshotToVault(shot);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast(strings.shot.vaultedToast);
              router.back();
            } else {
              Alert.alert('Error', 'Failed to move screenshot to vault.');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!shot) return;
    try {
      await Share.share({
        message: shot.ocr_text || 'Screenshot from Sortshot',
        url: shot.uri,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  if (loading || !shot) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: currentTheme.bg }]}>
        <Text style={{ color: currentTheme.muted }}>Loading screenshot...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      {/* Screenshot Image View */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: shot.uri }}
          style={styles.fullImage}
          contentFit="contain"
          transition={300}
        />
      </View>

      <View style={styles.detailsContainer}>
        {/* Dynamic Action Cards */}
        {entities.map((ent, idx) => {
          const extra = ent.extra ? JSON.parse(ent.extra) : {};

          if (ent.type === 'account') {
            const bank = extra.bank || 'Bank Account';
            const acctName = extra.accountName || '';
            return (
              <ActionCard
                key={idx}
                icon="🏦"
                title={`${bank} · ${ent.value}`}
                subtitle={acctName}
                actionLabel={strings.shot.copyAccount}
                onPress={() => handleCopy(ent.value, strings.shot.copiedToast)}
                secondaryActionLabel={strings.shot.copyAll}
                onSecondaryPress={() => handleCopy([bank, ent.value, acctName].filter(Boolean).join('\n'), strings.shot.copiedToast)}
              />
            );
          }

          if (ent.type === 'amount') {
            return (
              <ActionCard
                key={idx}
                icon="💵"
                title={ent.label || `₦${ent.value}`}
                subtitle={extra.direction === 'out' ? 'Debit / Outgoing transfer' : 'Credit / Inflow'}
                actionLabel={strings.shot.copyAmount}
                onPress={() => handleCopy(ent.value, strings.shot.copiedToast)}
              />
            );
          }

          if (ent.type === 'date') {
            return (
              <ActionCard
                key={idx}
                icon="📅"
                title={ent.label || ent.value}
                subtitle="Event or transaction date"
                actionLabel={strings.shot.addToCalendar}
                onPress={() => handleAddToCalendar(ent)}
              />
            );
          }

          if (ent.type === 'address') {
            return (
              <ActionCard
                key={idx}
                icon="📍"
                title="Location"
                subtitle={ent.value}
                actionLabel={strings.shot.openInMaps}
                onPress={() => handleOpenMaps(ent.value)}
                secondaryActionLabel="Copy"
                onSecondaryPress={() => handleCopy(ent.value, strings.shot.copiedToast)}
              />
            );
          }

          if (ent.type === 'url') {
            return (
              <ActionCard
                key={idx}
                icon="🔗"
                title={ent.label || 'Web Link'}
                subtitle={ent.value}
                actionLabel={strings.shot.openLink}
                onPress={() => handleOpenLink(ent.value)}
                secondaryActionLabel="Copy"
                onSecondaryPress={() => handleCopy(ent.value, strings.shot.copiedToast)}
              />
            );
          }

          if (ent.type === 'phone') {
            return (
              <ActionCard
                key={idx}
                icon="📞"
                title={ent.value}
                subtitle="Phone Number"
                actionLabel={strings.shot.whatsapp}
                onPress={() => handleWhatsApp(ent.value)}
                secondaryActionLabel={strings.shot.call}
                onSecondaryPress={() => handleCall(ent.value)}
              />
            );
          }

          if (ent.type === 'code') {
            return (
              <ActionCard
                key={idx}
                icon="🔑"
                title={ent.label || `Code: ${ent.value}`}
                subtitle={`Trigger: ${extra.keyword || 'verification'}`}
                actionLabel={strings.shot.copyCode}
                onPress={() => handleCopy(ent.value, strings.shot.copiedToast)}
              />
            );
          }

          return null;
        })}

        {/* Folder Switcher Chips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.ink }]}>
            {strings.shot.changeFolder}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {ALL_CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={strings.folders[cat]}
                selected={shot.primary_cat === cat}
                onPress={() => handleChangeCategory(cat)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Recognized Text (Selectable) */}
        {shot.ocr_text ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.ink }]}>
              {strings.shot.recognizedText}
            </Text>
            <View style={[styles.textBox, { backgroundColor: currentTheme.card, borderColor: currentTheme.line }]}>
              <Text selectable style={[styles.ocrText, { color: currentTheme.ink }]}>
                {shot.ocr_text}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Bottom Action Bar */}
        <View style={styles.actionRow}>
          <Button
            title={strings.shot.moveToVault}
            variant="secondary"
            onPress={handleMoveToVault}
            style={styles.flexBtn}
          />
          <Button
            title={strings.shot.share}
            variant="ghost"
            onPress={handleShare}
            style={styles.flexBtn}
          />
          <Button
            title={strings.shot.delete}
            variant="danger"
            onPress={handleDelete}
            style={styles.flexBtn}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 380,
    backgroundColor: '#000000',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  detailsContainer: {
    padding: theme.spacing[4],
  },
  section: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[2],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: theme.spacing[2],
  },
  chipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  textBox: {
    padding: theme.spacing[3],
    borderRadius: theme.radius.base,
    borderWidth: 1,
  },
  ocrText: {
    fontSize: 14,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[8],
  },
  flexBtn: {
    flex: 1,
  },
});
