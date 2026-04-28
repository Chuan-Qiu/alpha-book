/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#10B981",
        danger: "#EF4444",
        surface: "#1F2937",
        background: "#111827",
      },
    },
  },
  plugins: [],
};
