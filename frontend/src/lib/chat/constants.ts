export const PRODUCT_NAME = "ATA University Assistant";
export const PRODUCT_SUBTITLE = "Official information from university sources";

export const DEFAULT_LANGUAGE = "en";

export const COMPOSER_PLACEHOLDER =
  "Ask about admissions, tuition, programmes, offices, or university regulations…";

export const MAX_QUESTION_LENGTH = 1500;
export const CHARACTER_COUNTER_THRESHOLD = 1200;

export const REQUEST_TIMEOUT_MS = 30_000;

export const SUGGESTED_QUESTIONS = [
  "How do I apply?",
  "What documents are required?",
  "How much is Computer Science tuition?",
  "Where is the dean's office?",
  "When does the semester begin?",
  "What scholarships are available?",
] as const;

export const LOADING_STAGES = [
  "Searching university sources…",
  "Reviewing relevant pages…",
  "Preparing a grounded answer…",
] as const;

/** Mock-only test queries */
export const MOCK_ERROR_QUERY = "trigger error";
export const MOCK_NO_SOURCES_QUERY = "question with no sources";

export const EMPTY_ANSWER_MESSAGE =
  "I could not find a reliable answer in the indexed university sources.";

export const FOOTER_DISCLAIMER =
  "This assistant uses indexed university sources. For official decisions, verify the linked source or contact the relevant university office.";
