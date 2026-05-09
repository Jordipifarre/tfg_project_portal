"""
Downloads Catalunya administrative boundaries from Overpass API.
Uses `out geom;` to get direct coordinates — avoids osmtogeojson relation issues.

Run: python scripts/download_geojson.py
     python scripts/download_geojson.py --no-municipis
"""
import requests, json, time, os, sys

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "geojson")
os.makedirs(OUT_DIR, exist_ok=True)

MIRRORS = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
HDR = {"User-Agent": "TFG-SafecastPortal/1.0 academic project"}

CAT_AREA = 3600349053  # Catalonia OSM relation 349053 as area ID

QUERIES = {
    "comarques.geojson": (
        f"[out:json][timeout:90];"
        f"area({CAT_AREA})->.cat;"
        f"(relation(area.cat)[admin_level=7][boundary=administrative];);"
        f"out geom;"
    ),
    "provinces.geojson": (
        # ISO3166-2 codes for 4 Catalan provinces; bounding box covers just Cat
        "[out:json][timeout:60];"
        '(relation["admin_level"="6"]["boundary"="administrative"]'
        '["ISO3166-2"~"^ES-B$|^ES-GI$|^ES-L$|^ES-T$"];);'
        "out geom;"
    ),
    "municipis.geojson": (
        f"[out:json][timeout:180];"
        f"area({CAT_AREA})->.cat;"
        f"(relation(area.cat)[admin_level=8][boundary=administrative];);"
        f"out geom;"
    ),
}


def overpass_fetch(ql):
    for attempt in range(len(MIRRORS) * 3):
        mirror = MIRRORS[attempt % len(MIRRORS)]
        host = mirror.split("/")[2]
        try:
            r = requests.post(mirror, data={"data": ql}, headers=HDR, timeout=120)
            if r.status_code == 429:
                print(f"  rate limited on {host}, waiting 20s")
                time.sleep(20)
                continue
            if r.status_code != 200:
                raise Exception(f"HTTP {r.status_code} from {host}")
            if r.text.strip().startswith("<"):
                raise Exception(f"HTML response from {host}")
            return r.json()
        except Exception as e:
            if attempt < len(MIRRORS) * 3 - 1:
                print(f"  retry ({e})")
                time.sleep(8)
            else:
                raise
    raise Exception("All mirrors exhausted")


def osm_to_geojson(elements):
    """Convert Overpass 'out geom;' relations to a GeoJSON FeatureCollection."""
    features = []
    for el in elements:
        if el.get("type") != "relation":
            continue
        tags = el.get("tags", {})
        name = tags.get("name") or tags.get("name:ca") or ""
        if not name:
            continue

        # Collect outer ring coordinates from member ways
        outer_rings = []
        inner_rings = []
        for m in el.get("members", []):
            if m.get("type") != "way" or "geometry" not in m:
                continue
            coords = [[pt["lon"], pt["lat"]] for pt in m["geometry"]]
            if len(coords) < 3:
                continue
            # Close the ring if needed
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            role = m.get("role", "outer")
            if role == "outer":
                outer_rings.append(coords)
            elif role == "inner":
                inner_rings.append(coords)

        if not outer_rings:
            continue

        # Build geometry: single polygon or multipolygon
        if len(outer_rings) == 1:
            geom = {
                "type": "Polygon",
                "coordinates": [outer_rings[0]] + inner_rings,
            }
        else:
            # Each outer ring forms its own polygon (simplification — inners ignored)
            geom = {
                "type": "MultiPolygon",
                "coordinates": [[ring] for ring in outer_rings],
            }

        features.append({
            "type": "Feature",
            "id": f"relation/{el.get('id','')}",
            "properties": {
                "name": name,
                "admin_level": tags.get("admin_level", ""),
                "ISO3166-2": tags.get("ISO3166-2", ""),
            },
            "geometry": geom,
        })
    return {"type": "FeatureCollection", "features": features}


skip = {"municipis.geojson"} if "--no-municipis" in sys.argv else set()

for fname, ql in QUERIES.items():
    if fname in skip:
        print(f"[{fname}] skipped")
        continue
    print(f"\n[{fname}] querying Overpass...")
    t0 = time.time()
    try:
        osm = overpass_fetch(ql)
        els = osm.get("elements", [])
        print(f"  got {len(els)} elements in {time.time()-t0:.1f}s")
        geojson = osm_to_geojson(els)
        out_path = os.path.join(OUT_DIR, fname)
        with open(out_path, "w", encoding="utf-8") as fh:
            json.dump(geojson, fh, ensure_ascii=False)
        names = [f["properties"]["name"] for f in geojson["features"]]
        print(f"  saved {len(geojson['features'])} features to {fname}")
        print(f"  names: {names[:6]}{'...' if len(names)>6 else ''}")
    except Exception as e:
        print(f"  FAILED: {e}")
    time.sleep(4)

print("\nDone. Files in public/geojson/")
print('Name property: "name" -- handled by CataloniaMap.tsx extractName()')
