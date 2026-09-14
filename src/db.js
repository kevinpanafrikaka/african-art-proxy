const UPSERT_SQL = `
  INSERT INTO objects (
    id, title, unit_code, object_type, culture, medium, date, place,
    credit_line, description, image_url, thumbnail_url, record_link, raw_json, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    unit_code = excluded.unit_code,
    object_type = excluded.object_type,
    culture = excluded.culture,
    medium = excluded.medium,
    date = excluded.date,
    place = excluded.place,
    credit_line = excluded.credit_line,
    description = excluded.description,
    image_url = excluded.image_url,
    thumbnail_url = excluded.thumbnail_url,
    record_link = excluded.record_link,
    raw_json = excluded.raw_json,
    updated_at = datetime('now')
`;

export async function upsertObjects(db, records) {
  if (!records.length) return;
  const stmt = db.prepare(UPSERT_SQL);
  const batch = records.map((r) =>
    stmt.bind(
      r.id, r.title, r.unit_code, r.object_type, r.culture, r.medium, r.date, r.place,
      r.credit_line, r.description, r.image_url, r.thumbnail_url, r.record_link, r.raw_json
    )
  );
  await db.batch(batch);
}

export async function getIngestState(db) {
  return db.prepare("SELECT next_start, total_available FROM ingest_state WHERE id = 1").first();
}

export async function saveIngestState(db, { nextStart, total, status }) {
  await db
    .prepare(
      "UPDATE ingest_state SET next_start = ?, total_available = ?, last_run_at = datetime('now'), last_status = ? WHERE id = 1"
    )
    .bind(nextStart, total, status)
    .run();
}

export async function logIngest(db, { fetched, upserted, status, message }) {
  await db
    .prepare("INSERT INTO ingest_log (fetched_count, upserted_count, status, message) VALUES (?,?,?,?)")
    .bind(fetched, upserted, status, message ?? null)
    .run();
}
