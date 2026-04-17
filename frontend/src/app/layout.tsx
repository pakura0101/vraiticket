import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "VraiTicket", template: "%s | VraiTicket" },
  description: "Modern IT support ticket management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Inline script runs before React hydrates — reads persisted theme from
          localStorage and applies data-theme to <html> immediately, preventing
          a flash of the wrong theme on first paint.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem("vt_theme");
                  var theme = stored ? JSON.parse(stored).state?.theme : null;
                  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
                } catch(e) {
                  document.documentElement.setAttribute("data-theme", "dark");
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface-3)",
              color: "var(--text)",
              border: "1px solid var(--border-2)",
              borderRadius: "10px",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
            },
            success: { iconTheme: { primary: "#10B981", secondary: "var(--surface)" } },
            error:   { iconTheme: { primary: "#F43F5E", secondary: "var(--surface)" } },
          }}
        />
      </body>
    </html>
  );
}
