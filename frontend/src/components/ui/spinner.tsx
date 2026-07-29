import { cn } from "@/lib/utils/cn";

type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({ className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        "motion-reduce:animate-none motion-reduce:border-[var(--muted-foreground)] motion-reduce:opacity-70",
        className,
      )}
    />
  );
}
