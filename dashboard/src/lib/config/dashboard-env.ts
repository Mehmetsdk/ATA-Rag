import { parseEnvBoolean, normalizeApiBaseUrl } from "@/lib/config/env";

export type DashboardEnv = {
  apiBaseUrl: string | null;
  useMockDashboard: boolean;
};

/**
 * Dashboard-specific public env helper.
 * Reuses the same parsing rules as the chat frontend.
 *
 * NEXT_PUBLIC_USE_MOCK_DASHBOARD — when true, uses in-browser mock data.
 * NEXT_PUBLIC_API_BASE_URL — backend base URL for real admin endpoints.
 */
export function getDashboardEnv(): DashboardEnv {
  const useMockDashboard = parseEnvBoolean(process.env.NEXT_PUBLIC_USE_MOCK_DASHBOARD);
  const apiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

  return { apiBaseUrl, useMockDashboard };
}

export function assertDashboardApiConfigured(env: DashboardEnv = getDashboardEnv()): string {
  if (env.useMockDashboard) {
    return "";
  }

  if (!env.apiBaseUrl) {
    throw new Error("Dashboard API is not configured. Set NEXT_PUBLIC_API_BASE_URL or enable mock mode.");
  }

  return env.apiBaseUrl;
}

export function buildAdminEndpoint(apiBaseUrl: string, path: string): string {
  const base = normalizeApiBaseUrl(apiBaseUrl);
  if (!base) {
    throw new Error("Invalid API base URL.");
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
