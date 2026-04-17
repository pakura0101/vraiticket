"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type BlobState = "loading" | "ready" | "error";
export interface BlobEntry { state: BlobState; src: string; }

/**
 * Fetches a single authenticated path via axios (Bearer token injected).
 * Path must be RELATIVE to the api baseURL — e.g. "/users/1/avatar"
 * NOT "/api/v1/users/1/avatar" (that prefix is already in baseURL).
 */
export function useAuthFile(path: string | null | undefined): BlobEntry {
  const [entry, setEntry] = useState<BlobEntry>({ state: "loading", src: "" });
  const objRef = useRef("");

  useEffect(() => {
    if (!path) {
      setEntry({ state: "error", src: "" });
      return;
    }

    let cancelled = false;
    setEntry({ state: "loading", src: "" });

    api.get(path, { responseType: "blob" })
      .then(res => {
        if (cancelled) return;
        if (objRef.current) URL.revokeObjectURL(objRef.current);
        const url = URL.createObjectURL(res.data as Blob);
        objRef.current = url;
        setEntry({ state: "ready", src: url });
      })
      .catch(err => {
        if (cancelled) return;
        // Log in dev so the developer can see why an avatar failed
        if (process.env.NODE_ENV !== "production") {
          console.warn("[useAuthFile] failed to load", path, err?.response?.status ?? err?.message);
        }
        setEntry({ state: "error", src: "" });
      });

    return () => {
      cancelled = true;
      if (objRef.current) { URL.revokeObjectURL(objRef.current); objRef.current = ""; }
    };
  }, [path]);

  return entry;
}

/**
 * Fetches multiple authenticated paths in parallel.
 * Returns map of path → BlobEntry. Re-fetches when the path list changes.
 */
export function useAuthFiles(paths: string[]): Record<string, BlobEntry> {
  const [entries, setEntries] = useState<Record<string, BlobEntry>>({});
  const objsRef = useRef<Record<string, string>>({});
  const key = [...paths].sort().join("|");

  useEffect(() => {
    if (paths.length === 0) { setEntries({}); return; }

    // Mark all loading immediately (prevents stale state)
    setEntries(Object.fromEntries(paths.map(p => [p, { state: "loading" as BlobState, src: "" }])));

    Object.values(objsRef.current).forEach(u => { if (u) URL.revokeObjectURL(u); });
    objsRef.current = {};

    let cancelled = false;

    paths.forEach(p => {
      api.get(p, { responseType: "blob" })
        .then(res => {
          if (cancelled) return;
          const url = URL.createObjectURL(res.data as Blob);
          objsRef.current[p] = url;
          setEntries(prev => ({ ...prev, [p]: { state: "ready", src: url } }));
        })
        .catch(err => {
          if (cancelled) return;
          if (process.env.NODE_ENV !== "production") {
            console.warn("[useAuthFiles] failed", p, err?.response?.status);
          }
          setEntries(prev => ({ ...prev, [p]: { state: "error", src: "" } }));
        });
    });

    return () => {
      cancelled = true;
      Object.values(objsRef.current).forEach(u => { if (u) URL.revokeObjectURL(u); });
      objsRef.current = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return entries;
}
