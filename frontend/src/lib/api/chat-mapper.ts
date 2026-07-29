import type {
  ChatResponse,
  ConfidenceLevel,
  RawChatResponse,
  RawChatSource,
  SourceReference,
} from "@/types/chat";
import { ChatApiError, getErrorMessage } from "@/lib/api/chat-errors";

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Accept only safe absolute http(s) URLs for source links.
 * Rejects javascript:, data:, blob:, and relative values.
 */
export function sanitizeHttpUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function mapSource(raw: RawChatSource): SourceReference | null {
  const url = asOptionalString(raw.url);
  if (!url) return null;

  const validUrl = sanitizeHttpUrl(url);
  if (!validUrl) return null;

  const title = asOptionalString(raw.title) ?? hostnameFromUrl(validUrl) ?? validUrl;
  const section = asOptionalString(raw.section);
  const excerpt = asOptionalString(raw.excerpt);
  const sourceType = asOptionalString(raw.source_type) ?? undefined;

  return {
    title,
    url: validUrl,
    section,
    excerpt,
    sourceType,
  };
}

export function hostnameFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function dedupeSources(sources: SourceReference[]): SourceReference[] {
  const seen = new Set<string>();
  const result: SourceReference[] = [];

  for (const source of sources) {
    const key = source.url.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(source);
  }

  return result;
}

export function mapConfidenceLevel(confidence: number | null | undefined): ConfidenceLevel | null {
  if (confidence === null || confidence === undefined || !Number.isFinite(confidence)) {
    return null;
  }

  // Backend contract is 0–1. Ignore out-of-range values instead of mislabeling them.
  if (confidence < 0 || confidence > 1) {
    return null;
  }

  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

export function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "High source match";
    case "medium":
      return "Medium source match";
    case "low":
      return "Low source match";
  }
}

/**
 * Normalize a raw backend (snake_case) response into frontend domain types.
 */
export function mapChatResponse(raw: unknown): ChatResponse {
  // Arrays are typeof "object" in JS — reject them explicitly.
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new ChatApiError("invalid_response", getErrorMessage("invalid_response"));
  }

  const payload = raw as RawChatResponse;
  const answer = asOptionalString(payload.answer) ?? "";

  let sources: SourceReference[] = [];
  if (Array.isArray(payload.sources)) {
    sources = dedupeSources(
      payload.sources
        .filter((item): item is RawChatSource => !!item && typeof item === "object")
        .map((item) => mapSource(item))
        .filter((item): item is SourceReference => item !== null),
    );
  }

  const confidenceRaw = asOptionalNumber(payload.confidence);
  const confidence =
    confidenceRaw !== null && confidenceRaw >= 0 && confidenceRaw <= 1 ? confidenceRaw : null;

  const latencyRaw = asOptionalNumber(payload.latency_ms);
  const latencyMs = latencyRaw !== null && latencyRaw >= 0 ? latencyRaw : null;

  return {
    answer,
    sources,
    confidence,
    latencyMs,
  };
}
