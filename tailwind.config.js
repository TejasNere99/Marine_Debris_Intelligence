/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        sonar: {
          950: '#040810',
          900: '#09101d',
          850: '#0f1a2e',
          800: '#15243e',
          700: '#1d3254',
          600: '#274470',
          500: '#39639e',
          accent: '#00e5ff',
          muted: '#64748b',
        },
        verified: {
          DEFAULT: '#10b981',
          dim: 'rgba(16, 185, 129, 0.15)',
          border: '#059669',
        },
        uncertain: {
          DEFAULT: '#f59e0b',
          dim: 'rgba(245, 158, 11, 0.15)',
          border: '#d97706',
        },
        rejected: {
          DEFAULT: '#ef4444',
          dim: 'rgba(239, 68, 68, 0.15)',
          border: '#dc2626',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
