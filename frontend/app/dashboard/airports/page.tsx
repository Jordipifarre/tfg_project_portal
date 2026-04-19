import { AirportDashboard } from "@/components/dashboard/AirportDashboard";
import { Plane } from "lucide-react";

export default function AirportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <div className="p-2 bg-cyan-500/10 rounded-lg">
          <Plane size={18} className="text-cyan-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Incidents als Aeroports</h1>
          <p className="text-xs text-slate-500">Fets delictius registrats als aeroports de Catalunya</p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-slate-600 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
          Font: Dades Obertes GenCat
        </span>
      </div>
      <AirportDashboard />
    </div>
  );
}
