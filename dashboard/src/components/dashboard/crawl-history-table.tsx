import type { CrawlHistoryEntry } from "@/types/dashboard";
import { CrawlStatusBadge } from "@/components/dashboard/crawl-status-badge";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type CrawlHistoryTableProps = {
  entries: CrawlHistoryEntry[];
};

export function CrawlHistoryTable({ entries }: CrawlHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">No crawl history available yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
          <tr>
            <th className="px-4 py-3 font-medium">Started</th>
            <th className="px-4 py-3 font-medium">Finished</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Pages</th>
            <th className="px-4 py-3 font-medium">Failed</th>
            <th className="px-4 py-3 font-medium">Chunks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-4 py-3 text-[var(--foreground)]">{formatDateTime(entry.startedAt)}</td>
              <td className="px-4 py-3 text-[var(--muted-foreground)]">
                {formatDateTime(entry.finishedAt)}
              </td>
              <td className="px-4 py-3">
                <CrawlStatusBadge status={entry.status} />
              </td>
              <td className="px-4 py-3 tabular-nums">{entry.pagesCrawled}</td>
              <td className="px-4 py-3 tabular-nums">{entry.pagesFailed}</td>
              <td className="px-4 py-3 tabular-nums">{entry.chunksProduced}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
