import { CategoryId, ShotRow } from '../db/schema';

export interface CleanSuggestionCardData {
  id: 'duplicates' | 'near_duplicates' | 'old_codes' | 'little_text' | 'old_chats' | 'older_than';
  title: string;
  description: string;
  count: number;
  estimatedMb: number;
  previewUris: string[];
  shots: ShotRow[];
  preSelectedIds: string[];
}

export const ESTIMATED_MB_PER_SHOT = 1.8;

export function computeJaccardSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter((w) => w.length > 2));

  if (wordsA.size === 0 && wordsB.size === 0) return 1.0;
  if (wordsA.size === 0 || wordsB.size === 0) return 0.0;

  let intersectionSize = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) {
      intersectionSize++;
    }
  }

  const unionSize = wordsA.size + wordsB.size - intersectionSize;
  return intersectionSize / unionSize;
}

export function findDuplicates(shots: ShotRow[]): { allShots: ShotRow[]; toDeleteIds: string[] } {
  const sigMap = new Map<string, ShotRow[]>();

  for (const shot of shots) {
    if (!shot.text_sig || shot.text_len < 25) continue;
    const existing = sigMap.get(shot.text_sig) || [];
    existing.push(shot);
    sigMap.set(shot.text_sig, existing);
  }

  const allShots: ShotRow[] = [];
  const toDeleteIds: string[] = [];

  for (const [, group] of sigMap.entries()) {
    if (group.length > 1) {
      // Sort newest first
      group.sort((a, b) => b.created_at - a.created_at);
      // Keep newest (group[0]), suggest the rest for deletion
      for (let i = 0; i < group.length; i++) {
        allShots.push(group[i]);
        if (i > 0) {
          toDeleteIds.push(group[i].id);
        }
      }
    }
  }

  return { allShots, toDeleteIds };
}

export function findNearDuplicates(shots: ShotRow[]): { allShots: ShotRow[]; toDeleteIds: string[] } {
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const matchedIds = new Set<string>();
  const toDeleteIds = new Set<string>();

  const byCat = new Map<CategoryId, ShotRow[]>();
  for (const s of shots) {
    if (!s.primary_cat || !s.ocr_text || s.text_len < 25) continue;
    const group = byCat.get(s.primary_cat) || [];
    group.push(s);
    byCat.set(s.primary_cat, group);
  }

  for (const [, catShots] of byCat.entries()) {
    catShots.sort((a, b) => b.created_at - a.created_at);
    for (let i = 0; i < catShots.length; i++) {
      for (let j = i + 1; j < catShots.length; j++) {
        const a = catShots[i];
        const b = catShots[j];
        if (Math.abs(a.created_at - b.created_at) > ONE_HOUR_MS) {
          break;
        }
        if (a.ocr_text && b.ocr_text) {
          const sim = computeJaccardSimilarity(a.ocr_text, b.ocr_text);
          if (sim >= 0.9) {
            matchedIds.add(a.id);
            matchedIds.add(b.id);

            // Never pre-select sensitive categories in near duplicates
            const isProtected =
              b.primary_cat === 'bank_details' ||
              b.primary_cat === 'receipt' ||
              b.primary_cat === 'id_document';
            if (!isProtected) {
              toDeleteIds.add(b.id);
            }
          }
        }
      }
    }
  }

  const allShots = shots.filter((s) => matchedIds.has(s.id));
  return { allShots, toDeleteIds: Array.from(toDeleteIds) };
}

export function findOldCodes(shots: ShotRow[], now = Date.now()): ShotRow[] {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  return shots.filter((s) => s.primary_cat === 'code' && now - s.created_at > SEVEN_DAYS_MS);
}

export function findLittleTextOld(shots: ShotRow[], now = Date.now()): ShotRow[] {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return shots.filter((s) => s.primary_cat === 'little_text' && now - s.created_at > THIRTY_DAYS_MS);
}

export function findOldChats(shots: ShotRow[], now = Date.now()): ShotRow[] {
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  return shots.filter((s) => s.primary_cat === 'chat' && now - s.created_at > NINETY_DAYS_MS);
}

export function findOlderThan(
  shots: ShotRow[],
  ageMonths: number,
  includeSensitive = false,
  now = Date.now()
): { eligibleShots: ShotRow[]; preSelectedIds: string[] } {
  const ageMs = ageMonths * 30 * 24 * 60 * 60 * 1000;
  const protectedCategories = new Set(['bank_details', 'receipt', 'id_document']);

  const eligibleShots: ShotRow[] = [];
  const preSelectedIds: string[] = [];

  for (const s of shots) {
    if (now - s.created_at > ageMs) {
      const isProtected = s.primary_cat && protectedCategories.has(s.primary_cat);
      if (isProtected) {
        if (includeSensitive) {
          eligibleShots.push(s);
          // Never pre-select protected items even when included in the list
        }
      } else {
        eligibleShots.push(s);
        preSelectedIds.push(s.id);
      }
    }
  }

  return { eligibleShots, preSelectedIds };
}

