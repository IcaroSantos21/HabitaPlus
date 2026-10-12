/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        "brand-mint": "#AAFFC7",
        "brand-green": "#67C090",
        "brand-teal": "#215B63",
        "brand-navy": "#124170",
        danger: "#D64545",
        muted: "#687280",
        surface: "#8FAFAC",
        ink: "#172024",
      },
    },
  },

  plugins: [],
};