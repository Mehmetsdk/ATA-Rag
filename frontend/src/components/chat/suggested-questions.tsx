import { SUGGESTED_QUESTIONS } from "@/lib/chat/constants";
import { cn } from "@/lib/utils/cn";

type SuggestedQuestionsProps = {
  onSelect: (question: string) => void;
  disabled?: boolean;
  /** Per-question disable (e.g. consecutive duplicate prevention). */
  isQuestionDisabled?: (question: string) => boolean;
  className?: string;
};

export function SuggestedQuestions({
  onSelect,
  disabled = false,
  isQuestionDisabled,
  className,
}: SuggestedQuestionsProps) {
  return (
    <section className={cn("min-w-0 space-y-2", className)} aria-label="Suggested questions">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        Suggested questions
      </h2>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((question) => {
          const questionDisabled = disabled || Boolean(isQuestionDisabled?.(question));

          return (
            <button
              key={question}
              type="button"
              disabled={questionDisabled}
              onClick={() => onSelect(question)}
              className={cn(
                "max-w-full min-h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm text-[var(--foreground)] break-words",
                "transition-colors hover:border-[var(--primary)]/35 hover:bg-[var(--surface-muted)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {question}
            </button>
          );
        })}
      </div>
    </section>
  );
}
