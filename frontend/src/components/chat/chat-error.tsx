import { Button } from "@/components/ui/button";

type ChatErrorProps = {
  message: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
};

export function ChatError({ message, onRetry, retryDisabled }: ChatErrorProps) {
  return (
    <div
      role="alert"
      className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3"
    >
      <p className="text-sm text-[var(--danger)]">{message}</p>
      {onRetry ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRetry}
            disabled={retryDisabled}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
