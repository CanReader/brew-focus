/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit", "sans-serif"],
        serif: ["Fraunces", "serif"],
      },
      colors: {
        bg: "#141416",
        bg2: "#1c1c20",
        card: "#212126",
        "card-h": "#27272c",
        brd: "#2c2c32",
        brd2: "#38383f",
        t: "#e4e2de",
        t2: "#9d9b96",
        t3: "#5e5c58",
        accent: "var(--accent)",
        grn: "#34c759",
        blu: "#5a9cf5",
        amb: "#e8a83e",
      },
      animation: {
        "steam-1": "steam 2.5s ease-in-out infinite",
        "steam-2": "steam 2.5s ease-in-out infinite 0.5s",
        "steam-3": "steam 2.5s ease-in-out infinite 1s",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
