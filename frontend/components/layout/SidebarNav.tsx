"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, LayoutDashboard, Database, MessageSquare,
  ShieldAlert, Plane, AlertTriangle, Train, ChevronDown,
  Table2, FileText,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const dashboardChildren = [
  { href: "/dashboard",             icon: LayoutDashboard, label: "Overview",           exact: true,  color: "text-white/70"   },
  { href: "/dashboard/penal",       icon: ShieldAlert,     label: "Infraccions Penals", exact: false, color: "text-red-300"    },
  { href: "/dashboard/airports",    icon: Plane,           label: "Aeroports",          exact: false, color: "text-sky-300"    },
  { href: "/dashboard/hate-crimes", icon: AlertTriangle,   label: "Crims d'Odi",        exact: false, color: "text-amber-300"  },
  { href: "/dashboard/transport",   icon: Train,           label: "Transport Públic",   exact: false, color: "text-emerald-300"},
];

const explorerChildren = [
  { href: "/explorer/tables",   icon: Table2,    label: "Taules de Dades",    exact: false, color: "text-sky-300"     },
  { href: "/explorer/articles", icon: FileText,  label: "Articles i Informes", exact: false, color: "text-amber-300"  },
];

interface SidebarNavProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const isExplorer = pathname.startsWith("/explorer");
  const [dashOpen, setDashOpen] = useState(isDashboard);
  const [explorerOpen, setExplorerOpen] = useState(isExplorer);

  useEffect(() => { if (isDashboard) setDashOpen(true); }, [isDashboard]);
  useEffect(() => { if (isExplorer) setExplorerOpen(true); }, [isExplorer]);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  if (collapsed) {
    return (
      <nav className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
        <CollapseNavIcon href="/" icon={<Home size={18} />} active={pathname === "/"} title="Home" onClick={onNavigate} />
        <CollapseNavIcon href="/dashboard" icon={<LayoutDashboard size={18} />} active={isDashboard} title="Dashboard" onClick={onNavigate} />
        {isDashboard && (
          <div className="flex flex-col items-center gap-1 mt-0.5 mb-1">
            {dashboardChildren.slice(1).map((item) => (
              <CollapseNavIcon
                key={item.href}
                href={item.href}
                icon={<item.icon size={14} />}
                active={isActive(item.href, item.exact)}
                title={item.label}
                small
                onClick={onNavigate}
              />
            ))}
          </div>
        )}
        <CollapseNavIcon href="/explorer/tables" icon={<Database size={18} />} active={isExplorer} title="Data Explorer" onClick={onNavigate} />
        {isExplorer && (
          <div className="flex flex-col items-center gap-1 mt-0.5 mb-1">
            {explorerChildren.map((item) => (
              <CollapseNavIcon
                key={item.href}
                href={item.href}
                icon={<item.icon size={14} />}
                active={isActive(item.href, item.exact)}
                title={item.label}
                small
                onClick={onNavigate}
              />
            ))}
          </div>
        )}
        <CollapseNavIcon href="/chat" icon={<MessageSquare size={18} />} active={pathname.startsWith("/chat")} title="Smart Chat" onClick={onNavigate} />
      </nav>
    );
  }

  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      <NavLink href="/" icon={<Home size={16} />} label="Home" active={pathname === "/"} onClick={onNavigate} />

      {/* Dashboard group */}
      <div>
        <button
          onClick={() => setDashOpen(!dashOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            isDashboard
              ? "bg-white/15 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          <span className="flex items-center gap-2.5">
            <LayoutDashboard size={16} />
            Dashboard
          </span>
          <ChevronDown
            size={14}
            className={cn("transition-transform duration-200 shrink-0", dashOpen && "rotate-180")}
          />
        </button>

        {dashOpen && (
          <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
            {dashboardChildren.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/50 hover:text-white hover:bg-white/10"
                  )}
                >
                  <item.icon
                    size={14}
                    className={cn(active ? "text-white" : item.color)}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Explorer group */}
      <div>
        <button
          onClick={() => setExplorerOpen(!explorerOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            isExplorer
              ? "bg-white/15 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          <span className="flex items-center gap-2.5">
            <Database size={16} />
            Data Explorer
          </span>
          <ChevronDown
            size={14}
            className={cn("transition-transform duration-200 shrink-0", explorerOpen && "rotate-180")}
          />
        </button>

        {explorerOpen && (
          <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5">
            {explorerChildren.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/50 hover:text-white hover:bg-white/10"
                  )}
                >
                  <item.icon
                    size={14}
                    className={cn(active ? "text-white" : item.color)}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NavLink href="/chat" icon={<MessageSquare size={16} />} label="Smart Chat" active={pathname.startsWith("/chat")} onClick={onNavigate} />
    </nav>
  );
}

function NavLink({ href, icon, label, active, onClick }: {
  href: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-white/15 text-white"
          : "text-white/60 hover:text-white hover:bg-white/10"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function CollapseNavIcon({ href, icon, active, title, small = false, onClick }: {
  href: string; icon: React.ReactNode; active: boolean; title: string; small?: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      title={title}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-lg transition-all",
        small ? "w-7 h-7" : "w-9 h-9",
        active
          ? "bg-white/15 text-white"
          : "text-white/40 hover:text-white hover:bg-white/10"
      )}
    >
      {icon}
    </Link>
  );
}
