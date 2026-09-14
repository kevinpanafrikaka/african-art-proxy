const SI_BASE = "https://api.si.edu/openaccess/api/v1.0";

// National Museum of African Art unit code — scopes every search to African art objects.
const AFRICAN_ART_QUERY = 'unit_code:"NMAFA"';

export async function searchAfricanArt(apiKey, start, rows) {
  const url = new URL(`${SI_BASE}/search`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("q", AFRICAN_ART_QUERY);
  url.searchParams.set("start", String(start));
  url.searchParams.set("rows", String(rows));

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Smithsonian search failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function firstOrJoin(arr) {
  return Array.isArray(arr) && arr.length ? arr.join(", ") : null;
}

function freetextValue(freetext, label) {
  if (!freetext) return null;
  const key = Object.keys(freetext).find((k) => k.toLowerCase() === label.toLowerCase());
  if (!key) return null;
  const entries = freetext[key];
  if (!Array.isArray(entries) || !entries.length) return null;
  return entries.map((e) => e.content).filter(Boolean).join(" | ") || null;
}

export function mapSmithsonianRow(row) {
  const content = row.content || {};
  const dnr = content.descriptiveNonRepeating || {};
  const idx = content.indexedStructured || {};
  const freetext = content.freetext || {};
  const media = (dnr.online_media && dnr.online_media.media) || [];
  const image = media.find((m) => m.type === "Images") || media[0] || {};

  return {
    id: row.id,
    title: dnr.title?.content || row.title || null,
    unit_code: dnr.unit_code || null,
    object_type: firstOrJoin(idx.object_type),
    culture: firstOrJoin(idx.culture),
    medium: firstOrJoin(idx.medium),
    date: firstOrJoin(idx.date),
    place: firstOrJoin(idx.place),
    credit_line: freetextValue(freetext, "creditLine"),
    description: freetextValue(freetext, "notes") || freetextValue(freetext, "description"),
    image_url: image.content || null,
    thumbnail_url: image.thumbnail || null,
    record_link: dnr.record_link || null,
    raw_json: JSON.stringify(row),
  };
}
