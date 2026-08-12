import { cn } from "@/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3",
          "text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
          "shadow-[var(--shadow-sm)] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-[var(--primary)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
