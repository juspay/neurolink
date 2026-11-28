/**
 * BM25Core with an inverted index, in TypeScript: the algorithmic fix, to set
 * beside the Rust port. Same inputs, same outputs bit for bit as
 * `src/lib/rag/retrieval/bm25Core.ts`, including scores and tie order.
 *
 * Why the scores match exactly: the linear version adds one term per query
 * token to each document's score, in query order. A document that lacks a
 * token gets `idf * (0 / denominator)`, which is +0, and adding +0 to a
 * positive or zero score changes nothing. So adding only the non-zero terms,
 * still in query order, gives the same bits. A document with no query token
 * scores 0 and is dropped in both versions.
 */

const K1 = 1.5;
const B = 0.75;

export class BM25InvertedCore {
  private ids: string[] = [];
  private positions: Map<string, number> = new Map();
  private lengths: number[] = [];
  // Each document's distinct tokens, kept only to undo them on replacement.
  private docTerms: string[][] = [];
  // token -> parallel arrays of document positions and term frequencies
  private postings: Map<string, { docs: number[]; tfs: number[] }> = new Map();
  private totalLength = 0;
  private avgDocLength = 0;

  add(ids: string[], texts: string[]): void {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const tokens = tokenize(texts[i]);
      let position = this.positions.get(id);
      if (position === undefined) {
        position = this.ids.length;
        this.positions.set(id, position);
        this.ids.push(id);
        this.lengths.push(0);
        this.docTerms.push([]);
      } else {
        // Rare path: a re-added id drops its old postings first.
        for (const token of this.docTerms[position]) {
          const list = this.postings.get(token);
          if (list) {
            const at = list.docs.indexOf(position);
            list.docs.splice(at, 1);
            list.tfs.splice(at, 1);
          }
        }
        this.totalLength -= this.lengths[position];
      }
      const counts = new Map<string, number>();
      for (const token of tokens) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
      for (const [token, tf] of counts) {
        let list = this.postings.get(token);
        if (!list) {
          list = { docs: [], tfs: [] };
          this.postings.set(token, list);
        }
        list.docs.push(position);
        list.tfs.push(tf);
      }
      this.docTerms[position] = [...counts.keys()];
      this.lengths[position] = tokens.length;
      this.totalLength += tokens.length;
    }
    this.avgDocLength =
      this.ids.length > 0 ? this.totalLength / this.ids.length : 0;
  }

  search(query: string, limit: number): { ids: string[]; scores: number[] } {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 || this.ids.length === 0) {
      return { ids: [], scores: [] };
    }
    const n = this.ids.length;
    const acc = new Float64Array(n);
    const touched: number[] = [];
    const seen = new Uint8Array(n);
    for (const token of queryTokens) {
      const list = this.postings.get(token);
      const docCount = list?.docs.length ?? 0;
      const idf = Math.log((n - docCount + 0.5) / (docCount + 0.5) + 1);
      if (!list) {
        continue;
      }
      for (let k = 0; k < list.docs.length; k++) {
        const position = list.docs[k];
        const tf = list.tfs[k];
        const numerator = tf * (K1 + 1);
        const denominator =
          tf + K1 * (1 - B + B * (this.lengths[position] / this.avgDocLength));
        acc[position] += idf * (numerator / denominator);
        if (seen[position] === 0) {
          seen[position] = 1;
          touched.push(position);
        }
      }
    }
    // Position order first, so the stable score sort breaks ties as the
    // linear scan does.
    touched.sort((a, b) => a - b);
    const hits: Array<{ position: number; score: number }> = [];
    for (const position of touched) {
      if (acc[position] > 0) {
        hits.push({ position, score: acc[position] });
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
