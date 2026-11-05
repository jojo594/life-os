/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Channel-based so the whole palette can be re-themed (light/dark) by
        // swapping the CSS variables in index.css — no per-component dark: variants.
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          50: "rgb(var(--ink-50) / <alpha-value>)",
        },
        cyan: {
          DEFAULT: "rgb(var(--accent-cyan) / <alpha-value>)",
          glow: "rgb(var(--accent-cyan) / 0.14)",
        },
        gold: {
          DEFAULT: "rgb(var(--accent-gold) / <alpha-value>)",
          glow: "rgb(var(--accent-gold) / 0.14)",
        },
        emerald: {
          DEFAULT: "rgb(var(--accent-emerald) / <alpha-value>)",
        },
        rose: {
          DEFAULT: "rgb(var(--accent-rose) / <alpha-value>)",
        },
        violet: {
          DEFAULT: "rgb(var(--accent-violet) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        serif: ["Fraunces", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "10px",
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        // Quiet emphasis: a hairline ring + soft depth, never a neon halo.
        glow: "0 0 0 1px rgb(var(--border-c) / 0.05), 0 12px 32px -16px rgba(0,0,0,0.5)",
        "glow-cyan":
          "0 0 0 1px rgb(var(--accent-cyan) / 0.35), 0 10px 28px -14px rgba(0,0,0,0.55)",
        "glow-gold":
          "0 0 0 1px rgb(var(--accent-gold) / 0.35), 0 10px 28px -14px rgba(0,0,0,0.55)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse_ring: {
          "0%": { transform: "scale(0.95)", opacity: 0.6 },
          "70%": { transform: "scale(1.4)", opacity: 0 },
          "100%": { transform: "scale(1.4)", opacity: 0 },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-ring": "pulse_ring 1.6s ease-out infinite",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      opacity: {
        8: "0.08",
        15: "0.15",
        35: "0.35",
      },
      gridTemplateColumns: {
        15: "repeat(15, minmax(0, 1fr))",
        30: "repeat(30, minmax(0, 1fr))",
      },
    },
  },
  safelist: [
    // dynamic gradient/border classes used in Brand pillars
    "from-cyan/15",
    "from-gold/15",
    "from-emerald/15",
    "from-rose/15",
    "from-violet/15",
    "border-cyan/30",
    "border-gold/30",
    "border-emerald/30",
    "border-rose/30",
    "border-violet/30",
  ],
  plugins: [],
};
