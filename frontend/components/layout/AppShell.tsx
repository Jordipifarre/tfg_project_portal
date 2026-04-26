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
    <div className="flex h-screen overflow-hidden bg-gray-50 text-[#1f2937]">
      {/* ── Sidebar — Deep Navy ───────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 transition-all duration-200",
          "bg-[#1a3a52] border-r border-[rgba(255,255,255,0.1)]",
          collapsed ? "w-14" : "w-60"
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex items-center border-b border-[rgba(255,255,255,0.1)] h-16 shrink-0",
            collapsed ? "justify-center px-0" : "gap-3 px-5"
          )}
        >
          <div className="p-1.5 bg-white/10 rounded-lg shrink-0">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-sm tracking-tight text-white truncate font-serif">
                Safecast AI
              </p>
              <p className="text-[10px] text-white/50 leading-none mt-0.5 truncate">
                Catalunya Security Portal
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <SidebarNav collapsed={collapsed} />

        {/* Footer: collapse toggle */}
        <div
          className={cn(
            "p-3 border-t border-[rgba(255,255,255,0.1)] flex shrink-0",
            collapsed ? "justify-center" : "justify-between items-center"
          )}
        >
          {!collapsed && (
            <span className="text-[10px] text-white/25 uppercase tracking-widest">
              TFG · 2026
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
