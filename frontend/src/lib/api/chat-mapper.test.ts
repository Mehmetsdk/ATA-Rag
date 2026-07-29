import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dedupeSources,
  mapChatResponse,
  mapConfidenceLevel,
  sanitizeHttpUrl,
} from "./chat-mapper";
import { ChatApiError } from "./chat-errors";
import {
  buildChatEndpoint,
  normalizeApiBaseUrl,
  parseEnvBoolean,
} from "../config/env";
import { normalizeQuestion, isBlankQuestion } from "../chat/normalize-question";

describe("mapChatResponse", () => {
  it("maps a valid snake_case payload to camelCase domain types", () => {
    const result = mapChatResponse({
      answer: "Tuition details are published on the fees page.",
      sources: [
        {
          title: "Tuition",
          url: "https://example.edu/tuition/",
          section: "Fees",
          excerpt: "Annual fees vary by programme.",
          source_type: "website",
        },
      ],
      confidence: 0.84,
      latency_ms: 1430,
    });

    assert.equal(result.answer, "Tuition details are published on the fees page.");
    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0]?.sourceType, "website");
    assert.equal(result.confidence, 0.84);
    assert.equal(result.latencyMs, 1430);
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
    });

    assert.equal(result.answer, "A grounded answer.");
    assert.deepEqual(result.sources, []);
    assert.equal(result.confidence, null);
    assert.equal(result.latencyMs, null);
  });

  it("drops malformed source objects and unsafe URLs", () => {
    const result = mapChatResponse({
      answer: "Answer with mixed sources.",
      sources: [
        null,
        "string-source",
        { title: "No URL" },
        { title: "Bad", url: "javascript:alert(1)" },
        { title: "Good", url: "https://example.edu/ok" },
        { title: "Dup", url: "https://example.edu/ok/" },
      ],
    });

    assert.equal(result.sources.length, 1);
    assert.equal(result.sources[0]?.url, "https://example.edu/ok");
  });

  it("allows empty answer strings (caller enforces empty_answer)", () => {
    const result = mapChatResponse({ answer: "   ", sources: [] });
    assert.equal(result.answer, "");
  });
});

describe("sanitizeHttpUrl", () => {
  it("accepts http and https only", () => {
    assert.equal(sanitizeHttpUrl("https://example.edu/a"), "https://example.edu/a");
    assert.equal(sanitizeHttpUrl("http://example.edu/a"), "http://example.edu/a");
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
    });
    assert.equal(mapped.confidence, null);
    assert.equal(mapped.latencyMs, null);
  });

  it("keeps valid non-negative latency", () => {
    const mapped = mapChatResponse({
      answer: "x",
      latency_ms: "1200",
    });
    assert.equal(mapped.latencyMs, 1200);
  });
});

describe("dedupeSources", () => {
  it("removes duplicate URLs ignoring trailing slashes and case", () => {
    const result = dedupeSources([
      { title: "A", url: "https://Example.edu/path/" },
      { title: "B", url: "https://example.edu/path" },
      { title: "C", url: "https://example.edu/other" },
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

  it("normalizes API base URLs and builds a single-slash chat endpoint", () => {
    assert.equal(normalizeApiBaseUrl("http://localhost:8000/"), "http://localhost:8000");
    assert.equal(normalizeApiBaseUrl("http://localhost:8000///"), "http://localhost:8000");
    assert.equal(normalizeApiBaseUrl("ftp://localhost:8000"), null);
    assert.equal(normalizeApiBaseUrl(""), null);

    assert.equal(
      buildChatEndpoint("http://localhost:8000/"),
      "http://localhost:8000/api/chat",
    );
    assert.equal(
      buildChatEndpoint("https://api.example.edu"),
      "https://api.example.edu/api/chat",
    );
    assert.doesNotMatch(buildChatEndpoint("http://localhost:8000///"), /\/\/api\/chat/);
  });
});
