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
        background:
          'hsl(var(--color-background) / <alpha-value>)',

        foreground:
          'hsl(var(--color-foreground) / <alpha-value>)',

        surface: {
          DEFAULT:
            'hsl(var(--color-surface) / <alpha-value>)',

          muted:
            'hsl(var(--color-surface-muted) / <alpha-value>)',

          subtle:
            'hsl(var(--color-surface-subtle) / <alpha-value>)',
        },

        deep: {
          DEFAULT:
            'hsl(var(--color-deep) / <alpha-value>)',

          foreground:
            'hsl(var(--color-primary-foreground) / <alpha-value>)',
        },

        star: {
          DEFAULT:
            'hsl(var(--color-star) / <alpha-value>)',

          foreground:
            'hsl(var(--color-primary-foreground) / <alpha-value>)',
        },

        primary: {
          DEFAULT:
            'hsl(var(--color-primary) / <alpha-value>)',

          foreground:
            'hsl(var(--color-primary-foreground) / <alpha-value>)',
        },

        breaking: {
          DEFAULT:
            'hsl(var(--color-breaking) / <alpha-value>)',

          foreground:
            'hsl(var(--color-primary-foreground) / <alpha-value>)',
        },

        live: {
          DEFAULT:
            'hsl(var(--color-live) / <alpha-value>)',

          foreground:
            'hsl(var(--color-deep) / <alpha-value>)',
        },

        highlight: {
          DEFAULT:
            'hsl(var(--color-highlight) / <alpha-value>)',

          foreground:
            'hsl(var(--color-highlight-foreground) / <alpha-value>)',
        },

        muted: {
          DEFAULT:
            'hsl(var(--color-muted) / <alpha-value>)',

          foreground:
            'hsl(var(--color-muted-foreground) / <alpha-value>)',
        },

        accent: {
          DEFAULT:
            'hsl(var(--accent) / <alpha-value>)',

          foreground:
            'hsl(var(--accent-foreground) / <alpha-value>)',
        },

        destructive: {
          DEFAULT:
            'hsl(var(--destructive) / <alpha-value>)',

          foreground:
            'hsl(var(--destructive-foreground) / <alpha-value>)',
        },

        border:
          'hsl(var(--color-border) / <alpha-value>)',

        input:
          'hsl(var(--color-input) / <alpha-value>)',

        ring:
          'hsl(var(--color-ring) / <alpha-value>)',

        card: {
          DEFAULT:
            'hsl(var(--color-surface) / <alpha-value>)',

          foreground:
            'hsl(var(--color-foreground) / <alpha-value>)',
        },

        popover: {
          DEFAULT:
            'hsl(var(--color-surface) / <alpha-value>)',

          foreground:
            'hsl(var(--color-foreground) / <alpha-value>)',
        },

        secondary: {
          DEFAULT:
            'hsl(var(--color-surface-muted) / <alpha-value>)',

          foreground:
            'hsl(var(--color-foreground) / <alpha-value>)',
        },

        chart: {
          '1':
            'hsl(var(--color-deep) / <alpha-value>)',

          '2':
            'hsl(var(--color-primary) / <alpha-value>)',

          '3':
            'hsl(var(--color-live) / <alpha-value>)',

          '4':
            'hsl(var(--color-highlight) / <alpha-value>)',

          '5':
            'hsl(var(--color-breaking) / <alpha-value>)',
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
          from: {
            height: '0',
          },
          to: {
            height:
              'var(--radix-accordion-content-height)',
          },
        },

        'accordion-up': {
          from: {
            height:
              'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },

      animation: {
        'accordion-down':
          'accordion-down 0.2s ease-out',

        'accordion-up':
          'accordion-up 0.2s ease-out',
      },
    },
  },

  plugins: [
    require('tailwindcss-animate'),
  ],
};

export default config;