/**
 * Normalize a question for duplicate detection and mock routing.
 */
export function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isBlankQuestion(question: string): boolean {
  return question.trim().length === 0;
}
