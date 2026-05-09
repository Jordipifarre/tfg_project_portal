"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useState, useEffect, useCallback } from "react";
import type { PathOptions, Layer, Path } from "leaflet";
import type { PenalMapRegion } from "@/lib/api";

type Metric = "known" | "resolved" | "arrests";

interface Props {
  data: PenalMapRegion[];
}

const GEOJSON_PATH = "/geojson/regions_policials.geojson";

const METRIC_TABS: { key: Metric; label: string }[] = [
  { key: "known",    label: "Coneguts" },
  { key: "resolved", label: "Resolts" },
  { key: "arrests",  label: "Detencions" },
];

const METRIC_COLORS: Record<Metric, { label: string; from: [number,number,number]; to: [number,number,number] }> = {
  known:    { label: "Coneguts",   from: [239,246,255], to: [30,58,138] },
  resolved: { label: "Resolts",    from: [240,253,244], to: [20,83,45]  },
  arrests:  { label: "Detencions", from: [255,247,237], to: [124,45,18] },
};

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

export default function PenalMap({ data }: Props) {
  const [geoData, setGeoData]   = useState<object | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [metric, setMetric]     = useState<Metric>("known");

  useEffect(() => {
    fetch(GEOJSON_PATH)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setGeoData)
      .catch(() => setGeoError(true));
  }, []);

  const { from, to } = METRIC_COLORS[metric];
  const dataMap = Object.fromEntries(data.map((d) => [norm(d.name), d]));
  const maxVal  = Math.max(...data.map((d) => d[metric]), 1);

  const styleFeature = useCallback(
    (feature: { properties: Record<string, unknown> } | undefined): PathOptions => {
      const name  = extractName(feature?.properties ?? {});
      const match = dataMap[norm(name)];
      const val   = match ? match[metric] : 0;
      return {
        fillColor:   val > 0 ? interpolate(Math.min(val / maxVal, 1), from, to) : interpolate(0, from, to),
        fillOpacity: match ? 0.82 : 0.25,
        color:       "#94a3b8",
        weight:      0.8,
      };
    },
    [dataMap, metric, maxVal, from, to],
  );

  const onEachFeature = useCallback(
    (feature: { properties: Record<string, unknown> }, layer: Layer) => {
      const name  = extractName(feature?.properties ?? {});
      const match = dataMap[norm(name)];

      layer.bindTooltip(
        () => `
          <div style="font:13px/1.7 system-ui,sans-serif;padding:6px 10px;min-width:160px">
            <div style="font-weight:700;margin-bottom:4px;color:#1f2937">${name}</div>
            <div style="color:#1e3a8a">Coneguts: <b>${(match?.known ?? 0).toLocaleString("ca-ES")}</b></div>
            <div style="color:#166534">Resolts: <b>${(match?.resolved ?? 0).toLocaleString("ca-ES")}</b></div>
            <div style="color:#7c2d12">Detencions: <b>${(match?.arrests ?? 0).toLocaleString("ca-ES")}</b></div>
          </div>`,
        { sticky: true, opacity: 1, className: "penal-map-tooltip" },
      );

      const defaultStyle: PathOptions = {
        fillOpacity: match ? 0.82 : 0.25,
        color:       "#94a3b8",
        weight:      0.8,
      };
      const hoverStyle: PathOptions = {
        fillOpacity: 0.95,
        color:       "#3b82f6",
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

  return (
    <div>
      {/* Metric selector */}
      <div className="flex gap-1 mb-3">
        {METRIC_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              metric === key
                ? "bg-[#1e3a8a] border-[#1e3a8a] text-white"
                : "border-[#e5e5e5] text-[#6b7280] hover:border-[#1e3a8a] hover:text-[#1e3a8a]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {geoError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
          <p className="text-sm font-medium text-amber-800 mb-1">Fitxer GeoJSON no trobat</p>
          <p className="text-xs text-amber-700">
            Executa{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">
              python scripts/generate_police_regions.py
            </code>{" "}
            per generar{" "}
            <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">
              public/geojson/regions_policials.geojson
            </code>
          </p>
        </div>
      )}

      {!geoData && !geoError && (
        <div
          className="rounded-lg border border-[#e5e5e5] bg-gray-50 flex items-center justify-center"
          style={{ height: 420 }}
        >
          <span className="text-sm text-[#9ca3af]">Carregant mapa…</span>
        </div>
      )}

      {geoData && (
        <>
          <style>{`
            .penal-map-tooltip {
              background: white !important;
              border: 1px solid #e5e7eb !important;
              border-radius: 8px !important;
              box-shadow: 0 4px 16px rgba(0,0,0,0.10) !important;
              padding: 0 !important;
            }
            .penal-map-tooltip::before { display: none !important; }
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
                key={metric}
                data={geoData as any}
                style={styleFeature as any}
                onEachFeature={onEachFeature as any}
              />
            </MapContainer>
          </div>

          {/* Gradient legend */}
          <div className="flex items-center gap-2 mt-2 justify-end">
            <span className="text-xs text-[#9ca3af]">{METRIC_COLORS[metric].label}:</span>
            <div className="flex items-center gap-0.5">
              {LEGEND_STOPS.map((t) => (
                <div
                  key={t}
                  className="w-6 h-3 first:rounded-l last:rounded-r"
                  style={{
                    background: interpolate(t, from, to),
                    border: "1px solid #e5e7eb",
                  }}
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
