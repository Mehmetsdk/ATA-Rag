import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "neutral" | "success" | "warning" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children: ReactNode;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--surface-muted)] text-[var(--muted-foreground)] border-[var(--border)]",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-border)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-border)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-border)]",
};

export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
