import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5]">
        <div className="p-2 bg-[#1a3a52]/10 rounded-lg">
          <LayoutDashboard size={18} className="text-[#1a3a52]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1f2937]">Overview</h1>
          <p className="text-xs text-[#6b7280]">Visió general de la seguretat ciutadana a Catalunya</p>
        </div>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
