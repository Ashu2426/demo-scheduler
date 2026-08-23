import type { Config } from "tailwindcss";

// Colours are the approved Monocept palette only.
// Orange/green are the sole accent colours; the five greys cover all structure.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#FF601F",
          "orange-tint": "#FFF5F0",
          green: "#96C93D",
          "green-tint": "#F4F9E8",
        },
        ink: {
          900: "#333333",
          700: "#666666",
          500: "#999999",
          300: "#BFBFBF",
          100: "#D9D9D9",
        },
      },
      fontFamily: {
        // Harabara Mais / Palatino fallbacks per the Monocept brand guide
        head: ["Poppins", "Nunito", "Segoe UI", "system-ui", "sans-serif"],
        body: ["Georgia", "Palatino Linotype", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
