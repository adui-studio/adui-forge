import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils.ts";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-white/15 bg-white/5 text-slate-300",
        info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
        success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        warning: "border-amber-400/30 bg-amber-400/10 text-amber-300",
        danger: "border-red-400/30 bg-red-400/10 text-red-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/** 执行中状态带呼吸点，增强“正在进行”的科技感 */
export const Badge = ({ className, tone, children, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ tone }), className)} {...props}>
    {(tone === "info" || tone === "success") && (
      <span
        className={
          tone === "info"
            ? "h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"
            : "h-1.5 w-1.5 rounded-full bg-emerald-300"
        }
      />
    )}
    {children}
  </span>
);
