import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        g15: {
          primary: '#6366F1',
          secondary: '#10B981',
          accent: '#F59E0B',
          dark: '#1F2937',
          light: '#F9FAFB',
          success: '#22C55E',
          warning: '#F97316',
          error: '#EF4444',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        'slide-in': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-in-out',
        'fade-out': 'fade-out 0.3s ease-in-out',
        'slide-in': 'slide-in 0.4s ease-out'
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            color: 'var(--tw-prose-body)',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            p: {
              marginTop: '0.75em',
              marginBottom: '0.75em'
            },
            '[class~="lead"]': {
              fontSize: '1em'
            },
            a: {
              color: 'var(--tw-prose-links)'
            },
            strong: {
              fontWeight: '600'
            },
            ul: {
              marginTop: '0.75em',
              marginBottom: '0.75em',
              paddingLeft: '1.25em'
            },
            ol: {
              marginTop: '0.75em',
              marginBottom: '0.75em',
              paddingLeft: '1.25em'
            },
            li: {
              marginTop: '0.25em',
              marginBottom: '0.25em'
            },
            h1: {
              fontSize: '1.5em',
              marginTop: '1em',
              marginBottom: '0.5em',
              lineHeight: '1.3'
            },
            h2: {
              fontSize: '1.25em',
              marginTop: '1em',
              marginBottom: '0.5em',
              lineHeight: '1.3'
            },
            h3: {
              fontSize: '1.125em',
              marginTop: '1em',
              marginBottom: '0.5em',
              lineHeight: '1.3'
            },
            h4: {
              fontSize: '1em',
              marginTop: '1em',
              marginBottom: '0.5em',
              lineHeight: '1.3'
            },
            blockquote: {
              fontWeight: '400',
              fontStyle: 'italic',
              paddingLeft: '1em',
              borderLeftWidth: '0.25em'
            },
            code: {
              color: 'var(--tw-prose-code)',
              fontWeight: '500',
              fontSize: '0.8em'
            },
            pre: {
              fontSize: '0.8em',
              lineHeight: '1.5',
              marginTop: '0.75em',
              marginBottom: '0.75em',
              borderRadius: '0.375rem',
              paddingTop: '0.75em',
              paddingRight: '1em',
              paddingBottom: '0.75em',
              paddingLeft: '1em'
            }
          }
        },
        'prose-xs': { // Mobil için ekstra küçük boyut
          css: {
            fontSize: '0.75rem',
            h1: {
              fontSize: '1.25em'
            },
            h2: {
              fontSize: '1.15em'
            },
            h3: {
              fontSize: '1.05em'
            },
            h4: {
              fontSize: '1em'
            }
          }
        }
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")
  ],
} satisfies Config;
