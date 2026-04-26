"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { fetchTransportStats, type TransportStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Train, Car, Zap } from "lucide-react";

const TT = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
  color: "#1f2937",
  fontSize: 12,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};
const MODE_COLORS: Record<string, string> = {
  bus:     "#1d4ed8",   /* blue-700 */
  metro:   "#6d28d9",   /* violet-700 */
  taxi:    "#b45309",   /* amber-700 */
  train:   "#15803d",   /* forest green */
  Autobús: "#1d4ed8",
  Metro:   "#6d28d9",
  Taxi:    "#b45309",
  Tren:    "#15803d",
};

export function TransportDashboard() {
  const [data, setData] = useState<TransportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransportStats().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-[600px] rounded-lg bg-gray-100" />;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const totalByMode = data.by_mode.reduce((s, m) => s + m.total, 0);
  const topMode = data.by_mode.sort((a, b) => b.total - a.total)[0];
  const latest = data.trend.at(-1);
  const latestTotal = latest
    ? Object.entries(latest).filter(([k]) => k !== "year").reduce((s, [, v]) => s + (v as number), 0)
    : 0;

  const modeKeys = data.trend.length > 0
    ? Object.keys(data.trend[0]).filter((k) => k !== "year")
    : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Kpi
          label="Total Incidents"
          value={totalByMode.toLocaleString("ca-ES")}
          sub="Acumulat tots els anys"
          icon={<Train size={16} className="text-[#15803d]" />}
          borderColor="#15803d"
        />
        <Kpi
          label="Mode Principal"
          value={topMode?.mode ?? "—"}
          sub={`${topMode?.total.toLocaleString("ca-ES") ?? "—"} incidents`}
          icon={<Zap size={16} className="text-[#d97706]" />}
          borderColor="#d97706"
        />
        <Kpi
          label="Any Més Recent"
          value={latestTotal.toLocaleString("ca-ES")}
          sub={`Total incidents any ${latest?.year}`}
          icon={<Car size={16} className="text-[#1d4ed8]" />}
          borderColor="#1d4ed8"
        />
      </div>

      <Card title="Incidents per Mode de Transport i Any" sub="Evolució anual dels incidents al transport públic">
        {data.trend.length > 0 && modeKeys.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280" }} />
              {modeKeys.map((k) => (
                <Bar key={k} dataKey={k} name={k.charAt(0).toUpperCase() + k.slice(1)} stackId="a" fill={MODE_COLORS[k] ?? "#475569"} />
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
                  {data.by_mode.map((entry, i) => <Cell key={i} fill={MODE_COLORS[entry.mode] ?? "#475569"} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v) => (typeof v === "number" ? v.toLocaleString("ca-ES") : v)} />
              </PieChart>
              <div className="space-y-2">
                {data.by_mode.map((m) => (
                  <div key={m.mode} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: MODE_COLORS[m.mode] ?? "#475569" }} />
                    <span className="text-[#6b7280]">{m.mode}</span>
                    <span className="text-[#1f2937] font-medium tabular-nums ml-auto pl-4">{m.total.toLocaleString("ca-ES")}</span>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="mode" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="total" name="Total Incidents" radius={[4, 4, 0, 0]}>
                  {data.by_mode.map((entry, i) => <Cell key={i} fill={MODE_COLORS[entry.mode] ?? "#475569"} />)}
                </Bar>
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
