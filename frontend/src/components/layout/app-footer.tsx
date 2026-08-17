import { FOOTER_DISCLAIMER } from "@/lib/chat/constants";

export function AppFooter() {
  return (
    <footer>
      <div className="mx-auto w-full max-w-3xl px-4 py-3 sm:px-6">
        <p className="text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
          {FOOTER_DISCLAIMER}
        </p>
      </div>
    </footer>
  );
}
