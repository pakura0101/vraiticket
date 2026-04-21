"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, X, AlertTriangle, Ticket, CheckCheck, Clock, ArrowUpRight, Sun, Moon, Menu } from "lucide-react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useThemeStore } from "@/hooks/useTheme";
import { AuthAvatar } from "@/components/ui/AuthAvatar";
import { ROLE_CONFIG, timeAgo, cn } from "@/lib/utils";
import { ticketsAPI } from "@/lib/services";
import type { TicketListItem } from "@/types";

const TITLES: Record<string, string> = {
  "/dashboard":         "Dashboard",
  "/tickets":           "Tickets",
  "/tickets/new":       "New Ticket",
  "/tickets/internal":  "Internal Ticket",
  "/admin/stats":       "Statistics",
  "/admin/performance": "Agent Performance",
  "/admin/groups":      "Groups",
  "/admin/companies":   "Companies",
  "/admin/users":       "Users",
};

function ticketsToNotifs(tickets: TicketListItem[], userId?: number) {
  return tickets.slice(0, 8).map(t => {
    let type = "ticket", title = `Ticket #${t.id}`;
    if (t.status === "ESCALATED")                        { type = "escalated"; title = `Ticket #${t.id} escalated`; }
    else if (t.assigned_to === userId && t.status === "ASSIGNED") { type = "assigned";  title = `Ticket #${t.id} assigned to you`; }
    else if (t.status === "RESOLVED")                    { type = "resolved";  title = `Ticket #${t.id} resolved`; }
    else if (t.status === "NEW")                         { type = "new";       title = `New ticket #${t.id}`; }
    return { id: t.id, type, title, body: t.title, time: t.updated_at, ticket_id: t.id };
  });
}

interface TopNavProps {
  onMenuClick?: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { user }          = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const pathname          = usePathname();
  const router            = useRouter();

  const [notifOpen, setNotifOpen] = useState(false);
  const [tickets,   setTickets]   = useState<TicketListItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [loading,   setLoading]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const title   = TITLES[pathname] ?? (pathname.startsWith("/tickets/") ? "Ticket Detail" : "VraiTicket");
  const roleCfg = user ? ROLE_CONFIG[user.role] : null;

  const loadTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { const r = await ticketsAPI.list({ page: 1, page_size: 10 }); setTickets(r.items); }
    catch { /* silent */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => {
    if (!notifOpen) return;
    loadTickets();
    const id = setInterval(loadTickets, 60_000);
    return () => clearInterval(id);
  }, [notifOpen, loadTickets]);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const notifs = ticketsToNotifs(tickets, user?.id).filter(n => !dismissed.has(n.id));

  const ICON: Record<string, React.ReactNode> = {
    escalated: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
    assigned:  <Ticket        className="w-3.5 h-3.5 text-blue-400" />,
    resolved:  <CheckCheck    className="w-3.5 h-3.5 text-emerald-400" />,
    new:       <Clock         className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />,
    ticket:    <Ticket        className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />,
  };

  const BG: Record<string, string> = {
    escalated: "bg-rose-500/10", assigned: "bg-blue-500/10",
    resolved: "bg-emerald-500/10", new: "bg-slate-500/10", ticket: "bg-slate-500/10",
  };

  const isDark = theme === "dark";

  return (
    <header
      className="h-14 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shrink-0 backdrop-blur-md transition-colors duration-300"
      style={{ background: "var(--nav-bg)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3">
        {/* ── Hamburger — mobile only ──────────────────────────── */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl transition-all"
          style={{ color: "var(--text-muted)" }}
          aria-label="Open menu"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>

        <h1 className="font-display text-[15px] font-semibold" style={{ color: "var(--text)" }}>
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1.5" ref={ref}>

        {/* ── Theme toggle ─────────────────────────────────────── */}
        <button
          onClick={toggle}
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          className="p-2 rounded-xl transition-all"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
        >
          {isDark
            ? <Sun  className="w-[17px] h-[17px]" />
            : <Moon className="w-[17px] h-[17px]" />
          }
        </button>

        {/* ── Notifications ────────────────────────────────────── */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-2 rounded-xl transition-all"
            style={notifOpen
              ? { background: "var(--accent-dim)", color: "var(--accent)" }
              : { color: "var(--text-muted)" }
            }
          >
            <Bell className="w-[17px] h-[17px]" />
            {notifs.length > 0 && (
              <span
                className="absolute top-1 right-1 w-[7px] h-[7px] rounded-full ring-2"
                style={{ background: "var(--accent)", boxShadow: "0 0 0 2px var(--bg)" }}
              />
            )}
          </button>

          {notifOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-[min(340px,calc(100vw-2rem))] rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <span className="font-display text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Notifications
                </span>
                <div className="flex items-center gap-3">
                  {notifs.length > 0 && (
                    <span className="badge text-[10px]"
                      style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
                      {notifs.length} active
                    </span>
                  )}
                  <button onClick={loadTickets}
                    className="text-[10px] transition-colors"
                    style={{ color: "var(--text-muted)" }}>
                    {loading ? "Loading…" : "Refresh"}
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-[360px] overflow-y-auto divide-y"
                style={{ borderColor: "var(--border)" }}>
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2"
                    style={{ color: "var(--text-muted)" }}>
                    <Bell className="w-8 h-8" />
                    <p className="text-sm font-medium">All caught up</p>
                  </div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors group cursor-pointer"
                    style={{ borderColor: "var(--border)" }}
                    onClick={() => { if (n.ticket_id) router.push(`/tickets/${n.ticket_id}`); setNotifOpen(false); }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                  >
                    <div className={cn("mt-0.5 p-1.5 rounded-lg shrink-0", BG[n.type])}>
                      {ICON[n.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold leading-tight" style={{ color: "var(--text)" }}>
                        {n.title}
                      </p>
                      <p className="text-[11px] mt-0.5 leading-snug line-clamp-1"
                        style={{ color: "var(--text-muted)" }}>
                        {n.body}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(n.time)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-muted)" }} />
                      <button
                        onClick={e => { e.stopPropagation(); setDismissed(s => new Set(s).add(n.id)); }}
                        className="p-1 opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f43f5e"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5" style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={() => { router.push("/tickets"); setNotifOpen(false); }}
                  className="text-[11px] w-full text-center transition-colors"
                  style={{ color: "var(--accent)" }}
                >
                  View all tickets →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── User chip ──────────────────────────────────────────── */}
        {user && (
          <div
            className="flex items-center gap-2 pl-3 ml-1.5"
            style={{ borderLeft: "1px solid var(--border)" }}
          >
            {roleCfg && (
              <span className={cn("badge text-[10px] hidden sm:inline-flex", roleCfg.color)}>{roleCfg.label}</span>
            )}
            <AuthAvatar name={user.full_name} avatarPath={user.avatar_url} size="sm" />
          </div>
        )}
      </div>
    </header>
  );
}
