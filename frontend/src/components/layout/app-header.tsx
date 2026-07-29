import { PRODUCT_NAME, PRODUCT_SUBTITLE } from "@/lib/chat/constants";
import { getPublicEnv } from "@/lib/config/env";
import { cn } from "@/lib/utils/cn";

type AppHeaderProps = {
  activeNav?: "chat" | "dashboard";
};

function resolveStatus(env: ReturnType<typeof getPublicEnv>): {
  label: string;
  tone: "live" | "demo" | "warning";
} {
  if (env.useMockApi) {
    return { label: "Demo mode", tone: "demo" };
  }

  if (!env.apiBaseUrl) {
    return { label: "API not configured", tone: "warning" };
  }

  return { label: "Live API", tone: "live" };
}

export function AppHeader({ activeNav = "chat" }: AppHeaderProps) {
  const status = resolveStatus(getPublicEnv());

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full min-w-0 max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary)] text-sm font-semibold tracking-wide text-[var(--primary-foreground)]"
          >
            ATA
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
                {PRODUCT_NAME}
              </p>
              <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
                <span
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium",
                    activeNav === "chat"
                      ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]",
                  )}
                  aria-current={activeNav === "chat" ? "page" : undefined}
                >
                  Assistant
                </span>
                <span
                  className="rounded px-2 py-1 text-xs text-[var(--muted-foreground)]/70"
                  aria-disabled="true"
                  title="Coming soon"
                >
                  Dashboard
                </span>
              </nav>
            </div>
            <p className="truncate text-xs text-[var(--muted-foreground)] sm:text-sm">
              {PRODUCT_SUBTITLE}
            </p>
          </div>
        </div>

        <div
          className="flex max-w-[40%] shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 sm:max-w-none"
          title={status.label}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              status.tone === "live" && "bg-[var(--success)]",
              status.tone === "demo" && "bg-[var(--accent)]",
              status.tone === "warning" && "bg-[var(--danger)]",
            )}
          />
          <span className="sr-only">System status:</span>
          <span className="truncate text-xs font-medium text-[var(--muted-foreground)]">
            {status.label}
          </span>
        </div>
      </div>
    </header>
  );
}