export function buildAllCleanupSuggestions(
  allShots: ShotRow[],
  olderThanMonths = 6,
  includeSensitiveOlderThan = false,
  now = Date.now()
): CleanSuggestionCardData[] {
  const result: CleanSuggestionCardData[] = [];

  // 1. Duplicates
  const dupResult = findDuplicates(allShots);
  if (dupResult.toDeleteIds.length > 0) {
    result.push({
      id: 'duplicates',
      title: 'Exact duplicates',
      description: 'Identical captures. Keeps newest, suggests deleting the rest.',
      count: dupResult.toDeleteIds.length,
      estimatedMb: Math.round(dupResult.toDeleteIds.length * ESTIMATED_MB_PER_SHOT),
      previewUris: dupResult.allShots.slice(0, 6).map((s) => s.uri),
      shots: dupResult.allShots,
      preSelectedIds: dupResult.toDeleteIds,
    });
  }

  // 2. Near duplicates
  const nearResult = findNearDuplicates(allShots);
  if (nearResult.toDeleteIds.length > 0) {
    result.push({
      id: 'near_duplicates',
      title: 'Near duplicates',
      description: 'Very similar screenshots captured within 1 hour.',
      count: nearResult.toDeleteIds.length,
      estimatedMb: Math.round(nearResult.toDeleteIds.length * ESTIMATED_MB_PER_SHOT),
      previewUris: nearResult.allShots.slice(0, 6).map((s) => s.uri),
      shots: nearResult.allShots,
      preSelectedIds: nearResult.toDeleteIds,
    });
  }

  // 3. Old codes & OTPs
  const oldCodes = findOldCodes(allShots, now);
  if (oldCodes.length > 0) {
    result.push({
      id: 'old_codes',
      title: 'Old codes & OTPs',
      description: 'Verification codes and OTP screenshots older than 7 days.',
      count: oldCodes.length,
      estimatedMb: Math.round(oldCodes.length * ESTIMATED_MB_PER_SHOT),
      previewUris: oldCodes.slice(0, 6).map((s) => s.uri),
      shots: oldCodes,
      preSelectedIds: oldCodes.map((s) => s.id),
    });
  }

  // 4. Little or no text
  const littleText = findLittleTextOld(allShots, now);
  if (littleText.length > 0) {
    result.push({
      id: 'little_text',
      title: 'Little or no text',
      description: 'Memes, accidental snaps, and graphics older than 30 days.',
      count: littleText.length,
      estimatedMb: Math.round(littleText.length * ESTIMATED_MB_PER_SHOT),
      previewUris: littleText.slice(0, 6).map((s) => s.uri),
      shots: littleText,
      preSelectedIds: littleText.map((s) => s.id),
    });
  }

  // 5. Old chats
  const oldChats = findOldChats(allShots, now);
  if (oldChats.length > 0) {
    result.push({
      id: 'old_chats',
      title: 'Old chats',
      description: 'WhatsApp and messaging conversations older than 90 days.',
      count: oldChats.length,
      estimatedMb: Math.round(oldChats.length * ESTIMATED_MB_PER_SHOT),
      previewUris: oldChats.slice(0, 6).map((s) => s.uri),
      shots: oldChats,
      preSelectedIds: oldChats.map((s) => s.id),
    });
  }

  // 6. Everything older than...
  const olderResult = findOlderThan(allShots, olderThanMonths, includeSensitiveOlderThan, now);
  if (olderResult.eligibleShots.length > 0) {
    const ageLabel = olderThanMonths >= 12 ? `${olderThanMonths / 12} year(s)` : `${olderThanMonths} months`;
    result.push({
      id: 'older_than',
      title: `Older than ${ageLabel}`,
      description: `Screenshots older than ${ageLabel} (excluding protected receipts, bank details, and IDs).`,
      count: olderResult.eligibleShots.length,
      estimatedMb: Math.round(olderResult.eligibleShots.length * ESTIMATED_MB_PER_SHOT),
      previewUris: olderResult.eligibleShots.slice(0, 6).map((s) => s.uri),
      shots: olderResult.eligibleShots,
      preSelectedIds: olderResult.preSelectedIds,
    });
  }

  return result;
}
