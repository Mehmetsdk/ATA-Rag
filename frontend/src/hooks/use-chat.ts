"use client";

import { useCallback, useRef, useState } from "react";
import { askChat, submitFeedback } from "@/lib/api/chat-client";
import { ChatApiError, getErrorMessage } from "@/lib/api/chat-errors";
import { assertValidFeedbackRating } from "@/lib/api/chat-mapper";
import { DEFAULT_LANGUAGE, EMPTY_ANSWER_MESSAGE } from "@/lib/chat/constants";
import { canSubmitFeedback } from "@/lib/chat/feedback-state";
import { buildChatHistory, buildRetryHistory } from "@/lib/chat/history";
import { isBlankQuestion } from "@/lib/chat/normalize-question";
import type { ChatHistoryMessage, ChatMessage, FeedbackRating } from "@/types/chat";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const FEEDBACK_ERROR_MESSAGE =
  "Could not save your feedback. Please try again.";

export type UseChatResult = {
  messages: ChatMessage[];
  isLoading: boolean;
  statusMessage: string | null;
  sendMessage: (question: string) => Promise<void>;
  retryLastFailed: () => Promise<void>;
  resetConversation: () => void;
  canSubmit: (question: string) => boolean;
  submitAnswerFeedback: (messageId: string, rating: FeedbackRating) => Promise<void>;
};

export function useChat(): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastUserQuestionRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  messagesRef.current = messages;

  const canSubmit = useCallback(
    (question: string) => {
      if (inFlightRef.current || isLoading) return false;
      if (isBlankQuestion(question)) return false;
      return true;
    },
    [isLoading],
  );

  const runRequest = useCallback(
    async (question: string, assistantId: string, history: ChatHistoryMessage[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      inFlightRef.current = true;
      setIsLoading(true);
      setStatusMessage("Searching university sources…");

      try {
        const response = await askChat(
          { question, language: DEFAULT_LANGUAGE, history },
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
                  queryId: response.queryId,
                  status: "complete",
                  errorCode: null,
                  feedbackRating: null,
                  feedbackPending: false,
                  feedbackError: null,
                  feedbackId: null,
                  feedbackLastAttempt: null,
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
                    queryId: null,
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
                  queryId: null,
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
    },
    [],
  );

  const sendMessage = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!canSubmit(question)) return;

      if (inFlightRef.current) return;
      inFlightRef.current = true;

      lastUserQuestionRef.current = question;

      const history = buildChatHistory(messagesRef.current);

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
      await runRequest(question, assistantMessage.id, history);
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

    const history = buildRetryHistory(messages, failedAssistant.id);

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
              queryId: null,
              feedbackRating: null,
              feedbackPending: false,
              feedbackError: null,
              feedbackId: null,
              feedbackLastAttempt: null,
            }
          : message,
      ),
    );

    await runRequest(question, failedAssistant.id, history);
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

  const submitAnswerFeedback = useCallback(
    async (messageId: string, rating: FeedbackRating) => {
      const current = messagesRef.current.find((message) => message.id === messageId);
      if (!canSubmitFeedback(current, rating)) {
        return;
      }

      let validated: FeedbackRating;
      try {
        validated = assertValidFeedbackRating(rating);
      } catch {
        return;
      }

      const queryId = current!.queryId!.trim();

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                feedbackPending: true,
                feedbackError: null,
                feedbackLastAttempt: validated,
              }
            : message,
        ),
      );

      try {
        const result = await submitFeedback({
          queryId,
          rating: validated,
          comment: null,
        });

        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  feedbackRating: validated,
                  feedbackPending: false,
                  feedbackError: null,
                  feedbackId: result.feedbackId,
                  feedbackLastAttempt: validated,
                }
              : message,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  feedbackPending: false,
                  feedbackError: FEEDBACK_ERROR_MESSAGE,
                  feedbackLastAttempt: validated,
                }
              : message,
          ),
        );
      }
    },
    [],
  );

  return {
    messages,
    isLoading,
    statusMessage,
    sendMessage,
    retryLastFailed,
    resetConversation,
    canSubmit,
    submitAnswerFeedback,
  };
}
