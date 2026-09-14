import { runIngest } from "./ingest.js";

const OBJECT_COLUMNS =
  "id, title, unit_code, object_type, culture, medium, date, place, credit_line, description, image_url, thumbnail_url, record_link, updated_at";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

async function listObjects(request, env) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  const q = url.searchParams.get("q");
  const culture = url.searchParams.get("culture");
  const objectType = url.searchParams.get("object_type");

  const where = [];
  const binds = [];
  if (q) {
    where.push("title LIKE ?");
    binds.push(`%${q}%`);
  }
  if (culture) {
    where.push("culture LIKE ?");
    binds.push(`%${culture}%`);
  }
  if (objectType) {
    where.push("object_type LIKE ?");
    binds.push(`%${objectType}%`);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM objects ${whereClause}`)
    .bind(...binds)
    .first();

  const rows = await env.DB.prepare(
    `SELECT ${OBJECT_COLUMNS} FROM objects ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  return json({ page, limit, total: countRow?.c ?? 0, results: rows.results });
}

async function getObject(id, env) {
  const row = await env.DB.prepare("SELECT * FROM objects WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Not found" }, 404);
  const { raw_json, ...rest } = row;
  return json({ ...rest, raw: JSON.parse(raw_json) });
}

async function manualIngest(request, env) {
  const token = request.headers.get("x-admin-token");
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return json({ error: "Unauthorized" }, 401);
  }
  const result = await runIngest(env);
  return json(result);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (pathname === "/api/health") {
        return json({ ok: true });
      }
      if (pathname === "/api/objects" && request.method === "GET") {
        return await listObjects(request, env);
      }
      if (pathname.startsWith("/api/objects/") && request.method === "GET") {
        const id = decodeURIComponent(pathname.slice("/api/objects/".length));
        return await getObject(id, env);
      }
      if (pathname === "/api/admin/ingest" && request.method === "POST") {
        return await manualIngest(request, env);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runIngest(env));
  },
};
