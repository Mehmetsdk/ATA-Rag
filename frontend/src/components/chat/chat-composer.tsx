"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  CHARACTER_COUNTER_THRESHOLD,
  COMPOSER_PLACEHOLDER,
  MAX_QUESTION_LENGTH,
} from "@/lib/chat/constants";
import { cn } from "@/lib/utils/cn";

type ChatComposerProps = {
  onSubmit: (question: string) => void | Promise<void>;
  disabled?: boolean;
  canSubmit: (question: string) => boolean;
  placeholder?: string;
};

export function ChatComposer({
  onSubmit,
  disabled = false,
  canSubmit,
  placeholder = COMPOSER_PLACEHOLDER,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const submittingRef = useRef(false);
  const labelId = useId();
  const helpId = useId();

  const remaining = MAX_QUESTION_LENGTH - value.length;
  const showCounter = value.length >= CHARACTER_COUNTER_THRESHOLD;
  const submitEnabled =
    !disabled && canSubmit(value) && value.length <= MAX_QUESTION_LENGTH;

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [value]);

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (
      disabled ||
      submittingRef.current ||
      !canSubmit(value) ||
      value.length > MAX_QUESTION_LENGTH
    ) {
      return;
    }

    const question = value.trim();
    if (!question) return;

    submittingRef.current = true;
    setValue("");

    try {
      await onSubmit(question);
    } finally {
      submittingRef.current = false;
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 z-10 min-w-0 border-t border-[var(--border)] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-sm)] focus-within:border-[var(--focus-accent)]/50 focus-within:ring-2 focus-within:ring-[var(--focus-accent)]">
        <label id={labelId} htmlFor="chat-question" className="sr-only">
          Ask a question about the university
        </label>
        <Textarea
          ref={textareaRef}
          id="chat-question"
          name="question"
          aria-labelledby={labelId}
          aria-describedby={helpId}
          aria-busy={disabled || undefined}
          value={value}
          onChange={(event) =>
            setValue(event.target.value.slice(0, MAX_QUESTION_LENGTH))
          }
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="chat-textarea min-h-[44px] max-w-full border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0 focus-visible:border-0"
        />
        <div className="mt-1 flex min-w-0 items-center justify-between gap-3 px-1">
          <p
            id={helpId}
            className="min-w-0 text-xs text-[var(--muted-foreground)] break-words"
          >
            Enter to send · Shift+Enter for a new line
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {showCounter ? (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  remaining <= 50
                    ? "text-[var(--danger)]"
                    : "text-[var(--muted-foreground)]",
                )}
              >
                {value.length}/{MAX_QUESTION_LENGTH}
              </span>
            ) : null}
            <Button
              type="submit"
              size="icon"
              variant="accent"
              disabled={!submitEnabled}
              aria-label={disabled ? "Sending question" : "Send question"}
            >
              {disabled ? (
                <Spinner
                  className="text-[var(--primary-foreground)]"
                  label="Sending"
                />
              ) : (
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
