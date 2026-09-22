import { NetworkError } from "../types/index.js";
import type { ProviderErrorRule, UnknownRecord } from "../types/index.js";

/**
 * Shared error-rule builder for local-runtime OpenAI-compatible providers —
 * Ollama, LM Studio, llama.cpp. All three had byte-identical connection-
 * refused predicates (including the duck-typed `code`/`cause.code`
 * extraction, since none of that lives on ProviderErrorContext) before this
 * factored it out. A plain function, not a shared base class: the
 * `neurolink/provider-base-class` lint rule requires every provider to
 * extend BaseProvider or OpenAIChatCompletionsProvider directly, so the
 * three keep their existing class hierarchy and just call this from their
 * own `formatProviderError()`.
 *
 * `message` stays per-vendor (each provider's own exact wording, unchanged)
 * — only the match predicate and errorClass were ever duplicated.
 */
export function buildLocalUnreachableErrorRule(
  error: unknown,
  message: () => string,
): ProviderErrorRule {
  const errorRecord = error as UnknownRecord;
  const cause = (errorRecord?.cause as UnknownRecord) ?? {};
  const code = (errorRecord?.code ?? cause?.code) as string | undefined;
  return {
    match: (ctx) =>
      code === "ECONNREFUSED" ||
      /ECONNREFUSED|Failed to fetch|fetch failed/.test(ctx.message),
    errorClass: NetworkError,
    message,
  };
}
