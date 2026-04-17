import type { Config } from "tailwindcss";

const config: Config = {
  // Use data-theme attribute instead of class so Tailwind dark: variants
  // work with our CSS variable theme system
  darkMode: ["selector", "[data-theme='dark']"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0E0E11",
          50: "#F4F4F6",
          100: "#E8E8EC",
          200: "#C8C8D2",
          300: "#9898AA",
          400: "#6B6B82",
          500: "#4A4A5E",
          600: "#33333F",
          700: "#222228",
          800: "#171719",
          900: "#0E0E11",
        },
        amber: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        teal: {
          DEFAULT: "#14B8A6",
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        rose: {
          DEFAULT: "#F43F5E",
          50: "#FFF1F2",
          500: "#F43F5E",
          600: "#E11D48",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "slide-in-right": "slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      boxShadow: {
        "glow-amber": "0 0 24px rgba(245,158,11,0.25)",
        "glow-teal": "0 0 24px rgba(20,184,166,0.25)",
        "card": "0 1px 3px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.5), 0 16px 48px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
