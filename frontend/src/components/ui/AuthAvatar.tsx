"use client";

import { useAuthFile } from "@/hooks/useAuthImage";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  /**
   * The avatar_url value from the DB.
   * The backend stores this as "/api/v1/users/{id}/avatar".
   * We strip whatever prefix matches the api baseURL so the hook
   * receives only the path segment relative to baseURL.
   */
  avatarPath: string | null | undefined;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };

// Use semantic opacity classes (500/15) so colours work on both white and dark surfaces.
// The `dark:` variant is activated by data-theme="dark" on <html> (Tailwind darkMode selector).
const PALETTES = [
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
];

function initials(name: string) {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * Fetches an avatar through axios (Bearer token injected) and renders it.
 * Falls back to a theme-aware initials circle when no photo is set or load fails.
 *
 * The DB stores avatar_url as the full API path (e.g. /api/v1/users/3/avatar).
 * The axios baseURL already includes /api/v1, so we strip that prefix to get a
 * path relative to baseURL (/users/3/avatar) — no hardcoded hostnames anywhere.
 */
export function AuthAvatar({ name, avatarPath, size = "md" }: Props) {
  // Derive prefix to strip from the runtime env variable (same source as axios baseURL).
  // NEXT_PUBLIC_API_URL = "http://host:port/api/v1"  →  prefix = "/api/v1"
  // We only need the pathname portion, not the origin.
  const apiPrefix = (() => {
    if (typeof window === "undefined") return "/api/v1";
    try {
      const u = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1");
      return u.pathname.replace(/\/$/, ""); // e.g. "/api/v1"
    } catch {
      return "/api/v1";
    }
  })();

  const path = avatarPath
    ? avatarPath.startsWith(apiPrefix)
      ? avatarPath.slice(apiPrefix.length)   // strip /api/v1 → /users/3/avatar
      : avatarPath                            // already relative
    : null;

  const entry = useAuthFile(path);
  const color = PALETTES[name.charCodeAt(0) % PALETTES.length];
  const base  = cn("rounded-full shrink-0", SIZES[size]);

  if (path && entry.state === "ready" && entry.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={entry.src} alt={name} className={cn(base, "object-cover")} />
    );
  }

  return (
    <span className={cn(base, "flex items-center justify-center font-display font-bold", color)}>
      {initials(name)}
    </span>
  );
}
