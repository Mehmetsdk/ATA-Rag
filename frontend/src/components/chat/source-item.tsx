import { ExternalLink, FileText, Globe } from "lucide-react";
import { hostnameFromUrl, sanitizeHttpUrl } from "@/lib/api/chat-mapper";
import type { SourceReference } from "@/types/chat";

type SourceItemProps = {
  source: SourceReference;
  index: number;
};

export function SourceItem({ source, index }: SourceItemProps) {
  const safeUrl = sanitizeHttpUrl(source.url);
  if (!safeUrl) return null;

  const hostname = hostnameFromUrl(safeUrl);
  const isPdf =
    source.sourceType === "pdf" || safeUrl.toLowerCase().endsWith(".pdf");

  return (
    <li className="min-w-0">
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex min-w-0 gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition-colors hover:border-[var(--primary)]/40 hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        aria-label={`Source ${index + 1}: ${source.title} (opens in a new tab)`}
      >
        <span
          className="mt-0.5 shrink-0 text-[var(--muted-foreground)]"
          aria-hidden="true"
        >
          {isPdf ? (
            <FileText className="h-4 w-4" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-[var(--foreground)] break-words [overflow-wrap:anywhere] font-serif">
              {source.title}
            </span>
            <ExternalLink
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] opacity-70 group-hover:opacity-100"
              aria-hidden="true"
            />
          </span>
          {hostname ? (
            <span className="mt-0.5 block text-xs text-[var(--muted-foreground)] break-all font-serif">
              {hostname}
            </span>
          ) : null}
          {source.section ? (
            <span className="mt-1 block text-xs text-[var(--muted-foreground)] break-words font-serif">
              Section: {source.section}
            </span>
          ) : null}
          {source.excerpt ? (
            <span className="mt-1 block text-xs leading-relaxed text-[var(--muted-foreground)] line-clamp-2 break-words font-serif">
              {source.excerpt}
            </span>
          ) : null}
        </span>
      </a>
    </li>
  );
}
