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
  const { theme }           = useThemeStore();
  const router              = useRouter();
  const [ready, setReady]   = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (ready && !isAuthenticated) router.replace("/login");
  }, [ready, isAuthenticated, router]);

  // Close drawer on route change (e.g. back button)
  useEffect(() => {
    setMobileNavOpen(false);
  }, []);

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  if (!ready || !isAuthenticated) return <PageLoader />;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main content — offset by sidebar width on desktop only */}
      <div
        className="flex-1 flex flex-col min-h-screen overflow-auto lg:ml-[220px]"
        style={{ background: "var(--bg)" }}
      >
        <TopNav onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 animate-fade-in" data-theme-shell={theme}>
          {children}
        </main>
      </div>
    </div>
  );
}
