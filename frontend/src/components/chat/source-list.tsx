"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SourceItem } from "@/components/chat/source-item";
import { Button } from "@/components/ui/button";
import type { SourceReference } from "@/types/chat";

type SourceListProps = {
  sources: SourceReference[];
  /** When true, label sources as demo/mock data. */
  demo?: boolean;
};

const COLLAPSE_THRESHOLD = 2;

export function SourceList({ sources, demo = false }: SourceListProps) {
  const [expanded, setExpanded] = useState(sources.length <= COLLAPSE_THRESHOLD);

  if (sources.length === 0) return null;

  const visibleSources = expanded ? sources : sources.slice(0, COLLAPSE_THRESHOLD);
  const hiddenCount = sources.length - visibleSources.length;

  return (
    <section className="mt-3 min-w-0" aria-label={demo ? "Demo sources" : "Sources"}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {demo ? "Demo sources" : "Sources"}
          <span className="ml-1.5 font-normal normal-case tracking-normal">
            ({sources.length})
          </span>
        </h3>
        {sources.length > COLLAPSE_THRESHOLD ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                Show less
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            ) : (
              <>
                Show all
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </Button>
        ) : null}
      </div>

      {demo ? (
        <p className="mb-2 text-xs text-[var(--muted-foreground)]">
          These links are illustrative demo data, not live university search results.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {visibleSources.map((source, index) => (
          <SourceItem key={`${source.url}-${index}`} source={source} index={index} />
        ))}
      </ul>

      {!expanded && hiddenCount > 0 ? (
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          +{hiddenCount} more source{hiddenCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </section>
  );
}
