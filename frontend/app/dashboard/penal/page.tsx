import { PenalDashboard } from "@/components/dashboard/PenalDashboard";
import { ShieldAlert } from "lucide-react";

export default function PenalPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <ShieldAlert size={18} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Infraccions Penals</h1>
          <p className="text-xs text-slate-500">Fets coneguts, resolts i detencions — Mossos d'Esquadra</p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-slate-600 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
          Font: Dades Obertes GenCat
        </span>
      </div>
      <PenalDashboard />
    </div>
  );
}
