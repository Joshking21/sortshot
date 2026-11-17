import { getDb, getFts5Supported } from './index';
import { CategoryId, EntityRow, ShotRow } from './schema';

export async function insertPendingShots(
  shots: Array<{ id: string; uri: string; filename: string | null; created_at: number; modified_at: number | null; width: number | null; height: number | null }>
): Promise<void> {
  if (shots.length === 0) return;
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    for (const s of shots) {
      await db.runAsync(
        `INSERT OR IGNORE INTO shots (id, uri, filename, created_at, modified_at, width, height, ocr_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending');`,
        [s.id, s.uri, s.filename, s.created_at, s.modified_at, s.width, s.height]
      );
    }
  });
}

export async function markMissingShotsGone(activeIds: string[]): Promise<void> {
  const db = await getDb();
  if (activeIds.length === 0) {
    await db.runAsync(`UPDATE shots SET gone = 1 WHERE vaulted = 0;`);
    return;
  }

  // To avoid SQL parameter limits, fetch non-gone, non-vaulted IDs and compare in memory
  const rows = await db.getAllAsync<{ id: string }>(`SELECT id FROM shots WHERE gone = 0 AND vaulted = 0;`);
  const activeSet = new Set(activeIds);
  const goneIds = rows.map((r) => r.id).filter((id) => !activeSet.has(id));

  if (goneIds.length > 0) {
    await db.withTransactionAsync(async () => {
      for (const id of goneIds) {
        await db.runAsync(`UPDATE shots SET gone = 1 WHERE id = ?;`, [id]);
      }
    });
  }
}

export async function saveOcrResult(
  shotId: string,
  ocrText: string,
  textSig: string,
  primaryCat: CategoryId,
  cats: CategoryId[],
  sensitive: boolean,
  entities: Array<{ type: string; value: string; label: string | null; extra: string | null }>
): Promise<void> {
  const db = await getDb();
  const textLen = ocrText.length;
  const processedAt = Date.now();
  const catsJson = JSON.stringify(cats);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE shots
       SET ocr_status = 'done',
           ocr_text = ?,
           text_len = ?,
           text_sig = ?,
           primary_cat = ?,
           cats = ?,
           sensitive = ?,
           processed_at = ?
       WHERE id = ?;`,
      [ocrText, textLen, textSig, primaryCat, catsJson, sensitive ? 1 : 0, processedAt, shotId]
    );

    // Replace entities
    await db.runAsync(`DELETE FROM entities WHERE shot_id = ?;`, [shotId]);
    for (const e of entities) {
      await db.runAsync(
        `INSERT INTO entities (shot_id, type, value, label, extra) VALUES (?, ?, ?, ?, ?);`,
        [shotId, e.type, e.value, e.label, e.extra]
      );
    }
  });
}

export async function markOcrFailed(shotId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE shots SET ocr_status = 'failed' WHERE id = ?;`, [shotId]);
}

export async function getPendingShots(limit = 100): Promise<ShotRow[]> {
  const db = await getDb();
  return await db.getAllAsync<ShotRow>(
    `SELECT * FROM shots WHERE ocr_status = 'pending' AND gone = 0 ORDER BY created_at DESC LIMIT ?;`,
    [limit]
  );
}

export async function getFolderCounts(): Promise<Record<CategoryId, number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ primary_cat: CategoryId; count: number }>(
    `SELECT primary_cat, COUNT(*) as count FROM shots WHERE gone = 0 AND vaulted = 0 AND primary_cat IS NOT NULL GROUP BY primary_cat;`
  );

  const counts: Record<CategoryId, number> = {
    bank_details: 0,
    receipt: 0,
    chat: 0,
    event: 0,
    address: 0,
    link: 0,
    code: 0,
    id_document: 0,
    shopping: 0,
    other: 0,
    little_text: 0,
  };

  for (const row of rows) {
    if (row.primary_cat in counts) {
      counts[row.primary_cat] = row.count;
    }
  }

  return counts;
}

export async function getRecentShots(limit = 20): Promise<ShotRow[]> {
  const db = await getDb();
  return await db.getAllAsync<ShotRow>(
    `SELECT * FROM shots WHERE gone = 0 AND vaulted = 0 ORDER BY created_at DESC LIMIT ?;`,
    [limit]
  );
}

export async function getShotsByCategory(category: CategoryId, limit = 100, offset = 0): Promise<ShotRow[]> {
  const db = await getDb();
  return await db.getAllAsync<ShotRow>(
    `SELECT * FROM shots WHERE primary_cat = ? AND gone = 0 AND vaulted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?;`,
    [category, limit, offset]
  );
}

