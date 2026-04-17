import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import type { TicketStatus, TicketPriority, UserRole } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(dateStr: string) {
  try { return formatDistanceToNow(parseISO(dateStr), { addSuffix: true }); }
  catch { return dateStr; }
}

export function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), "MMM d, yyyy HH:mm"); }
  catch { return dateStr; }
}

export function isOverdue(due_at: string | null): boolean {
  if (!due_at) return false;
  return new Date(due_at) < new Date();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Status config — each status has a fully distinct color ────────────────────
// Badge colors use explicit light & dark Tailwind classes.
// data-theme="dark" maps to Tailwind's `dark:` via the tailwind config darkMode: ['selector', '[data-theme="dark"]'].
// All text colors pass WCAG AA (≥4.5:1) against their respective badge bg tint.
export const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; dot: string; chart: string }> = {
  NEW:         { label: "New",         color: "bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",       dot: "bg-slate-500",   chart: "#64748B" },
  ASSIGNED:    { label: "Assigned",    color: "bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",           dot: "bg-blue-500",    chart: "#3B82F6" },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",       dot: "bg-amber-500",   chart: "#F59E0B" },
  ON_HOLD:     { label: "On Hold",     color: "bg-orange-500/15 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300",   dot: "bg-orange-500",  chart: "#F97316" },
  RESOLVED:    { label: "Resolved",    color: "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300", dot: "bg-emerald-500", chart: "#10B981" },
  CLOSED:      { label: "Closed",      color: "bg-zinc-500/15 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",           dot: "bg-zinc-500",    chart: "#52525B" },
  ESCALATED:   { label: "Escalated",   color: "bg-rose-500/15 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",           dot: "bg-rose-500",    chart: "#F43F5E" },
  CANCELLED:   { label: "Cancelled",   color: "bg-neutral-500/15 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-400", dot: "bg-neutral-500", chart: "#737373" },
};

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; icon: string }> = {
  LOW:    { label: "Low",    color: "text-slate-600 dark:text-slate-400",   icon: "▼" },
  MEDIUM: { label: "Medium", color: "text-amber-700 dark:text-amber-400",   icon: "●" },
  HIGH:   { label: "High",   color: "text-rose-700  dark:text-rose-400",    icon: "▲" },
};

export const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  client: { label: "Client", color: "bg-slate-500/15 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300" },
  agent:  { label: "Agent",  color: "bg-blue-500/15 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"     },
  admin:  { label: "Admin",  color: "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300" },
};

export const ALL_STATUSES: TicketStatus[] = [
  "NEW","ASSIGNED","IN_PROGRESS","ON_HOLD","RESOLVED","CLOSED","ESCALATED","CANCELLED",
];
export const ALL_PRIORITIES: TicketPriority[] = ["LOW","MEDIUM","HIGH"];

export const AGENT_EDITABLE_STATUSES: TicketStatus[] = ["IN_PROGRESS","ON_HOLD","RESOLVED"];
export const ADMIN_EDITABLE_STATUSES: TicketStatus[] = [
  "NEW","ASSIGNED","IN_PROGRESS","ON_HOLD","RESOLVED","CLOSED","ESCALATED","CANCELLED",
];

export const GROUP_COLORS = [
  "#F59E0B","#10B981","#3B82F6","#F43F5E","#8B5CF6","#F97316","#EC4899","#14B8A6",
];
