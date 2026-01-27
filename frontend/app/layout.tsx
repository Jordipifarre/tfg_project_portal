import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  MessageSquare, 
  Search, 
  BookOpen, 
  Home as HomeIcon 
} from "lucide-react";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Seguretat AI Portal",
  description: "Portal d'intel·ligència de dades de seguretat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <div className="flex h-screen overflow-hidden">
          {/* SIDEBAR */}
          <aside className="w-64 bg-[#003366] text-white flex flex-col shadow-xl">
            <div className="p-6 flex items-center gap-3 border-b border-blue-800">
              <ShieldCheck className="text-blue-400 w-8 h-8" />
              <span className="font-bold text-lg tracking-tight">Portal de Seguretat</span>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
              <NavItem href="/" icon={<HomeIcon size={20}/>} label="Inici" />
              <NavItem href="/dashboard" icon={<LayoutDashboard size={20}/>} label="Dashboard" />
              <NavItem href="/explorer" icon={<Search size={20}/>} label="Explorador" />
              <NavItem href="/chat" icon={<MessageSquare size={20}/>} label="AI Analyst" />
              <NavItem href="/docs" icon={<BookOpen size={20}/>} label="Knowledge Base" />
            </nav>

            <div className="p-4 border-t border-blue-800 text-[10px] text-blue-300 uppercase tracking-widest text-center">
              TFG Enginyeria - 2026
            </div>
          </aside>

          {/* CONTINGUT DINÀMIC */}
          <main className="flex-1 overflow-y-auto p-8 lg:p-12">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavItem({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800/50 transition-all group">
      <span className="text-blue-300 group-hover:text-white">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}