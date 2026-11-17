export type CategoryId =
  | 'bank_details'
  | 'receipt'
  | 'chat'
  | 'event'
  | 'address'
  | 'link'
  | 'code'
  | 'id_document'
  | 'shopping'
  | 'other'
  | 'little_text';

export type EntityType =
  | 'account'
  | 'amount'
  | 'date'
  | 'address'
  | 'url'
  | 'code'
  | 'phone'
  | 'email';

export interface ShotRow {
  id: string;
  uri: string;
  filename: string | null;
  created_at: number; // ms epoch
  modified_at: number | null;
  width: number | null;
  height: number | null;
  ocr_status: 'pending' | 'done' | 'failed';
  ocr_text: string | null;
  text_len: number;
  text_sig: string | null;
  primary_cat: CategoryId | null;
  cats: string | null; // JSON string of CategoryId[]
  sensitive: number; // 0 or 1
  vaulted: number; // 0 or 1
  vault_path: string | null;
  gone: number; // 0 or 1
  processed_at: number | null;
}

export interface EntityRow {
  id?: number;
  shot_id: string;
  type: EntityType;
  value: string;
  label: string | null;
  extra: string | null; // JSON string
}

export interface SettingRow {
  key: string;
  value: string;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS shots (
  id TEXT PRIMARY KEY,
  uri TEXT NOT NULL,
  filename TEXT,
  created_at INTEGER NOT NULL,
  modified_at INTEGER,
  width INTEGER,
  height INTEGER,
  ocr_status TEXT NOT NULL DEFAULT 'pending',
  ocr_text TEXT,
  text_len INTEGER DEFAULT 0,
  text_sig TEXT,
  primary_cat TEXT,
  cats TEXT,
  sensitive INTEGER DEFAULT 0,
  vaulted INTEGER DEFAULT 0,
  vault_path TEXT,
  gone INTEGER DEFAULT 0,
  processed_at INTEGER
);

CREATE INDEX IF NOT EXISTS shots_cat ON shots(primary_cat, created_at DESC);
CREATE INDEX IF NOT EXISTS shots_status ON shots(ocr_status);
CREATE INDEX IF NOT EXISTS shots_sig ON shots(text_sig);
CREATE INDEX IF NOT EXISTS shots_gone ON shots(gone);
CREATE INDEX IF NOT EXISTS shots_created ON shots(created_at DESC);

CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shot_id TEXT NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  extra TEXT
);

CREATE INDEX IF NOT EXISTS entities_shot ON entities(shot_id);
CREATE INDEX IF NOT EXISTS entities_type ON entities(type);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

export const FTS_TABLE_SQL = `
CREATE VIRTUAL TABLE IF NOT EXISTS shots_fts USING fts5(
  ocr_text,
  content='shots',
  content_rowid='rowid'
);
`;

export const FTS_TRIGGERS_SQL = `
CREATE TRIGGER IF NOT EXISTS shots_ai AFTER INSERT ON shots BEGIN
  INSERT INTO shots_fts(rowid, ocr_text) VALUES (new.rowid, new.ocr_text);
END;

CREATE TRIGGER IF NOT EXISTS shots_ad AFTER DELETE ON shots BEGIN
  INSERT INTO shots_fts(shots_fts, rowid, ocr_text) VALUES('delete', old.rowid, old.ocr_text);
END;

CREATE TRIGGER IF NOT EXISTS shots_au AFTER UPDATE OF ocr_text ON shots BEGIN
  INSERT INTO shots_fts(shots_fts, rowid, ocr_text) VALUES('delete', old.rowid, old.ocr_text);
  INSERT INTO shots_fts(rowid, ocr_text) VALUES (new.rowid, new.ocr_text);
END;
`;
