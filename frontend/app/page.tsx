import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Database, Bot, FileText } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-700">
      <div className="space-y-4">
        <h1 className="text-6xl font-extrabold tracking-tight text-slate-900">
          {"Portal d'Anàlisi sobre "}
          <span className="text-blue-600">{"seguretat a Catalunya"}</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          {"Sistema intel·ligent de gestió de dades de seguretat. Analitza fets delictius, "}
          {"transport públic i dades d'odi mitjançant IA."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <FeatureCard 
          icon={<Database className="text-blue-600" size={24} />}
          title="Dades Obertes"
          desc="Consulta dades oficials directament des de Supabase."
        />
        <FeatureCard 
          icon={<Bot className="text-green-600" size={24} />}
          title="IA SQL Agent"
          desc="Parla amb les dades mitjançant llenguatge natural."
        />
        <FeatureCard 
          icon={<FileText className="text-orange-600" size={24} />}
          title="Base Documental"
          desc="Properament: RAG amb articles i PDFs oficials."
        />
      </div>

      <div className="pt-8">
        <Link href="/dashboard">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 h-14 px-8 text-lg gap-2">
            {"Començar l'exploració"} <ArrowRight size={20} />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 bg-white border rounded-2xl shadow-sm space-y-3 hover:border-blue-200 transition-colors">
      <div className="p-3 bg-slate-50 w-fit rounded-xl">{icon}</div>
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-slate-500 text-sm">{desc}</p>
    </div>
  );
}