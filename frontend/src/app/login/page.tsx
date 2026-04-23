"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, Mail, Lock, ArrowRight, Sun, Moon } from "lucide-react";
import toast from "react-hot-toast";
import { authAPI } from "@/lib/services";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useThemeStore } from "@/hooks/useTheme";
import { Spinner } from "@/components/ui";

const schema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const { theme, toggle }            = useThemeStore();
  const [loading, setLoading] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const token = await authAPI.login(data);
      // Save token FIRST so the axios interceptor can attach it to the /me request
      localStorage.setItem("vt_auth", JSON.stringify({ state: { token: token.access_token, user: null } }));
      const user = await authAPI.me();
      // setAuth is the single source of truth — it persists to localStorage via Zustand
      setAuth(token.access_token, user);
      toast.success(`Welcome, ${user.full_name.split(" ")[0]}!`);
      router.replace("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300"
      style={{ background: "var(--bg)" }}
    >
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[140px]"
          style={{ background: "rgba(245,158,11,0.06)" }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full blur-[120px]"
          style={{ background: "rgba(59,130,246,0.05)" }} />
      </div>

      {/* Theme toggle — top-right corner, works without login */}
      <button
        onClick={toggle}
        title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className="absolute top-5 right-5 p-2.5 rounded-xl transition-all z-10"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-[400px] relative z-10 space-y-7">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 bg-amber-500 rounded-2xl rotate-6 opacity-20" />
            <div className="absolute inset-0 bg-amber-500 rounded-2xl flex items-center justify-center shadow-glow-amber">
              <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-display font-extrabold text-2xl tracking-tight"
              style={{ color: "var(--text)" }}>
              Vrai<span style={{ color: "var(--accent)" }}>Ticket</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>IT Support Platform</p>
          </div>
        </div>

        {/* Form card */}
        <div className="card p-8">
          <h2 className="font-display text-lg font-bold mb-1" style={{ color: "var(--text)" }}>
            Sign in
          </h2>
          <p className="text-[13px] mb-6" style={{ color: "var(--text-muted)" }}>
            Enter your credentials to access your workspace.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }} />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  className={`input-base pl-9 ${errors.email ? "border-rose-500" : ""}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }} />
                <input
                  {...register("password")}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`input-base pl-9 ${errors.password ? "border-rose-500" : ""}`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 mt-2"
            >
              {loading
                ? <><Spinner className="w-4 h-4" /> Signing in…</>
                : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
          Contact your administrator to create an account.
        </p>
      </div>
    </div>
  );
}
