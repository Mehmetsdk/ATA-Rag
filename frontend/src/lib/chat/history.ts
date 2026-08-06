import {
  MAX_HISTORY_CONTENT_LENGTH,
  MAX_HISTORY_MESSAGES,
} from "@/lib/chat/constants";
import type { ChatHistoryMessage, ChatMessage } from "@/types/chat";

function truncateHistoryContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= MAX_HISTORY_CONTENT_LENGTH) {
    return trimmed;
  }
  return trimmed.slice(0, MAX_HISTORY_CONTENT_LENGTH);
}

/**
 * Build prior-turn history for the API.
 * - completed user/assistant only
 * - non-empty content
 * - excludes pending and error messages
 * - latest MAX_HISTORY_MESSAGES messages
 * - truncates each content to MAX_HISTORY_CONTENT_LENGTH
 */
export function buildChatHistory(messages: ChatMessage[]): ChatHistoryMessage[] {
  const filtered = messages
    .filter(
      (message) =>
        message.status === "complete" &&
        (message.role === "user" || message.role === "assistant") &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      role: message.role,
      content: truncateHistoryContent(message.content),
    }));

  if (filtered.length <= MAX_HISTORY_MESSAGES) {
    return filtered;
  }
  return filtered.slice(filtered.length - MAX_HISTORY_MESSAGES);
}

/**
 * History for a retry: prior completed turns before the failed/current user turn.
 */
export function buildRetryHistory(
  messages: ChatMessage[],
  failedAssistantId: string,
): ChatHistoryMessage[] {
  const failedIndex = messages.findIndex((message) => message.id === failedAssistantId);
  if (failedIndex < 0) {
    return buildChatHistory(messages);
  }

  let turnStart = failedIndex;
  for (let i = failedIndex - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      turnStart = i;
      break;
    }
  }

  return buildChatHistory(messages.slice(0, Math.max(0, turnStart)));
}
