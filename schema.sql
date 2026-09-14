-- African Art Proxy - D1 schema
-- Run with: wrangler d1 execute african_art_db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS objects (
  id TEXT PRIMARY KEY,
  title TEXT,
  unit_code TEXT,
  object_type TEXT,
  culture TEXT,
  medium TEXT,
  date TEXT,
  place TEXT,
  credit_line TEXT,
  description TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  record_link TEXT,
  raw_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_objects_culture ON objects(culture);
CREATE INDEX IF NOT EXISTS idx_objects_object_type ON objects(object_type);
CREATE INDEX IF NOT EXISTS idx_objects_medium ON objects(medium);
CREATE INDEX IF NOT EXISTS idx_objects_updated_at ON objects(updated_at);

CREATE TABLE IF NOT EXISTS ingest_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  next_start INTEGER NOT NULL DEFAULT 0,
  total_available INTEGER,
  last_run_at TEXT,
  last_status TEXT
);

INSERT OR IGNORE INTO ingest_state (id, next_start) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS ingest_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at TEXT NOT NULL DEFAULT (datetime('now')),
  fetched_count INTEGER,
  upserted_count INTEGER,
  status TEXT,
  message TEXT
);
