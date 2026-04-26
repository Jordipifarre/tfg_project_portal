"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { fetchPenalStats, type PenalStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, CheckCircle, Users } from "lucide-react";

const C = { known: "#dc2626", resolved: "#15803d", arrests: "#d97706" };
const TT = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  color: "#1f2937",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

export function PenalDashboard() {
  const [data, setData] = useState<PenalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPenalStats().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[600px] rounded-lg bg-gray-100" />;
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
        <Kpi
          label="Fets Coneguts"
          value={latest?.known.toLocaleString("ca-ES") ?? "—"}
          sub={`Any ${latest?.year}`}
          icon={<ShieldAlert size={16} className="text-[#dc2626]" />}
          borderColor="#dc2626"
        />
        <Kpi
          label="Resolts"
          value={latest?.resolved.toLocaleString("ca-ES") ?? "—"}
          sub={`Taxa: ${rateNow}%${ratePrev ? ` (ant. ${ratePrev}%)` : ""}`}
          icon={<CheckCircle size={16} className="text-[#15803d]" />}
          borderColor="#15803d"
        />
        <Kpi
          label="Detencions"
          value={latest?.arrests.toLocaleString("ca-ES") ?? "—"}
          sub={`Any ${latest?.year}`}
          icon={<Users size={16} className="text-[#d97706]" />}
          borderColor="#d97706"
        />
      </div>

      {/* Trend chart */}
      <Card title="Evolució Anual" sub="Fets coneguts, resolts i detencions (2011–actualitat)">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {(["known", "resolved", "arrests"] as const).map((k) => (
                <linearGradient key={k} id={`g_${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C[k]} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C[k]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280" }} />
            <Area type="monotone" dataKey="known" name="Coneguts" stroke={C.known} fill="url(#g_known)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="resolved" name="Resolts" stroke={C.resolved} fill="url(#g_resolved)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="arrests" name="Detencions" stroke={C.arrests} fill="url(#g_arrests)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Top crimes */}
      <Card title="Top 10 Tipus de Delicte" sub="Per volum total de fets coneguts (tots els anys)">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data.top_crimes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <YAxis type="category" dataKey="type" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} axisLine={false} width={150} />
            <Tooltip contentStyle={TT} />
            <Bar dataKey="total" name="Total Fets" fill={C.known} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
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

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border-l-4 border-l-[#dc2626] border border-[#e5e5e5] bg-red-50 p-4 text-[#dc2626] text-sm">
      Error: {msg}
    </div>
  );
}
