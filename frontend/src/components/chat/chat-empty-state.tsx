type ChatEmptyStateProps = {
  compact?: boolean;
};

export function ChatEmptyState({ compact = false }: ChatEmptyStateProps) {
  if (compact) {
    return (
      <div className="mb-2 min-w-0">
        <p className="text-sm text-[var(--muted-foreground)] break-words">
          Answers are generated from indexed university pages and documents.
        </p>
      </div>
    );
  }

  return (
    <section
      className="flex min-w-0 flex-1 flex-col justify-center py-6 sm:py-10"
      aria-labelledby="empty-title"
    >
      <div className="mx-auto max-w-xl text-center">
        <h1
          id="empty-title"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl"
        >
          Ask about the university
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">
          Get information about admissions, tuition, study programmes, university offices,
          regulations, scholarships, and student services.
        </p>
        <p className="mt-4 text-xs text-[var(--muted-foreground)] sm:text-sm">
          Answers are generated from indexed university pages and documents.
        </p>
      </div>
    </section>
  );
}
