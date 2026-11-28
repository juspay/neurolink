/**
 * Named error-text signals from `structured-output.json`: case-insensitive
 * patterns that recognise a provider rejection from its message, whatever
 * vendor sent it.
 */
import { getProviderRules } from "./registry.js";

const compiled = new Map<string, RegExp[]>();

function signalPatterns(name: string): RegExp[] {
  let patterns = compiled.get(name);
  if (!patterns) {
    const sources = getProviderRules("structured-output").errorSignals?.[name];
    if (!sources) {
      throw new Error(
        `Provider rules file "structured-output.json" has no errorSignals.${name}`,
      );
    }
    patterns = sources.map((source) => new RegExp(source, "i"));
    compiled.set(name, patterns);
  }
  return patterns;
}

/** Whether an error (an Error's message, or a string) matches a named signal. */
export function matchesErrorSignal(name: string, error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return signalPatterns(name).some((pattern) => pattern.test(message));
}
