/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Official Reve Palette
        // Raven Teal (60% Main/Background: #16292B, RGB: 22, 41, 43)
        raven: {
          950: "#091213",
          900: "#0E1C1E",
          850: "#122325",
          800: "#16292B", // Core Background (60%)
          750: "#192F31",
          700: "#1C3537", // Core Surface
          650: "#213D40",
          600: "#27474A", // Elevated Card
          500: "#32595D", // Borders & Muted Chrome
          400: "#447378",
          300: "#5D9197",
        },
        // Seagrass Grey (30% Secondary/Surfaces & Text: #9FB3AB, RGB: 159, 179, 171)
        seagrass: {
          900: "#22312D",
          800: "#384B45",
          700: "#516860",
          600: "#6B857D",
          500: "#86A39A",
          400: "#9FB3AB", // Core Surface Secondary (30%)
          300: "#B8C9C3",
          200: "#D3DEDB",
          100: "#EAF0EE",
          50: "#F4F7F6", // High-Contrast Off-White Text
        },
        // Apricot Flare (10% Accent/Actions: #FF8A1F, RGB: 255, 138, 31)
        apricot: {
          900: "#7A3500",
          800: "#A34800",
          700: "#CC5D05",
          600: "#E6740B", // Pressed state
          500: "#FF8A1F", // Core Action Accent (10%)
          400: "#FFA147", // Hover state
          300: "#FFBA75",
          200: "#FFD5A8",
          100: "#FFEEDB",
          50: "#FFF8F2",
        },
        // Semantic Roles
        semantic: {
          success: "#22C55E",
          error: "#EF4444",
          warning: "#F59E0B",
          info: "#38BDF8",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Courier New", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(255, 138, 31, 0.25)",
        surface: "0 4px 20px -2px rgba(9, 18, 19, 0.6)",
        modal: "0 20px 48px -8px rgba(9, 18, 19, 0.85)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
