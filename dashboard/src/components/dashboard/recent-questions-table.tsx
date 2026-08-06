import type { RecentQuestion } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatConfidence(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

type RecentQuestionsTableProps = {
  questions: RecentQuestion[];
};

export function RecentQuestionsTable({ questions }: RecentQuestionsTableProps) {
  if (questions.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">No recent questions recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
          <tr>
            <th className="px-4 py-3 font-medium">Question</th>
            <th className="px-4 py-3 font-medium">Asked</th>
            <th className="px-4 py-3 font-medium">Answered</th>
            <th className="px-4 py-3 font-medium">Response</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
          {questions.map((entry) => (
            <tr key={entry.id}>
              <td className="max-w-xs px-4 py-3 text-[var(--foreground)]">
                <span className="line-clamp-2">{entry.question}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-[var(--muted-foreground)]">
                {formatDateTime(entry.askedAt)}
              </td>
              <td className="px-4 py-3">
                <Badge variant={entry.answered ? "success" : "danger"}>
                  {entry.answered ? "Yes" : "No"}
                </Badge>
              </td>
              <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                {entry.responseTimeMs !== null ? `${entry.responseTimeMs} ms` : "—"}
              </td>
              <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">
                {formatConfidence(entry.confidence)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
