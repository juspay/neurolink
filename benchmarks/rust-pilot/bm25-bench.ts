/**
 * BM25 three ways on the same corpus: the TypeScript core as shipped, its Rust
 * port through napi-rs, and TypeScript with an inverted index.
 *
 *   pnpm exec tsx benchmarks/rust-pilot/bm25-bench.ts            # all sizes
 *   pnpm exec tsx benchmarks/rust-pilot/bm25-bench.ts --docs 10000
 *
 * Needs the native module first: `rust-anything build rust/bm25-rs`.
 * Each variant and size runs in its own process, so memory is not shared.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");
const VARIANTS = ["ts", "rust", "ts-inverted"] as const;
type Variant = (typeof VARIANTS)[number];
type Core = {
  add(ids: string[], texts: string[]): void;
  search(query: string, limit: number): { ids: string[]; scores: number[] };
};

// A deterministic corpus: Zipf-like word frequencies over a 5,000-word
// vocabulary, 50 to 300 words per document.
function corpus(docs: number) {
  let seed = 42;
  const rnd = () =>
    (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const vocab = Array.from({ length: 5000 }, (_, i) => `w${i.toString(36)}`);
  const word = () => vocab[Math.floor(Math.pow(rnd(), 2.5) * vocab.length)];
  const ids: string[] = [];
  const texts: string[] = [];
  for (let i = 0; i < docs; i++) {
    ids.push(`doc-${i}`);
    texts.push(
      Array.from({ length: 50 + Math.floor(rnd() * 250) }, word).join(" "),
    );
  }
  const queries = Array.from({ length: 50 }, () =>
    Array.from({ length: 3 }, word).join(" "),
  );
  return { ids, texts, queries };
}

async function load(variant: Variant): Promise<Core> {
  if (variant === "rust") {
    const require = createRequire(import.meta.url);
    const native = require(path.join(root, "rust", "bm25-rs", "index.cjs"));
    return new native.BM25Core();
  }
  if (variant === "ts-inverted") {
    const { BM25InvertedCore } = await import("./bm25InvertedCore.js");
    return new BM25InvertedCore();
  }
  const { BM25Core } = await import("../../src/lib/rag/retrieval/bm25Core.js");
  return new BM25Core();
}

async function child(variant: Variant, docs: number) {
  const { ids, texts, queries } = corpus(docs);
  const core = await load(variant);
  global.gc?.();
  const heapBefore = process.memoryUsage().heapUsed;
  const rssBefore = process.memoryUsage().rss;

  const addStart = performance.now();
  core.add(ids, texts);
  const addMs = performance.now() - addStart;
  global.gc?.();
  const memory = {
    heapMB: (process.memoryUsage().heapUsed - heapBefore) / 1048576,
    rssMB: (process.memoryUsage().rss - rssBefore) / 1048576,
  };

  const hash = createHash("sha256");
  core.search(queries[0], 10);
  const times: number[] = [];
  for (const query of queries) {
    const start = performance.now();
    const result = core.search(query, 10);
    times.push(performance.now() - start);
    hash.update(JSON.stringify(result));
  }
  times.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      variant,
      docs,
      addMs,
      searchMedianMs: times[times.length >> 1],
      searchP95Ms: times[Math.floor(times.length * 0.95)],
      ...memory,
      resultsHash: hash.digest("hex").slice(0, 16),
    }),
  );
}

const flag = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

if (flag("variant")) {
  await child(flag("variant") as Variant, Number(flag("docs")));
} else {
  const sizes = flag("docs") ? [Number(flag("docs"))] : [1000, 10000, 100000];
  const rows = [];
  for (const docs of sizes) {
    for (const variant of VARIANTS) {
      const out = execFileSync(
        process.execPath,
        [
          ...process.execArgv,
          "--expose-gc",
          fileURLToPath(import.meta.url),
          "--variant",
          variant,
          "--docs",
          String(docs),
        ],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
      );
      rows.push(JSON.parse(out.trim().split("\n").at(-1) as string));
    }
  }
  console.table(rows);
  const mismatched = sizes.filter(
    (docs) =>
      new Set(rows.filter((r) => r.docs === docs).map((r) => r.resultsHash))
        .size !== 1,
  );
  console.log(
    mismatched.length === 0
      ? "All three variants returned identical ids and scores for every query."
      : `Results differ between variants at ${mismatched.join(", ")} docs.`,
  );
  process.exitCode = mismatched.length === 0 ? 0 : 1;
}
