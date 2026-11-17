import { ShotRow } from '../db/schema';

export interface CleanSuggestionGroup {
  id: 'duplicates' | 'near_duplicates' | 'old_codes' | 'little_text' | 'old_chats' | 'older_than';
  title: string;
  description: string;
  shots: ShotRow[];
  preSelectedIds: string[];
}

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

export function findDuplicates(shots: ShotRow[]): { duplicates: ShotRow[]; toDeleteIds: string[] } {
  // Group by text_sig where text_sig is present and text_len >= 25
  const sigMap = new Map<string, ShotRow[]>();
  for (const shot of shots) {
    if (!shot.text_sig || shot.text_len < 25) continue;
    const existing = sigMap.get(shot.text_sig) || [];
    existing.push(shot);
    sigMap.set(shot.text_sig, existing);
  }

  const allDuplicates: ShotRow[] = [];
  const toDeleteIds: string[] = [];

  for (const [, group] of sigMap.entries()) {
    if (group.length > 1) {
      // Sort newest first
      group.sort((a, b) => b.created_at - a.created_at);
      // Keep newest (index 0), suggest the rest for deletion
      for (let i = 0; i < group.length; i++) {
        allDuplicates.push(group[i]);
        if (i > 0) {
          toDeleteIds.push(group[i].id);
        }
      }
    }
  }

  return { duplicates: allDuplicates, toDeleteIds };
}

export function findNearDuplicates(shots: ShotRow[]): { nearDuplicates: ShotRow[]; toDeleteIds: string[] } {
  // Jaccard similarity >= 0.9 on word sets for shots in the same primary category taken within 1 hour of each other
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const matchedIds = new Set<string>();
  const toDeleteIds = new Set<string>();

  // Group by primary_cat
  const byCat = new Map<string, ShotRow[]>();
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
          break; // Since sorted by created_at, no further shots will be within 1 hour
        }
        if (a.ocr_text && b.ocr_text) {
          const sim = computeJaccardSimilarity(a.ocr_text, b.ocr_text);
          if (sim >= 0.9) {
            matchedIds.add(a.id);
            matchedIds.add(b.id);
            // Suggest older one for deletion
            toDeleteIds.add(b.id);
          }
        }
      }
    }
  }

  const nearDuplicates = shots.filter((s) => matchedIds.has(s.id));
  return { nearDuplicates, toDeleteIds: Array.from(toDeleteIds) };
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
): ShotRow[] {
  const ageMs = ageMonths * 30 * 24 * 60 * 60 * 1000;
  const protectedCategories = new Set(['bank_details', 'receipt', 'id_document']);

  return shots.filter((s) => {
    if (now - s.created_at <= ageMs) return false;
    if (!includeSensitive && s.primary_cat && protectedCategories.has(s.primary_cat)) {
      return false;
    }
    return true;
  });
}
