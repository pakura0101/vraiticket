"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useThemeStore } from "@/hooks/useTheme";
import { PageLoader } from "@/components/ui";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const { theme }           = useThemeStore();   // subscribes so re-renders on theme change
  const router              = useRouter();
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace("/login");
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) return <PageLoader />;

  return (
    /* bg-[var(--bg)] reacts to data-theme changes */
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <div
        className="flex-1 flex flex-col ml-[220px] min-h-screen overflow-auto"
        style={{ background: "var(--bg)" }}
      >
        <TopNav />
        <main className="flex-1 p-6 animate-fade-in" data-theme-shell={theme}>
          {children}
        </main>
      </div>
    </div>
  );
}
