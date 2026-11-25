/**
 * In-memory BM25 index.
 *
 * Lives in its own file, apart from hybrid search, so it can be benchmarked
 * and ported on its own. Tokenizing and scoring happen in `BM25Core`; this
 * class keeps the async `BM25Index` API and each document's text and metadata.
 */

import type { BM25Index, BM25Result } from "../../types/index.js";
import { BM25Core } from "./bm25Core.js";

/**
 * In-memory BM25 implementation for testing and development
 */
export class InMemoryBM25Index implements BM25Index {
  private core = new BM25Core();
  private documents: Map<
    string,
    { text: string; metadata: Record<string, unknown> }
  > = new Map();

  async search(query: string, topK = 10): Promise<BM25Result[]> {
    // The core takes a whole-number limit; anything else keeps Array.slice's
    // own handling of negative and fractional values.
    const exact = Number.isInteger(topK) && topK >= 0;
    const hits = this.core.search(query, exact ? topK : -1);
    const results: BM25Result[] = hits.ids.map((id, i) => {
      const doc = this.documents.get(id);
      return {
        id,
        score: hits.scores[i],
        text: doc?.text ?? "",
        metadata: doc?.metadata ?? {},
      };
    });
    return exact ? results : results.slice(0, topK);
  }

  async addDocuments(
    documents: Array<{
      id: string;
      text: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    for (const doc of documents) {
      this.documents.set(doc.id, {
        text: doc.text,
        metadata: doc.metadata || {},
      });
    }
    this.core.add(
      documents.map((doc) => doc.id),
      documents.map((doc) => doc.text),
    );
  }
}
