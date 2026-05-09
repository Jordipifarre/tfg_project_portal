"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  fetchHateCrimesStats,
  fetchHateCrimesMapStats,
  type HateCrimesStats,
  type MapGranularity,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Users, Wifi } from "lucide-react";

const CataloniaMap = dynamic(() => import("./CataloniaMap"), { ssr: false });

const TT = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  color: "#1f2937",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};
const PIE_COLORS = ["#d97706", "#b45309", "#92400e", "#78350f"];

export function HateCrimesDashboard() {
  const [data, setData] = useState<HateCrimesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mapGranularity, setMapGranularity] = useState<MapGranularity>("comarca");
  const [mapData, setMapData] = useState<{ name: string; incidents: number; victims: number }[]>([]);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    fetchHateCrimesStats().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setMapLoading(true);
    fetchHateCrimesMapStats(mapGranularity)
      .then((d) => setMapData(d.regions))
      .catch(() => setMapData([]))
      .finally(() => setMapLoading(false));
  }, [mapGranularity]);

  if (loading) return <Skeleton className="h-[600px] rounded-lg bg-gray-100" />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const totalIncidents = data.trend.reduce((s, r) => s + r.incidents, 0);
  const totalVictims = data.trend.reduce((s, r) => s + r.victims, 0);
  const latest = data.trend.at(-1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Kpi
          label="Total Fets Registrats"
          value={totalIncidents.toLocaleString("ca-ES")}
          sub="Acumulat tots els anys"
          icon={<AlertTriangle size={16} className="text-[#d97706]" />}
          borderColor="#d97706"
        />
        <Kpi
          label="Total Víctimes"
          value={totalVictims.toLocaleString("ca-ES")}
          sub="Acumulat tots els anys"
          icon={<Users size={16} className="text-[#dc2626]" />}
          borderColor="#dc2626"
        />
        <Kpi
          label="Any Més Recent"
          value={latest?.incidents.toLocaleString("ca-ES") ?? "—"}
          sub={`${latest?.victims.toLocaleString("ca-ES") ?? "—"} víctimes (${latest?.year})`}
          icon={<Wifi size={16} className="text-[#1a3a52]" />}
          borderColor="#1a3a52"
        />
      </div>

      <Card title="Evolució Anual" sub="Incidents i víctimes registrades per any">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280" }} />
            <Line type="monotone" dataKey="incidents" name="Incidents" stroke="#d97706" strokeWidth={2.5} dot={{ fill: "#d97706", r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="victims" name="Víctimes" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Distribució Geogràfica" sub="Incidents per zona — passa el cursor per veure el detall">
        {mapLoading ? (
          <div className="h-[380px] flex items-center justify-center text-[#9ca3af] text-sm">
            Carregant dades del mapa…
          </div>
        ) : (
          <CataloniaMap
            data={mapData}
            granularity={mapGranularity}
            onGranularityChange={setMapGranularity}
          />
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Canal dels Fets" sub="Presencial vs. en línia">
          {data.by_channel.length > 0 ? (
            <div className="flex items-center justify-center">
              <PieChart width={260} height={220}>
                <Pie
                  data={data.by_channel}
                  dataKey="total"
                  nameKey="channel"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props) => `${(props as any).channel ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "#e5e5e5" }}
                >
                  {data.by_channel.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v) => (typeof v === "number" ? v.toLocaleString("ca-ES") : v)} />
              </PieChart>
            </div>
          ) : <NoData />}
        </Card>

        <Card title="Top 10 — Àmbit del Fet" sub="Per volum total d'incidents">
          {data.by_scope.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.by_scope} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="scope" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={140} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" name="Incidents" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, borderColor }: {
  label: string; value: string; sub: string; icon: React.ReactNode; borderColor: string;
}) {
  return (
    <div
      className="rounded-lg border border-[#e5e5e5] border-t-4 bg-white p-6 shadow-sm"
      style={{ borderTopColor: borderColor }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-[#6b7280] uppercase tracking-wide">{label}</p>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-[#1f2937] tabular-nums font-serif">{value}</p>
      <p className="text-xs text-[#9ca3af] mt-1">{sub}</p>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-[#1f2937]">{title}</h3>
      <p className="text-xs text-[#6b7280] mb-4">{sub}</p>
      {children}
    </div>
  );
}

function NoData() {
  return <div className="h-[220px] flex items-center justify-center text-[#9ca3af] text-sm">Sense dades disponibles</div>;
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border-l-4 border-l-[#dc2626] border border-[#e5e5e5] bg-red-50 p-4 text-[#dc2626] text-sm">
      Error: {msg}
    </div>
  );
}
