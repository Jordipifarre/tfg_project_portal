"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback } from "react";
import type { PathOptions, Layer, Path } from "leaflet";
import type { MapGranularity } from "@/lib/api";

interface RegionData {
  name: string;
  incidents: number;
  victims: number;
}

interface Props {
  data: RegionData[];
  granularity: MapGranularity;
  onGranularityChange: (g: MapGranularity) => void;
}

const GEOJSON_PATHS: Record<MapGranularity, string> = {
  provincia: "/geojson/provinces.geojson",
  comarca:   "/geojson/comarques.geojson",
};

const GRANULARITY_TABS: { key: MapGranularity; label: string }[] = [
  { key: "provincia", label: "Província" },
  { key: "comarca",   label: "Comarca" },
];

/** Strip combining diacritical marks for accent-insensitive matching */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Extract the display name from a GeoJSON feature's properties */
function extractName(props: Record<string, unknown>): string {
  const candidates = [
    "name",
    "NOM_COMAR", "NOMCOMAR", "NOM_COMARCA",
    "NOM_PROV",  "NOMPROV",  "NOM_PROVINCIA",
    "NOM_MUNI",  "NOMMUNI",  "NOM_MUNICIPI",
    "NOM", "nom_comar", "nom_prov", "nom_muni", "nom",
    "Name", "NAME",
  ];
  for (const k of candidates) {
    const v = props?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of Object.values(props ?? {})) {
    if (typeof v === "string" && v.trim() && isNaN(Number(v))) return v.trim();
  }
  return "Desconegut";
}

/** Continuous linear interpolation from #fef2f2 (0%) to #7f1d1d (100%) */
function incidentColor(incidents: number, max: number): string {
  if (!incidents || max === 0) return "#fef2f2";
  const t = Math.min(incidents / max, 1);
  const r = Math.round(254 - t * (254 - 127));
  const g = Math.round(242 - t * (242 - 29));
  const b = Math.round(242 - t * (242 - 29));
  return `rgb(${r},${g},${b})`;
}

const LEGEND_STOPS = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

