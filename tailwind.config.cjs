/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // toggle with <html class="dark">
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // semantic surfaces bound to CSS vars (see globals.css)
        bg: "var(--bg)",
        "bg-muted": "var(--bg-muted)",
        card: "var(--card)",
        ink: "var(--text)",
        "ink-muted": "var(--text-muted)",
        border: "var(--border)",

        // brand
        scarlet: "var(--cs-scarlet)",
        accent: "var(--accent)",

        // optional neutrals aligned to brand
        gray: {
          950: "var(--cs-gray-950)",
          900: "var(--cs-gray-900)",
          800: "var(--cs-gray-800)",
          700: "var(--cs-gray-700)",
          500: "var(--cs-gray-500)",
          300: "var(--cs-gray-300)",
          100: "var(--cs-gray-100)",
        },
      },
      boxShadow: {
        card: "0 6px 24px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
