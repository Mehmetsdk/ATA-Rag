import type {
  CrawlHistoryEntry,
  CrawlStatus,
  DashboardStats,
  RawCrawlHistoryEntry,
  RawDashboardStats,
  RawRecentQuestion,
  RecentQuestion,
} from "@/types/dashboard";

const VALID_CRAWL_STATUSES = new Set<CrawlStatus>(["idle", "running", "failed", "completed"]);

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function toCrawlStatus(value: unknown): CrawlStatus {
  if (typeof value === "string" && VALID_CRAWL_STATUSES.has(value as CrawlStatus)) {
    return value as CrawlStatus;
  }
  return "idle";
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1) return true;
  return false;
}

export function mapDashboardStats(raw: RawDashboardStats): DashboardStats {
  return {
    totalDocuments: toNumber(raw.total_documents),
    totalChunks: toNumber(raw.total_chunks),
    crawlStatus: toCrawlStatus(raw.crawl_status),
    failedPages: toNumber(raw.failed_pages),
    lastCrawlAt: toStringOrNull(raw.last_crawl_at),
    totalQuestions: toNumber(raw.total_questions),
    avgResponseTimeMs: toNumber(raw.avg_response_time_ms),
    unansweredQuestions: toNumber(raw.unanswered_questions),
  };
}

export function mapCrawlHistoryEntry(raw: RawCrawlHistoryEntry): CrawlHistoryEntry {
  return {
    id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
    startedAt: toStringOrNull(raw.started_at) ?? new Date(0).toISOString(),
    finishedAt: toStringOrNull(raw.finished_at),
    status: toCrawlStatus(raw.status),
    pagesCrawled: toNumber(raw.pages_crawled),
    pagesFailed: toNumber(raw.pages_failed),
    chunksProduced: toNumber(raw.chunks_produced),
  };
}

export function mapRecentQuestion(raw: RawRecentQuestion): RecentQuestion {
  const confidenceRaw = raw.confidence;
  let confidence: number | null = null;
  if (typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)) {
    confidence = confidenceRaw;
  }

  const responseTimeRaw = raw.response_time_ms;
  let responseTimeMs: number | null = null;
  if (typeof responseTimeRaw === "number" && Number.isFinite(responseTimeRaw)) {
    responseTimeMs = responseTimeRaw;
  }

  return {
    id: typeof raw.id === "string" ? raw.id : String(raw.id ?? ""),
    question: typeof raw.question === "string" ? raw.question : "",
    askedAt: toStringOrNull(raw.asked_at) ?? new Date(0).toISOString(),
    answered: toBoolean(raw.answered),
    responseTimeMs,
    confidence,
  };
}

export function mapCrawlHistoryList(raw: unknown): CrawlHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => mapCrawlHistoryEntry(entry as RawCrawlHistoryEntry));
}

export function mapRecentQuestionsList(raw: unknown): RecentQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => mapRecentQuestion(entry as RawRecentQuestion));
}
