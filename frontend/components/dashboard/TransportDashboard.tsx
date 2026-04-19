"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { fetchTransportStats, type TransportStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Train, Car, Zap } from "lucide-react";

const TT = { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: 12 };
const MODE_COLORS: Record<string, string> = {
  bus: "#60a5fa",
  metro: "#a78bfa",
  taxi: "#fb923c",
  train: "#4ade80",
  Autobús: "#60a5fa",
  Metro: "#a78bfa",
  Taxi: "#fb923c",
  Tren: "#4ade80",
};

export function TransportDashboard() {
  const [data, setData] = useState<TransportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransportStats().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[600px] rounded-xl bg-slate-800" />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const totalByMode = data.by_mode.reduce((s, m) => s + m.total, 0);
  const topMode = data.by_mode.sort((a, b) => b.total - a.total)[0];
  const latest = data.trend.at(-1);
  const latestTotal = latest ? Object.entries(latest).filter(([k]) => k !== "year").reduce((s, [, v]) => s + (v as number), 0) : 0;

  const modeKeys = data.trend.length > 0
    ? Object.keys(data.trend[0]).filter((k) => k !== "year")
    : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Total Incidents" value={totalByMode.toLocaleString("ca-ES")} sub="Acumulat tots els anys" icon={<Train size={16} className="text-blue-400" />} />
        <Kpi label="Mode Principal" value={topMode?.mode ?? "—"} sub={`${topMode?.total.toLocaleString("ca-ES") ?? "—"} incidents`} icon={<Zap size={16} className="text-amber-400" />} />
        <Kpi label="Any Més Recent" value={latestTotal.toLocaleString("ca-ES")} sub={`Total incidents any ${latest?.year}`} icon={<Car size={16} className="text-emerald-400" />} />
      </div>

      <Card title="Incidents per Mode de Transport i Any" sub="Evolució anual dels incidents al transport públic">
        {data.trend.length > 0 && modeKeys.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              {modeKeys.map((k) => (
                <Bar key={k} dataKey={k} name={k.charAt(0).toUpperCase() + k.slice(1)} stackId="a" fill={MODE_COLORS[k] ?? "#94a3b8"} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : <NoData />}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Distribució per Mode" sub="Proporció del total acumulat per cada mode">
          {data.by_mode.length > 0 ? (
            <div className="flex items-center justify-center gap-6">
              <PieChart width={220} height={220}>
                <Pie data={data.by_mode} dataKey="total" nameKey="mode" cx="50%" cy="50%" outerRadius={85} innerRadius={45}>
                  {data.by_mode.map((entry, i) => <Cell key={i} fill={MODE_COLORS[entry.mode] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v) => (typeof v === "number" ? v.toLocaleString("ca-ES") : v)} />
              </PieChart>
              <div className="space-y-2">
                {data.by_mode.map((m) => (
                  <div key={m.mode} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MODE_COLORS[m.mode] ?? "#94a3b8" }} />
                    <span className="text-slate-400">{m.mode}</span>
                    <span className="text-slate-200 font-medium tabular-nums ml-auto pl-4">{m.total.toLocaleString("ca-ES")}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <NoData />}
        </Card>

        <Card title="Comparativa de Modes" sub="Total acumulat per cada mode de transport">
          {data.by_mode.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.by_mode} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="mode" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" name="Total Incidents" radius={[4, 4, 0, 0]}>
                  {data.by_mode.map((entry, i) => <Cell key={i} fill={MODE_COLORS[entry.mode] ?? "#94a3b8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
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
      <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
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

function NoData() {
  return <div className="h-[220px] flex items-center justify-center text-slate-600 text-sm">Sense dades disponibles</div>;
}

function ErrorBox({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400 text-sm">Error: {msg}</div>;
}
