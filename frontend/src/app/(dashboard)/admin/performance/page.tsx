"use client";

import { useEffect, useState } from "react";
import { Star, TrendingUp, Clock, CheckCircle, Ticket, Award, Users } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import toast from "react-hot-toast";
import { adminAPI } from "@/lib/services";
import { Avatar, Spinner, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AgentStats } from "@/types";

const TOOLTIP_STYLE = {
  background: "#0E0E14",
  border: "1px solid #1C1C22",
  borderRadius: "10px",
  color: "#E0E0E8",
  fontSize: "12px",
};

export default function PerformancePage() {
  const [agents,   setAgents]   = useState<AgentStats[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<AgentStats | null>(null);

  useEffect(() => {
    adminAPI.stats()
      .then(s => {
        setAgents(s.agent_stats);
        if (s.agent_stats.length > 0) setSelected(s.agent_stats[0]);
      })
      .catch(() => toast.error("Failed to load performance data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="w-6 h-6 text-amber-400"/></div>;
  if (agents.length === 0) return (
    <EmptyState icon={<TrendingUp className="w-12 h-12"/>} title="No agent data yet"
      description="Performance data appears once agents handle tickets."/>
  );

  const topRated    = [...agents].filter(a => a.avg_rating !== null).sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))[0];
  const topResolver = [...agents].sort((a, b) => b.resolved - a.resolved)[0];
  const totalResolved = agents.reduce((s, a) => s + a.resolved, 0);
  const ratedAgents   = agents.filter(a => a.avg_rating !== null);
  const teamAvgRating = ratedAgents.length > 0
    ? ratedAgents.reduce((s, a) => s + (a.avg_rating ?? 0), 0) / ratedAgents.length
    : null;

  // Radar axes — all derived from REAL data, no fake multipliers
  // Each axis is 0–100 where 100 = best possible score in the team
  const maxAssigned = Math.max(...agents.map(a => a.assigned), 1);
  const maxResolved = Math.max(...agents.map(a => a.resolved), 1);

  const radarData = selected ? [
    {
      axis: "Resolution %",
      // Resolved / assigned as a percentage (direct stat)
      value: selected.assigned > 0 ? Math.round((selected.resolved / selected.assigned) * 100) : 0,
      full: 100,
    },
    {
      axis: "Rating",
      // avg_rating / 5.0 as percentage
      value: selected.avg_rating !== null ? Math.round((selected.avg_rating / 5) * 100) : 0,
      full: 100,
    },
    {
      axis: "Workload",
      // assigned relative to max assigned agent in team
      value: Math.round((selected.assigned / maxAssigned) * 100),
      full: 100,
    },
    {
      axis: "Reviews",
      // rating_count relative to max in team
      value: (() => {
        const maxReviews = Math.max(...agents.map(a => a.rating_count), 1);
        return Math.round((selected.rating_count / maxReviews) * 100);
      })(),
      full: 100,
    },
    {
      axis: "Volume",
      // resolved relative to max resolved in team
      value: Math.round((selected.resolved / maxResolved) * 100),
      full: 100,
    },
  ] : [];

  // Star bar chart data — real counts from backend
  const starChartData = selected
    ? [5,4,3,2,1].map(s => ({
        star: `${s}★`,
        count: selected.star_counts[s] ?? 0,
      }))
    : [];

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header */}
      <div className="animate-slide-up">
        <h2 className="page-title">Agent Performance</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Detailed view of individual agent metrics and ratings.</p>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: "0.05s" }}>
        {[
          { label: "Agents",        value: agents.length,                                     icon: Users,       color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
          { label: "Total Resolved", value: totalResolved,                                    icon: CheckCircle, color: "text-teal-600 dark:text-teal-400",  bg: "bg-teal-500/10"  },
          { label: "Top Resolver",   value: topResolver?.agent_name.split(" ")[0] ?? "—",     icon: TrendingUp,  color: "text-teal-600 dark:text-teal-400",  bg: "bg-teal-500/10"  },
          { label: "Team Avg Rating",
            value: teamAvgRating !== null ? `${teamAvgRating.toFixed(1)} ★` : "—",
            icon: Star, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10"
          },
        ].map((k, i) => (
          <div key={i} className="card p-5 flex items-center gap-4">
            <div className={cn("p-2.5 rounded-xl", k.bg)}>
              <k.icon className={cn("w-5 h-5", k.color)}/>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{k.label}</p>
              <p className="font-display text-xl font-bold text-[var(--text)] mt-0.5">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Agent selector + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

        {/* Agent list */}
        <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">Agents</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {agents.map(agent => {
              const rate       = agent.assigned > 0 ? Math.round((agent.resolved / agent.assigned) * 100) : 0;
              const isSelected = selected?.agent_id === agent.agent_id;
              return (
                <button key={agent.agent_id} onClick={() => setSelected(agent)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-l-2",
                    isSelected ? "bg-amber-500/10 border-amber-500" : "hover:bg-[var(--surface-2)] border-transparent"
                  )}>
                  <Avatar name={agent.agent_name} size="sm"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-2)] truncate">{agent.agent_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-[var(--surface-3)] rounded-full h-1 max-w-[60px]">
                        <div className="bg-teal-500 h-1 rounded-full" style={{ width: `${rate}%` }}/>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{rate}%</span>
                    </div>
                  </div>
                  {agent.avg_rating !== null && (
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">★ {agent.avg_rating.toFixed(1)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: "0.15s" }}>

            {/* Profile header */}
            <div className="card p-5 flex items-center gap-5">
              <Avatar name={selected.agent_name} size="lg"/>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-[var(--text)]">{selected.agent_name}</h3>
                <p className="text-sm text-[var(--text-muted)]">Support Agent</p>
                {selected.avg_rating !== null ? (
                  <div className="flex items-center gap-1 mt-1.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={cn("w-4 h-4",
                        s <= Math.round(selected.avg_rating!) ? "text-amber-400 fill-amber-400" : "text-[var(--border)]"
                      )}/>
                    ))}
                    <span className="ml-1 text-sm font-bold text-amber-600 dark:text-amber-400">
                      {selected.avg_rating.toFixed(1)}
                      <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">({selected.rating_count} review{selected.rating_count !== 1 ? "s" : ""})</span>
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--text-muted)] mt-1.5">No ratings yet</p>
                )}
              </div>
              {/* Badges */}
              <div className="flex gap-2">
                {topRated?.agent_id === selected.agent_id && selected.avg_rating !== null && (
                  <div className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <Award className="w-5 h-5 text-amber-400"/>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">Top Rated</p>
                  </div>
                )}
                {topResolver?.agent_id === selected.agent_id && (
                  <div className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
                    <TrendingUp className="w-5 h-5 text-teal-400"/>
                    <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">Top Resolver</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Assigned",  value: selected.assigned,  icon: Ticket,       color: "text-amber-600 dark:text-amber-400" },
                { label: "Resolved",  value: selected.resolved,  icon: CheckCircle,  color: "text-teal-600 dark:text-teal-400"  },
                { label: "Resolution Rate",
                  value: selected.assigned > 0 ? Math.round((selected.resolved / selected.assigned) * 100) + "%" : "—",
                  icon: TrendingUp, color: "text-teal-600 dark:text-teal-400" },
              ].map(s => (
                <div key={s.label} className="card p-4 text-center">
                  <s.icon className={cn("w-5 h-5 mx-auto mb-2", s.color)}/>
                  <p className="font-display text-xl font-bold text-[var(--text)]">{s.value}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Radar — all axes are real percentages */}
              <div className="card p-5">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-4">Performance Radar</h4>
                <p className="text-[10px] text-[var(--text-muted)] mb-3">Each axis is 0–100%. Workload and Volume are relative to the top agent in team.</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1C1C22"/>
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "#4A4A5E", fontSize: 10 }}/>
                    <Radar dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={1.5}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Star rating breakdown — REAL counts from backend */}
              <div className="card p-5">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-4">Rating Breakdown</h4>
                {selected.avg_rating !== null && selected.rating_count > 0 ? (
                  <div className="flex items-start gap-5">
                    {/* Big number */}
                    <div className="text-center shrink-0">
                      <p className="font-display text-5xl font-extrabold text-amber-600 dark:text-amber-400">{selected.avg_rating.toFixed(1)}</p>
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={cn("w-3.5 h-3.5",
                            s <= Math.round(selected.avg_rating!) ? "text-amber-400 fill-amber-400" : "text-[var(--border)]"
                          )}/>
                        ))}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">{selected.rating_count} review{selected.rating_count !== 1 ? "s" : ""}</p>
                    </div>
                    {/* Real star bar chart */}
                    <div className="flex-1 min-w-0">
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={starChartData} layout="vertical" barSize={12}
                          margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                          <XAxis type="number" tick={{ fill: "#4A4A5E", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                          <YAxis type="category" dataKey="star" tick={{ fill: "#9898AA", fontSize: 11 }} axisLine={false} tickLine={false} width={24}/>
                          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Reviews"]}/>
                          <Bar dataKey="count" radius={[0,4,4,0]}>
                            {starChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.count > 0 ? "#F59E0B" : "#1C1C22"}/>
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-[var(--text-muted)]">
                    <Star className="w-8 h-8 mb-2"/>
                    <p className="text-sm">No reviews yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket bar chart */}
            <div className="card p-5">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mb-4">Ticket Volume</h4>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={[
                    { name: "Assigned",   value: selected.assigned,                                        fill: "#F59E0B" },
                    { name: "Resolved",   value: selected.resolved,                                        fill: "#14B8A6" },
                    { name: "Open",       value: Math.max(0, selected.assigned - selected.resolved),       fill: "#F43F5E" },
                  ]}
                  barSize={42}
                  margin={{ left: 0, right: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fill: "#4A4A5E", fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill: "#4A4A5E", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, _: string, item: { payload?: { name?: string } }) => [v, item?.payload?.name ?? _]}/>
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    {[
                      { name:"Assigned", fill:"#F59E0B" },
                      { name:"Resolved", fill:"#14B8A6" },
                      { name:"Open",     fill:"#F43F5E" },
                    ].map((d, i) => <Cell key={i} fill={d.fill}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

