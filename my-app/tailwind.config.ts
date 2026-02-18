import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f9f0ff',
          100: '#f3e0ff',
          200: '#e8c2ff',
          300: '#dda3ff',
          400: '#d184ff',
          500: '#c061ff',
          600: '#c061ff',
          700: '#ad45eb',
          800: '#8e35c4',
          900: '#702a9a'
        }
      },
      boxShadow: {
        card: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
