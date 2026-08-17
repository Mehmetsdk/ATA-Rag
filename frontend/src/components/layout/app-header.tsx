import { PRODUCT_NAME, PRODUCT_SUBTITLE } from "@/lib/chat/constants";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getPublicEnv } from "@/lib/config/env";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

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
          <img
            src="/ata-logo.jpeg"
            alt="ATA Akademia Techniczno-Artystyczna"
            className="h-10 w-10 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="truncate font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
                {PRODUCT_NAME}
              </p>
            </div>
            <p className="truncate text-xs text-[var(--muted-foreground)] sm:text-sm">
              {PRODUCT_SUBTITLE}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={activeNav === "dashboard" ? "/" : "/dashboard"}
            className="text-sm font-serif text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            {activeNav === "dashboard" ? "Chat" : "Dashboard"}
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
