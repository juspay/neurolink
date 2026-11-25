/**
 * The synchronous part of the in-memory BM25 index: tokenizing and scoring.
 *
 * It takes and returns only strings and numbers, so it can be ported to Rust
 * and called through a native binding. `InMemoryBM25Index` wraps it and keeps
 * each document's text and metadata in TypeScript.
 */

const K1 = 1.5;
const B = 0.75;

export class BM25Core {
  private ids: string[] = [];
  private positions: Map<string, number> = new Map();
  private tokens: string[][] = [];
  private avgDocLength = 0;

  /**
   * Adds documents, or replaces the tokens of an id already present. A
   * replaced id keeps its original position, as a Map entry does.
   */
  add(ids: string[], texts: string[]): void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const docTokens = tokenize(texts[i]);
      const position = this.positions.get(id);
      if (position === undefined) {
        this.positions.set(id, this.ids.length);
        this.ids.push(id);
        this.tokens.push(docTokens);
      } else {
        this.tokens[position] = docTokens;
      }
    }

    let totalLength = 0;
    for (const docTokens of this.tokens) {
      totalLength += docTokens.length;
    }
    this.avgDocLength =
      this.tokens.length > 0 ? totalLength / this.tokens.length : 0;
  }

  /**
   * Ids and scores of the documents scoring above zero, best first. Equal
   * scores keep insertion order. `limit` below zero returns every hit.
   */
  search(query: string, limit: number): { ids: string[]; scores: number[] } {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 || this.ids.length === 0) {
      return { ids: [], scores: [] };
    }

    const idfValues = new Map<string, number>();
    for (const token of queryTokens) {
      let docCount = 0;
      for (const docTokens of this.tokens) {
        if (docTokens.includes(token)) {
          docCount++;
        }
      }
      idfValues.set(
        token,
        Math.log((this.ids.length - docCount + 0.5) / (docCount + 0.5) + 1),
      );
    }

    const hits: Array<{ position: number; score: number }> = [];
    for (let position = 0; position < this.ids.length; position++) {
      const docTokens = this.tokens[position];
      const docLength = docTokens.length;
      let score = 0;
      for (const token of queryTokens) {
        let tf = 0;
        for (const t of docTokens) {
          if (t === token) {
            tf++;
          }
        }
        const idf = idfValues.get(token) || 0;
        const numerator = tf * (K1 + 1);
        const denominator =
          tf + K1 * (1 - B + B * (docLength / this.avgDocLength));
        score += idf * (numerator / denominator);
      }
      if (score > 0) {
        hits.push({ position, score });
      }
    }

    hits.sort((a, b) => b.score - a.score);
    const kept = limit < 0 ? hits : hits.slice(0, limit);
    return {
      ids: kept.map((hit) => this.ids[hit.position]),
      scores: kept.map((hit) => hit.score),
    };
  }

  size(): number {
    return this.ids.length;
  }
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}
