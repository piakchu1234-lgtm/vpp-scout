import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // SimplySite Brand Colors
        brand: {
          lime: '#E9E778',      // Primary accent - use for CTAs, highlights, success states
          dark: '#241F21',      // Primary background - deep charcoal
          'lime-light': '#F0EE9A', // Lighter lime for hovers
          'lime-dark': '#D4D15C',  // Darker lime for active states
        },
      },
    },
  },
  plugins: [],
};
export default config;
