"use client";

import { RotateCcw } from "lucide-react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatEmptyState } from "@/components/chat/chat-empty-state";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { SuggestedQuestions } from "@/components/chat/suggested-questions";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/use-chat";
import { PRODUCT_NAME } from "@/lib/chat/constants";

export function ChatPage() {
  const {
    messages,
    isLoading,
    statusMessage,
    sendMessage,
    retryLastFailed,
    resetConversation,
    canSubmit,
    submitAnswerFeedback,
  } = useChat();

  const hasMessages = messages.length > 0;

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 bg-surface rounded-3xl shadow-sm p-4 sm:p-6"
      aria-busy={isLoading || undefined}
    >
      {hasMessages ? <h1 className="sr-only">{PRODUCT_NAME}</h1> : null}

      <div className="flex min-w-0 items-start justify-between gap-3">
        {hasMessages ? <ChatEmptyState compact /> : null}
        {hasMessages ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetConversation}
            disabled={isLoading}
            className="shrink-0"
            aria-label="Reset conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-serif">Reset</span>
          </Button>
        ) : null}
      </div>

      {!hasMessages ? <ChatEmptyState /> : null}

      <ChatMessageList
        messages={messages}
        onRetry={retryLastFailed}
        retryDisabled={isLoading}
        onFeedback={(messageId, rating) => {
          void submitAnswerFeedback(messageId, rating);
        }}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {!hasMessages || messages.length < 4 ? (
        <SuggestedQuestions
          onSelect={(question) => void sendMessage(question)}
          disabled={isLoading}
          isQuestionDisabled={(question) => !canSubmit(question)}
        />
      ) : null}

      <ChatComposer
        onSubmit={sendMessage}
        disabled={isLoading}
        canSubmit={canSubmit}
      />
    </div>
  );
}
