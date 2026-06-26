import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#06070d",
          900: "#0a0c16",
          800: "#11131f",
          700: "#181b2b",
        },
        brand: {
          300: "#9db4ff",
          400: "#6f8dff",
          500: "#4f6bff",
          600: "#3a4fe0",
        },
        accent: {
          400: "#c084fc",
          500: "#a855f7",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 20% 20%, rgba(79,107,255,0.18), transparent 40%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.16), transparent 45%)",
      },
      boxShadow: {
        glass: "0 8px 40px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 12px 50px rgba(79,107,255,0.25)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.2s linear infinite",
        floaty: "floaty 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
