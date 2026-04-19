"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { fetchPenalStats, type PenalStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, CheckCircle, Users } from "lucide-react";

const C = { known: "#f87171", resolved: "#34d399", arrests: "#fbbf24" };
const TT = { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: 12 };

export function PenalDashboard() {
  const [data, setData] = useState<PenalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPenalStats().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[600px] rounded-xl bg-slate-800" />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const latest = data.trend.at(-1);
  const prev = data.trend.at(-2);
  const rateNow = latest ? ((latest.resolved / (latest.known || 1)) * 100).toFixed(1) : "—";
  const ratePrev = prev ? ((prev.resolved / (prev.known || 1)) * 100).toFixed(1) : null;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Fets Coneguts" value={latest?.known.toLocaleString("ca-ES") ?? "—"} sub={`Any ${latest?.year}`} icon={<ShieldAlert size={16} className="text-red-400" />} />
        <Kpi label="Resolts" value={latest?.resolved.toLocaleString("ca-ES") ?? "—"} sub={`Taxa: ${rateNow}%${ratePrev ? ` (ant. ${ratePrev}%)` : ""}`} icon={<CheckCircle size={16} className="text-emerald-400" />} />
        <Kpi label="Detencions" value={latest?.arrests.toLocaleString("ca-ES") ?? "—"} sub={`Any ${latest?.year}`} icon={<Users size={16} className="text-amber-400" />} />
      </div>

      {/* Trend chart */}
      <Card title="Evolució Anual" sub="Fets coneguts, resolts i detencions (2011–actualitat)">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {(["known", "resolved", "arrests"] as const).map((k) => (
                <linearGradient key={k} id={`g_${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C[k]} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C[k]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Area type="monotone" dataKey="known" name="Coneguts" stroke={C.known} fill={`url(#g_known)`} strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="resolved" name="Resolts" stroke={C.resolved} fill={`url(#g_resolved)`} strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="arrests" name="Detencions" stroke={C.arrests} fill={`url(#g_arrests)`} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Top crimes */}
      <Card title="Top 10 Tipus de Delicte" sub="Per volum total de fets coneguts (tots els anys)">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.top_crimes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <YAxis type="category" dataKey="type" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={150} />
            <Tooltip contentStyle={TT} />
            <Bar dataKey="total" name="Total Fets" fill={C.known} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
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

function ErrorBox({ msg }: { msg: string }) {
  return <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-red-400 text-sm">Error: {msg}</div>;
}
