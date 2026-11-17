import * as MediaLibrary from 'expo-media-library/legacy';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { getFolderCounts, getPendingShots, insertPendingShots, markMissingShotsGone, markOcrFailed, saveOcrResult } from '../db/queries';
import { classifyText, generateTextSignature } from '../classify/classify';
import { recognizeTextFromUri } from './ocr';
import { useScannerStore } from './scannerStore';
import { checkPhotoPermission } from './permissions';

const CONCURRENT_JOBS = 2;
const PROGRESS_THROTTLE_MS = 250;

let isScannerActive = false;
let shouldPause = false;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export async function collectScreenshotAssets(): Promise<MediaLibrary.Asset[]> {
  const assetMap = new Map<string, MediaLibrary.Asset>();

  // iOS native screenshot subtype detection
  if (Platform.OS === 'ios') {
    let hasNextPage = true;
    let endCursor: string | undefined;

    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        first: 100,
        after: endCursor,
        mediaType: 'photo',
        mediaSubtypes: ['screenshot'],
        sortBy: [['creationTime', false]],
      });

      for (const asset of page.assets) {
        assetMap.set(asset.id, asset);
      }

      hasNextPage = page.hasNextPage;
      endCursor = page.endCursor;
    }

    return Array.from(assetMap.values());
  }

  // Android & generic logic:
  // 1. Check albums matching 'screenshot'
  try {
    const albums = await MediaLibrary.getAlbumsAsync();
    const screenshotAlbums = albums.filter((a: MediaLibrary.Album) => /screenshot/i.test(a.title));

    for (const album of screenshotAlbums) {
      let hasNextPage = true;
      let endCursor: string | undefined;

      while (hasNextPage) {
        const page = await MediaLibrary.getAssetsAsync({
          first: 100,
          after: endCursor,
          album: album,
          mediaType: 'photo',
          sortBy: [['creationTime', false]],
        });

        for (const asset of page.assets) {
          assetMap.set(asset.id, asset);
        }

        hasNextPage = page.hasNextPage;
        endCursor = page.endCursor;
      }
    }
  } catch (err) {
    console.warn('[Scanner] Failed querying albums', err);
  }

  // 2. Also check camera roll for assets whose filename starts with 'screenshot'
  try {
    let hasNextPage = true;
    let endCursor: string | undefined;
    let fetched = 0;
    const MAX_ROLL_CHECK = 1000;

    while (hasNextPage && fetched < MAX_ROLL_CHECK) {
      const page = await MediaLibrary.getAssetsAsync({
        first: 100,
        after: endCursor,
        mediaType: 'photo',
        sortBy: [['creationTime', false]],
      });

      fetched += page.assets.length;
      for (const asset of page.assets) {
        if (/^screenshot/i.test(asset.filename)) {
          assetMap.set(asset.id, asset);
        }
      }

      hasNextPage = page.hasNextPage;
      endCursor = page.endCursor;
    }
  } catch (err) {
    console.warn('[Scanner] Failed checking camera roll', err);
  }

  // Sort newest first
  const allScreenshots = Array.from(assetMap.values());
  allScreenshots.sort((a, b) => b.creationTime - a.creationTime);
  return allScreenshots;
}

export function initScannerLifecycle(): void {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'background' || nextState === 'inactive') {
      shouldPause = true;
      useScannerStore.getState().setPaused(true);
    } else if (nextState === 'active') {
      shouldPause = false;
      useScannerStore.getState().setPaused(false);
      // Resume scanner if pending rows remain
      if (!isScannerActive) {
        runScanner();
      }
    }
  });
}

export async function runScanner(isIncremental = false): Promise<void> {
  if (isScannerActive) return;

  const permission = await checkPhotoPermission();
  useScannerStore.getState().setPartialAccess(permission.isPartial);
  if (!permission.granted) {
    return;
  }

  isScannerActive = true;
  useScannerStore.getState().setScanning(true);
  const startTime = Date.now();

  try {
    // 1. Collect all screenshot assets from device
    const assets = await collectScreenshotAssets();
    const activeIds = assets.map((a) => a.id);

    // 2. Insert unseen assets into DB as 'pending'
    const pendingPayload = assets.map((a) => ({
      id: a.id,
      uri: a.uri,
      filename: a.filename || null,
      created_at: a.creationTime,
      modified_at: a.modificationTime || null,
      width: a.width,
      height: a.height,
    }));
    await insertPendingShots(pendingPayload);

    // Mark photos removed from device as gone
    await markMissingShotsGone(activeIds);

    // Refresh folder counts
    const initialCounts = await getFolderCounts();
    useScannerStore.getState().setFolderCounts(initialCounts);

    // 3. Process pending queue with concurrency
    let pendingRows = await getPendingShots(500);
    const totalToProcess = pendingRows.length;
    let completedInRun = 0;
    let lastProgressEmit = Date.now();

    useScannerStore.getState().setProgress(0, totalToProcess);

    while (pendingRows.length > 0 && !shouldPause) {
      const batch = pendingRows.splice(0, CONCURRENT_JOBS);

      await Promise.all(
        batch.map(async (shot) => {
          if (shouldPause) return;

          try {
            // Get local file URI for ML Kit
            let localUri = shot.uri;
            try {
              const info = await MediaLibrary.getAssetInfoAsync(shot.id);
              if (info?.localUri) {
                localUri = info.localUri;
              }
            } catch {
              // fallback to shot.uri
            }

            // Run OCR
            const ocr = await recognizeTextFromUri(localUri);
            const ocrText = ocr.text;

            // Classify & Extract
            const classification = classifyText(ocrText, shot.created_at);
            const textSig = generateTextSignature(ocrText);

            // Save in one SQLite transaction
            await saveOcrResult(
              shot.id,
              ocrText,
              textSig,
              classification.primary,
              classification.cats,
              classification.sensitive,
              classification.entities
            );

            completedInRun++;
          } catch (err) {
            console.error(`[Scanner] Error processing shot ${shot.id}:`, err);
            await markOcrFailed(shot.id);
          }
        })
      );

      // Throttle progress emissions
      const now = Date.now();
      if (now - lastProgressEmit >= PROGRESS_THROTTLE_MS || pendingRows.length === 0) {
        const counts = await getFolderCounts();
        useScannerStore.getState().setFolderCounts(counts);
        useScannerStore.getState().setProgress(completedInRun, totalToProcess);
        lastProgressEmit = now;
      }

      // If pendingRows is exhausted, check if new pending entries arrived
      if (pendingRows.length === 0 && !shouldPause) {
        pendingRows = await getPendingShots(500);
      }
    }

    const durationMs = Date.now() - startTime;
    const speed = completedInRun > 0 && durationMs > 0 ? completedInRun / (durationMs / 1000) : 0;
    useScannerStore.getState().setPerformanceMetrics(durationMs, speed);
  } catch (err) {
    console.error('[Scanner] Critical pipeline failure', err);
  } finally {
    isScannerActive = false;
    useScannerStore.getState().setScanning(false);
    const finalCounts = await getFolderCounts();
    useScannerStore.getState().setFolderCounts(finalCounts);
  }
}
