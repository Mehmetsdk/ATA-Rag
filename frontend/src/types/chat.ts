export type SourceType = "website" | "pdf" | string;

export type SourceReference = {
  title: string;
  url: string;
  section?: string | null;
  excerpt?: string | null;
  sourceType?: SourceType;
};

export type ChatMessageStatus = "pending" | "complete" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: SourceReference[];
  confidence?: number | null;
  latencyMs?: number | null;
  status?: ChatMessageStatus;
  errorCode?: ChatErrorCode | null;
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

export type ChatRequest = {
  question: string;
  language: string;
};

export type ChatResponse = {
  answer: string;
  sources: SourceReference[];
  confidence: number | null;
  latencyMs: number | null;
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
};

export type ConfidenceLevel = "high" | "medium" | "low";
