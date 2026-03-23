import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate"

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: "hsl(var(--secondary-light))",
          dark: "hsl(var(--secondary-dark))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        'ocean-gradient': 'var(--ocean-gradient)',
        'sunset-gradient': 'var(--sunset-gradient)',
        'hero-gradient': 'var(--hero-gradient)',
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'medium': 'var(--shadow-medium)',
        'strong': 'var(--shadow-strong)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "rotate": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "fillBar": {
          "0%": { width: "0%" },
          "25%": { width: "35%" },
          "50%": { width: "58%" },
          "75%": { width: "82%" },
          "100%": { width: "100%" },
        },
        "shine": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" },
        },
        "cardSlideIn": {
          from: { opacity: "0", transform: "translateY(30px) scale(0.95)" },
to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.4)" },
          "50%": { boxShadow: "0 0 0 10px rgba(16, 185, 129, 0)" },
        },
        "lockShake": {
          "0%, 90%, 100%": { transform: "rotate(0deg)" },
          "92%, 96%": { transform: "rotate(-5deg)" },
          "94%, 98%": { transform: "rotate(5deg)" },
        },
        "countUp": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "numberChange": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
        },
        "slideInFromBottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "icon-rotate": "rotate 2s linear infinite",
        "fill-bar": "fillBar 2.4s ease-out forwards",
        "shine-effect": "shine 1.5s infinite",
        "shimmer": "shimmer 1.5s infinite",
        "card-slide-in": "cardSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "pulse-dot": "pulse 1.5s ease-in-out infinite",
        "lock-shake": "lockShake 3s infinite",
        "stat-item-appear": "countUp 0.6s ease forwards",
        "soft-glow": "soft-pulse 2s ease-in-out infinite, glow 2s ease-in-out infinite",
        "number-update-anim": "numberChange 0.3s ease",
        "slide-in-from-bottom": "slideInFromBottom 0.3s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
