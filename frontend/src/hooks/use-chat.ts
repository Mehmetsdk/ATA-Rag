"use client";

import { useCallback, useRef, useState } from "react";
import { askChat } from "@/lib/api/chat-client";
import { ChatApiError, getErrorMessage } from "@/lib/api/chat-errors";
import { DEFAULT_LANGUAGE, EMPTY_ANSWER_MESSAGE } from "@/lib/chat/constants";
import { isBlankQuestion } from "@/lib/chat/normalize-question";
import type { ChatMessage } from "@/types/chat";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type UseChatResult = {
  messages: ChatMessage[];
  isLoading: boolean;
  statusMessage: string | null;
  sendMessage: (question: string) => Promise<void>;
  retryLastFailed: () => Promise<void>;
  resetConversation: () => void;
  canSubmit: (question: string) => boolean;
};

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastUserQuestionRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const canSubmit = useCallback(
    (question: string) => {
      // Block only while a request is in flight — same question may be asked again after completion.
      if (inFlightRef.current || isLoading) return false;
      if (isBlankQuestion(question)) return false;
      return true;
    },
    [isLoading],
  );

  const runRequest = useCallback(async (question: string, assistantId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    inFlightRef.current = true;
    setIsLoading(true);
    setStatusMessage("Searching university sources…");

    try {
      const response = await askChat(
        { question, language: DEFAULT_LANGUAGE },
        { signal: controller.signal },
      );

      if (requestId !== requestIdRef.current) return;

      if (!response.answer.trim()) {
        throw new ChatApiError("empty_answer", getErrorMessage("empty_answer"));
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: response.answer,
                sources: response.sources,
                confidence: response.confidence,
                latencyMs: response.latencyMs,
                status: "complete",
                errorCode: null,
              }
            : message,
        ),
      );
      setStatusMessage(null);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      if (error instanceof ChatApiError && error.code === "cancelled") {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId && message.status === "pending"
              ? {
                  ...message,
                  content: getErrorMessage("cancelled"),
                  status: "error",
                  errorCode: "cancelled",
                }
              : message,
          ),
        );
        setStatusMessage(null);
        return;
      }

      const apiError =
        error instanceof ChatApiError
          ? error
          : new ChatApiError("unknown", getErrorMessage("unknown"));

      const content =
        apiError.code === "empty_answer" ? EMPTY_ANSWER_MESSAGE : getErrorMessage(apiError.code);

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content,
                status: "error",
                errorCode: apiError.code,
                sources: [],
                confidence: null,
                latencyMs: null,
              }
            : message,
        ),
      );
      setStatusMessage(content);
    } finally {
      if (requestId !== requestIdRef.current) return;

      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!canSubmit(question)) return;

      if (inFlightRef.current) return;
      inFlightRef.current = true;

      lastUserQuestionRef.current = question;

      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: question,
        createdAt: now,
        status: "complete",
      };

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: "",
        createdAt: now,
        status: "pending",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      await runRequest(question, assistantMessage.id);
    },
    [canSubmit, runRequest],
  );

  const retryLastFailed = useCallback(async () => {
    if (inFlightRef.current || isLoading) return;

    const question = lastUserQuestionRef.current;
    if (!question) return;

    const failedAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.status === "error");

    if (!failedAssistant) return;

    inFlightRef.current = true;

    setMessages((prev) =>
      prev.map((message) =>
        message.id === failedAssistant.id
          ? {
              ...message,
              content: "",
              status: "pending",
              errorCode: null,
              sources: [],
              confidence: null,
              latencyMs: null,
            }
          : message,
      ),
    );

    await runRequest(question, failedAssistant.id);
  }, [isLoading, messages, runRequest]);

  const resetConversation = useCallback(() => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    inFlightRef.current = false;
    lastUserQuestionRef.current = null;
    setMessages([]);
    setIsLoading(false);
    setStatusMessage(null);
  }, []);

  return {
    messages,
    isLoading,
    statusMessage,
    sendMessage,
    retryLastFailed,
    resetConversation,
    canSubmit,
  };
}
