import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-dark shadow-md hover:shadow-lg",
        cta: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-[0_4px_20px_hsla(15,100%,60%,0.4)] hover:shadow-[0_6px_30px_hsla(15,100%,60%,0.5)] hover:scale-105",
        hero: "bg-white/20 backdrop-blur-md text-white border-2 border-white hover:bg-white/30",
        outline: "border-2 border-border bg-background hover:bg-secondary text-foreground",
        ghost: "hover:bg-secondary text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
