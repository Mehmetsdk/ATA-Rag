import {
  MOCK_ERROR_QUERY,
  MOCK_NO_SOURCES_QUERY,
} from "@/lib/chat/constants";
import { normalizeQuestion } from "@/lib/chat/normalize-question";
import { ChatApiError, getErrorMessage } from "@/lib/api/chat-errors";
import { assertValidFeedbackRating } from "@/lib/api/chat-mapper";
import type {
  ChatRequest,
  ChatResponse,
  FeedbackRequest,
  FeedbackResponse,
  SourceReference,
} from "@/types/chat";

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

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Stable UUID-shaped query id for identical mock inputs (CONTRACTS.md query_id).
 */
export function stableMockQueryId(question: string, historyLength: number): string {
  const seed = `${normalizeQuestion(question)}|${historyLength}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  let extended = hex;
  while (extended.length < 12) {
    extended += hex;
  }
  return `mock0000-0000-4000-8000-${extended.slice(0, 12)}`;
}

type MockScenario = {
  answer: string;
  sources: SourceReference[];
  confidence: number;
};

const DEFAULT_SOURCES: SourceReference[] = [
  {
    title: "[Demo] Admissions Overview",
    url: "https://akademiata.pl/",
    section: "How to apply",
    excerpt:
      "Demo data: Applicants submit an online application, required documents, and any programme-specific materials by the published deadline.",
    sourceType: "website",
  },
  {
    title: "[Demo] Tuition and Fees",
    url: "https://akademiata.pl/kalkulator-czesnego/",
    section: "Study programmes",
    excerpt:
      "Demo data: Tuition varies by programme and study mode. Computer Science fees are published in the current academic year fee schedule.",
    sourceType: "website",
  },
  {
    title: "[Demo] Student Services Guide",
    url: "https://akademiata.pl/kontakt/",
    section: "Scholarships",
    excerpt:
      "Demo data: Need-based and merit scholarships are available. Eligibility and application windows are announced each semester.",
    sourceType: "website",
  },
];

function buildScenario(question: string): MockScenario {
  const normalized = normalizeQuestion(question);

  if (normalized.includes("tuition") || normalized.includes("computer science")) {
    return {
      answer:
        "According to the published fee schedule, Computer Science tuition depends on the study mode and academic year. Check the tuition page for the current amount and payment deadlines. For official confirmation, contact the admissions or finance office linked in the sources below.",
      sources: [DEFAULT_SOURCES[1], DEFAULT_SOURCES[0]],
      confidence: 0.86,
    };
  }

  if (normalized.includes("apply") || normalized.includes("admission")) {
    return {
      answer:
        "To apply, complete the online application form, upload the required documents, and follow any programme-specific steps listed on the admissions pages. Deadlines vary by programme and intake, so verify the current schedule on the official admissions page.",
      sources: [DEFAULT_SOURCES[0], DEFAULT_SOURCES[1]],
      confidence: 0.81,
    };
  }

  if (normalized.includes("document")) {
    return {
      answer:
        "Typical application documents include identification, education certificates or transcripts, a completed application form, and any programme-specific materials. Exact requirements can differ by programme, so confirm the checklist on the admissions page before submitting.",
      sources: [DEFAULT_SOURCES[0]],
      confidence: 0.78,
    };
  }

  if (normalized.includes("dean")) {
    return {
      answer:
        "Dean’s office locations and opening hours are published on the university contact and faculty pages. Visiting hours may change during examination periods, so check the linked source before your visit.",
      sources: [
        {
          title: "[Demo] University Offices and Contacts",
          url: "https://akademiata.pl/kontakt/",
          section: "Dean’s office",
          excerpt:
            "Demo data: Faculty dean’s offices publish location, phone, and reception hours on the contacts page.",
          sourceType: "website",
        },
      ],
      confidence: 0.72,
    };
  }

  if (normalized.includes("semester") || normalized.includes("begin")) {
    return {
      answer:
        "Semester start dates are published in the academic calendar. Exact dates can differ by programme and year of study, so confirm the current calendar entry for your intake.",
      sources: [
        {
          title: "[Demo] Academic Calendar",
          url: "https://akademiata.pl/",
          section: "Semester dates",
          excerpt:
            "Demo data: The academic calendar lists semester start and end dates, examination periods, and holidays.",
          sourceType: "website",
        },
      ],
      confidence: 0.8,
    };
  }

  if (normalized.includes("scholarship")) {
    return {
      answer:
        "ATA offers scholarships based on academic merit and financial need. Application windows and eligibility criteria are announced each semester on the student services pages. Review the scholarship guide and submit any required documentation before the deadline.",
      sources: [DEFAULT_SOURCES[2], DEFAULT_SOURCES[0]],
      confidence: 0.77,
    };
  }

  return {
    answer:
      "Based on indexed university sources, relevant information is available on the admissions, tuition, and student services pages. Review the linked sources for details that match your question, and contact the relevant university office for official confirmation when needed.",
    sources: DEFAULT_SOURCES.slice(0, 2),
    confidence: 0.64,
  };
}

type MockFeedbackEntry = {
  queryId: string;
  rating: "up" | "down";
  comment: string | null;
  feedbackId: string;
};

/** In-memory mock feedback store keyed by query_id (upsert semantics). */
const mockFeedbackByQueryId = new Map<string, MockFeedbackEntry>();

/**
 * Mock chat adapter used when NEXT_PUBLIC_USE_MOCK_API=true.
 * Keeps realistic latency and supports test queries for error / empty-source paths.
 */
export async function askMockChat(
  request: ChatRequest,
  options?: { signal?: AbortSignal },
): Promise<ChatResponse> {
  const started = performance.now();
  const waitMs = randomBetween(700, 1200);
  await delay(waitMs, options?.signal);

  const normalized = normalizeQuestion(request.question);
  const historyCount = request.history?.length ?? 0;
  const queryId = stableMockQueryId(request.question, historyCount);

  if (normalized === normalizeQuestion(MOCK_ERROR_QUERY)) {
    throw new ChatApiError("unavailable", getErrorMessage("unavailable"), 503);
  }

  if (normalized === normalizeQuestion(MOCK_NO_SOURCES_QUERY)) {
    return {
      answer:
        "I reviewed the indexed materials for this question, but no matching source pages were returned for citation. Please rephrase the question or contact the relevant university office directly.",
      sources: [],
      confidence: 0.42,
      latencyMs: Math.round(performance.now() - started),
      queryId,
    };
  }

  const scenario = buildScenario(request.question);
  const historySuffix =
    historyCount > 0
      ? ` I also considered ${historyCount} earlier message${historyCount === 1 ? "" : "s"} in this conversation.`
      : "";

  return {
    answer: `${scenario.answer}${historySuffix}`,
    sources: scenario.sources,
    confidence: scenario.confidence,
    latencyMs: Math.round(performance.now() - started),
    queryId,
  };
}

export async function submitMockFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  await delay(randomBetween(120, 280));
  const rating = assertValidFeedbackRating(request.rating);
  const queryId = request.queryId?.trim();
  if (!queryId) {
    throw new ChatApiError("invalid_response", getErrorMessage("invalid_response"));
  }

  const existing = mockFeedbackByQueryId.get(queryId);
  const feedbackId = existing?.feedbackId ?? `fb_mock_${queryId.slice(-12)}`;
  mockFeedbackByQueryId.set(queryId, {
    queryId,
    rating,
    comment: request.comment ?? null,
    feedbackId,
  });

  return { success: true, feedbackId };
}

/** Test helper — not used by UI. */
export function getMockFeedbackLog(): MockFeedbackEntry[] {
  return Array.from(mockFeedbackByQueryId.values());
}

export function clearMockFeedbackLog() {
  mockFeedbackByQueryId.clear();
}
