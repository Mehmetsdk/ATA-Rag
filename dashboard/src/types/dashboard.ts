export type CrawlStatus = "idle" | "running" | "failed" | "completed";

export type DashboardStats = {
  totalDocuments: number;
  totalChunks: number;
  crawlStatus: CrawlStatus;
  failedPages: number;
  lastCrawlAt: string | null;
  totalQuestions: number;
  avgResponseTimeMs: number;
  unansweredQuestions: number;
};

export type CrawlHistoryEntry = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: CrawlStatus;
  pagesCrawled: number;
  pagesFailed: number;
  chunksProduced: number;
};

export type RecentQuestion = {
  id: string;
  question: string;
  askedAt: string;
  answered: boolean;
  responseTimeMs: number | null;
  confidence: number | null;
};

export type DashboardData = {
  stats: DashboardStats;
  crawlHistory: CrawlHistoryEntry[];
  recentQuestions: RecentQuestion[];
};

export type DashboardErrorCode =
  | "network"
  | "timeout"
  | "unavailable"
  | "invalid_response"
  | "cancelled"
  | "config"
  | "unknown";

/** Raw backend payload (snake_case). Tolerant of missing fields. */
export type RawDashboardStats = {
  total_documents?: unknown;
  total_chunks?: unknown;
  crawl_status?: unknown;
  failed_pages?: unknown;
  last_crawl_at?: unknown;
  total_questions?: unknown;
  avg_response_time_ms?: unknown;
  unanswered_questions?: unknown;
};

export type RawCrawlHistoryEntry = {
  id?: unknown;
  started_at?: unknown;
  finished_at?: unknown;
  status?: unknown;
  pages_crawled?: unknown;
  pages_failed?: unknown;
  chunks_produced?: unknown;
};

export type RawRecentQuestion = {
  id?: unknown;
  question?: unknown;
  asked_at?: unknown;
  answered?: unknown;
  response_time_ms?: unknown;
  confidence?: unknown;
};
