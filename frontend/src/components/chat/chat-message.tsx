"use client";

import { Copy, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AssistantLoading } from "@/components/chat/assistant-loading";
import { ChatError } from "@/components/chat/chat-error";
import { ConfidenceBadge } from "@/components/chat/confidence-badge";
import { SourceList } from "@/components/chat/source-list";
import { Button } from "@/components/ui/button";
import { getPublicEnv } from "@/lib/config/env";
import type { ChatMessage } from "@/types/chat";

type ChatMessageProps = {
  message: ChatMessage;
  onRetry?: () => void;
  retryDisabled?: boolean;
};

export function ChatMessageView({ message, onRetry, retryDisabled }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(85%,36rem)] rounded-2xl rounded-br-md bg-[var(--primary)] px-4 py-2.5 text-sm leading-relaxed text-[var(--primary-foreground)]">
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.status === "pending") {
    return <AssistantLoading active />;
  }

  if (message.status === "error") {
    return (
      <ChatError
        message={message.content}
        onRetry={message.errorCode === "cancelled" ? undefined : onRetry}
        retryDisabled={retryDisabled}
      />
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article
      className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-sm)]"
      aria-label="Assistant response"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          Answer
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ConfidenceBadge confidence={message.confidence} />
          {typeof message.latencyMs === "number" ? (
            <span className="text-xs text-[var(--muted-foreground)]">
              {(message.latencyMs / 1000).toFixed(1)}s
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={handleCopy}
            aria-label={copied ? "Answer copied" : "Copy answer"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </div>

      <div className="mt-3 text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {message.content}
      </div>

      {message.sources && message.sources.length > 0 ? (
        <SourceList sources={message.sources} demo={getPublicEnv().useMockApi} />
      ) : null}
    </article>
  );
}
