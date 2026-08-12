import type { CrawlStatus } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<CrawlStatus, string> = {
  idle: "Idle",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const STATUS_VARIANTS: Record<CrawlStatus, "neutral" | "success" | "warning" | "danger"> = {
  idle: "neutral",
  running: "warning",
  completed: "success",
  failed: "danger",
};

type CrawlStatusBadgeProps = {
  status: CrawlStatus;
};

export function CrawlStatusBadge({ status }: CrawlStatusBadgeProps) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}
