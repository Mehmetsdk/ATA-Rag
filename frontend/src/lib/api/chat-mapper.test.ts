import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertValidFeedbackRating,
  dedupeSources,
  mapChatResponse,
  mapConfidenceLevel,
  mapFeedbackResponse,
  sanitizeHttpUrl,
} from "./chat-mapper";
import { ChatApiError } from "./chat-errors";
import {
  buildChatEndpoint,
  buildFeedbackEndpoint,
  normalizeApiBaseUrl,
  parseEnvBoolean,
} from "../config/env";
import { normalizeQuestion, isBlankQuestion } from "../chat/normalize-question";
import {
  MAX_HISTORY_CONTENT_LENGTH,
  MAX_HISTORY_MESSAGES,
} from "../chat/constants";
import { buildChatHistory, buildRetryHistory } from "../chat/history";
import { canSubmitFeedback, resolveFeedbackRetryRating } from "../chat/feedback-state";
import { __contractHelpers } from "./chat-client";
import {
  askMockChat,
  clearMockFeedbackLog,
  getMockFeedbackLog,
  stableMockQueryId,
  submitMockFeedback,
} from "./mock-chat-client";
import type { ChatMessage } from "../../types/chat";

function msg(
  partial: Partial<ChatMessage> & Pick<ChatMessage, "id" | "role" | "content">,
): ChatMessage {
  return {
    createdAt: "2026-01-01T00:00:00Z",
    status: "complete",
    ...partial,
  };
}

describe("mapChatResponse", () => {
  it("maps a valid snake_case payload including query_id", () => {
    const result = mapChatResponse({
      answer: "Tuition details are published on the fees page.",
      sources: [
        {
          title: "Tuition",
          url: "https://akademiata.pl/kalkulator-czesnego/",
          section: "Fees",
          excerpt: "Annual fees vary by programme.",
          source_type: "website",
        },
      ],
      confidence: 0.84,
      latency_ms: 1430,
      query_id: "q-123",
    });

    assert.equal(result.answer, "Tuition details are published on the fees page.");
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0]?.sourceType, "website");
    assert.equal(result.confidence, 0.84);
    assert.equal(result.latencyMs, 1430);
    assert.equal(result.queryId, "q-123");
  });

  it("rejects missing, empty, or whitespace query_id", () => {
    for (const query_id of [undefined, null, "", "   "]) {
      assert.throws(
        () =>
          mapChatResponse({
            answer: "ok",
            sources: [],
            confidence: 0.5,
            latency_ms: 10,
            query_id,
          }),
        ChatApiError,
      );
    }
  });

  it("rejects null, arrays, strings, and non-objects", () => {
    for (const raw of [null, [], "html", 42, true]) {
      assert.throws(() => mapChatResponse(raw), ChatApiError);
    }
  });

  it("tolerates missing optional fields and non-array sources", () => {
    const result = mapChatResponse({
      answer: "A grounded answer.",
      sources: "not-an-array",
      confidence: null,
      latency_ms: undefined,
      query_id: "qid-1",
    });

    assert.equal(result.answer, "A grounded answer.");
    assert.deepEqual(result.sources, []);
    assert.equal(result.confidence, null);
    assert.equal(result.latencyMs, null);
    assert.equal(result.queryId, "qid-1");
  });

  it("drops malformed source objects and unsafe URLs", () => {
    const result = mapChatResponse({
      answer: "Answer with mixed sources.",
      query_id: "qid-2",
      sources: [
        null,
        "string-source",
        { title: "No URL" },
        { title: "Bad", url: "javascript:alert(1)" },
        { title: "Good", url: "https://akademiata.pl/ok" },
        { title: "Dup", url: "https://akademiata.pl/ok/" },
      ],
    });

    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0]?.url, "https://akademiata.pl/ok");
  });

  it("allows empty answer strings (caller enforces empty_answer)", () => {
    const result = mapChatResponse({ answer: "   ", sources: [], query_id: "qid-3" });
    assert.equal(result.answer, "");
  });
});

