import { PenalDashboard } from "@/components/dashboard/PenalDashboard";
import { ShieldAlert } from "lucide-react";

export default function PenalPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5]">
        <div className="p-2 bg-red-50 rounded-lg">
          <ShieldAlert size={18} className="text-[#dc2626]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1f2937]">Infraccions Penals</h1>
          <p className="text-xs text-[#6b7280]">Fets coneguts, resolts i detencions — Mossos d&apos;Esquadra</p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-[#6b7280] bg-white border border-[#e5e5e5] px-2 py-1 rounded">
          Font: Dades Obertes GenCat
        </span>
      </div>
      <PenalDashboard />
    </div>
  );
}
