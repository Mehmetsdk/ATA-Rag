export type SourceType = "website" | "pdf" | string;

export type SourceReference = {
  title: string;
  url: string;
  section?: string | null;
  excerpt?: string | null;
  sourceType?: SourceType;
};

export type ChatMessageStatus = "pending" | "complete" | "error";

export type FeedbackRating = "up" | "down";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: SourceReference[];
  confidence?: number | null;
  latencyMs?: number | null;
  /** Backend query_logs.id from a successful /api/chat response. */
  queryId?: string | null;
  status?: ChatMessageStatus;
  errorCode?: ChatErrorCode | null;
  /** Local thumbs feedback for this assistant answer, if any. */
  feedbackRating?: FeedbackRating | null;
  feedbackPending?: boolean;
  feedbackError?: string | null;
  feedbackId?: string | null;
  /** Last rating the user attempted (used for error retry). */
  feedbackLastAttempt?: FeedbackRating | null;
};

export type ChatErrorCode =
  | "network"
  | "timeout"
  | "unavailable"
  | "invalid_response"
  | "empty_answer"
  | "cancelled"
  | "config"
  | "unknown";

/** Prior completed turns sent with the current question (CONTRACTS.md §3.1). */
export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  question: string;
  language: string;
  history?: ChatHistoryMessage[];
};

export type ChatResponse = {
  answer: string;
  sources: SourceReference[];
  confidence: number | null;
  latencyMs: number | null;
  queryId: string;
};

export type FeedbackRequest = {
  queryId: string;
  rating: FeedbackRating;
  comment?: string | null;
};

export type FeedbackResponse = {
  success: boolean;
  feedbackId: string;
};

/** Raw backend payload (snake_case). Tolerant of missing fields. */
export type RawChatSource = {
  title?: unknown;
  url?: unknown;
  section?: unknown;
  excerpt?: unknown;
  source_type?: unknown;
};

export type RawChatResponse = {
  answer?: unknown;
  sources?: unknown;
  confidence?: unknown;
  latency_ms?: unknown;
  query_id?: unknown;
};

export type RawFeedbackResponse = {
  success?: unknown;
  feedback_id?: unknown;
};

export type ConfidenceLevel = "high" | "medium" | "low";
