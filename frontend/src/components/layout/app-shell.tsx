import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";

type AppShellProps = {
  children: ReactNode;
  /** Future routes can pass active nav key, e.g. "chat" | "dashboard" */
  activeNav?: "chat" | "dashboard";
};

/**
 * Shared application shell for chat and future dashboard pages.
 */
export function AppShell({ children, activeNav = "chat" }: AppShellProps) {
  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <AppHeader activeNav={activeNav} />
      <main className="mx-auto flex w-full min-w-0 max-w-3xl min-h-0 flex-1 flex-col px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
