import { TransportDashboard } from "@/components/dashboard/TransportDashboard";
import { Train } from "lucide-react";

export default function TransportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Train size={18} className="text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Transport Públic</h1>
          <p className="text-xs text-slate-500">Incidents al bus, metro, taxi i tren a Catalunya</p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-slate-600 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
          Font: Dades Obertes GenCat
        </span>
      </div>
      <TransportDashboard />
    </div>
  );
}
