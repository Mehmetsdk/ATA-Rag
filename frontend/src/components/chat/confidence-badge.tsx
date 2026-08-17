import { confidenceLabel, mapConfidenceLevel } from "@/lib/api/chat-mapper";

type ConfidenceBadgeProps = {
  confidence?: number | null;
};

const colorClasses = {
  high: "text-[var(--success)]",
  medium: "text-[var(--warning)]",
  low: "text-[var(--danger)]",
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const level = mapConfidenceLevel(confidence ?? null);
  if (!level) return null;
  const colorClass =
    level === "high"
      ? colorClasses.high
      : level === "medium"
        ? colorClasses.medium
        : colorClasses.low;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-serif font-medium ${colorClass}`}
      aria-label={`Confidence: ${confidenceLabel(level)}`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current"
      />
      {confidenceLabel(level)}
    </span>
  );
}
