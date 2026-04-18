"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Ticket, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { ticketsAPI } from "@/lib/services";
import { useAuthStore } from "@/hooks/useAuthStore";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badges";
import { Avatar, Button, EmptyState, Spinner, Select } from "@/components/ui";
import { timeAgo, isOverdue, ALL_STATUSES, ALL_PRIORITIES } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { TicketListItem } from "@/types";

const PAGE_SIZE = 15;

export default function TicketsPage() {
  const { user } = useAuthStore();
  const [tickets,    setTickets]    = useState<TicketListItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [status,     setStatus]     = useState("");
  const [priority,   setPriority]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketsAPI.list({
        page, page_size: PAGE_SIZE,
        status:      status      || undefined,
        priority:    priority    || undefined,
      });
      setTickets(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } finally {
      setLoading(false);
    }
  }, [page, status, priority]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? tickets.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || String(t.id).includes(search))
    : tickets;

  const roleEmptyMsg = user?.role === "client"
    ? "You haven't submitted any tickets yet."
    : user?.role === "agent"
    ? "No tickets are assigned to you yet."
    : "No tickets in the system yet.";

  const showCreatorCol  = user?.role === "admin";
  const showAssigneeCol = user?.role === "admin" || user?.role === "agent";

  return (
    <div className="max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h2 className="page-title">
            {user?.role === "client" ? "My Tickets" : user?.role === "agent" ? "My Queue" : "All Tickets"}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">{total} ticket{total !== 1 ? "s" : ""}</p>
        </div>
        {(user?.role === "client" || user?.role === "admin") && (
          <Link href="/tickets/new">
            <Button size="sm"><Plus className="w-3.5 h-3.5" />New Ticket</Button>
          </Link>
        )}
      </div>

      {/* Role-aware context banner */}
      {user?.role === "agent" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-500/5 border border-teal-500/15 animate-slide-up" style={{ animationDelay: "0.03s" }}>
          <Inbox className="w-4 h-4 text-teal-400 shrink-0" />
          <p className="text-sm text-teal-600 dark:text-teal-400/80">
            Showing tickets assigned to you. Update status as you progress.
          </p>
        </div>
      )}
      {user?.role === "client" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 animate-slide-up" style={{ animationDelay: "0.03s" }}>
          <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-600/90 dark:text-amber-400/80">
            Track your submitted tickets here. Our team will keep you updated on progress.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-faint)]" />
          <input type="text" placeholder="Search by title or ID…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="input-base pl-9" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-[var(--text-faint)]" />
          <div className="w-36">
            <Select placeholder="All statuses"
              options={ALL_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g," ") }))}
              value={status} onValueChange={(v) => { setStatus(v === status ? "" : v); setPage(1); }} />
          </div>
          <div className="w-32">
            <Select placeholder="All priorities"
              options={ALL_PRIORITIES.map((p) => ({ value: p, label: p }))}
              value={priority} onValueChange={(v) => { setPriority(v === priority ? "" : v); setPage(1); }} />
          </div>
          {(status || priority) && (
            <button onClick={() => { setStatus(""); setPriority(""); setPage(1); }}
              className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">Clear</button>
          )}
        </div>
      </div>

      {/* Table — scrollable on mobile */}
      <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: "0.1s" }}>
        {loading ? (
          <div className="flex items-center justify-center h-48"><Spinner className="w-5 h-5 text-amber-400" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Ticket className="w-10 h-10"/>} title="No tickets found"
            description={roleEmptyMsg}
            action={user?.role !== "agent" ? (
              <Link href="/tickets/new"><Button size="sm"><Plus className="w-3.5 h-3.5"/>Create Ticket</Button></Link>
            ) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg)]/60">
                  {["#", "Title", "Status", "Priority",
                    ...(showCreatorCol ? ["Submitted by"] : []),
                    ...(showAssigneeCol ? ["Assignee"] : []),
                    "Updated"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.18em] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((ticket) => {
                  const overdue = isOverdue(ticket.due_at) && !["RESOLVED","CLOSED"].includes(ticket.status);
                  return (
                    <tr key={ticket.id} className="hover:bg-[var(--surface)] transition-colors group">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded">#{ticket.id}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px] sm:max-w-[260px]">
                        <Link href={`/tickets/${ticket.id}`}>
                          <p className="text-[13px] font-medium text-[var(--text)] group-hover:text-amber-400 transition-colors line-clamp-1">
                            {ticket.title}
                          </p>
                          {overdue && <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">⚠ SLA overdue</p>}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
                      <td className="px-4 py-3.5"><PriorityBadge priority={ticket.priority} /></td>
                      {showCreatorCol && (
                        <td className="px-4 py-3.5">
                          {ticket.creator ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={ticket.creator.full_name} size="sm" />
                              <span className="text-xs text-[var(--text-muted)] hidden xl:block">{ticket.creator.full_name.split(" ")[0]}</span>
                            </div>
                          ) : <span className="text-xs text-[var(--border)]">—</span>}
                        </td>
                      )}
                      {showAssigneeCol && (
                        <td className="px-4 py-3.5">
                          {ticket.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={ticket.assignee.full_name} size="sm" />
                              <span className="text-xs text-[var(--text-muted)] hidden xl:block">{ticket.assignee.full_name.split(" ")[0]}</span>
                            </div>
                          ) : <span className="text-xs text-[var(--border)]">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={cn("text-[11px]", overdue ? "text-rose-600 dark:text-rose-400" : "text-[var(--text-muted)]")}>
                          {timeAgo(ticket.updated_at)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between animate-slide-up">
          <p className="text-xs text-[var(--text-muted)]">Page {page} of {pages} · {total} tickets</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            <Button variant="secondary" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
