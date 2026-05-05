/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cult: {
          // ── Raw palette (kept for legacy usage; semantic tokens preferred) ──
          black: 'var(--op-canvas)',
          white: '#FFFFFF',
          'off-white': '#F8F8F8',
          'near-black': 'var(--op-surface)',
          graphite: 'var(--op-surface)',
          charcoal: 'var(--op-surface-2)',
          'medium-gray': '#404040',
          'light-gray': '#999999',
          'lighter-gray': '#666666',
          'dark-gray': 'var(--op-surface)',
          silver: '#A6A6A6',
          red: 'var(--status-bad)',
          green: 'var(--status-ok)',
          'green-bright': '#34D399',

          // ── Opaque palette (kept for modal/print/overlay surfaces) ──
          'opaque-black': '#0A0A0A',
          'opaque-near-black': '#111111',
          'opaque-graphite': '#161616',

          // ── Semantic Surface Tokens (now opaque, instrument-grade) ──
          'surface': 'var(--op-surface)',
          'surface-inset': 'var(--op-canvas)',
          'surface-subtle': 'var(--op-surface)',
          'surface-raised': 'var(--op-surface-2)',
          'surface-overlay': 'var(--op-surface-2)',
          'surface-active': 'var(--op-surface-2)',
          'surface-sunken': 'var(--op-canvas)',

          // ── Semantic Border Tokens (hairlines) ──
          'border-faint': 'var(--op-line)',
          'border-subtle': 'var(--op-line)',
          'border': 'var(--op-line-strong)',
          'border-active': 'var(--op-line-strong)',
          'border-strong': 'var(--op-line-strong)',

          // ── Semantic Text Tokens (warm-white scale) ──
          'text-primary': 'var(--op-ink)',
          'text-secondary': 'var(--op-ink-2)',
          'text-muted': 'var(--op-ink-3)',
          'text-faint': 'var(--op-ink-4)',

          // ── Interactive / Brand Tokens (warm white, single accent) ──
          'accent': 'var(--accent)',
          'accent-hover': 'var(--accent-press)',
          'accent-subtle': 'rgba(232, 224, 212, 0.6)',

          // ── Status Tokens (desaturated, instrument-grade) ──
          'success': 'var(--status-ok)',
          'success-bright': '#34D399',
          'success-muted': 'rgba(110, 170, 141, 0.12)',
          'danger': 'var(--status-bad)',
          'danger-muted': 'rgba(197, 106, 106, 0.12)',
          'warning': 'var(--status-warn)',
          'warning-muted': 'rgba(200, 148, 58, 0.12)',
          'info': '#3B82F6',
          'info-muted': 'rgba(59, 130, 246, 0.12)',
          'pending': '#A78BFA',
          'pending-muted': 'rgba(167, 139, 250, 0.12)',

          // ── Cannabis Stage Colors (functional markers only, never decoration) ──
          'stage-clone': 'var(--stage-clone)',
          'stage-veg': 'var(--stage-veg)',
          'stage-flower': 'var(--stage-flower)',
          'stage-harvest': 'var(--stage-harvest)',
          'stage-cure': 'var(--stage-cure)',
          'stage-package': 'var(--stage-package)',
          'stage-mother': 'var(--stage-mother)',

          // ── Rosin Lab Stage Colors (kept; aesthetic decision pending review) ──
          'stage-ff': '#06B6D4',
          'stage-wash': '#3B82F6',
          'stage-fd': '#94A3B8',
          'stage-hash': '#F59E0B',
          'stage-press': '#F97316',
          'stage-rosin': '#6366F1',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        display: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'h1': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '600' }],
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '500' }],
        'h3': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        'body': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
      },
      borderRadius: {
        'cult': '12px',
      },
      boxShadow: {
        // Working-instrument aesthetic: hairline borders, no shadows.
        // Standard Tailwind shadow names AND custom glow/glass names all
        // collapse to 'none'. To add elevation, use border-cult-border-strong.
        DEFAULT: 'none',
        'sm': 'none',
        'md': 'none',
        'lg': 'none',
        'xl': 'none',
        '2xl': 'none',
        '3xl': 'none',
        'inner': 'none',
        'glow': 'none',
        'glow-strong': 'none',
        'glass': 'none',
        'glass-lg': 'none',
        'glow-success': 'none',
        'glow-danger': 'none',
        'glow-warning': 'none',
        'glow-info': 'none',
        'glow-clone': 'none',
        'glow-veg': 'none',
        'glow-flower': 'none',
        'glow-harvest': 'none',
        'glow-accent': 'none',
      },
      backdropBlur: {
        // Backdrop blur neutralized; surfaces are opaque. Standard names
        // (sm, md, lg, xl, 2xl, 3xl) and custom (glass, glass-lg, glass-xl)
        // all collapse to 0.
        DEFAULT: '0',
        'none': '0',
        'sm': '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
        '2xl': '0',
        '3xl': '0',
        'glass': '0',
        'glass-lg': '0',
        'glass-xl': '0',
      },
      animation: {
        'glitch': 'glitch 1s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.4s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'flicker': 'flicker 0.3s ease-in-out',
        // Removed: pulse-red / pulse-amber. Working-instrument doesn't
        // pulse; urgency is rendered as a 6px status dot + mono text label.
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
          '100%': { transform: 'scale(1.03)', boxShadow: 'none' },
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
          '0%': { opacity: '1' },
          '100%': { opacity: '1' },
        },
        numberRoll: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        successPulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      transitionTimingFunction: {
        'cult': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
