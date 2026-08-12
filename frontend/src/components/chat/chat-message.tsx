"use client";

import { Check, Copy, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AssistantLoading } from "@/components/chat/assistant-loading";
import { ChatError } from "@/components/chat/chat-error";
import { ConfidenceBadge } from "@/components/chat/confidence-badge";
import { SourceList } from "@/components/chat/source-list";
import { Button } from "@/components/ui/button";
import { getPublicEnv } from "@/lib/config/env";
import { resolveFeedbackRetryRating } from "@/lib/chat/feedback-state";
import type { ChatMessage, FeedbackRating } from "@/types/chat";

type ChatMessageProps = {
  message: ChatMessage;
  onRetry?: () => void;
  retryDisabled?: boolean;
  onFeedback?: (messageId: string, rating: FeedbackRating) => void;
};

export function ChatMessageView({
  message,
  onRetry,
  retryDisabled,
  onFeedback,
}: ChatMessageProps) {
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

  const showFeedback =
    Boolean(onFeedback) &&
    message.status === "complete" &&
    Boolean(message.queryId?.trim());
  const feedbackBusy = Boolean(message.feedbackPending);

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

      {showFeedback ? (
        <div
          className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3"
          role="group"
          aria-label="Answer feedback"
        >
          <span className="text-xs text-[var(--muted-foreground)]">Was this helpful?</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 focus-visible:ring-2"
            disabled={feedbackBusy}
            aria-pressed={message.feedbackRating === "up"}
            aria-label="Thumbs up"
            onClick={() => onFeedback?.(message.id, "up")}
          >
            <ThumbsUp
              className={`h-3.5 w-3.5 ${message.feedbackRating === "up" ? "text-[var(--primary)]" : ""}`}
              aria-hidden="true"
            />
            <span className="text-xs">Yes</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 focus-visible:ring-2"
            disabled={feedbackBusy}
            aria-pressed={message.feedbackRating === "down"}
            aria-label="Thumbs down"
            onClick={() => onFeedback?.(message.id, "down")}
          >
            <ThumbsDown
              className={`h-3.5 w-3.5 ${message.feedbackRating === "down" ? "text-[var(--primary)]" : ""}`}
              aria-hidden="true"
            />
            <span className="text-xs">No</span>
          </Button>
          {message.feedbackRating && !message.feedbackError ? (
            <span className="text-xs text-[var(--muted-foreground)]">Thanks for your feedback</span>
          ) : null}
          {message.feedbackError ? (
            <div className="flex w-full flex-wrap items-center gap-2" role="alert">
              <span className="text-xs text-[var(--danger)]">{message.feedbackError}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 focus-visible:ring-2"
                disabled={feedbackBusy}
                aria-label="Retry feedback"
                onClick={() => onFeedback?.(message.id, resolveFeedbackRetryRating(message))}
              >
                <span className="text-xs">Retry</span>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
