/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#131714',
        paper: '#f4f6f2',
        lime: '#b7f34a',
        cobalt: '#275df5',
        coral: '#ff6b4a'
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans SC"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        app: '0 18px 60px rgba(20, 28, 22, .12)'
      }
    }
  },
  plugins: []
}
