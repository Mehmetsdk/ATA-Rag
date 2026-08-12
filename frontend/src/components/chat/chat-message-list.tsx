"use client";

import { ChatMessageView } from "@/components/chat/chat-message";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import type { ChatMessage, FeedbackRating } from "@/types/chat";

type ChatMessageListProps = {
  messages: ChatMessage[];
  onRetry?: () => void;
  retryDisabled?: boolean;
  onFeedback?: (messageId: string, rating: FeedbackRating) => void;
};

export function ChatMessageList({
  messages,
  onRetry,
  retryDisabled,
  onFeedback,
}: ChatMessageListProps) {
  const scrollRef = useAutoScroll<HTMLDivElement>(
    messages.length + messages.map((m) => m.status).join(","),
  );

  if (messages.length === 0) return null;

  const lastErrorId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.status === "error")?.id;

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain pr-1"
    >
      {messages.map((message) => (
        <ChatMessageView
          key={message.id}
          message={message}
          onRetry={message.id === lastErrorId ? onRetry : undefined}
          retryDisabled={retryDisabled}
          onFeedback={onFeedback}
        />
      ))}
    </div>
  );
}
