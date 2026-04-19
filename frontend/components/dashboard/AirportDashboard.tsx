"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { fetchAirportStats, type AirportStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, TrendingUp, MapPin } from "lucide-react";

const TT = { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: 12 };
const BAR_COLORS = ["#22d3ee", "#67e8f9", "#a5f3fc", "#cffafe", "#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7"];

export function AirportDashboard() {
  const [data, setData] = useState<AirportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAirportStats().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[600px] rounded-xl bg-slate-800" />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const total = data.by_airport.reduce((s, a) => s + a.total, 0);
  const latest = data.trend.at(-1);
  const topAirport = data.by_airport[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Total Incidents" value={total.toLocaleString("ca-ES")} sub="Acumulat tots els anys" icon={<Plane size={16} className="text-cyan-400" />} />
        <Kpi label="Any Més Recent" value={latest?.total.toLocaleString("ca-ES") ?? "—"} sub={`Any ${latest?.year}`} icon={<TrendingUp size={16} className="text-emerald-400" />} />
        <Kpi label="Aeroport Destacat" value={topAirport?.airport ?? "—"} sub={`${topAirport?.total.toLocaleString("ca-ES") ?? "—"} incidents`} icon={<MapPin size={16} className="text-amber-400" />} />
      </div>

      <Card title="Evolució Anual d'Incidents" sub="Total d'incidents registrats als aeroports de Catalunya per any">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TT} />
            <Line type="monotone" dataKey="total" name="Incidents" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill: "#22d3ee", r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Incidents per Aeroport" sub="Volum total acumulat">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.by_airport} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="airport" tick={{ fill: "#64748b", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="type" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={160} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="total" name="Total" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400">{label}</p>
        <div className="p-1.5 bg-slate-800 rounded-lg">{icon}</div>
      </div>
      <p className="text-xl font-bold text-slate-100 tabular-nums leading-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="text-xs text-slate-500 mb-4">{sub}</p>
      {children}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400 text-sm">Error: {msg}</div>;
}
