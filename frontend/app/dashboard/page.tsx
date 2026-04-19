import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <LayoutDashboard size={18} className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Overview</h1>
          <p className="text-xs text-slate-500">Visió general de la seguretat ciutadana a Catalunya</p>
        </div>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
