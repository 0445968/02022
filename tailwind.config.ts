import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['var(--font-headline)', 'Georgia', 'serif'],
        interface: ['var(--font-interface)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--color-background))',
        foreground: 'hsl(var(--color-foreground))',
        surface: {
          DEFAULT: 'hsl(var(--color-surface))',
          muted: 'hsl(var(--color-surface-muted))',
          subtle: 'hsl(var(--color-surface-subtle))',
        },
        deep: {
          DEFAULT: 'hsl(var(--color-deep))',
          foreground: 'hsl(var(--color-primary-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--color-primary))',
          foreground: 'hsl(var(--color-primary-foreground))',
        },
        breaking: {
          DEFAULT: 'hsl(var(--color-breaking))',
          foreground: 'hsl(var(--color-primary-foreground))',
        },
        live: {
          DEFAULT: 'hsl(var(--color-live))',
          foreground: 'hsl(var(--color-deep))',
        },
        highlight: {
          DEFAULT: 'hsl(var(--color-highlight))',
          foreground: 'hsl(var(--color-highlight-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--color-muted))',
          foreground: 'hsl(var(--color-muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--color-accent))',
          foreground: 'hsl(var(--color-accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--color-destructive))',
          foreground: 'hsl(var(--color-destructive-foreground))',
        },
        border: 'hsl(var(--color-border))',
        input: 'hsl(var(--color-input))',
        ring: 'hsl(var(--color-ring))',
        card: {
          DEFAULT: 'hsl(var(--color-surface))',
          foreground: 'hsl(var(--color-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--color-surface))',
          foreground: 'hsl(var(--color-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--color-surface-muted))',
          foreground: 'hsl(var(--color-foreground))',
        },
        chart: {
          '1': 'hsl(var(--color-deep))',
          '2': 'hsl(var(--color-primary))',
          '3': 'hsl(var(--color-live))',
          '4': 'hsl(var(--color-highlight))',
          '5': 'hsl(var(--color-breaking))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) + 1px)',
        sm: 'calc(var(--radius) + 2px)',
      },
      maxWidth: {
        editorial: '1280px',
        reading: '720px',
        measure: '680px',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '680px',
          },
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
