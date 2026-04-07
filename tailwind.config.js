/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'sm': '480px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1440px',
    },
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', '"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        'nunma-navy': '#1a1a4e',
        'nunma-lime': '#c2f575',
        'nunma-forest': '#052e16',
        'nunma-white': '#fcfcfc',
      },
      borderRadius: {
        'nunma': '1.5rem',
      }
    },
  },
  plugins: [],
}
