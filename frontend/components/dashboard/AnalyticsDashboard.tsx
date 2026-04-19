"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { fetchOverviewStats, fetchPenalStats, type OverviewStats, type PenalStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, Plane, AlertTriangle, Train, TrendingUp } from "lucide-react";
import Link from "next/link";

const CHART_COLORS = { known: "#f87171", resolved: "#34d399", arrests: "#fbbf24" };

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#e2e8f0",
  fontSize: 12,
};

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [penal, setPenal] = useState<PenalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchOverviewStats(), fetchPenalStats()])
      .then(([ov, pe]) => { setOverview(ov); setPenal(pe); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-red-400 text-sm">
      Error carregant dades: {error}
    </div>
  );

  const p = overview?.penal;
  const a = overview?.airports;
  const h = overview?.hate_crimes;
  const t = overview?.transport;
  const resolutionRate = p ? ((p.total_resolved / (p.total_known || 1)) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Fets Penals Coneguts"
          value={p ? p.total_known.toLocaleString("ca-ES") : "—"}
          sub={`${p?.total_arrests.toLocaleString("ca-ES") ?? "—"} detencions`}
          icon={<ShieldAlert size={18} className="text-red-400" />}
          accent="red"
        />
        <KpiCard
          label="Taxa Resolució"
          value={`${resolutionRate}%`}
          sub={`${p?.total_resolved.toLocaleString("ca-ES") ?? "—"} resolts`}
          icon={<TrendingUp size={18} className="text-emerald-400" />}
          accent="emerald"
        />
        <KpiCard
          label="Incidents Aeroports"
          value={a ? a.total.toLocaleString("ca-ES") : "—"}
          sub="Total acumulat"
          icon={<Plane size={18} className="text-cyan-400" />}
          accent="cyan"
        />
        <KpiCard
          label="Crims d'Odi · Víctimes"
          value={h ? h.total_victims.toLocaleString("ca-ES") : "—"}
          sub={`${h?.total_incidents.toLocaleString("ca-ES") ?? "—"} fets registrats`}
          icon={<AlertTriangle size={18} className="text-purple-400" />}
          accent="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Evolució Anual — Fets Penals" sub="Coneguts, resolts i detencions per any">
          {penal && penal.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={penal.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gKnown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.known} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.known} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.resolved} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.resolved} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                <Area type="monotone" dataKey="known" name="Coneguts" stroke={CHART_COLORS.known} fill="url(#gKnown)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="resolved" name="Resolts" stroke={CHART_COLORS.resolved} fill="url(#gResolved)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>

        <ChartCard title="Top 10 — Tipus de Delicte" sub="Per volum total de fets coneguts">
          {penal && penal.top_crimes.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={penal.top_crimes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <YAxis type="category" dataKey="type" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={130} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="total" name="Total" fill={CHART_COLORS.known} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>
      </div>

      {/* Category cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Àrees d'anàlisi</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <CategoryCard href="/dashboard/penal" icon={<ShieldAlert size={20} className="text-red-400" />} label="Infraccions Penals" desc="Fets coneguts, resolts i detencions per any i comarca" accent="red" />
          <CategoryCard href="/dashboard/airports" icon={<Plane size={20} className="text-cyan-400" />} label="Aeroports" desc="Incidents registrats als aeroports de Catalunya" accent="cyan" />
          <CategoryCard href="/dashboard/hate-crimes" icon={<AlertTriangle size={20} className="text-purple-400" />} label="Crims d'Odi" desc="Delictes i infraccions per discriminació i odi" accent="purple" />
          <CategoryCard href="/dashboard/transport" icon={<Train size={20} className="text-blue-400" />} label="Transport Públic" desc="Incidents per bus, metro, taxi i tren" accent="blue" />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: React.ReactNode; accent: string }) {
  const bg: Record<string, string> = { red: "bg-red-500/10 border-red-900/40", emerald: "bg-emerald-500/10 border-emerald-900/40", cyan: "bg-cyan-500/10 border-cyan-900/40", purple: "bg-purple-500/10 border-purple-900/40" };
  return (
    <div className={`rounded-xl border p-4 ${bg[accent] ?? "bg-slate-900 border-slate-800"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <div className="p-1.5 bg-slate-900/60 rounded-lg">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="text-xs text-slate-500 mb-4">{sub}</p>
      {children}
    </div>
  );
}

function CategoryCard({ href, icon, label, desc, accent }: { href: string; icon: React.ReactNode; label: string; desc: string; accent: string }) {
  const hover: Record<string, string> = { red: "hover:border-red-800/60", cyan: "hover:border-cyan-800/60", purple: "hover:border-purple-800/60", blue: "hover:border-blue-800/60" };
  return (
    <Link href={href} className={`group rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:bg-slate-900 ${hover[accent] ?? ""}`}>
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-semibold text-slate-200 group-hover:text-slate-100">{label}</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</p>
    </Link>
  );
}

function NoData() {
  return <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm">Sense dades disponibles</div>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-slate-800" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[340px] rounded-xl bg-slate-800" />
        <Skeleton className="h-[340px] rounded-xl bg-slate-800" />
      </div>
    </div>
  );
}
