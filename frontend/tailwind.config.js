/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          deep: "#0A0A0B",
          surface: "#111113",
          elevated: "#1A1A1E",
          border: "#25252A",
        },
        accent: {
          DEFAULT: "#7C5CFC",
          hover: "#9B7FFF",
          pressed: "#5B3FD4",
        },
        content: {
          primary: "#FFFFFF",
          secondary: "#A1A1AA",
          muted: "#71717A",
          disabled: "#3F3F46",
        },
        semantic: {
          success: "#22C55E",
          error: "#EF4444",
          warning: "#F59E0B",
          info: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
