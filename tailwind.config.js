/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cult: {
          // ── Raw palette (aliased to semantic values — glass system) ──
          black: 'rgba(10, 10, 10, 0.95)',
          white: '#FFFFFF',
          'off-white': '#F8F8F8',
          'near-black': 'rgba(255, 255, 255, 0.04)',
          graphite: 'rgba(255, 255, 255, 0.06)',
          charcoal: 'rgba(255, 255, 255, 0.10)',
          'medium-gray': '#404040',
          'light-gray': '#999999',
          'lighter-gray': '#666666',
          'dark-gray': 'rgba(255, 255, 255, 0.06)',
          silver: '#A6A6A6',
          red: '#DC4545',
          green: '#10B981',
          'green-bright': '#34D399',
          // ── Opaque palette (for modals, drawers, print, overlays that MUST block content behind) ──
          'opaque-black': '#0A0A0A',
          'opaque-near-black': '#111111',
          'opaque-graphite': '#1C1C1C',

          // ── Semantic Surface Tokens (translucent — glass system) ──
          'surface': 'rgba(10, 10, 10, 0.95)',
          'surface-raised': 'rgba(255, 255, 255, 0.06)',
          'surface-overlay': 'rgba(255, 255, 255, 0.08)',
          'surface-sunken': 'rgba(0, 0, 0, 0.2)',

          // ── Semantic Border Tokens (light reflections on glass) ──
          'border': 'rgba(255, 255, 255, 0.10)',
          'border-strong': 'rgba(255, 255, 255, 0.20)',
          'border-subtle': 'rgba(255, 255, 255, 0.06)',

          // ── Semantic Text Tokens ──
          'text-primary': '#FFFFFF',
          'text-secondary': '#A6A6A6',
          'text-muted': '#666666',
          'text-faint': '#404040',

          // ── Interactive / Brand Tokens (warm white) ──
          'accent': '#E8E0D4',
          'accent-hover': '#F5EDE0',
          'accent-subtle': 'rgba(232, 224, 212, 0.6)',
                      // Status Tokens
                      'success': '#10B981',
                      'success-bright': '#34D399',
                      'success-muted': 'rgba(16, 185, 129, 0.12)',
                      'danger': '#DC4545',
                      'danger-muted': 'rgba(220, 69, 69, 0.12)',
                      'warning': '#F59E0B',
                      'warning-muted': 'rgba(245, 158, 11, 0.12)',
                      'info': '#3B82F6',
                      'info-muted': 'rgba(59, 130, 246, 0.12)',
                      'pending': '#A78BFA',
                      'pending-muted': 'rgba(167, 139, 250, 0.12)',
                      // Cannabis Stage Colors
                      'stage-clone': '#0EA5E9',
                      'stage-veg': '#10B981',
                      'stage-flower': '#F43F5E',
                      'stage-harvest': '#F59E0B',
                      'stage-cure': '#8B5CF6',
                      'stage-package': '#6366F1',
                      // Rosin Lab Stage Colors
                      'stage-ff': '#06B6D4',
                      'stage-wash': '#3B82F6',
                      'stage-fd': '#94A3B8',
                      'stage-hash': '#F59E0B',
                      'stage-press': '#F97316',
                      'stage-rosin': '#6366F1',
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
        'cult': '16px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 255, 255, 0.1)',
        'glow-strong': '0 0 30px rgba(255, 255, 255, 0.2)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.2)',
        'glow-danger': '0 0 20px rgba(220, 69, 69, 0.2)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.2)',
        'glow-info': '0 0 20px rgba(59, 130, 246, 0.2)',
        'glow-clone': '0 0 20px rgba(14, 165, 233, 0.15)',
        'glow-veg': '0 0 20px rgba(16, 185, 129, 0.15)',
        'glow-flower': '0 0 20px rgba(244, 63, 94, 0.15)',
        'glow-harvest': '0 0 20px rgba(245, 158, 11, 0.15)',
        'glow-accent': '0 0 12px rgba(232, 224, 212, 0.15)',
      },
      backdropBlur: {
        'glass': '16px',
        'glass-lg': '24px',
        'glass-xl': '40px',
      },
      animation: {
        'glitch': 'glitch 1s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.4s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'flicker': 'flicker 0.3s ease-in-out',
        'pulse-red': 'pulseUrgentRed 2s infinite',
        'pulse-amber': 'pulseUrgentAmber 2s infinite',
        'card-fade-up': 'cardFadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'stat-emphasize': 'statEmphasize 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'stat-recede': 'statRecede 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'bar-fill': 'barFill 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'countdown-tick': 'countdownTick 2s ease-in-out infinite',
        'glass-shimmer': 'glassShimmer 2s ease-in-out infinite',
        'number-roll': 'numberRoll 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'success-pulse': 'successPulse 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        pulseUrgentRed: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(220, 69, 69, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(220, 69, 69, 0.6)' }
        },
        pulseUrgentAmber: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)' }
        },
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
        cardFadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        statEmphasize: {
          '0%': { transform: 'scale(1)', boxShadow: 'none' },
          '100%': { transform: 'scale(1.03)', boxShadow: '0 0 24px rgba(245, 158, 11, 0.15)' },
        },
        statRecede: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0.6' },
        },
        barFill: {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
        countdownTick: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        glassShimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        numberRoll: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        successPulse: {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
          '50%': { transform: 'scale(1.02)', boxShadow: '0 0 0 8px rgba(16, 185, 129, 0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        },
      },
      transitionTimingFunction: {
        'cult': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
