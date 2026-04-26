"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fetchAirportStats, type AirportStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, TrendingUp, MapPin } from "lucide-react";

const TT = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  color: "#1f2937",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};
const BAR_COLORS = [
  "#0284c7", "#0369a1", "#0ea5e9", "#38bdf8",
  "#7dd3fc", "#bae6fd", "#0c4a6e", "#075985", "#0369a1", "#0284c7",
];

export function AirportDashboard() {
  const [data, setData] = useState<AirportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAirportStats().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[600px] rounded-lg bg-gray-100" />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const total = data.by_airport.reduce((s, a) => s + a.total, 0);
  const latest = data.trend.at(-1);
  const topAirport = data.by_airport[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Kpi
          label="Total Incidents"
          value={total.toLocaleString("ca-ES")}
          sub="Acumulat tots els anys"
          icon={<Plane size={16} className="text-[#0284c7]" />}
          borderColor="#0284c7"
        />
        <Kpi
          label="Any Més Recent"
          value={latest?.total.toLocaleString("ca-ES") ?? "—"}
          sub={`Any ${latest?.year}`}
          icon={<TrendingUp size={16} className="text-[#15803d]" />}
          borderColor="#15803d"
        />
        <Kpi
          label="Aeroport Destacat"
          value={topAirport?.airport ?? "—"}
          sub={`${topAirport?.total.toLocaleString("ca-ES") ?? "—"} incidents`}
          icon={<MapPin size={16} className="text-[#d97706]" />}
          borderColor="#d97706"
        />
      </div>

      <Card title="Evolució Anual d'Incidents" sub="Total d'incidents registrats als aeroports de Catalunya per any">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TT} />
            <Line type="monotone" dataKey="total" name="Incidents" stroke="#0284c7" strokeWidth={2.5} dot={{ fill: "#0284c7", r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Incidents per Aeroport" sub="Volum total acumulat">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_airport} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="airport" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="total" name="Incidents" radius={[4, 4, 0, 0]}>
                {data.by_airport.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top 10 Tipus de Fet" sub="Per volum total d'incidents">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_type} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={160} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="total" name="Total" fill="#0284c7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
      <p className="text-xl font-bold text-[#1f2937] tabular-nums leading-tight font-serif">{value}</p>
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

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border-l-4 border-l-[#dc2626] border border-[#e5e5e5] bg-red-50 p-4 text-[#dc2626] text-sm">
      Error: {msg}
    </div>
  );
}
