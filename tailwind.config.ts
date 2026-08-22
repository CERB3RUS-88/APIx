import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0E1420",
          deep: "#090D15",
        },
        surface: {
          DEFAULT: "#161D2C",
          panel: "#161D2C",
          elevated: "#1E273A",
          hover: "#253147",
          subtle: "#121824",
        },
        primary: {
          DEFAULT: "#F5F3EE",
        },
        secondary: {
          DEFAULT: "#9AA1B2",
          muted: "#677186",
        },
        amber: {
          signal: "#E8A33D",
          bright: "#F5B450",
          dim: "#A36F22",
        },
        delta: {
          positive: "#4FA98C", // Fares down (green)
          negative: "#D9634A", // Fares up (red/surge)
        },
        border: {
          hairline: "rgba(255, 255, 255, 0.08)",
          subtle: "#232F46",
          active: "#344360",
          amber: "rgba(232, 163, 61, 0.35)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "IBM Plex Mono", "monospace"],
      },
      boxShadow: {
        "panel": "0 1px 3px 0 rgba(0, 0, 0, 0.37), 0 1px 2px -1px rgba(0, 0, 0, 0.24)",
        "panel-elevated": "0 4px 12px 0 rgba(0, 0, 0, 0.45)",
        "amber-glow": "0 0 16px -2px rgba(232, 163, 61, 0.25)",
      },
      keyframes: {
        "flip-top": {
          "0%": { transform: "rotateX(0deg)" },
          "100%": { transform: "rotateX(-90deg)" },
        },
        "flip-bottom": {
          "0%": { transform: "rotateX(90deg)" },
          "100%": { transform: "rotateX(0deg)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "flip-top": "flip-top 150ms ease-in forwards",
        "flip-bottom": "flip-bottom 150ms ease-out 150ms forwards",
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
