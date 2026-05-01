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
        surface: "#FFFFFF",
        background: "#F3F4F6",
      },
    },
  },
  plugins: [],
};
