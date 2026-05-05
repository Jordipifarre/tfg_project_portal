"use client";

import { useState } from "react";
import { ShieldCheck, PanelLeftClose, PanelLeftOpen, Menu, X } from "lucide-react";
import { SidebarNav } from "./SidebarNav";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
  onClose,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
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
          <div className="overflow-hidden flex-1">
            <p className="font-bold text-sm tracking-tight text-white truncate font-serif">
              Safecast AI
            </p>
            <p className="text-[10px] text-white/50 leading-none mt-0.5 truncate">
              Catalunya Security Portal
            </p>
          </div>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <SidebarNav collapsed={collapsed} onNavigate={onClose} />

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
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-[#1f2937]">
      {/* ── Desktop Sidebar ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 transition-all duration-200",
          "bg-[#1a3a52] border-r border-[rgba(255,255,255,0.1)]",
          collapsed ? "w-14" : "w-60"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>

      {/* ── Mobile Drawer Overlay ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col shrink-0",
          "bg-[#1a3a52] border-r border-[rgba(255,255,255,0.1)]",
          "transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          collapsed={false}
          onToggleCollapse={() => setMobileOpen(false)}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 shrink-0 bg-[#1a3a52] border-b border-[rgba(255,255,255,0.1)]">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="p-1 bg-white/10 rounded-lg">
            <ShieldCheck className="text-white w-4 h-4" />
          </div>
          <p className="font-bold text-sm tracking-tight text-white font-serif">
            Safecast AI
          </p>
        </header>

        {children}
      </main>
    </div>
  );
}
