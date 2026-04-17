import { cn } from "@/lib/utils";
import { STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/utils";
import type { TicketStatus, TicketPriority } from "@/types";

export function StatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("badge", cfg.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", cfg.color)}>
      <span className="text-[10px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
