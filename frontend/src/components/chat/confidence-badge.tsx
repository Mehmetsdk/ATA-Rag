import { confidenceLabel, mapConfidenceLevel } from "@/lib/api/chat-mapper";
import { Badge } from "@/components/ui/badge";

type ConfidenceBadgeProps = {
  confidence?: number | null;
};

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const level = mapConfidenceLevel(confidence ?? null);
  if (!level) return null;

  const variant = level === "high" ? "success" : level === "medium" ? "warning" : "danger";

  return (
    <Badge variant={variant} aria-label={`Confidence: ${confidenceLabel(level)}`}>
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current"
      />
      {confidenceLabel(level)}
    </Badge>
  );
}
