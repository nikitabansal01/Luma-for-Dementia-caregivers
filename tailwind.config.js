/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        care: {
          cream: "#faf9f6",
          sage: "#e8ede8",
          mint: "#d4e5d9",
          forest: "#1A3C34",
          olive: "#5c7c64",
          stone: "#6b6b6b",
          bark: "#3d3d3d",
          sky: "#e0eef4",
          skyDark: "#3d6b85",
          amber: "#f5e6d3",
          amberDark: "#9a6b2e",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        cardHover: "0 4px 12px 0 rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [],
};
