import { searchAfricanArt, mapSmithsonianRow } from "./smithsonian.js";
import { upsertObjects, getIngestState, saveIngestState, logIngest } from "./db.js";

const PAGE_SIZE = 100;

export async function runIngest(env) {
  const state = await getIngestState(env.DB);
  const start = state?.next_start ?? 0;

  let data;
  try {
    data = await searchAfricanArt(env.SMITHSONIAN_API_KEY, start, PAGE_SIZE);
  } catch (err) {
    await logIngest(env.DB, { fetched: 0, upserted: 0, status: "error", message: err.message });
    throw err;
  }

  const rows = data?.response?.rows || [];
  const total = data?.response?.rowCount ?? null;
  const records = rows.map(mapSmithsonianRow).filter((r) => r.id && r.title);

  await upsertObjects(env.DB, records);

  const advanced = start + PAGE_SIZE;
  const wrapped = total != null && advanced >= total;
  const nextStart = wrapped ? 0 : advanced;

  await saveIngestState(env.DB, { nextStart, total, status: "ok" });
  await logIngest(env.DB, { fetched: rows.length, upserted: records.length, status: "ok" });

  return { start, fetched: rows.length, upserted: records.length, nextStart, total };
}
