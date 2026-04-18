"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ticket, Clock, CheckCircle, AlertTriangle, Plus, ArrowRight } from "lucide-react";
import { ticketsAPI, adminAPI } from "@/lib/services";
import { useAuthStore } from "@/hooks/useAuthStore";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badges";
import { StatCard } from "@/components/admin/StatCard";
import { Avatar, Button, EmptyState, Spinner } from "@/components/ui";
import { timeAgo, isOverdue, cn } from "@/lib/utils";
import type { TicketListItem, SystemStats } from "@/types";

export default function DashboardPage() {
  const { user }  = useAuthStore();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [stats,   setStats]   = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ticketRes] = await Promise.all([
          ticketsAPI.list({ page: 1, page_size: 6 }),
        ]);
        setTickets(ticketRes.items);
        if (user?.role === "admin") {
          const s = await adminAPI.stats();
          setStats(s);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-6 h-6 text-amber-500" />
      </div>
    );
  }

  const openTickets = tickets.filter(
    t => !["RESOLVED", "CLOSED"].includes(t.status)
  ).length;
  const overdueTickets = tickets.filter(
    t => isOverdue(t.due_at) && !["RESOLVED", "CLOSED"].includes(t.status)
  ).length;

  return (
    <div className="max-w-6xl space-y-6 sm:space-y-8">

      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 animate-slide-up">
        <div>
          <h2 className="page-title">
            Good {getGreeting()},{" "}
            <span style={{ color: "var(--accent)" }}>{user?.full_name.split(" ")[0]}</span>
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Here&apos;s what&apos;s happening with your tickets today.
          </p>
        </div>
        {(user?.role === "client" || user?.role === "admin") && (
          <Link href="/tickets/new" className="shrink-0">
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" /> New Ticket
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Total Tickets" value={stats?.total_tickets ?? tickets.length}
          icon={Ticket} accent="amber" style={{ animationDelay: "0.05s" }} />
        <StatCard label="Open"          value={stats?.open_tickets ?? openTickets}
          icon={Clock}  accent="teal"  style={{ animationDelay: "0.10s" }} />
        <StatCard label="Resolved"      value={stats?.resolved_tickets ?? 0}
          icon={CheckCircle} accent="default" style={{ animationDelay: "0.15s" }} />
        <StatCard label="Escalated"     value={stats?.escalated_tickets ?? overdueTickets}
          icon={AlertTriangle} accent="rose" style={{ animationDelay: "0.20s" }} />
      </div>

      {/* Recent tickets table */}
      <div className="animate-slide-up" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title">Recent Tickets</h3>
          <Link href="/tickets"
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: "var(--accent)" }}>
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {tickets.length === 0 ? (
          <EmptyState
            icon={<Ticket className="w-12 h-12" />}
            title="No tickets yet"
            description="Create your first support ticket to get started."
            action={
              user?.role !== "agent" ? (
                <Link href="/tickets/new"><Button size="sm">Create Ticket</Button></Link>
              ) : undefined
            }
          />
        ) : (
          <div className="card overflow-hidden">
            {/* Horizontally scrollable on small screens */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Ticket", "Status", "Priority", "Assignee", "Updated"].map(h => (
                      <th key={h}
                        className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em]"
                        style={{ color: "var(--text-muted)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, i) => {
                    const overdue = isOverdue(ticket.due_at) &&
                      !["RESOLVED", "CLOSED"].includes(ticket.status);
                    return (
                      <tr
                        key={ticket.id}
                        className="group transition-colors"
                        style={{ borderTop: i > 0 ? "1px solid var(--border)" : "none" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                      >
                        <td className="px-4 py-3">
                          <Link href={`/tickets/${ticket.id}`} className="flex items-start gap-3">
                            <div>
                              <p className="text-sm font-medium transition-colors line-clamp-1"
                                style={{ color: "var(--text)" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--accent)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text)"}>
                                {ticket.title}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                                #{ticket.id}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={ticket.priority} />
                        </td>
                        <td className="px-4 py-3">
                          {ticket.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={ticket.assignee.full_name} size="sm" />
                              <span className="text-xs hidden lg:block" style={{ color: "var(--text-2)" }}>
                                {ticket.assignee.full_name.split(" ")[0]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs", overdue && "text-rose-500")}
                            style={!overdue ? { color: "var(--text-muted)" } : undefined}>
                            {timeAgo(ticket.updated_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Agent performance — admin only */}
      {user?.role === "admin" && stats && stats.agent_stats.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: "0.30s" }}>
          <h3 className="section-title mb-4">Agent Performance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.agent_stats.slice(0, 6).map(agent => (
              <div key={agent.agent_id} className="card p-4 flex items-center gap-3">
                <Avatar name={agent.agent_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                    {agent.agent_name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {agent.assigned} assigned
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      {agent.resolved} resolved
                    </span>
                  </div>
                </div>
                {agent.avg_rating !== null && (
                  <div className="text-center shrink-0">
                    <p className="font-display font-bold text-amber-500 text-sm">
                      {agent.avg_rating.toFixed(1)}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>rating</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
