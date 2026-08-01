/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wolf-dark': '#1a1c29',
        'wolf-panel': '#2a2d3e',
        'wolf-primary': '#6c5ce7',
        'wolf-danger': '#ff7675',
        'wolf-success': '#00b894',
        'wolf-warning': '#fdcb6e',
      }
    },
  },
  plugins: [],
}
