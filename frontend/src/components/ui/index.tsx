"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Spinner ────────────────────────────────────────────────────────────────────

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin text-current", className)}
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ── Button ─────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?:    "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary", size = "md", loading, disabled, className, children, ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const variants: Record<string, string> = {
    primary:   "btn-primary focus:ring-amber-500/40",
    secondary: "btn-secondary focus:ring-[var(--border-2)]",
    ghost:     "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] focus:ring-[var(--border)]",
    danger:    "bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500/40",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };

  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? <><Spinner className="w-4 h-4" />{children}</> : children}
    </button>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?:  React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}>
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn("input-base", icon && "pl-9", error && "border-rose-500", className)}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

// ── Textarea ───────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div>
      {label && <label className="label">{label}</label>}
      <textarea
        ref={ref}
        className={cn("input-base resize-none", error && "border-rose-500", className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

// ── Select ─────────────────────────────────────────────────────────────────────

interface SelectProps {
  label?:         string;
  placeholder?:   string;
  options:        { value: string; label: string }[];
  value:          string;
  onValueChange:  (v: string) => void;
  disabled?:      boolean;
}

export function Select({ label, placeholder, options, value, onValueChange, disabled }: SelectProps) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={cn(
            "input-base flex items-center justify-between gap-2 cursor-pointer",
            !value && "text-[var(--text-muted)]"
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder ?? "Select…"} />
          <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-faint)" }} />
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 min-w-[180px] max-h-60 overflow-auto rounded-xl shadow-2xl animate-slide-up"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border-2)",
            }}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map(opt => (
                <SelectPrimitive.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer outline-none transition-colors"
                  style={{ color: "var(--text)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-3)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}
                >
                  <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <Check className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

interface ModalProps {
  open:         boolean;
  onClose:      () => void;
  title:        string;
  description?: string;
  size?:        "sm" | "md" | "lg";
  children:     React.ReactNode;
}

const MODAL_WIDTHS = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, description, size = "md", children }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={v => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 backdrop-blur-sm transition-opacity"
          style={{ background: "var(--overlay)" }}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <DialogPrimitive.Content
            className={cn("relative w-full rounded-2xl shadow-2xl pointer-events-auto overflow-hidden", MODAL_WIDTHS[size])}
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <DialogPrimitive.Title
                className="font-display text-[17px] font-bold pr-6"
                style={{ color: "var(--text)" }}
              >
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-[13px]"
                  style={{ color: "var(--text-muted)" }}>
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-120px)]">
              {children}
            </div>
            <DialogPrimitive.Close
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = "var(--text)";
                (e.currentTarget as HTMLElement).style.background = "var(--surface-3)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                (e.currentTarget as HTMLElement).style.background = "";
              }}
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

export function Avatar({
  name, avatarUrl, size = "md",
}: { name: string; avatarUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const palettes = [
    "bg-amber-500/20 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300",
    "bg-blue-500/20 text-blue-700 dark:bg-blue-500/25 dark:text-blue-300",
    "bg-rose-500/20 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300",
    "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300",
    "bg-violet-500/20 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300",
    "bg-orange-500/20 text-orange-700 dark:bg-orange-500/25 dark:text-orange-300",
  ];
  const color = palettes[name.charCodeAt(0) % palettes.length];
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt={name}
        className={cn("rounded-full object-cover shrink-0", sizes[size])} />
    );
  }
  return (
    <span className={cn(
      "rounded-full flex items-center justify-center font-semibold font-display shrink-0",
      color, sizes[size]
    )}>
      {initials}
    </span>
  );
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="px-2.5 py-1.5 text-xs rounded-lg shadow-xl z-50"
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--border-2)",
              color: "var(--text)",
            }}
            sideOffset={4}
          >
            {content}
            <TooltipPrimitive.Arrow style={{ fill: "var(--surface-3)" }} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────

export function EmptyState({
  icon, title, description, action,
}: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4" style={{ color: "var(--text-muted)" }}>{icon}</div>}
      <p className="font-display font-semibold text-base" style={{ color: "var(--text-muted)" }}>{title}</p>
      {description && <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── PageLoader ─────────────────────────────────────────────────────────────────

export function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "var(--bg)" }}>
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <div className="absolute inset-0 rounded-full border-2 opacity-20"
          style={{ borderColor: "var(--border-2)" }} />
      </div>
    </div>
  );
}
