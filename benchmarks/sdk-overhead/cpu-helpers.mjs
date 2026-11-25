// Times the CPU-bound public helpers on realistic inputs: chunking and
// tokenizing 1 MB of text, BM25 over 10,000 documents, and 10,000 cosine
// similarities at 1,536 dimensions.
//   node cpu-helpers.mjs <dist/index.js>
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const distArg = process.argv[2];
const neurolink = await import(
  distArg.startsWith("file:")
    ? distArg
    : pathToFileURL(path.resolve(distArg)).href
);

const PARAGRAPH =
  "Juspay processes payments for merchants across India. The orchestration layer routes each transaction to the best gateway. ";
const TEXT_1MB = PARAGRAPH.repeat(Math.ceil(1_048_576 / PARAGRAPH.length));
const results = [];

async function time(name, fn, reps = 5) {
  try {
    await fn();
    const samples = [];
    for (let i = 0; i < reps; i++) {
      const start = performance.now();
      await fn();
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    results.push({ name, medianMs: samples[samples.length >> 1] });
  } catch (error) {
    results.push({ name, error: error.message });
  }
}

for (const strategy of [
  "character",
  "recursive",
  "sentence",
  "token",
  "markdown",
]) {
  await time(
    `chunk 1 MB (${strategy})`,
    async () => {
      const chunker = await neurolink.createChunker(strategy);
      return chunker.chunk(TEXT_1MB, { maxSize: 1000, overlap: 100 });
    },
    3,
  );
}
await time("tokenize 1 MB", () => neurolink.tokenize(TEXT_1MB), 3);

const DOCS = Array.from({ length: 10_000 }, (_, i) => ({
  id: `d${i}`,
  text: `${PARAGRAPH} document ${i}`,
}));
await time(
  "BM25 index 10,000 docs",
  async () => {
    const index = new neurolink.InMemoryBM25Index();
    await index.addDocuments(DOCS);
  },
  3,
);
const bm25 = new neurolink.InMemoryBM25Index();
await bm25.addDocuments(DOCS);
await time("BM25 search 10,000 docs", () =>
  bm25.search("payment gateway routing", 10),
);

const a = Array.from({ length: 1536 }, Math.random);
const b = Array.from({ length: 1536 }, Math.random);
await time("cosine 1536-dim x 10,000", () => {
  let sum = 0;
  for (let i = 0; i < 10_000; i++) {
    sum += neurolink.cosineSimilarity(a, b);
  }
  return sum;
});

console.log(JSON.stringify({ helpers: results }));
process.exit(0);
