import {
  assertDashboardApiConfigured,
  buildAdminEndpoint,
  getDashboardEnv,
} from "@/lib/config/dashboard-env";
import {
  DashboardApiError,
  getDashboardErrorMessage,
  toDashboardApiError,
} from "@/lib/api/dashboard-errors";
import {
  mapCrawlHistoryList,
  mapDashboardStats,
  mapRecentQuestionsList,
} from "@/lib/api/dashboard-mapper";
import type { DashboardData } from "@/types/dashboard";

const REQUEST_TIMEOUT_MS = 15_000;

export type FetchDashboardOptions = {
  signal?: AbortSignal;
};

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

async function fetchJson<T>(
  url: string,
  options?: FetchDashboardOptions,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const onExternalAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onExternalAbort);

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        if (options?.signal?.aborted) {
          throw new DashboardApiError("cancelled", getDashboardErrorMessage("cancelled"));
        }
        throw new DashboardApiError("timeout", getDashboardErrorMessage("timeout"));
      }
      throw toDashboardApiError(error);
    }

    if (!response.ok) {
      if (response.status === 404 || response.status >= 500) {
        throw new DashboardApiError(
          "unavailable",
          getDashboardErrorMessage("unavailable"),
          response.status,
        );
      }
      throw new DashboardApiError("unknown", getDashboardErrorMessage("unknown"), response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new DashboardApiError("invalid_response", getDashboardErrorMessage("invalid_response"));
    }
  } finally {
    globalThis.clearTimeout(timeoutId);
    options?.signal?.removeEventListener("abort", onExternalAbort);
  }
}

async function fetchRemoteDashboard(options?: FetchDashboardOptions): Promise<DashboardData> {
  const baseUrl = assertDashboardApiConfigured();

  const [statsRaw, crawlHistoryRaw, recentQuestionsRaw] = await Promise.all([
    fetchJson<unknown>(buildAdminEndpoint(baseUrl, "/api/admin/stats"), options),
    fetchJson<unknown>(buildAdminEndpoint(baseUrl, "/api/admin/crawl-history"), options),
    fetchJson<unknown>(buildAdminEndpoint(baseUrl, "/api/admin/recent-questions"), options),
  ]);

  return {
    stats: mapDashboardStats(statsRaw as Record<string, unknown>),
    crawlHistory: mapCrawlHistoryList(crawlHistoryRaw),
    recentQuestions: mapRecentQuestionsList(recentQuestionsRaw),
  };
}

/**
 * Unified dashboard client. Components call this only — mock vs remote is env-driven.
 * Mock adapter is loaded only when mock mode is enabled.
 */
export async function fetchDashboard(options?: FetchDashboardOptions): Promise<DashboardData> {
  const env = getDashboardEnv();

  try {
    if (env.useMockDashboard) {
      const { fetchMockDashboard } = await import("@/lib/api/mock-dashboard-client");
      return await fetchMockDashboard(options);
    }

    return await fetchRemoteDashboard(options);
  } catch (error) {
    throw toDashboardApiError(error);
  }
}
