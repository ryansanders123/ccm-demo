import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#751411",
          light: "#c2a3a6",
          50: "#fbf5f5",
          100: "#f5e6e6",
          200: "#e8c8c8",
          300: "#d5a3a3",
          400: "#bd7978",
          500: "#a15554",
          600: "#873d3b",
          700: "#751411",
          800: "#601110",
          900: "#500f0e",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17, 17, 17, 0.04), 0 1px 3px rgba(17, 17, 17, 0.06)",
        card: "0 1px 2px rgba(17, 17, 17, 0.04), 0 2px 8px rgba(17, 17, 17, 0.05)",
        pop: "0 4px 20px -4px rgba(17, 17, 17, 0.12), 0 2px 6px -2px rgba(17, 17, 17, 0.06)",
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
