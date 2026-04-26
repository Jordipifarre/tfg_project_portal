import { AirportDashboard } from "@/components/dashboard/AirportDashboard";
import { Plane } from "lucide-react";

export default function AirportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5]">
        <div className="p-2 bg-sky-50 rounded-lg">
          <Plane size={18} className="text-[#0284c7]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1f2937]">Incidents als Aeroports</h1>
          <p className="text-xs text-[#6b7280]">Fets delictius registrats als aeroports de Catalunya</p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-[#6b7280] bg-white border border-[#e5e5e5] px-2 py-1 rounded">
          Font: Dades Obertes GenCat
        </span>
      </div>
      <AirportDashboard />
    </div>
  );
}
