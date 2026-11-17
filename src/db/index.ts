import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL, FTS_TABLE_SQL, FTS_TRIGGERS_SQL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isFts5Available = false;

export const DB_NAME = 'sortshot.db';
export const CURRENT_DB_VERSION = 1;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  return dbInstance;
}

export function getFts5Supported(): boolean {
  return isFts5Available;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await getDb();

  // Enable foreign keys and WAL mode
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion < CURRENT_DB_VERSION) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(SCHEMA_SQL);
      await db.execAsync(`PRAGMA user_version = ${CURRENT_DB_VERSION};`);
    });
  }

  // Check FTS5 availability and set up virtual table if supported
  try {
    const ftsCheck = await db.getFirstAsync<{ supported: number }>(
      "SELECT sqlite_compileoption_used('ENABLE_FTS5') as supported;"
    );
    if (ftsCheck && ftsCheck.supported === 1) {
      await db.execAsync(FTS_TABLE_SQL);
      await db.execAsync(FTS_TRIGGERS_SQL);
      isFts5Available = true;
    } else {
      // Attempt creating table directly to be certain
      await db.execAsync(FTS_TABLE_SQL);
      await db.execAsync(FTS_TRIGGERS_SQL);
      isFts5Available = true;
    }
  } catch (err) {
    // Fall back to standard SQL search (LIKE) if FTS5 is not compiled in
    isFts5Available = false;
  }

  return db;
}
