// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}", // Scan Vue and TS/JS files
  ],
  theme: {
    extend: {
      colors: {
        // Custom minimalist grayscale palette
        background: '#ffffff',
        foreground: '#0f0f0f',
        primary: {
          DEFAULT: '#0f0f0f',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#f3f3f3',
          foreground: '#737373',
        },
        accent: {
          DEFAULT: '#e5e5e5',
          foreground: '#0f0f0f',
        },
        border: '#e0e0e0',
        input: '#d4d4d4',
        ring: '#a3a3a3',
      },
      // Soft shadows for subtle depth
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}