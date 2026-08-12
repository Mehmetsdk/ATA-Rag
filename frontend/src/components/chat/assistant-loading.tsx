"use client";

import { LOADING_STAGES } from "@/lib/chat/constants";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";

type AssistantLoadingProps = {
  active: boolean;
};

/**
 * Visual loading indicator. Screen-reader status is owned by ChatPage's
 * single aria-live region (statusMessage) to avoid repeated announcements
 * when stages rotate.
 */
export function AssistantLoading({ active }: AssistantLoadingProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % LOADING_STAGES.length);
    }, 2200);

    return () => window.clearInterval(intervalId);
  }, [active]);

  if (!active) return null;

  const label = LOADING_STAGES[stageIndex] ?? LOADING_STAGES[0];

  return (
    <div
      className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]"
      aria-hidden="true"
    >
      <Spinner label="Loading" className="text-[var(--primary)]" />
      <span>{label}</span>
    </div>
  );
}
