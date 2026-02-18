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
          50: '#f5efff',
          100: '#e9dcff',
          200: '#d4b8ff',
          300: '#bc8fff',
          400: '#a56bff',
          500: '#8f4bff',
          600: '#7e34f4',
          700: '#6f28d8',
          800: '#5e24b2',
          900: '#4e208f'
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
