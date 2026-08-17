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
          "w-full resize-none rounded-md px-3.5 py-3",
          "text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]",
          "transition-colors",
          "outline-none focus:outline-none focus-visible:outline-none border-none",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
    );
  },
);
