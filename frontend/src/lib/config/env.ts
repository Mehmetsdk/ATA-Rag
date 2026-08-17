import { ChatApiError, getErrorMessage } from "@/lib/api/chat-errors";

export type PublicEnv = {
  apiBaseUrl: string | null;
  useMockApi: boolean;
};

/**
 * Strict boolean parsing for NEXT_PUBLIC flags.
 * Only true/1/yes (case-insensitive) enable a flag.
 * false, 0, empty, undefined, and other strings remain disabled.
 */
export function parseEnvBoolean(value: string | undefined): boolean {
  if (value === undefined || value === null) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Normalize API base URL: trim, strip trailing slashes, require http(s).
 */
export function normalizeApiBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Typed public environment helper.
 * Only NEXT_PUBLIC_* values are read — never server secrets.
 *
 * Note: NEXT_PUBLIC_* values are inlined at Next.js build time.
 * Changing them requires rebuilding (or restarting `next dev`).
 */
export function getPublicEnv(): PublicEnv {
  const useMockApi = parseEnvBoolean(process.env.NEXT_PUBLIC_USE_MOCK_API);
  const apiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

  return { apiBaseUrl, useMockApi };
}

export function assertApiConfigured(env: PublicEnv = getPublicEnv()): string {
  if (env.useMockApi) {
    return "";
  }

  if (!env.apiBaseUrl) {
    throw new ChatApiError("config", getErrorMessage("config"));
  }

  return env.apiBaseUrl;
}

function buildApiPath(apiBaseUrl: string, path: string): string {
  const base = normalizeApiBaseUrl(apiBaseUrl);
  if (!base) {
    throw new ChatApiError("config", getErrorMessage("config"));
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

/** Build the chat endpoint URL with exactly one slash before /api/chat. */
export function buildChatEndpoint(apiBaseUrl: string): string {
  return buildApiPath(apiBaseUrl, "/api/chat");
}

/** Build the feedback endpoint URL (CONTRACTS.md §3.2). */
export function buildFeedbackEndpoint(apiBaseUrl: string): string {
  return buildApiPath(apiBaseUrl, "/api/feedback");
}

/** Build the dashboard stats endpoint URL. */
export function buildDashboardStatsEndpoint(apiBaseUrl: string): string {
  return buildApiPath(apiBaseUrl, "/api/dashboard/stats");
}