describe("mapFeedbackResponse", () => {
  it("maps success and feedback_id", () => {
    assert.deepEqual(mapFeedbackResponse({ success: true, feedback_id: "fb-1" }), {
      success: true,
      feedbackId: "fb-1",
    });
  });

  it("rejects invalid feedback responses", () => {
    assert.throws(() => mapFeedbackResponse({ ok: true }), ChatApiError);
    assert.throws(() => mapFeedbackResponse({ success: false, feedback_id: "x" }), ChatApiError);
    assert.throws(() => mapFeedbackResponse({ success: true }), ChatApiError);
    assert.throws(() => mapFeedbackResponse({ success: true, feedback_id: "  " }), ChatApiError);
    assert.throws(() => mapFeedbackResponse(null), ChatApiError);
  });
});

describe("assertValidFeedbackRating", () => {
  it("accepts up and down only", () => {
    assert.equal(assertValidFeedbackRating("up"), "up");
    assert.equal(assertValidFeedbackRating("down"), "down");
    assert.throws(() => assertValidFeedbackRating("sideways"), ChatApiError);
    assert.throws(() => assertValidFeedbackRating(null), ChatApiError);
  });
});

describe("sanitizeHttpUrl", () => {
  it("accepts http and https only", () => {
    assert.equal(sanitizeHttpUrl("https://akademiata.pl/a"), "https://akademiata.pl/a");
    assert.equal(sanitizeHttpUrl("http://akademiata.pl/a"), "http://akademiata.pl/a");
    assert.equal(sanitizeHttpUrl("javascript:alert(1)"), null);
    assert.equal(sanitizeHttpUrl("data:text/html,hi"), null);
    assert.equal(sanitizeHttpUrl("/relative"), null);
    assert.equal(sanitizeHttpUrl("not a url"), null);
  });
});

describe("confidence and latency normalization", () => {
  it("maps confidence bands and rejects out-of-range values", () => {
    assert.equal(mapConfidenceLevel(0.9), "high");
    assert.equal(mapConfidenceLevel(0.5), "medium");
    assert.equal(mapConfidenceLevel(0.49), "low");
    assert.equal(mapConfidenceLevel(1.2), null);
    assert.equal(mapConfidenceLevel(-0.1), null);
    assert.equal(mapConfidenceLevel(null), null);

    const mapped = mapChatResponse({
      answer: "x",
      confidence: 1.5,
      latency_ms: -10,
      query_id: "qid",
    });
    assert.equal(mapped.confidence, null);
    assert.equal(mapped.latencyMs, null);
  });

  it("keeps valid non-negative latency", () => {
    const mapped = mapChatResponse({
      answer: "x",
      latency_ms: "1200",
      query_id: "qid",
    });
    assert.equal(mapped.latencyMs, 1200);
  });
});

describe("dedupeSources", () => {
  it("removes duplicate URLs ignoring trailing slashes and case", () => {
    const result = dedupeSources([
      { title: "A", url: "https://Akademiata.pl/path/" },
      { title: "B", url: "https://akademiata.pl/path" },
      { title: "C", url: "https://akademiata.pl/other" },
    ]);

    assert.equal(result.length, 2);
    assert.equal(result[0]?.title, "A");
    assert.equal(result[1]?.title, "C");
  });
});

describe("normalizeQuestion", () => {
  it("trims, collapses whitespace, and lowercases", () => {
    assert.equal(normalizeQuestion("  How   do I Apply? "), "how do i apply?");
    assert.equal(isBlankQuestion("   "), true);
    assert.equal(isBlankQuestion("ok"), false);
  });
});

