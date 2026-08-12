"use client";

import { RefreshCw } from "lucide-react";
import { CrawlHistoryTable } from "@/components/dashboard/crawl-history-table";
import { CrawlStatusBadge } from "@/components/dashboard/crawl-status-badge";
import { DashboardError } from "@/components/dashboard/dashboard-error";
import { RecentQuestionsTable } from "@/components/dashboard/recent-questions-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDashboard } from "@/hooks/use-dashboard";
import { getDashboardEnv } from "@/lib/config/dashboard-env";

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function DashboardPage() {
  const { data, isLoading, errorMessage, errorCode, refresh } = useDashboard();
  const env = getDashboardEnv();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Spinner className="h-6 w-6 text-[var(--primary)]" label="Loading dashboard" />
        <p className="text-sm text-[var(--muted-foreground)]">Loading dashboard metrics…</p>
      </div>
    );
  }

  if (errorMessage) {
    return <DashboardError message={errorMessage} code={errorCode} onRetry={() => void refresh()} />;
  }

  if (!data) {
    return (
      <DashboardError
        message="Dashboard data is unavailable."
        onRetry={() => void refresh()}
      />
    );
  }

  const { stats, crawlHistory, recentQuestions } = data;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Operations Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Crawl health, indexed content, and recent assistant activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {env.useMockDashboard ? (
            <span className="rounded border border-[var(--border)] bg-[var(--accent-soft)] px-2 py-1 text-xs font-medium text-[var(--accent)]">
              Demo data
            </span>
          ) : null}
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </div>

      <section aria-labelledby="dashboard-stats-heading">
        <h2 id="dashboard-stats-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard label="Total documents" value={formatNumber(stats.totalDocuments)} />
          <StatCard label="Total chunks" value={formatNumber(stats.totalChunks)} />
          <StatCard
            label="Crawl status"
            value={<CrawlStatusBadge status={stats.crawlStatus} />}
          />
          <StatCard
            label="Failed pages"
            value={formatNumber(stats.failedPages)}
            hint="Pages that could not be indexed during the last crawl"
          />
          <StatCard
            label="Last crawl"
            value={formatDateTime(stats.lastCrawlAt)}
          />
          <StatCard label="Total questions" value={formatNumber(stats.totalQuestions)} />
          <StatCard
            label="Avg response time"
            value={`${formatNumber(stats.avgResponseTimeMs)} ms`}
          />
          <StatCard
            label="Unanswered questions"
            value={formatNumber(stats.unansweredQuestions)}
            hint="Questions with no grounded answer in indexed sources"
          />
        </div>
      </section>

      <section aria-labelledby="crawl-history-heading" className="flex flex-col gap-3">
        <h2
          id="crawl-history-heading"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]"
        >
          Recent crawl history
        </h2>
        <CrawlHistoryTable entries={crawlHistory} />
      </section>

      <section aria-labelledby="recent-questions-heading" className="flex flex-col gap-3">
        <h2
          id="recent-questions-heading"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]"
        >
          Recent user questions
        </h2>
        <RecentQuestionsTable questions={recentQuestions} />
      </section>
    </div>
  );
}
