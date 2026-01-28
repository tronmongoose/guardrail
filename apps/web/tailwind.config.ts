import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: "#00fff0",
          pink: "#ff2dff",
          yellow: "#ffe600",
          green: "#39ff14",
          blue: "#4d4dff",
          purple: "#b026ff",
          orange: "#ff6600",
        },
        surface: {
          dark: "#0a0a0f",
          card: "#12121a",
          border: "#1e1e2e",
        },
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a5f",
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.8s ease-out",
        "slide-up-delay": "slide-up 0.8s ease-out 0.15s both",
        "slide-up-delay-2": "slide-up 0.8s ease-out 0.3s both",
        "slide-up-delay-3": "slide-up 0.8s ease-out 0.45s both",
        "gradient-x": "gradient-x 8s ease infinite",
        "border-glow": "border-glow 4s ease infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "#00fff0" },
          "33%": { borderColor: "#ff2dff" },
          "66%": { borderColor: "#ffe600" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
