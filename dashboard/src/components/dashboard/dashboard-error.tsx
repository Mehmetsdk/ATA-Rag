import { Button } from "@/components/ui/button";
import type { DashboardErrorCode } from "@/types/dashboard";

type DashboardErrorProps = {
  message: string;
  code?: DashboardErrorCode | null;
  onRetry?: () => void;
};

export function DashboardError({ message, code, onRetry }: DashboardErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4"
    >
      <p className="text-sm font-medium text-[var(--danger)]">Could not load dashboard</p>
      <p className="mt-1 text-sm text-[var(--foreground)]">{message}</p>
      {code ? (
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">Error code: {code}</p>
      ) : null}
      {onRetry ? (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