describe("environment helpers", () => {
  it("parses boolean flags intentionally", () => {
    assert.equal(parseEnvBoolean(undefined), false);
    assert.equal(parseEnvBoolean(""), false);
    assert.equal(parseEnvBoolean("false"), false);
    assert.equal(parseEnvBoolean("0"), false);
    assert.equal(parseEnvBoolean("no"), false);
    assert.equal(parseEnvBoolean("true"), true);
    assert.equal(parseEnvBoolean("TRUE"), true);
    assert.equal(parseEnvBoolean("1"), true);
    assert.equal(parseEnvBoolean(" yes "), true);
  });

  it("normalizes API base URLs and builds single-slash chat/feedback endpoints", () => {
    assert.equal(normalizeApiBaseUrl("http://localhost:8000/"), "http://localhost:8000");
    assert.equal(
      buildChatEndpoint("http://localhost:8000/"),
      "http://localhost:8000/api/chat",
    );
    assert.equal(
      buildFeedbackEndpoint("http://localhost:8000/"),
      "http://localhost:8000/api/feedback",
    );
    assert.doesNotMatch(buildChatEndpoint("http://localhost:8000///"), /\/\/api\/chat/);
  });
});

describe("API wire contract (CONTRACTS.md §3)", () => {
  it("serializes chat requests with question, language, and history", () => {
    const wire = __contractHelpers.toWireChatBody({
      question: "How much is Computer Science tuition?",
      language: "en",
      history: [
        { role: "user", content: "How do I apply?" },
        { role: "assistant", content: "Complete the online form." },
      ],
    });

    assert.deepEqual(wire, {
      question: "How much is Computer Science tuition?",
      language: "en",
      history: [
        { role: "user", content: "How do I apply?" },
        { role: "assistant", content: "Complete the online form." },
      ],
    });
  });

  it("defaults missing history to an empty array on the wire", () => {
    const wire = __contractHelpers.toWireChatBody({
      question: "Hello",
      language: "en",
    });
    assert.deepEqual(wire.history, []);
  });

  it("serializes feedback requests with query_id only (no message/question/answer)", () => {
    const wire = __contractHelpers.toWireFeedbackBody({
      queryId: "backend-query-id",
      rating: "up",
      comment: null,
    });

    assert.deepEqual(wire, {
      query_id: "backend-query-id",
      rating: "up",
      comment: null,
    });
    assert.equal("message_id" in wire, false);
    assert.equal("question" in wire, false);
    assert.equal("answer" in wire, false);
  });

  it("rejects invalid feedback ratings at wire time", () => {
    assert.throws(
      () =>
        __contractHelpers.toWireFeedbackBody({
          queryId: "q",
          rating: "sideways" as "up",
        }),
      ChatApiError,
    );
  });
});

describe("buildChatHistory", () => {
  it("includes only completed non-empty user/assistant turns", () => {
    const messages: ChatMessage[] = [
      msg({ id: "1", role: "user", content: "How do I apply?" }),
      msg({ id: "2", role: "assistant", content: "Complete the form." }),
      msg({ id: "3", role: "assistant", content: "", status: "pending" }),
      msg({ id: "4", role: "assistant", content: "Error", status: "error" }),
    ];

    assert.deepEqual(buildChatHistory(messages), [
      { role: "user", content: "How do I apply?" },
      { role: "assistant", content: "Complete the form." },
    ]);
  });

  it("keeps at most the latest 8 valid history messages", () => {
    const messages: ChatMessage[] = [];
    for (let i = 0; i < 12; i += 1) {
      messages.push(
        msg({
          id: `m${i}`,
          role: i % 2 === 0 ? "user" : "assistant",
          content: `msg-${i}`,
        }),
      );
    }
    const history = buildChatHistory(messages);
    assert.equal(history.length, MAX_HISTORY_MESSAGES);
    assert.equal(history[0]?.content, "msg-4");
    assert.equal(history[7]?.content, "msg-11");
  });

  it("truncates overlong history content", () => {
    const long = "x".repeat(MAX_HISTORY_CONTENT_LENGTH + 50);
    const history = buildChatHistory([
      msg({ id: "1", role: "user", content: long }),
    ]);
    assert.equal(history[0]?.content.length, MAX_HISTORY_CONTENT_LENGTH);
  });

  it("returns empty history for first question", () => {
    assert.deepEqual(buildChatHistory([]), []);
  });
});

