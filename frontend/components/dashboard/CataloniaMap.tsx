"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback, useRef } from "react";
import type { PathOptions, Layer } from "leaflet";
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
  municipi:  "/geojson/municipis.geojson",
};

const GRANULARITY_TABS: { key: MapGranularity; label: string }[] = [
  { key: "provincia", label: "Província" },
  { key: "comarca",   label: "Comarca" },
  { key: "municipi",  label: "Municipi" },
];

// Strips combining diacritical marks (U+0300–U+036F) after NFD decomposition
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Extract display name from GeoJSON feature properties.
// OSM data uses "name"; ICGC shapefiles use NOM_COMAR / NOM_PROV / NOM_MUNI.
function extractName(props: Record<string, unknown>): string {
  const candidates = [
    // OSM standard
    "name",
    // ICGC shapefile variants
    "NOM_COMAR", "NOMCOMAR", "NOM_COMARCA",
    "NOM_PROV",  "NOMPROV",  "NOM_PROVINCIA",
    "NOM_MUNI",  "NOMMUNI",  "NOM_MUNICIPI",
    "NOM",
    // lowercase variants
    "nom_comar", "nom_prov", "nom_muni", "nom",
    // generic
    "Name", "NAME", "NOMBRE", "nombre",
  ];
  for (const k of candidates) {
    if (typeof props?.[k] === "string" && (props[k] as string).trim()) {
      return (props[k] as string).trim();
    }
  }
  // Last resort: first non-numeric string property
  for (const v of Object.values(props ?? {})) {
    if (typeof v === "string" && v.trim() && isNaN(Number(v))) return v.trim();
  }
  return "Desconegut";
}

// 5-bucket red ramp scaled to the maximum value
function incidentColor(incidents: number, max: number): string {
  if (!incidents || max === 0) return "#fef2f2";
  const pct = incidents / max;
  if (pct < 0.2) return "#fecaca";
  if (pct < 0.4) return "#f87171";
  if (pct < 0.6) return "#ef4444";
  if (pct < 0.8) return "#dc2626";
  return "#7f1d1d";
}

const LEGEND = [
  { color: "#fef2f2", label: "0" },
  { color: "#fecaca", label: "1–20%" },
  { color: "#f87171", label: "20–40%" },
  { color: "#ef4444", label: "40–60%" },
  { color: "#dc2626", label: "60–80%" },
  { color: "#7f1d1d", label: "màx" },
];

export default function CataloniaMap({ data, granularity, onGranularityChange }: Props) {
  const [geoData, setGeoData]   = useState<object | null>(null);
  const [geoStatus, setGeoStatus] = useState<"loading" | "ok" | "error">("loading");
  const matchCountRef = useRef(0);

  useEffect(() => {
    setGeoData(null);
    setGeoStatus("loading");
    fetch(GEOJSON_PATHS[granularity])
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setGeoData(d); setGeoStatus("ok"); })
      .catch(() => setGeoStatus("error"));
  }, [granularity]);

  const dataMap = Object.fromEntries(data.map((d) => [norm(d.name), d]));
  const maxIncidents = Math.max(...data.map((d) => d.incidents), 1);

  // Reset match counter when granularity or data changes
  useEffect(() => { matchCountRef.current = 0; }, [granularity, data]);

  const styleFeature = useCallback(
    (feature: { properties: Record<string, unknown> } | undefined): PathOptions => {
      const name  = extractName(feature?.properties ?? {});
      const match = dataMap[norm(name)];
      if (match) matchCountRef.current += 1;
      return {
        fillColor:   incidentColor(match?.incidents ?? 0, maxIncidents),
        fillOpacity: 0.82,
        color:       "#d1d5db",
        weight:      0.8,
      };
    },
    [dataMap, maxIncidents],
  );

  const onEachFeature = useCallback(
    (feature: { properties: Record<string, unknown> }, layer: Layer) => {
      const name  = extractName(feature?.properties ?? {});
      const match = dataMap[norm(name)];
      layer.bindTooltip(
        `<div style="font:12px/1.5 sans-serif;padding:4px 8px">
           <strong style="display:block;margin-bottom:2px">${name}</strong>
           Incidents: <b>${(match?.incidents ?? 0).toLocaleString("ca-ES")}</b><br/>
           Víctimes: <b>${(match?.victims ?? 0).toLocaleString("ca-ES")}</b>
         </div>`,
        { sticky: true, opacity: 0.96 },
      );
      (layer as any).on("mouseover", function (this: any) {
        this.setStyle({ weight: 2, color: "#d97706" });
      });
      (layer as any).on("mouseout", function (this: any) {
        this.setStyle({ weight: 0.8, color: "#d1d5db" });
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

      {/*
        Error banner lives OUTSIDE the MapContainer div so Leaflet's internal
        z-index stacking (tile pane = z-200, overlay = z-400, etc.) can't
        cover it. The map div is simply hidden when the file is missing.
      */}
      {geoStatus === "error" && (
        <div className="rounded-lg border border-[#e5e5e5] bg-amber-50 p-5 text-center">
          <p className="text-sm font-medium text-[#92400e] mb-1">
            Fitxer GeoJSON no trobat
          </p>
          <p className="text-xs text-[#b45309]">
            Executa{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded">
              node scripts/download-geojson.mjs
            </code>{" "}
            per generar{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded">
              public/geojson/{filename}
            </code>
          </p>
          <p className="text-xs text-[#b45309] mt-1">
            O descarrega manualment de{" "}
            <span className="font-medium">icgc.cat → Descàrregues → Capes de geoinformació</span>
          </p>
        </div>
      )}

      {geoStatus === "loading" && (
        <div className="h-[380px] rounded-lg border border-[#e5e5e5] bg-gray-50 flex items-center justify-center">
          <span className="text-xs text-[#9ca3af]">Carregant mapa…</span>
        </div>
      )}

      {geoStatus === "ok" && (
        <>
          <div className="rounded-lg overflow-hidden border border-[#e5e5e5]" style={{ height: 380 }}>
            <MapContainer
              center={[41.72, 1.48]}
              zoom={7}
              style={{ width: "100%", height: "100%" }}
              scrollWheelZoom={false}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" />
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

          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 justify-end">
            <span className="text-xs text-[#9ca3af]">Incidents:</span>
            {LEGEND.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-sm border border-gray-200"
                  style={{ background: color }}
                />
                <span className="text-xs text-[#9ca3af]">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
