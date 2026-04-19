import { HateCrimesDashboard } from "@/components/dashboard/HateCrimesDashboard";
import { AlertTriangle } from "lucide-react";

export default function HateCrimesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-slate-800">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <AlertTriangle size={18} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-100">Crims d&apos;Odi i Discriminació</h1>
          <p className="text-xs text-slate-500">Fets delictius i infraccions administratives de l&apos;àmbit de l&apos;odi</p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-slate-600 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md">
          Font: Dades Obertes GenCat
        </span>
      </div>
      <HateCrimesDashboard />
    </div>
  );
}
