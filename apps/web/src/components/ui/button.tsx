import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils.ts";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-400/40 hover:brightness-110",
        destructive: "bg-red-500/90 text-white hover:bg-red-500",
        outline:
          "border border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10",
        secondary: "bg-slate-100 text-slate-900 hover:bg-white",
        ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
};
