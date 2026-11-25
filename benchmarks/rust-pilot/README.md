# Rust pilot: the BM25 index

A pilot for the NeuroLink Rust migration. It ports one module, the in-memory
BM25 index, to Rust with [rust-anything](https://github.com/erkamyaman/rust-anything)
4.1.0 and napi-rs, then compares it with the TypeScript it replaces and with
a better algorithm in TypeScript.

**Result: do not ship the Rust port.** It returns the same results and
searches 1.5x faster at 100,000 documents, but it is 3x slower on small calls
and uses more memory. An inverted index in TypeScript searches 165x faster.
Nothing in the shipped package loads the native module.

## What is here

| Path                                        | What it is                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/lib/rag/retrieval/bm25Core.ts`         | The synchronous scoring core, split out of `InMemoryBM25Index` so it can be bridged             |
| `src/lib/rag/retrieval/bm25Index.ts`        | `InMemoryBM25Index`, unchanged in behaviour, now a thin async wrapper around the core           |
| `rust/bm25-rs/`                             | The Rust crate: `src/port.rs` (the port), `src/fdlibm.rs` (V8's `Math.log`), generated bindings |
| `rust/bm25-rs/cases.jsonl`                  | 500 recorded calls of the TypeScript core, the behaviour the port must match                    |
| `benchmarks/rust-pilot/bm25InvertedCore.ts` | The same core with an inverted index, in TypeScript                                             |
| `benchmarks/rust-pilot/bm25-bench.ts`       | Times all three on the same corpus and checks they return identical results                     |

## Run it

Needs a Rust toolchain and the `rust-anything` CLI.

```bash
rust-anything build rust/bm25-rs     # builds rust/bm25-rs/bm25_rs.node
rust-anything diff rust/bm25-rs      # 500/500 recorded cases must match
rust-anything gate rust/bm25-rs      # fmt, clippy, tests, coverage, behaviour
pnpm exec tsx benchmarks/rust-pilot/bm25-bench.ts             # 1k, 10k, 100k docs
pnpm exec tsx benchmarks/rust-pilot/bm25-bench.ts --docs 10000
```

After `rust-anything refresh`, run Prettier on `rust/bm25-rs/index.cjs` and
`rust/bm25-rs/README.md`: the generated files do not follow the repo's style.

## Results

Medians of three runs on an Apple M5 Max with Node 26.12.1. A corpus of
Zipf-distributed words, 50 to 300 words per document, 50 three-word queries.
All three versions returned identical ids and scores at every size.

| Version                        | Search, 1k docs | Search, 100k docs | Index, 100k docs | Process memory, 100k docs |
| ------------------------------ | --------------- | ----------------- | ---------------- | ------------------------- |
| TypeScript today (linear scan) | 6.2 ms          | 610 ms            | 1.2 s            | 567 MB                    |
| Rust port, same algorithm      | 3.8 ms          | 399 ms            | 0.7 s            | 916 MB                    |
| TypeScript, inverted index     | 0.08 ms         | 3.7 ms            | 6.4 s            | 692 MB                    |

On rust-anything's own recorded cases, which are small, the Rust port ran at
0.34x: crossing from JavaScript into Rust costs more than the work.

## What it taught us

- **Bit-identical scores need V8's math.** Rust's `f64::ln` differs from
  `Math.log` in the last bit for about 2% of inputs. `src/fdlibm.rs` ports
  fdlibm's `log`, which V8 uses, and fuses the multiply-adds that clang fuses
  when it builds V8 for arm64. It matches Node 26.12.1 on 2,000,016 values.
  The x86-64 form has not been checked against an x86-64 Node.
- **The bridge cannot port async methods.** `InMemoryBM25Index` had to be
  split into a synchronous core and a wrapper before it could be bridged.
- **A straight port keeps the old data layout,** one heap string per token, so
  it does not save memory.
- **Most of `src/lib` is one import cycle.** `rust-anything analyze` found 140
  of 153 units in it. A class that depends only on types can still be ported
  alone, as this one was.
