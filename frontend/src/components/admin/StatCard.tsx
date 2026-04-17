import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: "amber" | "teal" | "rose" | "default";
  style?: React.CSSProperties;
}

export function StatCard({ label, value, icon: Icon, trend, trendUp, accent = "default", style }: StatCardProps) {
  const accents = {
    amber:   { icon: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-500/15 border-amber-500/25 dark:bg-amber-500/10 dark:border-amber-500/20"  },
    teal:    { icon: "text-teal-700 dark:text-teal-400",     bg: "bg-teal-500/15 border-teal-500/25 dark:bg-teal-500/10 dark:border-teal-500/20"      },
    rose:    { icon: "text-rose-700 dark:text-rose-400",     bg: "bg-rose-500/15 border-rose-500/25 dark:bg-rose-500/10 dark:border-rose-500/20"      },
    default: { icon: "text-[var(--text-muted)]", bg: "bg-[var(--surface-3)] border-[var(--border-2)]" },
  };
  const a = accents[accent];

  return (
    <div className="card p-5 flex items-start gap-4 animate-slide-up" style={style}>
      <div className={cn("p-2.5 rounded-xl border", a.bg)}>
        <Icon className={cn("w-5 h-5", a.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide font-semibold mb-1"
          style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
        <p className="font-display text-2xl font-bold" style={{ color: "var(--text)" }}>
          {value}
        </p>
        {trend && (
          <p className={cn("text-xs mt-0.5", trendUp ? "text-teal-500" : "")}
            style={!trendUp ? { color: "var(--text-muted)" } : undefined}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}
