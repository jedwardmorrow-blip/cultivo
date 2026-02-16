/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cult: {
          black: '#0A0A0A',
          white: '#FFFFFF',
          'off-white': '#F8F8F8',
          'near-black': '#111111',
          graphite: '#1C1C1C',
          charcoal: '#2E2E2E',
          'medium-gray': '#404040',
          'light-gray': '#999999',
          'lighter-gray': '#666666',
          'dark-gray': '#1A1A1A',
          silver: '#A6A6A6',
          red: '#B81D24',
          green: '#10B981',
          'green-bright': '#34D399',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'h1': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '500' }],
        'h3': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        'body': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '300' }],
      },
      borderRadius: {
        'cult': '6px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 255, 255, 0.1)',
        'glow-strong': '0 0 30px rgba(255, 255, 255, 0.2)',
      },
      animation: {
        'glitch': 'glitch 1s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.4s ease-in-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'flicker': 'flicker 0.3s ease-in-out',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '33%': { transform: 'translate(-1px, 1px)', opacity: '0.95' },
          '66%': { transform: 'translate(1px, -1px)', opacity: '0.95' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      transitionTimingFunction: {
        'cult': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
