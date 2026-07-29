import { REQUEST_TIMEOUT_MS } from "@/lib/chat/constants";
import { assertApiConfigured, buildChatEndpoint, getPublicEnv } from "@/lib/config/env";
import { ChatApiError, getErrorMessage, toChatApiError } from "@/lib/api/chat-errors";
import { mapChatResponse } from "@/lib/api/chat-mapper";
import type { ChatRequest, ChatResponse } from "@/types/chat";

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
        body: JSON.stringify({
          question: request.question,
          language: request.language,
        }),
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
