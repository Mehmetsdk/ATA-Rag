import { REQUEST_TIMEOUT_MS } from "@/lib/chat/constants";
import { assertApiConfigured, buildChatEndpoint, buildFeedbackEndpoint, getPublicEnv } from "@/lib/config/env";
import { ChatApiError, getErrorMessage, toChatApiError } from "@/lib/api/chat-errors";
import {
  assertValidFeedbackRating,
  mapChatResponse,
  mapFeedbackResponse,
} from "@/lib/api/chat-mapper";
import type { ChatRequest, ChatResponse, FeedbackRequest, FeedbackResponse } from "@/types/chat";

export type AskChatOptions = {
  signal?: AbortSignal;
  /**
   * Reserved for future streaming support.
   * The non-streaming client ignores this today.
   */
  onChunk?: (chunk: string) => void;
};

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function toWireChatBody(request: ChatRequest) {
  return {
    question: request.question,
    language: request.language,
    history: (request.history ?? []).map((item) => ({
      role: item.role,
      content: item.content,
    })),
  };
}

function toWireFeedbackBody(request: FeedbackRequest) {
  const rating = assertValidFeedbackRating(request.rating);
  const queryId = request.queryId?.trim();
  if (!queryId) {
    throw new ChatApiError("invalid_response", getErrorMessage("invalid_response"));
  }
  return {
    query_id: queryId,
    rating,
    comment: request.comment ?? null,
  };
}

async function askRemoteChat(
  request: ChatRequest,
  options?: AskChatOptions,
): Promise<ChatResponse> {
  const baseUrl = assertApiConfigured();
  const endpoint = buildChatEndpoint(baseUrl);
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onExternalAbort);

  try {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(toWireChatBody(request)),
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        if (options?.signal?.aborted) {
          throw new ChatApiError("cancelled", getErrorMessage("cancelled"));
        }
        throw new ChatApiError("timeout", getErrorMessage("timeout"));
      }
      throw toChatApiError(error);
    }

    if (!response.ok) {
      if (response.status === 404 || response.status >= 500) {
        throw new ChatApiError("unavailable", getErrorMessage("unavailable"), response.status);
      }
      throw new ChatApiError("unknown", getErrorMessage("unknown"), response.status);
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new ChatApiError("invalid_response", getErrorMessage("invalid_response"), response.status);
    }

    const mapped = mapChatResponse(raw);

    if (!mapped.answer.trim()) {
      throw new ChatApiError("empty_answer", getErrorMessage("empty_answer"));
    }

    return mapped;
  } finally {
    globalThis.clearTimeout(timeoutId);
    options?.signal?.removeEventListener("abort", onExternalAbort);
  }
}

async function submitRemoteFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  const baseUrl = assertApiConfigured();
  const endpoint = buildFeedbackEndpoint(baseUrl);
  const wire = toWireFeedbackBody(request);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(wire),
    });
  } catch (error) {
    throw toChatApiError(error);
  }

  if (!response.ok) {
    if (response.status === 404 || response.status >= 500) {
      throw new ChatApiError("unavailable", getErrorMessage("unavailable"), response.status);
    }
    throw new ChatApiError("unknown", getErrorMessage("unknown"), response.status);
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ChatApiError("invalid_response", getErrorMessage("invalid_response"), response.status);
  }

  return mapFeedbackResponse(raw);
}

/**
 * Unified chat client. Components call this only — mock vs remote is env-driven.
 * Mock adapter is loaded only when mock mode is enabled.
 */
export async function askChat(
  request: ChatRequest,
  options?: AskChatOptions,
): Promise<ChatResponse> {
  const env = getPublicEnv();

  try {
    if (env.useMockApi) {
      const { askMockChat } = await import("@/lib/api/mock-chat-client");
      const response = await askMockChat(request, { signal: options?.signal });
      if (!response.answer.trim()) {
        throw new ChatApiError("empty_answer", getErrorMessage("empty_answer"));
      }
      return response;
    }

    return await askRemoteChat(request, options);
  } catch (error) {
    throw toChatApiError(error);
  }
}

/**
 * Submit thumbs up/down feedback keyed by backend query_id.
 */
export async function submitFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  const env = getPublicEnv();

  try {
    if (env.useMockApi) {
      const { submitMockFeedback } = await import("@/lib/api/mock-chat-client");
      return await submitMockFeedback(request);
    }

    return await submitRemoteFeedback(request);
  } catch (error) {
    throw toChatApiError(error);
  }
}

/** Exported for contract tests — keep wire shape aligned with CONTRACTS.md. */
export const __contractHelpers = {
  toWireChatBody,
  toWireFeedbackBody,
};
