"""
Generates regions_policials.geojson from comarques.geojson by grouping
comarques into their Mossos d'Esquadra police regions (Regions Policials).

Run: python scripts/generate_police_regions.py
"""
import json, os, unicodedata

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IN_FILE  = os.path.join(SCRIPT_DIR, "..", "public", "geojson", "comarques.geojson")
OUT_FILE = os.path.join(SCRIPT_DIR, "..", "public", "geojson", "regions_policials.geojson")


def norm(s: str) -> str:
    import re
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    # Normalise all apostrophe/quote variants to a space (use ord() to avoid encoding issues)
    for apos in (chr(0x27), chr(0x2019), chr(0x2018), chr(0x60), chr(0xB4), chr(0x2BC)):
        s = s.replace(apos, " ")
    s = re.sub(r"\s+", " ", s).lower().strip()
    for art in ("el ", "els ", "la ", "les ", "l "):
        if s.startswith(art):
            s = s[len(art):]
            break
    return s.strip()


COMARCA_TO_RP: dict[str, str] = {
    # RP Metropolitana Barcelona
    "barcelones":            "RP Metropolitana Barcelona",
    # RP Metropolitana Nord
    "maresme":               "RP Metropolitana Nord",
    "valles occidental":     "RP Metropolitana Nord",
    "valles oriental":       "RP Metropolitana Nord",
    # RP Metropolitana Sud
    "baix llobregat":        "RP Metropolitana Sud",
    "alt penedes":           "RP Metropolitana Sud",
    "garraf":                "RP Metropolitana Sud",
    "anoia":                 "RP Metropolitana Sud",
    # RP Central
    "bages":                 "RP Central",
    "bergueda":              "RP Central",
    "osona":                 "RP Central",
    "solsones":              "RP Central",
    "moianes":               "RP Central",
    # RP Girona
    "alt emporda":           "RP Girona",
    "baix emporda":          "RP Girona",
    "garrotxa":              "RP Girona",
    "girones":               "RP Girona",
    "pla de l estany":       "RP Girona",
    "pla de estany":         "RP Girona",
    "ripolles":              "RP Girona",
    "selva":                 "RP Girona",
    "cerdanya":              "RP Girona",
    # RP Camp de Tarragona
    "alt camp":              "RP Camp de Tarragona",
    "baix camp":             "RP Camp de Tarragona",
    "baix penedes":          "RP Camp de Tarragona",
    "conca de barbera":      "RP Camp de Tarragona",
    "priorat":               "RP Camp de Tarragona",
    "tarragones":            "RP Camp de Tarragona",
    # RP Terres de l'Ebre
    "baix ebre":             "RP Terres de l'Ebre",
    "montsia":               "RP Terres de l'Ebre",
    "ribera d ebre":         "RP Terres de l'Ebre",
    "terra alta":            "RP Terres de l'Ebre",
    # RP Ponent
    "garrigues":             "RP Ponent",
    "noguera":               "RP Ponent",
    "pla d urgell":          "RP Ponent",
    "segarra":               "RP Ponent",
    "segria":                "RP Ponent",
    "urgell":                "RP Ponent",
    # RP Ponent (additional)
    "llucanes":              "RP Central",   # el Lluçanès — Osona area, central region
    # RP Alt Pirineu i Aran  (also covers legacy "RP Pirineu Occidental" data)
    "alt urgell":            "RP Alt Pirineu i Aran",
    "alta ribagorca":        "RP Alt Pirineu i Aran",
    "pallars jussa":         "RP Alt Pirineu i Aran",
    "pallars sobira":        "RP Alt Pirineu i Aran",
    "val d aran":            "RP Alt Pirineu i Aran",
}


def extract_outer_rings(geometry: dict) -> list:
    gtype = geometry.get("type")
    coords = geometry.get("coordinates", [])
    if gtype == "Polygon":
        return [coords[0]]
    if gtype == "MultiPolygon":
        return [p[0] for p in coords]
    return []


with open(IN_FILE, encoding="utf-8") as f:
    comarques = json.load(f)

rp_polygons: dict[str, list] = {}
unmatched: list[str] = []

for feature in comarques["features"]:
    name = feature["properties"].get("name", "")
    key  = norm(name)
    rp   = COMARCA_TO_RP.get(key)
    if not rp:
        unmatched.append(f"{name!r} (norm: {key!r})")
        continue
    rp_polygons.setdefault(rp, []).extend(extract_outer_rings(feature["geometry"]))

if unmatched:
    print("Unmatched comarques:")
    for u in unmatched:
        print(f"  {u}")

features = []
for rp, polys in sorted(rp_polygons.items()):
    geom = (
        {"type": "Polygon",      "coordinates": [polys[0]]}
        if len(polys) == 1
        else {"type": "MultiPolygon", "coordinates": [[p] for p in polys]}
    )
    features.append({
        "type":       "Feature",
        "properties": {"name": rp},
        "geometry":   geom,
    })

result = {"type": "FeatureCollection", "features": features}
with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False)

print(f"\nSaved {len(features)} police regions to regions_policials.geojson")
for rp in sorted(rp_polygons):
    print(f"  {rp}: {len(rp_polygons[rp])} sub-polygon(s)")
