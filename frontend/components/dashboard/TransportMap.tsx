"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback } from "react";
import type { PathOptions, Layer, Path } from "leaflet";
import type { TransportMapRegion } from "@/lib/api";

type Mode = "total" | "bus" | "metro" | "taxi" | "train";

interface Props {
  data: TransportMapRegion[];
}

const GEOJSON_PATH = "/geojson/regions_policials.geojson";

interface ModeConfig {
  label: string;
  from: [number, number, number];
  to:   [number, number, number];
  accent: string;
}

const MODE_CONFIG: Record<Mode, ModeConfig> = {
  total: { label: "Total",    from: [241,245,249], to: [30,41,59],   accent: "#334155" },
  bus:   { label: "Autobús",  from: [239,246,255], to: [29,78,216],  accent: "#1d4ed8" },
  metro: { label: "Metro",    from: [245,243,255], to: [109,40,217], accent: "#6d28d9" },
  taxi:  { label: "Taxi",     from: [255,251,235], to: [180,83,9],   accent: "#b45309" },
  train: { label: "Tren",     from: [240,253,244], to: [21,128,61],  accent: "#15803d" },
};

const MODE_TABS: Mode[] = ["total", "bus", "metro", "taxi", "train"];

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function extractName(props: Record<string, unknown>): string {
  for (const k of ["name", "Name", "NAME", "NOM", "nom"]) {
    const v = props?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of Object.values(props ?? {})) {
    if (typeof v === "string" && v.trim() && isNaN(Number(v))) return v.trim();
  }
  return "Desconegut";
}

function interpolate(t: number, from: [number,number,number], to: [number,number,number]): string {
  const r = Math.round(from[0] + t * (to[0] - from[0]));
  const g = Math.round(from[1] + t * (to[1] - from[1]));
  const b = Math.round(from[2] + t * (to[2] - from[2]));
  return `rgb(${r},${g},${b})`;
}

const LEGEND_STOPS = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

export default function TransportMap({ data }: Props) {
  const [geoData, setGeoData]   = useState<object | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [mode, setMode]         = useState<Mode>("total");

  useEffect(() => {
    fetch(GEOJSON_PATH)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setGeoData)
      .catch(() => setGeoError(true));
  }, []);

  const cfg     = MODE_CONFIG[mode];
  const dataMap = Object.fromEntries(data.map((d) => [norm(d.name), d]));
  const maxVal  = Math.max(...data.map((d) => d[mode]), 1);

  const styleFeature = useCallback(
    (feature: { properties: Record<string, unknown> } | undefined): PathOptions => {
      const name  = extractName(feature?.properties ?? {});
      const match = dataMap[norm(name)];
      const val   = match ? match[mode] : 0;
      return {
        fillColor:   interpolate(val > 0 ? Math.min(val / maxVal, 1) : 0, cfg.from, cfg.to),
        fillOpacity: match ? 0.82 : 0.25,
        color:       "#94a3b8",
        weight:      0.8,
      };
    },
    [dataMap, mode, maxVal, cfg],
  );

  const onEachFeature = useCallback(
    (feature: { properties: Record<string, unknown> }, layer: Layer) => {
      const name  = extractName(feature?.properties ?? {});
      const match = dataMap[norm(name)];
      const f = (n: number) => n.toLocaleString("ca-ES");

      layer.bindTooltip(
        () => `
          <div style="font:13px/1.75 system-ui,sans-serif;padding:6px 10px;min-width:170px">
            <div style="font-weight:700;margin-bottom:4px;color:#1f2937">${name}</div>
            <div style="color:#334155">Total: <b>${f(match?.total ?? 0)}</b></div>
            <div style="color:#1d4ed8">Autobús: <b>${f(match?.bus ?? 0)}</b></div>
            <div style="color:#6d28d9">Metro: <b>${f(match?.metro ?? 0)}</b></div>
            <div style="color:#b45309">Taxi: <b>${f(match?.taxi ?? 0)}</b></div>
            <div style="color:#15803d">Tren: <b>${f(match?.train ?? 0)}</b></div>
          </div>`,
        { sticky: true, opacity: 1, className: "transport-map-tooltip" },
      );

      const defaultStyle: PathOptions = { fillOpacity: match ? 0.82 : 0.25, color: "#94a3b8", weight: 0.8 };
      const hoverStyle:   PathOptions = { fillOpacity: 0.95, color: cfg.accent, weight: 2 };

      (layer as Path).on({
        mouseover(e) { (e.target as Path).setStyle(hoverStyle); (e.target as Path).bringToFront(); },
        mouseout(e)  { (e.target as Path).setStyle(defaultStyle); },
      });
    },
    [dataMap, cfg],
  );

  return (
    <div>
      {/* Mode selector */}
      <div className="flex flex-wrap gap-1 mb-3">
        {MODE_TABS.map((m) => {
          const { label, accent } = MODE_CONFIG[m];
          const active = m === mode;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1 text-xs rounded-full border transition-colors"
              style={
                active
                  ? { backgroundColor: accent, borderColor: accent, color: "#fff" }
                  : { borderColor: "#e5e5e5", color: "#6b7280" }
              }
            >
              {label}
            </button>
          );
        })}
      </div>

      {geoError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-medium text-amber-800 mb-1">Fitxer GeoJSON no trobat</p>
          <p className="text-xs text-amber-700">
            Executa{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">
              python scripts/generate_police_regions.py
            </code>
          </p>
        </div>
      )}

      {!geoData && !geoError && (
        <div className="rounded-lg border border-[#e5e5e5] bg-gray-50 flex items-center justify-center" style={{ height: 420 }}>
          <span className="text-sm text-[#9ca3af]">Carregant mapa…</span>
        </div>
      )}

      {geoData && (
        <>
          <style>{`
            .transport-map-tooltip {
              background: white !important;
              border: 1px solid #e5e7eb !important;
              border-radius: 8px !important;
              box-shadow: 0 4px 16px rgba(0,0,0,0.10) !important;
              padding: 0 !important;
            }
            .transport-map-tooltip::before { display: none !important; }
          `}</style>

          <div className="rounded-lg overflow-hidden border border-[#e5e5e5]" style={{ height: 420 }}>
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
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              <GeoJSON
                key={mode}
                data={geoData as any}
                style={styleFeature as any}
                onEachFeature={onEachFeature as any}
              />
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-2 justify-end">
            <span className="text-xs text-[#9ca3af]">{cfg.label}:</span>
            <div className="flex items-center gap-0.5">
              {LEGEND_STOPS.map((t) => (
                <div
                  key={t}
                  className="w-6 h-3 first:rounded-l last:rounded-r"
                  style={{ background: interpolate(t, cfg.from, cfg.to), border: "1px solid #e5e7eb" }}
                  title={`${Math.round(t * 100)}%`}
                />
              ))}
            </div>
            <span className="text-xs text-[#9ca3af]">màx</span>
          </div>
        </>
      )}
    </div>
  );
}
