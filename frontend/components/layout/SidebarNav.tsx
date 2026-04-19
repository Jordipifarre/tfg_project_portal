"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, LayoutDashboard, Database, MessageSquare,
  ShieldAlert, Plane, AlertTriangle, Train, ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const dashboardChildren = [
  { href: "/dashboard",             icon: LayoutDashboard, label: "Overview",           exact: true,  color: "text-slate-400" },
  { href: "/dashboard/penal",       icon: ShieldAlert,     label: "Infraccions Penals", exact: false, color: "text-red-400"   },
  { href: "/dashboard/airports",    icon: Plane,           label: "Aeroports",          exact: false, color: "text-cyan-400"  },
  { href: "/dashboard/hate-crimes", icon: AlertTriangle,   label: "Crims d'Odi",        exact: false, color: "text-purple-400"},
  { href: "/dashboard/transport",   icon: Train,           label: "Transport Públic",   exact: false, color: "text-blue-400"  },
];

interface SidebarNavProps {
  collapsed?: boolean;
}

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const [dashOpen, setDashOpen] = useState(isDashboard);

  useEffect(() => { if (isDashboard) setDashOpen(true); }, [isDashboard]);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  if (collapsed) {
    return (
      <nav className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
        <CollapseNavIcon href="/" icon={<Home size={18} />} active={pathname === "/"} title="Home" />
        <CollapseNavIcon href="/dashboard" icon={<LayoutDashboard size={18} />} active={isDashboard} title="Dashboard" />
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
              />
            ))}
          </div>
        )}
        <CollapseNavIcon href="/explorer" icon={<Database size={18} />} active={pathname.startsWith("/explorer")} title="Data Explorer" />
        <CollapseNavIcon href="/chat" icon={<MessageSquare size={18} />} active={pathname.startsWith("/chat")} title="Smart Chat" />
      </nav>
    );
  }

  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      <NavLink href="/" icon={<Home size={16} />} label="Home" active={pathname === "/"} />

      {/* Dashboard group */}
      <div>
        <button
          onClick={() => setDashOpen(!dashOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            isDashboard
              ? "bg-cyan-500/10 text-cyan-400"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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
          <div className="mt-0.5 ml-3 pl-3 border-l border-slate-800 space-y-0.5">
            {dashboardChildren.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                    active
                      ? "bg-slate-800 text-slate-100"
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
                  )}
                >
                  <item.icon
                    size={14}
                    className={cn(active ? "text-cyan-400" : item.color)}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <NavLink href="/explorer" icon={<Database size={16} />} label="Data Explorer" active={pathname.startsWith("/explorer")} />
      <NavLink href="/chat" icon={<MessageSquare size={16} />} label="Smart Chat" active={pathname.startsWith("/chat")} />
    </nav>
  );
}

function NavLink({ href, icon, label, active }: {
  href: string; icon: React.ReactNode; label: string; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-cyan-500/10 text-cyan-400"
          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function CollapseNavIcon({ href, icon, active, title, small = false }: {
  href: string; icon: React.ReactNode; active: boolean; title: string; small?: boolean;
}) {
  return (
    <Link
      href={href}
      title={title}
      className={cn(
        "flex items-center justify-center rounded-lg transition-all",
        small ? "w-7 h-7" : "w-9 h-9",
        active
          ? "bg-cyan-500/10 text-cyan-400"
          : "text-slate-500 hover:text-slate-200 hover:bg-slate-800"
      )}
    >
      {icon}
    </Link>
  );
}
