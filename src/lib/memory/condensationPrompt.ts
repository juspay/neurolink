import type {
  CondensationPlaceholder,
  CondensationPromptValidation,
} from "../types/index.js";

/**
 * Placeholders `@juspay/hippocampus` substitutes into a condensation prompt
 * (`replaceAll` in `Hippocampus.add()`). None is required by Hippocampus
 * itself — a missing one simply stays literal — which is exactly why the
 * two structural ones must be checked here: a prompt without
 * `{{NEW_CONTENT}}` produces a memory that never grows, and one without
 * `{{OLD_MEMORY}}` overwrites the whole summary on every turn. Both fail
 * silently at the LLM boundary.
 */
const CONDENSATION_PLACEHOLDERS: readonly CondensationPlaceholder[] = [
  "OLD_MEMORY",
  "NEW_CONTENT",
  "MAX_WORDS",
];

const FATAL_PLACEHOLDERS: ReadonlySet<CondensationPlaceholder> = new Set([
  "OLD_MEMORY",
  "NEW_CONTENT",
]);

/**
 * Check a condensation prompt template for the placeholders Hippocampus
 * expects. Pure — never logs or throws. `valid` is false only when a
 * structural placeholder (`OLD_MEMORY` / `NEW_CONTENT`) is missing;
 * a missing `MAX_WORDS` is reported in `missing` but leaves `valid` true.
 */
export function validateCondensationPrompt(
  prompt: string,
): CondensationPromptValidation {
  const missing = CONDENSATION_PLACEHOLDERS.filter(
    (name) => !prompt.includes(`{{${name}}}`),
  );
  const fatal = missing.filter((name) => FATAL_PLACEHOLDERS.has(name));
  return { valid: fatal.length === 0, missing, fatal };
}
