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

const C = { known: "#dc2626", resolved: "#15803d", arrests: "#d97706" };

const TT = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  color: "#1f2937",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
    <div className="rounded-lg border-l-4 border-l-[#dc2626] border border-[#e5e5e5] bg-red-50 p-6 text-[#dc2626] text-sm">
      Error carregant dades: {error}
    </div>
  );

  const p = overview?.penal;
  const a = overview?.airports;
  const h = overview?.hate_crimes;
  const resolutionRate = p ? ((p.total_resolved / (p.total_known || 1)) * 100).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Fets Penals Coneguts"
          value={p ? p.total_known.toLocaleString("ca-ES") : "—"}
          sub={`${p?.total_arrests.toLocaleString("ca-ES") ?? "—"} detencions`}
          icon={<ShieldAlert size={18} className="text-[#dc2626]" />}
          borderColor="#dc2626"
        />
        <KpiCard
          label="Taxa Resolució"
          value={`${resolutionRate}%`}
          sub={`${p?.total_resolved.toLocaleString("ca-ES") ?? "—"} resolts`}
          icon={<TrendingUp size={18} className="text-[#15803d]" />}
          borderColor="#15803d"
        />
        <KpiCard
          label="Incidents Aeroports"
          value={a ? a.total.toLocaleString("ca-ES") : "—"}
          sub="Total acumulat"
          icon={<Plane size={18} className="text-[#0284c7]" />}
          borderColor="#0284c7"
        />
        <KpiCard
          label="Crims d'Odi · Víctimes"
          value={h ? h.total_victims.toLocaleString("ca-ES") : "—"}
          sub={`${h?.total_incidents.toLocaleString("ca-ES") ?? "—"} fets registrats`}
          icon={<AlertTriangle size={18} className="text-[#d97706]" />}
          borderColor="#d97706"
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
                    <stop offset="5%" stopColor={C.known} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.known} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.resolved} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.resolved} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280" }} />
                <Area type="monotone" dataKey="known" name="Coneguts" stroke={C.known} fill="url(#gKnown)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="resolved" name="Resolts" stroke={C.resolved} fill="url(#gResolved)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>

        <ChartCard title="Top 10 — Tipus de Delicte" sub="Per volum total de fets coneguts">
          {penal && penal.top_crimes.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={penal.top_crimes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <YAxis type="category" dataKey="type" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={130} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" name="Total" fill={C.known} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>
      </div>

      {/* Category cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#9ca3af] mb-3">
          Àrees d&apos;anàlisi
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <CategoryCard
            href="/dashboard/penal"
            icon={<ShieldAlert size={20} className="text-[#dc2626]" />}
            label="Infraccions Penals"
            desc="Fets coneguts, resolts i detencions per any i comarca"
            borderColor="#dc2626"
          />
          <CategoryCard
            href="/dashboard/airports"
            icon={<Plane size={20} className="text-[#0284c7]" />}
            label="Aeroports"
            desc="Incidents registrats als aeroports de Catalunya"
            borderColor="#0284c7"
          />
          <CategoryCard
            href="/dashboard/hate-crimes"
            icon={<AlertTriangle size={20} className="text-[#d97706]" />}
            label="Crims d'Odi"
            desc="Delictes i infraccions per discriminació i odi"
            borderColor="#d97706"
          />
          <CategoryCard
            href="/dashboard/transport"
            icon={<Train size={20} className="text-[#15803d]" />}
            label="Transport Públic"
            desc="Incidents per bus, metro, taxi i tren"
            borderColor="#15803d"
          />
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, borderColor }: {
  label: string; value: string; sub: string; icon: React.ReactNode; borderColor: string;
}) {
  return (
    <div
      className="rounded-lg border border-[#e5e5e5] border-t-4 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
      style={{ borderTopColor: borderColor }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">{label}</p>
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-[#1f2937] tabular-nums font-serif">{value}</p>
      <p className="text-xs text-[#9ca3af] mt-1">{sub}</p>
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 shadow-sm">
      <h3 className="text-base font-bold text-[#1f2937]">{title}</h3>
      <p className="text-xs text-[#6b7280] mb-4">{sub}</p>
      {children}
    </div>
  );
}

function CategoryCard({ href, icon, label, desc, borderColor }: {
  href: string; icon: React.ReactNode; label: string; desc: string; borderColor: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-[#e5e5e5] border-t-4 bg-white p-5 shadow-sm hover:shadow-md transition-shadow block"
      style={{ borderTopColor: borderColor }}
    >
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-semibold text-[#1f2937] group-hover:text-[#1a3a52] transition-colors">{label}</p>
      <p className="text-xs text-[#6b7280] mt-1 leading-relaxed">{desc}</p>
    </Link>
  );
}

function NoData() {
  return <div className="h-[280px] flex items-center justify-center text-[#9ca3af] text-sm">Sense dades disponibles</div>;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg bg-gray-100" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-[360px] rounded-lg bg-gray-100" />
        <Skeleton className="h-[360px] rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}