export async function getShotById(id: string): Promise<ShotRow | null> {
  const db = await getDb();
  return await db.getFirstAsync<ShotRow>(`SELECT * FROM shots WHERE id = ?;`, [id]);
}

export async function getEntitiesForShot(shotId: string): Promise<EntityRow[]> {
  const db = await getDb();
  return await db.getAllAsync<EntityRow>(`SELECT * FROM entities WHERE shot_id = ?;`, [shotId]);
}

export async function getPrimaryEntityForShot(shotId: string): Promise<EntityRow | null> {
  const db = await getDb();
  return await db.getFirstAsync<EntityRow>(
    `SELECT * FROM entities WHERE shot_id = ? ORDER BY id ASC LIMIT 1;`,
    [shotId]
  );
}

export async function updateShotCategory(id: string, newCategory: CategoryId): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE shots SET primary_cat = ? WHERE id = ?;`, [newCategory, id]);
}

export async function markShotVaulted(id: string, vaultPath: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE shots SET vaulted = 1, vault_path = ? WHERE id = ?;`, [vaultPath, id]);
}

export async function markShotRestored(id: string, newUri: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE shots SET vaulted = 0, vault_path = NULL, uri = ? WHERE id = ?;`, [newUri, id]);
}

export async function markShotsGone(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(`UPDATE shots SET gone = 1 WHERE id = ?;`, [id]);
    }
  });
}

export async function getVaultedShots(): Promise<ShotRow[]> {
  const db = await getDb();
  return await db.getAllAsync<ShotRow>(
    `SELECT * FROM shots WHERE vaulted = 1 ORDER BY created_at DESC;`
  );
}

export async function getActiveShotsForCleanup(): Promise<ShotRow[]> {
  const db = await getDb();
  return await db.getAllAsync<ShotRow>(
    `SELECT * FROM shots WHERE gone = 0 AND vaulted = 0 ORDER BY created_at DESC;`
  );
}

export async function searchShots(queryText: string, categoryFilter?: CategoryId): Promise<ShotRow[]> {
  const db = await getDb();
  const trimmed = queryText.trim();
  if (!trimmed) return [];

  const useFts = getFts5Supported();

  if (useFts) {
    // FTS5 prefix match
    const ftsQuery = trimmed
      .split(/\s+/)
      .map((w) => `${w.replace(/[^a-zA-Z0-9]/g, '')}*`)
      .filter((w) => w.length > 1)
      .join(' ');

    if (ftsQuery) {
      try {
        if (categoryFilter) {
          return await db.getAllAsync<ShotRow>(
            `SELECT shots.* FROM shots
             JOIN shots_fts ON shots.rowid = shots_fts.rowid
             WHERE shots_fts MATCH ? AND shots.gone = 0 AND shots.vaulted = 0 AND shots.primary_cat = ?
             ORDER BY shots.created_at DESC LIMIT 50;`,
            [ftsQuery, categoryFilter]
          );
        }
        return await db.getAllAsync<ShotRow>(
          `SELECT shots.* FROM shots
           JOIN shots_fts ON shots.rowid = shots_fts.rowid
           WHERE shots_fts MATCH ? AND shots.gone = 0 AND shots.vaulted = 0
           ORDER BY shots.created_at DESC LIMIT 50;`,
          [ftsQuery]
        );
      } catch {
        // Fall back to LIKE if MATCH fails syntax
      }
    }
  }

  // Fallback to LIKE over ocr_text and entity labels
  const likeTerm = `%${trimmed}%`;
  if (categoryFilter) {
    return await db.getAllAsync<ShotRow>(
      `SELECT DISTINCT shots.* FROM shots
       LEFT JOIN entities ON entities.shot_id = shots.id
       WHERE shots.gone = 0 AND shots.vaulted = 0 AND shots.primary_cat = ?
         AND (shots.ocr_text LIKE ? OR entities.label LIKE ? OR entities.value LIKE ?)
       ORDER BY shots.created_at DESC LIMIT 50;`,
      [categoryFilter, likeTerm, likeTerm, likeTerm]
    );
  }

  return await db.getAllAsync<ShotRow>(
    `SELECT DISTINCT shots.* FROM shots
     LEFT JOIN entities ON entities.shot_id = shots.id
     WHERE shots.gone = 0 AND shots.vaulted = 0
       AND (shots.ocr_text LIKE ? OR entities.label LIKE ? OR entities.value LIKE ?)
     ORDER BY shots.created_at DESC LIMIT 50;`,
    [likeTerm, likeTerm, likeTerm]
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = ?;`, [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);`, [key, value]);
}
