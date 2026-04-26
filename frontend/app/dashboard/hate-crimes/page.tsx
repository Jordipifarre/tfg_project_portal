import { HateCrimesDashboard } from "@/components/dashboard/HateCrimesDashboard";
import { AlertTriangle } from "lucide-react";

export default function HateCrimesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#e5e5e5]">
        <div className="p-2 bg-amber-50 rounded-lg">
          <AlertTriangle size={18} className="text-[#d97706]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#1f2937]">Crims d&apos;Odi i Discriminació</h1>
          <p className="text-xs text-[#6b7280]">Fets delictius i infraccions administratives de l&apos;àmbit de l&apos;odi</p>
        </div>
        <span className="ml-auto text-[10px] font-mono text-[#6b7280] bg-white border border-[#e5e5e5] px-2 py-1 rounded">
          Font: Dades Obertes GenCat
        </span>
      </div>
      <HateCrimesDashboard />
    </div>
  );
}
