/**
 * Downloads Catalunya administrative boundaries from OpenStreetMap via Overpass API.
 * Converts OSM JSON → GeoJSON using osmtogeojson.
 *
 * Run once: node scripts/download-geojson.mjs
 * Skip large municipis file: node scripts/download-geojson.mjs --no-municipis
 *
 * Output → public/geojson/
 *   provinces.geojson   (4 provinces)
 *   comarques.geojson   (42 comarques)
 *   municipis.geojson   (947 municipis, ~10 MB, ~2 min)
 *
 * GeoJSON name property: "name" (OSM standard, already handled by extractName())
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import osmtogeojson from "osmtogeojson";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "geojson");
mkdirSync(OUT_DIR, { recursive: true });

// Mirrors in fallback order (overpass-api.de returns 406 from some IPs)
const MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

// Bounding box: south,west,north,east — covers all 4 Catalan provinces
const BB = "40.5,-0.9,42.9,3.35";

const QUERIES = {
  provinces: {
    out: "provinces.geojson",
    ql: `[out:json][timeout:60];(relation["admin_level"="6"]["boundary"="administrative"](${BB}););out body;>;out skel qt;`,
  },
  comarques: {
    out: "comarques.geojson",
    ql: `[out:json][timeout:90];(relation["admin_level"="7"]["boundary"="administrative"](${BB}););out body;>;out skel qt;`,
  },
  municipis: {
    out: "municipis.geojson",
    ql: `[out:json][timeout:180];(relation["admin_level"="8"]["boundary"="administrative"](${BB}););out body;>;out skel qt;`,
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function overpassFetch(ql) {
  for (let attempt = 0; attempt < MIRRORS.length * 2; attempt++) {
    const mirror = MIRRORS[attempt % MIRRORS.length];
    const host = mirror.split("/")[2];
    try {
      const res = await fetch(mirror, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(ql)}`,
      });
      if (res.status === 429) {
        console.log(`  Rate limited on ${host}, waiting 15s…`);
        await sleep(15000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${host}`);
      const text = await res.text();
      if (text.trimStart().startsWith("<")) throw new Error(`Got HTML from ${host}`);
      return JSON.parse(text);
    } catch (err) {
      if (attempt < MIRRORS.length * 2 - 1) {
        console.log(`  Retrying after error: ${err.message}`);
        await sleep(5000);
      } else {
        throw err;
      }
    }
  }
  throw new Error("All mirrors failed");
}

async function downloadLayer(name, { out, ql }) {
  console.log(`\n[${name}] Querying Overpass…`);
  const start = Date.now();

  const osm = await overpassFetch(ql);
  console.log(`  Got ${osm.elements?.length ?? 0} OSM elements in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  const geojson = osmtogeojson(osm);
  geojson.features = geojson.features.filter(
    (f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
  );

  const outPath = join(OUT_DIR, out);
  writeFileSync(outPath, JSON.stringify(geojson));

  const sample = geojson.features[0]?.properties ?? {};
  console.log(`  ✓ ${geojson.features.length} polygon features → ${out}`);
  console.log(`  Sample "name": "${sample.name ?? "(not found)"}"`);
  console.log(`  All properties: [ ${Object.keys(sample).join(", ")} ]`);
}

const skip = process.argv.includes("--no-municipis") ? ["municipis"] : [];

for (const [name, cfg] of Object.entries(QUERIES)) {
  if (skip.includes(name)) {
    console.log(`\n[${name}] Skipped`);
    continue;
  }
  try {
    await downloadLayer(name, cfg);
    await sleep(3000); // polite delay between queries
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

console.log('\n✅ Done. GeoJSON files in public/geojson/');
console.log('   Name property: "name" — already handled by CataloniaMap extractName()');
