"use client";

import { useState } from "react";
import { ShieldCheck, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-slate-800 bg-slate-950 shrink-0 transition-all duration-200",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex items-center border-b border-slate-800 h-14 shrink-0",
            collapsed ? "justify-center px-0" : "gap-2.5 px-4"
          )}
        >
          <div className="p-1.5 bg-cyan-500/10 rounded-lg shrink-0">
            <ShieldCheck className="text-cyan-400 w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-sm tracking-tight text-slate-100 truncate">Safecast AI</p>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5 truncate">Catalunya Security Portal</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <SidebarNav collapsed={collapsed} />

        {/* Footer: collapse toggle */}
        <div className={cn("p-3 border-t border-slate-800 flex shrink-0", collapsed ? "justify-center" : "justify-between items-center")}>
          {!collapsed && (
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">TFG · 2026</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950">
        {children}
      </main>
    </div>
  );
}
