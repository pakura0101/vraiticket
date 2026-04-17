"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Ticket, Plus, BarChart3,
  Users, LogOut, ChevronRight, Activity, TrendingUp,
  Users2, FileText, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/hooks/useAuthStore";
import { AuthAvatar } from "@/components/ui/AuthAvatar";

const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard",       href: "/dashboard",        icon: LayoutDashboard, roles: ["client","agent","admin"] },
      { label: "My Tickets",      href: "/tickets",          icon: Ticket,          roles: ["client","agent","admin"] },
      { label: "New Ticket",      href: "/tickets/new",      icon: Plus,            roles: ["client","admin"]         },
      { label: "Internal Ticket", href: "/tickets/internal", icon: FileText,        roles: ["agent","admin"]          },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Stats",       href: "/admin/stats",       icon: BarChart3,  roles: ["admin"] },
      { label: "Performance", href: "/admin/performance", icon: TrendingUp, roles: ["admin"] },
      { label: "Groups",      href: "/admin/groups",      icon: Users2,     roles: ["admin"] },
      { label: "Companies",   href: "/admin/companies",   icon: Building2,  roles: ["admin"] },
      { label: "Users",       href: "/admin/users",       icon: Users,      roles: ["admin"] },
    ],
  },
];

// These hrefs need exact matching (they are prefixes of sibling hrefs)
const EXACT_MATCH = new Set([
  "/dashboard", "/tickets",
  "/admin/stats", "/admin/performance",
  "/admin/groups", "/admin/companies", "/admin/users",
]);

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();

  function isActive(href: string) {
    return EXACT_MATCH.has(href) ? pathname === href : pathname.startsWith(href);
  }

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-30 transition-colors duration-300"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-5 py-[18px] shrink-0 group"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="relative w-8 h-8 shrink-0">
          <div className="absolute inset-0 bg-amber-500 rounded-lg rotate-6 opacity-25 group-hover:rotate-12 transition-transform duration-300" />
          <div className="absolute inset-0 bg-amber-500 rounded-lg flex items-center justify-center shadow-glow-amber">
            <Activity className="w-[18px] h-[18px] text-[#0A0A0D]" strokeWidth={2.5} />
          </div>
        </div>
        <div className="leading-none">
          <span className="font-display font-extrabold text-[15px] tracking-tight block"
            style={{ color: "var(--text)" }}>
            Vrai<span style={{ color: "var(--accent)" }}>Ticket</span>
          </span>
          <span className="text-[9px] uppercase tracking-[0.18em] font-medium"
            style={{ color: "var(--text-faint)" }}>Support Suite</span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter(item => user && item.roles.includes(user.role));
          if (visible.length === 0) return null;
          return (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.22em]"
                style={{ color: "var(--text-muted)" }}>
                {section.label}
              </p>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-150 group relative"
                      )}
                      style={active ? {
                        background: "var(--accent-dim)",
                        color: "var(--accent)",
                      } : {
                        color: "var(--text-muted)",
                      }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
                      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; } }}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full"
                          style={{ background: "var(--accent)" }}
                        />
                      )}
                      <item.icon
                        className="w-[15px] h-[15px] shrink-0"
                        style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
                      />
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-40"
                          style={{ color: "var(--accent)" }} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="px-3 pb-4 pt-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <div
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <AuthAvatar name={user.full_name} avatarPath={user.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold truncate leading-tight" style={{ color: "var(--text)" }}>
                {user.full_name}
              </p>
              <p className="text-[10px] capitalize leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f43f5e"; (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              <LogOut className="w-[14px] h-[14px]" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
