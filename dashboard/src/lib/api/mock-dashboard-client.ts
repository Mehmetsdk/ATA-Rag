/**
 * TODO (Person 2): Replace this module with real backend calls to /api/admin/*.
 * This in-browser mock is used when NEXT_PUBLIC_USE_MOCK_DASHBOARD=true.
 */
import type { DashboardData } from "@/types/dashboard";

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      globalThis.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

const MOCK_DASHBOARD_DATA: DashboardData = {
  stats: {
    totalDocuments: 142,
    totalChunks: 1847,
    crawlStatus: "completed",
    failedPages: 3,
    lastCrawlAt: "2026-08-05T14:30:00Z",
    totalQuestions: 523,
    avgResponseTimeMs: 1240,
    unansweredQuestions: 12,
  },
  crawlHistory: [
    {
      id: "crawl-2026-08-05",
      startedAt: "2026-08-05T12:00:00Z",
      finishedAt: "2026-08-05T14:30:00Z",
      status: "completed",
      pagesCrawled: 287,
      pagesFailed: 3,
      chunksProduced: 1847,
    },
    {
      id: "crawl-2026-08-01",
      startedAt: "2026-08-01T09:15:00Z",
      finishedAt: "2026-08-01T11:45:00Z",
      status: "completed",
      pagesCrawled: 265,
      pagesFailed: 5,
      chunksProduced: 1720,
    },
    {
      id: "crawl-2026-07-28",
      startedAt: "2026-07-28T08:00:00Z",
      finishedAt: "2026-07-28T08:02:00Z",
      status: "failed",
      pagesCrawled: 12,
      pagesFailed: 12,
      chunksProduced: 0,
    },
  ],
  recentQuestions: [
    {
      id: "q-001",
      question: "How much is Computer Science tuition?",
      askedAt: "2026-08-06T10:22:00Z",
      answered: true,
      responseTimeMs: 1180,
      confidence: 0.91,
    },
    {
      id: "q-002",
      question: "What documents are required for admission?",
      askedAt: "2026-08-06T09:55:00Z",
      answered: true,
      responseTimeMs: 1420,
      confidence: 0.87,
    },
    {
      id: "q-003",
      question: "Where is the dean's office?",
      askedAt: "2026-08-06T09:30:00Z",
      answered: true,
      responseTimeMs: 980,
      confidence: 0.79,
    },
    {
      id: "q-004",
      question: "Can I transfer credits from another university?",
      askedAt: "2026-08-06T08:45:00Z",
      answered: false,
      responseTimeMs: null,
      confidence: null,
    },
    {
      id: "q-005",
      question: "What scholarships are available for international students?",
      askedAt: "2026-08-06T08:10:00Z",
      answered: true,
      responseTimeMs: 1560,
      confidence: 0.72,
    },
  ],
};

export type FetchDashboardOptions = {
  signal?: AbortSignal;
};

export async function fetchMockDashboard(options?: FetchDashboardOptions): Promise<DashboardData> {
  await delay(500, options?.signal);
  return structuredClone(MOCK_DASHBOARD_DATA);
}