export default function CataloniaMap({ data, granularity, onGranularityChange }: Props) {
  // Store the last successfully-fetched result keyed by granularity
  const [loaded, setLoaded] = useState<{ data: object; granularity: MapGranularity } | null>(null);
  // Track which granularity last produced a fetch error
  const [errorFor, setErrorFor] = useState<MapGranularity | null>(null);

  useEffect(() => {
    if (loaded?.granularity === granularity) return; // already in state
    if (errorFor === granularity) return;            // already failed
    let cancelled = false;
    fetch(GEOJSON_PATHS[granularity])
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (!cancelled) setLoaded({ data: d, granularity }); })
      .catch(() => { if (!cancelled) setErrorFor(granularity); });
    return () => { cancelled = true; };
  }, [granularity, loaded, errorFor]);

  // Derive display state — no synchronous setState needed
  const geoStatus =
    loaded?.granularity === granularity ? "ok" :
    errorFor === granularity            ? "error" :
    "loading";
  const geoData = geoStatus === "ok" ? loaded!.data : null;

  // Build normalised lookup: normalisedName → data row
  const dataMap = Object.fromEntries(data.map((d) => [norm(d.name), d]));
  const maxIncidents = Math.max(...data.map((d) => d.incidents), 1);

  const styleFeature = useCallback(
    (feature: { properties: Record<string, unknown> } | undefined): PathOptions => {
      const name  = extractName(feature?.properties ?? {});
      const match = dataMap[norm(name)];
      return {
        fillColor:   incidentColor(match?.incidents ?? 0, maxIncidents),
        fillOpacity: match ? 0.82 : 0.25,
        color:       "#94a3b8",
        weight:      0.6,
      };
    },
    [dataMap, maxIncidents],
  );

  const onEachFeature = useCallback(
    (feature: { properties: Record<string, unknown> }, layer: Layer) => {
      const name      = extractName(feature?.properties ?? {});
      const match     = dataMap[norm(name)];
      const incidents = match?.incidents ?? 0;
      const victims   = match?.victims   ?? 0;

      layer.bindTooltip(
        () => `
          <div style="font:13px/1.6 system-ui,sans-serif;padding:6px 10px;min-width:140px">
            <div style="font-weight:700;margin-bottom:3px;color:#1f2937">${name}</div>
            <div style="color:#d97706">Incidents: <b>${incidents.toLocaleString("ca-ES")}</b></div>
            <div style="color:#dc2626">Víctimes: <b>${victims.toLocaleString("ca-ES")}</b></div>
          </div>`,
        { sticky: true, opacity: 1, className: "cat-map-tooltip" },
      );

      const defaultStyle: PathOptions = {
        fillOpacity: match ? 0.82 : 0.25,
        color:       "#94a3b8",
        weight:      0.6,
      };
      const hoverStyle: PathOptions = {
        fillOpacity: 0.95,
        color:       "#d97706",
        weight:      2,
      };

      (layer as Path).on({
        mouseover(e) {
          (e.target as Path).setStyle(hoverStyle);
          (e.target as Path).bringToFront();
        },
        mouseout(e) {
          (e.target as Path).setStyle(defaultStyle);
        },
      });
    },
    [dataMap],
  );

  const filename = GEOJSON_PATHS[granularity].split("/").pop();

  return (
    <div>
      {/* Granularity toggle */}
      <div className="flex gap-1 mb-3">
        {GRANULARITY_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onGranularityChange(key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              granularity === key
                ? "bg-[#d97706] border-[#d97706] text-white"
                : "border-[#e5e5e5] text-[#6b7280] hover:border-[#d97706] hover:text-[#d97706]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error — outside MapContainer so Leaflet's z-index can't cover it */}
      {geoStatus === "error" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-medium text-amber-800 mb-1">Fitxer GeoJSON no trobat</p>
          <p className="text-xs text-amber-700">
            Executa{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">
              python scripts/download_geojson.py
            </code>{" "}
            per generar <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">public/geojson/{filename}</code>
          </p>
        </div>
      )}

      {geoStatus === "loading" && (
        <div
          className="rounded-lg border border-[#e5e5e5] bg-gray-50 flex items-center justify-center"
          style={{ height: 400 }}
        >
          <span className="text-sm text-[#9ca3af]">Carregant mapa…</span>
        </div>
      )}

      {geoStatus === "ok" && (
        <>
          <style>{`
            .cat-map-tooltip {
              background: white !important;
              border: 1px solid #e5e7eb !important;
              border-radius: 8px !important;
              box-shadow: 0 4px 16px rgba(0,0,0,0.10) !important;
              padding: 0 !important;
            }
            .cat-map-tooltip::before { display: none !important; }
          `}</style>

          <div
            className="rounded-lg overflow-hidden border border-[#e5e5e5]"
            style={{ height: 400 }}
          >
            <MapContainer
              center={[41.72, 1.48]}
              zoom={7}
              style={{ width: "100%", height: "100%" }}
              scrollWheelZoom={false}
              attributionControl={false}
              zoomControl
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              />
              {geoData && (
                <GeoJSON
                  key={granularity}
                  data={geoData as any}
                  style={styleFeature as any}
                  onEachFeature={onEachFeature as any}
                />
              )}
            </MapContainer>
          </div>

          {/* Gradient legend */}
          <div className="flex items-center gap-2 mt-2 justify-end">
            <span className="text-xs text-[#9ca3af]">Incidents:</span>
            <div className="flex items-center gap-0.5">
              {LEGEND_STOPS.map((t) => {
                const r = Math.round(254 - t * (254 - 127));
                const g = Math.round(242 - t * (242 - 29));
                const b = Math.round(242 - t * (242 - 29));
                return (
                  <div
                    key={t}
                    className="w-6 h-3 first:rounded-l last:rounded-r"
                    style={{ background: `rgb(${r},${g},${b})`, border: "1px solid #e5e7eb" }}
                    title={`${Math.round(t * 100)}%`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-[#9ca3af]">màx</span>
          </div>
        </>
      )}
    </div>
  );
}
