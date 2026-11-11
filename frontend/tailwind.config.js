/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        "brand-mint": "#C9F8E7",
        "brand-green": "#34C99A",
        "brand-teal": "#08747A",
        "brand-navy": "#0B3F5E",
        danger: "#D64545",
        muted: "#6D8292",
        surface: "#F3F7FA",
        ink: "#163447",
      },
    },
  },

  plugins: [],
};