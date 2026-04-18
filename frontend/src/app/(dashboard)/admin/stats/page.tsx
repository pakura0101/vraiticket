"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts";
import { Activity, Zap, TrendingUp, Clock, Ticket, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { adminAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { StatCard } from "@/components/admin/StatCard";
import { Avatar, Button, Spinner } from "@/components/ui";
import { STATUS_CONFIG } from "@/lib/utils";
import type { SystemStats } from "@/types";

const TOOLTIP_STYLE = {
  background: "#0E0E14", border: "1px solid #1C1C22",
  borderRadius: "10px", color: "#E0E0E8", fontSize: "12px",
};

export default function AdminStatsPage() {
  const [stats,      setStats]      = useState<SystemStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [slaLoading, setSlaLoading] = useState(false);

  useEffect(() => {
    adminAPI.stats().then(setStats)
      .catch(() => toast.error("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  async function triggerSLA() {
    setSlaLoading(true);
    try {
      const res = await adminAPI.triggerSLA();
      toast.success(res.message);
      setStats(await adminAPI.stats());
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSlaLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="w-6 h-6 text-amber-400"/></div>;
  if (!stats)  return null;

  // Each ticket has exactly ONE status — the by_status counts are already mutually exclusive
  const activeStatuses = stats.by_status.filter(s => s.count > 0);

  const chartData = activeStatuses.map(s => ({
    status: s.status,
    label:  STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG]?.label ?? s.status,
    count:  s.count,
    fill:   STATUS_CONFIG[s.status as keyof typeof STATUS_CONFIG]?.chart ?? "#64748B",
  }));

  const finished = stats.resolved_tickets + (stats.cancelled_tickets ?? 0);
  const resolutionRate = finished > 0
    ? Math.round((stats.resolved_tickets / finished) * 100) : 0;

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div>
          <h2 className="page-title">System Statistics</h2>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Real-time overview of support operations.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={triggerSLA} loading={slaLoading}>
          <Zap className="w-3.5 h-3.5 text-amber-400"/>Run SLA Check
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total"     value={stats.total_tickets}          icon={Ticket}        accent="amber"   style={{ animationDelay: "0.05s" }}/>
        <StatCard label="Open"      value={stats.open_tickets}           icon={Clock}         accent="teal"    style={{ animationDelay: "0.10s" }}/>
        <StatCard label="Resolved"  value={stats.resolved_tickets}       icon={CheckCircle}   accent="default" style={{ animationDelay: "0.15s" }}/>
        <StatCard label="Escalated" value={stats.escalated_tickets}      icon={AlertTriangle} accent="rose"    style={{ animationDelay: "0.20s" }}/>
        <StatCard label="Cancelled" value={stats.cancelled_tickets ?? 0} icon={XCircle}       accent="default" style={{ animationDelay: "0.25s" }}/>
      </div>

      {/* Resolution rate + avg time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400"/>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Resolution Rate</p>
          </div>
          <p className="font-display text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">{resolutionRate}%</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {stats.resolved_tickets} resolved / {finished} closed tickets
          </p>
          <div className="mt-3 bg-[var(--surface-3)] rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${resolutionRate}%` }}/>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400"/>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">Avg Resolution Time</p>
          </div>
          {stats.avg_resolution_hours !== null ? (
            <>
              <p className="font-display text-4xl font-extrabold text-amber-600 dark:text-amber-400">
                {stats.avg_resolution_hours < 1
                  ? `${Math.round(stats.avg_resolution_hours * 60)}m`
                  : `${stats.avg_resolution_hours.toFixed(1)}h`}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">across {stats.resolved_tickets} resolved tickets</p>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)] mt-2">No resolved tickets yet</p>
          )}
        </div>
      </div>

      {/* Charts — using STATUS_CONFIG.chart colors so each status is visually distinct */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.35s" }}>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-amber-400"/>
            <h3 className="section-title text-sm">Tickets by Status</h3>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mb-4">
            Each ticket has exactly one state — bars are mutually exclusive.
          </p>
          {chartData.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">No ticket data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={26}>
                <XAxis dataKey="label" tick={{ fill: "#4A4A5E", fontSize: 9 }}
                  axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: "#4A4A5E", fontSize: 10 }} axisLine={false}
                  tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                  formatter={(v: number) => [v, "tickets"]}/>
                <Bar dataKey="count" radius={[6,6,0,0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6 animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-400 to-emerald-400"/>
            <h3 className="section-title text-sm">Distribution</h3>
          </div>
          {chartData.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">No ticket data yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={46} outerRadius={74}
                    paddingAngle={3} dataKey="count">
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, _: string, item: { payload?: typeof chartData[0] }) =>
                      [v, item?.payload?.label ?? _]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {chartData.map(d => {
                  const pct = stats.total_tickets > 0
                    ? Math.round((d.count / stats.total_tickets) * 100) : 0;
                  return (
                    <div key={d.status} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }}/>
                      <span className="text-[11px] text-[var(--text-muted)] truncate flex-1">{d.label}</span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">{d.count}</span>
                      <span className="text-[10px] text-[var(--text-muted)] w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Agent table */}
      {stats.agent_stats.length > 0 && (
        <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: "0.45s" }}>
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="section-title text-sm">Agent Performance</h3>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#1A1A1E] bg-[var(--bg)]/40">
                {["Agent","Assigned","Resolved","Resolution Rate","Avg Rating","Reviews"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.18em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {stats.agent_stats.map(agent => {
                const rate = agent.assigned > 0
                  ? Math.round((agent.resolved / agent.assigned) * 100) : 0;
                return (
                  <tr key={agent.agent_id} className="hover:bg-[var(--surface)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={agent.agent_name} size="sm"/>
                        <span className="text-[13px] text-[var(--text)]">{agent.agent_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--text-2)]">{agent.assigned}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">{agent.resolved}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[var(--surface-3)] rounded-full h-1.5 max-w-[80px]">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${rate}%` }}/>
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {agent.avg_rating !== null ? (
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400">★</span>
                          <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold">{agent.avg_rating.toFixed(1)}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">/ 5</span>
                        </div>
                      ) : <span className="text-xs text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[var(--text-muted)]">{agent.rating_count ?? 0}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}


