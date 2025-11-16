import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        grotesk: ['"Overused Grotesk"', 'sans-serif'],
        spacemono: ['"Space Mono"', 'monospace'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Reddit-inspired color system
        reddit: {
          orange: "hsl(var(--reddit-orange))",
          blue: "hsl(var(--reddit-blue))",
          dark: "hsl(var(--reddit-dark))",
          light: "hsl(var(--reddit-light))",
          gray: "hsl(var(--reddit-gray))",
          "gray-light": "hsl(var(--reddit-gray-light))",
          hover: "hsl(var(--reddit-hover))",
        },
        // Semantic colors
        positive: "hsl(var(--positive))",
        negative: "hsl(var(--negative))",
        neutral: "hsl(var(--neutral))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        // Vote colors
        upvote: {
          DEFAULT: "hsl(var(--upvote))",
          hover: "hsl(var(--upvote-hover))",
        },
        downvote: {
          DEFAULT: "hsl(var(--downvote))",
          hover: "hsl(var(--downvote-hover))",
        },
        // Community colors
        community: {
          1: "hsl(var(--community-1))",
          2: "hsl(var(--community-2))",
          3: "hsl(var(--community-3))",
          4: "hsl(var(--community-4))",
          5: "hsl(var(--community-5))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "vote-bounce": "vote-bounce 0.3s ease-out",
        "comment-slide": "comment-slide 0.4s ease-out", 
        "post-reveal": "post-reveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "notification-pop": "notification-pop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
