import {
  buildAllCleanupSuggestions,
  computeJaccardSimilarity,
  findDuplicates,
  findLittleTextOld,
  findNearDuplicates,
  findOldChats,
  findOldCodes,
  findOlderThan,
} from '../src/clean/suggestions';
import { ShotRow } from '../src/db/schema';

describe('Cleanup Suggestions Engine', () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const mockShot = (overrides: Partial<ShotRow>): ShotRow => ({
    id: 'shot-1',
    uri: 'file:///data/shot1.png',
    filename: 'screenshot1.png',
    created_at: now,
    modified_at: null,
    width: 1080,
    height: 2400,
    ocr_status: 'done',
    ocr_text: 'sample text',
    text_len: 30,
    text_sig: 'sampletextsig123',
    primary_cat: 'other',
    cats: '["other"]',
    sensitive: 0,
    vaulted: 0,
    vault_path: null,
    gone: 0,
    processed_at: now,
    ...overrides,
  });

  describe('Jaccard Similarity', () => {
    it('computes 1.0 for identical word sets', () => {
      const sim = computeJaccardSimilarity('transfer successful to tunde', 'transfer successful to tunde');
      expect(sim).toBe(1.0);
    });

    it('computes high similarity for near-duplicate texts', () => {
      const textA = 'Payment of 50000 naira successful to Chidinma Obi via GTBank transfer terminal';
      const textB = 'Payment of 50000 naira successful to Chidinma Obi via GTBank transfer';
      const sim = computeJaccardSimilarity(textA, textB);
      expect(sim).toBeGreaterThanOrEqual(0.8);
    });

    it('computes 0.0 for completely disjoint word sets', () => {
      const sim = computeJaccardSimilarity('banana apple mango', 'computer keyboard monitor');
      expect(sim).toBe(0.0);
    });
  });

  describe('Exact Duplicates Detection', () => {
    it('identifies shots with identical text_sig, keeps newest and suggests older for deletion', () => {
      const shotNewer = mockShot({
        id: 'dup-new',
        created_at: now,
        text_sig: 'identicalsignaturesig',
        text_len: 50,
      });
      const shotOlder = mockShot({
        id: 'dup-old',
        created_at: now - 5000,
        text_sig: 'identicalsignaturesig',
        text_len: 50,
      });

      const { allShots, toDeleteIds } = findDuplicates([shotOlder, shotNewer]);
      expect(allShots.length).toBe(2);
      expect(toDeleteIds).toContain('dup-old');
      expect(toDeleteIds).not.toContain('dup-new');
    });

    it('ignores shots with text_len < 25', () => {
      const shot1 = mockShot({ id: 's1', text_sig: 'short', text_len: 5 });
      const shot2 = mockShot({ id: 's2', text_sig: 'short', text_len: 5 });

      const { allShots, toDeleteIds } = findDuplicates([shot1, shot2]);
      expect(allShots.length).toBe(0);
      expect(toDeleteIds.length).toBe(0);
    });
  });

  describe('Near Duplicates Detection', () => {
    it('detects near duplicates taken within 1 hour in the same category', () => {
      const textA = 'Delivery confirmation to 14 Admiralty Way Lekki Phase 1 near supermarket rider arrived';
      const textB = 'Delivery confirmation to 14 Admiralty Way Lekki Phase 1 near supermarket rider';

      const shot1 = mockShot({
        id: 'near-1',
        primary_cat: 'address',
        ocr_text: textA,
        created_at: now,
      });
      const shot2 = mockShot({
        id: 'near-2',
        primary_cat: 'address',
        ocr_text: textB,
        created_at: now - 10 * 60 * 1000, // 10 minutes earlier
      });

      const { allShots, toDeleteIds } = findNearDuplicates([shot1, shot2]);
      expect(allShots.length).toBe(2);
      expect(toDeleteIds).toContain('near-2');
    });

    it('does not pre-select protected categories in near duplicates', () => {
      const textA = 'GTBank account 0123456789 transfer details for Ada Obi';
      const textB = 'GTBank account 0123456789 transfer details for Ada';

      const shot1 = mockShot({
        id: 'bank-1',
        primary_cat: 'bank_details',
        ocr_text: textA,
        created_at: now,
      });
      const shot2 = mockShot({
        id: 'bank-2',
        primary_cat: 'bank_details',
        ocr_text: textB,
        created_at: now - 5 * 60 * 1000,
      });

      const { toDeleteIds } = findNearDuplicates([shot1, shot2]);
      // Per spec: Never pre-select anything in bank_details, receipt, id_document except in Duplicates
      expect(toDeleteIds.length).toBe(0);
    });
  });

  describe('Aging Suggestion Filters', () => {
    it('finds codes older than 7 days', () => {
      const freshCode = mockShot({
        id: 'c-fresh',
        primary_cat: 'code',
        created_at: now - 2 * DAY_MS,
      });
      const oldCode = mockShot({
        id: 'c-old',
        primary_cat: 'code',
        created_at: now - 10 * DAY_MS,
      });

      const results = findOldCodes([freshCode, oldCode], now);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('c-old');
    });

    it('finds little_text older than 30 days', () => {
      const freshMeme = mockShot({
        id: 'm-fresh',
        primary_cat: 'little_text',
        created_at: now - 15 * DAY_MS,
      });
      const oldMeme = mockShot({
        id: 'm-old',
        primary_cat: 'little_text',
        created_at: now - 45 * DAY_MS,
      });

      const results = findLittleTextOld([freshMeme, oldMeme], now);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('m-old');
    });

    it('finds chats older than 90 days', () => {
      const freshChat = mockShot({
        id: 'chat-fresh',
        primary_cat: 'chat',
        created_at: now - 30 * DAY_MS,
      });
      const oldChat = mockShot({
        id: 'chat-old',
        primary_cat: 'chat',
        created_at: now - 120 * DAY_MS,
      });

      const results = findOldChats([freshChat, oldChat], now);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('chat-old');
    });

    it('filters older than N months and respects sensitive document inclusion rules', () => {
      const oldEvent = mockShot({
        id: 'old-event',
        primary_cat: 'event',
        created_at: now - 200 * DAY_MS, // ~6.6 months
      });
      const oldReceipt = mockShot({
        id: 'old-receipt',
        primary_cat: 'receipt',
        created_at: now - 200 * DAY_MS,
      });

      // Without including sensitive
      const res1 = findOlderThan([oldEvent, oldReceipt], 6, false, now);
      expect(res1.eligibleShots.some((s) => s.id === 'old-event')).toBe(true);
      expect(res1.eligibleShots.some((s) => s.id === 'old-receipt')).toBe(false);

      // With including sensitive: eligible, but receipt must NOT be pre-selected
      const res2 = findOlderThan([oldEvent, oldReceipt], 6, true, now);
      expect(res2.eligibleShots.some((s) => s.id === 'old-receipt')).toBe(true);
      expect(res2.preSelectedIds).toContain('old-event');
      expect(res2.preSelectedIds).not.toContain('old-receipt');
    });
  });

  describe('Aggregate Suggestions Builder', () => {
    it('builds cards with preview URIs, counts, and size estimates', () => {
      const shots = [
        mockShot({ id: 's1', primary_cat: 'code', created_at: now - 14 * DAY_MS, uri: 'file://c1' }),
        mockShot({ id: 's2', primary_cat: 'code', created_at: now - 20 * DAY_MS, uri: 'file://c2' }),
      ];

      const cards = buildAllCleanupSuggestions(shots, 6, false, now);
      const codeCard = cards.find((c) => c.id === 'old_codes');
      expect(codeCard).toBeDefined();
      expect(codeCard?.count).toBe(2);
      expect(codeCard?.estimatedMb).toBeGreaterThan(0);
      expect(codeCard?.previewUris).toEqual(['file://c1', 'file://c2']);
    });
  });
});
