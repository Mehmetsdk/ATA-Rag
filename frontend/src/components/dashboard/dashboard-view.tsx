"use client";

import { useEffect, useState } from "react";
import {
  assertApiConfigured,
  buildDashboardStatsEndpoint,
} from "@/lib/config/env";

type DashboardStats = {
  totalQuestions: number;
  unansweredCount: number;
  unansweredRate: number;
  avgConfidence: number | null;
  avgLatencyMs: number | null;
  topQuestions: { question: string; count: number }[];
  unansweredQuestions: { question: string; createdAt: string }[];
  feedbackCounts: { up: number; down: number };
  recentQueries: {
    id: string;
    question: string;
    language: string;
    confidence: number | null;
    latencyMs: number | null;
    createdAt: string;
  }[];
  periodDays: number;
};

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const apiBaseUrl = assertApiConfigured();
        const res = await fetch(buildDashboardStatsEndpoint(apiBaseUrl));
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as DashboardStats;
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-[var(--muted-foreground)] font-serif">
          Loading dashboard…
        </p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-[var(--danger)] font-serif">
          {error ?? "Failed to load dashboard"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 bg-surface rounded-3xl shadow-sm p-4 sm:p-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)] font-serif">
          Last {stats.periodDays} days
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total questions"
          value={stats.totalQuestions.toString()}
        />
        <StatCard
          label="Unanswered"
          value={`${stats.unansweredCount} (${stats.unansweredRate}%)`}
        />
        <StatCard
          label="Avg confidence"
          value={
            stats.avgConfidence !== null ? stats.avgConfidence.toFixed(2) : "—"
          }
        />
        <StatCard
          label="Avg latency"
          value={stats.avgLatencyMs !== null ? `${stats.avgLatencyMs}ms` : "—"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="👍 Helpful"
          value={stats.feedbackCounts.up.toString()}
        />
        <StatCard
          label="👎 Not helpful"
          value={stats.feedbackCounts.down.toString()}
        />
      </div>

      <Section title="Top questions">
        <ul className="flex flex-col gap-2">
          {stats.topQuestions.map((item, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-serif"
            >
              <span className="min-w-0 truncate text-[var(--foreground)]">
                {item.question}
              </span>
              <span className="shrink-0 text-[var(--muted-foreground)]">
                {item.count}×
              </span>
            </li>
          ))}
          {stats.topQuestions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] font-serif">
              No data yet.
            </p>
          ) : null}
        </ul>
      </Section>

      <Section title="Unanswered questions">
        <ul className="flex flex-col gap-2">
          {stats.unansweredQuestions.map((item, i) => (
            <li
              key={i}
              className="rounded-md border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm font-serif text-[var(--foreground)]"
            >
              {item.question}
            </li>
          ))}
          {stats.unansweredQuestions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] font-serif">
              No unanswered questions in this period.
            </p>
          ) : null}
        </ul>
      </Section>

      <Section title="Recent queries">
        <div className="flex flex-col gap-2">
          {stats.recentQueries.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-xs font-serif"
            >
              <span className="min-w-0 flex-1 truncate text-[var(--foreground)]">
                {item.question}
              </span>
              <span className="shrink-0 text-[var(--muted-foreground)]">
                {item.confidence !== null ? item.confidence.toFixed(2) : "—"} ·{" "}
                {item.latencyMs ?? "—"}ms
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--border)] px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] font-serif">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] font-serif">
        {title}
      </h2>
      {children}
    </div>
  );
}
