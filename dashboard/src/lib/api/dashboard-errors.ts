import type { DashboardErrorCode } from "@/types/dashboard";

export class DashboardApiError extends Error {
  readonly code: DashboardErrorCode;
  readonly status?: number;

  constructor(code: DashboardErrorCode, message: string, status?: number) {
    super(message);
    this.name = "DashboardApiError";
    this.code = code;
    this.status = status;
  }
}

export function getDashboardErrorMessage(code: DashboardErrorCode): string {
  switch (code) {
    case "network":
      return "Could not reach the dashboard API. Check your connection and try again.";
    case "timeout":
      return "The dashboard request took too long. Please try again.";
    case "unavailable":
      return "Dashboard data is temporarily unavailable. Please try again shortly.";
    case "invalid_response":
      return "The dashboard API returned an unexpected response.";
    case "cancelled":
      return "The dashboard request was cancelled.";
    case "config":
      return "Dashboard is not configured. Set the API base URL or enable mock mode.";
    case "unknown":
    default:
      return "Something went wrong while loading dashboard data.";
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function toDashboardApiError(error: unknown): DashboardApiError {
  if (error instanceof DashboardApiError) {
    return error;
  }

  if (isAbortError(error)) {
    return new DashboardApiError("cancelled", getDashboardErrorMessage("cancelled"));
  }

  if (error instanceof TypeError) {
    return new DashboardApiError("network", getDashboardErrorMessage("network"));
  }

  if (error instanceof Error && error.message.includes("not configured")) {
    return new DashboardApiError("config", getDashboardErrorMessage("config"));
  }

  return new DashboardApiError("unknown", getDashboardErrorMessage("unknown"));
}
