import type { ChatMessage, FeedbackRating } from "@/types/chat";

/**
 * Whether a feedback vote may be sent for this assistant message.
 * Blocks only while a request is pending; allows changing up↔down after success.
 */
export function canSubmitFeedback(
  message: ChatMessage | undefined,
  rating: FeedbackRating,
): boolean {
  if (!message) return false;
  if (message.role !== "assistant" || message.status !== "complete") return false;
  if (!message.queryId?.trim()) return false;
  if (message.feedbackPending) return false;
  if (message.feedbackRating === rating && !message.feedbackError) return false;
  return true;
}

export function resolveFeedbackRetryRating(message: ChatMessage): FeedbackRating {
  if (message.feedbackLastAttempt === "up" || message.feedbackLastAttempt === "down") {
    return message.feedbackLastAttempt;
  }
  if (message.feedbackRating === "up" || message.feedbackRating === "down") {
    return message.feedbackRating;
  }
  return "up";
}
