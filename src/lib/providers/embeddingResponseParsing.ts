/**
 * Shared embeddings-response validation for Voyage and Jina — both call
 * POST /embeddings with an identical `{input, model}` body and get back an
 * identical `{data: [{embedding, index}]}` shape, and both had byte-identical
 * validation logic (same three message templates, same sort-by-index +
 * 0..n-1 coverage check) before this was factored out.
 *
 * A plain function, not a shared base class: Voyage throws typed
 * `ProviderError` here, Jina throws plain `Error` (a real, pre-existing
 * inconsistency between the two — not something this refactor silently
 * fixes). `makeError` preserves each provider's exact existing behavior;
 * `providerLabel` preserves each provider's exact existing message text
 * ("Voyage ..." / "Jina ...").
 */
const isIndexedEmbedding = (
  value: unknown,
): value is { embedding: number[]; index: number } => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { embedding, index } = value as {
    embedding?: unknown;
    index?: unknown;
  };
  return (
    Number.isInteger(index) &&
    Array.isArray(embedding) &&
    embedding.every((n) => typeof n === "number" && Number.isFinite(n))
  );
};

export function parseIndexedEmbeddingsResponse(
  data: unknown,
  inputCount: number,
  providerLabel: string,
  makeError: (message: string) => Error,
): number[][] {
  const entries =
    typeof data === "object" && data !== null
      ? (data as { data?: unknown }).data
      : undefined;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw makeError(`${providerLabel} embeddings response missing data`);
  }

  if (entries.length !== inputCount) {
    throw makeError(
      `${providerLabel} embeddings response count mismatch: expected ${inputCount}, got ${entries.length}`,
    );
  }

  const malformed = entries.findIndex((entry) => !isIndexedEmbedding(entry));
  if (malformed !== -1) {
    throw makeError(
      `${providerLabel} embeddings response entry ${malformed} is not an {index, embedding: number[]} object`,
    );
  }

  const sorted = (entries as { embedding: number[]; index: number }[])
    .slice()
    .sort((a, b) => a.index - b.index);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].index !== i) {
      throw makeError(
        `${providerLabel} embeddings response has unexpected index ordering: position ${i} has index ${sorted[i].index}`,
      );
    }
  }

  return sorted.map((d) => d.embedding);
}
