import type { ChatErrorCode } from "@/types/chat";

export class ChatApiError extends Error {
  readonly code: ChatErrorCode;
  readonly status?: number;

  constructor(code: ChatErrorCode, message: string, status?: number) {
    super(message);
    this.name = "ChatApiError";
    this.code = code;
    this.status = status;
  }
}

export function getErrorMessage(code: ChatErrorCode): string {
  switch (code) {
    case "network":
      return "We could not reach the university assistant. Check your connection and try again.";
    case "timeout":
      return "The request took too long. Please try again.";
    case "unavailable":
      return "The assistant is temporarily unavailable. Please try again shortly.";
    case "invalid_response":
      return "The assistant returned an unexpected response. Please try again.";
    case "empty_answer":
      return "I could not find a reliable answer in the indexed university sources.";
    case "cancelled":
      return "The request was cancelled.";
    case "config":
      return "The assistant is not configured correctly. Set the API base URL or enable mock mode.";
    case "unknown":
    default:
      return "Something went wrong while answering your question. Please try again.";
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function toChatApiError(error: unknown): ChatApiError {
  if (error instanceof ChatApiError) {
    return error;
  }

  if (isAbortError(error)) {
    return new ChatApiError("cancelled", getErrorMessage("cancelled"));
  }

  if (error instanceof TypeError) {
    return new ChatApiError("network", getErrorMessage("network"));
  }

  return new ChatApiError("unknown", getErrorMessage("unknown"));
}