describe("buildRetryHistory", () => {
  it("excludes the failed/current turn so the question is not duplicated", () => {
    const messages: ChatMessage[] = [
      msg({ id: "u1", role: "user", content: "How do I apply?" }),
      msg({ id: "a1", role: "assistant", content: "Complete the form." }),
      msg({ id: "u2", role: "user", content: "Tuition?" }),
      msg({ id: "a2", role: "assistant", content: "Failed", status: "error" }),
    ];
    assert.deepEqual(buildRetryHistory(messages, "a2"), [
      { role: "user", content: "How do I apply?" },
      { role: "assistant", content: "Complete the form." },
    ]);
  });
});

describe("reset semantics (history helpers)", () => {
  it("clears conversation context when message list is empty", () => {
    assert.deepEqual(buildChatHistory([]), []);
    assert.deepEqual(buildRetryHistory([], "missing"), []);
  });
});

describe("feedback state helpers", () => {
  const base = msg({
    id: "a1",
    role: "assistant",
    content: "Answer",
    queryId: "q-1",
    status: "complete",
  });

  it("prevents duplicate requests while pending", () => {
    assert.equal(canSubmitFeedback({ ...base, feedbackPending: true }, "up"), false);
  });

  it("allows changing up to down after success", () => {
    assert.equal(canSubmitFeedback({ ...base, feedbackRating: "up" }, "down"), true);
    assert.equal(canSubmitFeedback({ ...base, feedbackRating: "up" }, "up"), false);
  });

  it("allows retry after feedback error", () => {
    assert.equal(
      canSubmitFeedback({ ...base, feedbackRating: "up", feedbackError: "fail" }, "up"),
      true,
    );
    assert.equal(
      resolveFeedbackRetryRating({ ...base, feedbackLastAttempt: "down" }),
      "down",
    );
  });

  it("requires assistant complete with queryId", () => {
    assert.equal(canSubmitFeedback({ ...base, queryId: null }, "up"), false);
    assert.equal(canSubmitFeedback({ ...base, status: "pending" }, "up"), false);
    assert.equal(canSubmitFeedback(msg({ id: "u", role: "user", content: "q" }), "up"), false);
  });
});

describe("mock chat client", () => {
  it("uses akademiata.pl source URLs only (never ata.edu.pl or akademiata.edu.pl)", async () => {
    const response = await askMockChat({
      question: "How much is Computer Science tuition?",
      language: "en",
      history: [],
    });

    assert.ok(response.sources.length > 0);
    assert.ok(response.queryId);
    for (const source of response.sources) {
      assert.match(source.url, /^https:\/\/akademiata\.pl\b/);
      assert.doesNotMatch(source.url, /ata\.edu\.pl/);
      assert.doesNotMatch(source.url, /akademiata\.edu\.pl/);
    }
  });

  it("returns stable valid query IDs for identical inputs", async () => {
    const a = stableMockQueryId("Tuition?", 0);
    const b = stableMockQueryId("Tuition?", 0);
    const c = stableMockQueryId("Tuition?", 2);
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(a, /^[0-9a-z-]{36}$/i);
  });

  it("reflects conversation history in the mock answer", async () => {
    const response = await askMockChat({
      question: "What documents are required?",
      language: "en",
      history: [
        { role: "user", content: "How do I apply?" },
        { role: "assistant", content: "Complete the online form." },
      ],
    });

    assert.match(response.answer, /2 earlier messages/i);
    assert.ok(response.queryId);
  });

  it("records mock feedback by query_id and upserts on change", async () => {
    clearMockFeedbackLog();
    const queryId = "mock-query-1";
    const first = await submitMockFeedback({
      queryId,
      rating: "up",
      comment: null,
    });
    assert.deepEqual(first, { success: true, feedbackId: first.feedbackId });

    const second = await submitMockFeedback({
      queryId,
      rating: "down",
      comment: null,
    });
    assert.equal(second.feedbackId, first.feedbackId);
    assert.equal(getMockFeedbackLog().length, 1);
    assert.equal(getMockFeedbackLog()[0]?.rating, "down");
    clearMockFeedbackLog();
  });
});
