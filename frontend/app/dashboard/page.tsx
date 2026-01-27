import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Train, ShieldAlert, Users, TrendingUp } from "lucide-react";

// Definim una interfície per a les props (Això fa que el codi sigui molt més pro)
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Vista General del Sistema</h2>
        <p className="text-slate-500">Volum de dades carregat per categories.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Aeroports" value="1.048" icon={<Plane />} color="text-blue-600" />
        <StatCard title="Transport Públic" value="Pending" icon={<Train />} color="text-green-600" />
        <StatCard title="Fets d'Odi" value="Pending" icon={<ShieldAlert />} color="text-red-600" />
        <StatCard title="Detencions" value="Pending" icon={<Users />} color="text-purple-600" />
      </div>

      <Card className="p-20 border-dashed border-2 flex items-center justify-center text-slate-400">
        <div className="text-center space-y-2">
          <TrendingUp className="mx-auto w-10 h-10 opacity-20" />
          <p>Gràfiques de Tremor en construcció...</p>
        </div>
      </Card>
    </div>
  );
}

// Ara fem servir la interfície en lloc d'any
function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <div className={`${color}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
          <span className="text-green-500 font-medium">Actualitzat</span> des de Supabase
        </p>
      </CardContent>
    </Card>
  );
}