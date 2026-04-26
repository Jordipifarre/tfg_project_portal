import { TransportDashboard } from "@/components/dashboard/TransportDashboard";
import { Train } from "lucide-react";

export default function TransportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5]">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <Train size={18} className="text-[#15803d]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1f2937]">Transport Públic</h1>
          <p className="text-xs text-[#6b7280]">Incidents al bus, metro, taxi i tren a Catalunya</p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-[#6b7280] bg-white border border-[#e5e5e5] px-2 py-1 rounded">
          Font: Dades Obertes GenCat
        </span>
      </div>
      <TransportDashboard />
    </div>
  );
}
