"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { fetchHateCrimesStats, type HateCrimesStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Users, Wifi } from "lucide-react";

const TT = { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: 12 };
const PIE_COLORS = ["#c084fc", "#a855f7", "#7c3aed", "#6d28d9"];

export function HateCrimesDashboard() {
  const [data, setData] = useState<HateCrimesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHateCrimesStats().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[600px] rounded-xl bg-slate-800" />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const totalIncidents = data.trend.reduce((s, r) => s + r.incidents, 0);
  const totalVictims = data.trend.reduce((s, r) => s + r.victims, 0);
  const latest = data.trend.at(-1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Total Fets Registrats" value={totalIncidents.toLocaleString("ca-ES")} sub="Acumulat tots els anys" icon={<AlertTriangle size={16} className="text-purple-400" />} />
        <Kpi label="Total Víctimes" value={totalVictims.toLocaleString("ca-ES")} sub="Acumulat tots els anys" icon={<Users size={16} className="text-red-400" />} />
        <Kpi label="Any Més Recent" value={latest?.incidents.toLocaleString("ca-ES") ?? "—"} sub={`${latest?.victims.toLocaleString("ca-ES") ?? "—"} víctimes (${latest?.year})`} icon={<Wifi size={16} className="text-cyan-400" />} />
      </div>

      <Card title="Evolució Anual" sub="Incidents i víctimes registrades per any">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TT} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Line type="monotone" dataKey="incidents" name="Incidents" stroke="#c084fc" strokeWidth={2.5} dot={{ fill: "#c084fc", r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="victims" name="Víctimes" stroke="#f87171" strokeWidth={2} strokeDasharray="5 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>
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
                  labelLine={{ stroke: "#475569" }}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="scope" tick={{ fill: "#94a3b8", fontSize: 10 }} tickLine={false} axisLine={false} width={140} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" name="Incidents" fill="#a855f7" radius={[0, 4, 4, 0]} />
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
