# SDK overhead benchmarks

These scripts measure what NeuroLink itself costs, apart from the model call:
import time, memory, CPU per `generate()` and `stream()` call, and the
CPU-bound helpers. They were written to answer whether a Rust core would pay
off, and they are kept so the numbers can be rerun after a change such as
lazy loading.

Every call goes to a local fake OpenAI-compatible server
(`mock-server.mjs`) that returns a fixed 300-word reply. The benchmark
processes get only `PATH`, `HOME` and the mock server's settings, so no real
provider key is read and no paid API is called.

## Run

```bash
pnpm run build
node benchmarks/sdk-overhead/run.mjs              # 3 runs of 200 calls each
node benchmarks/sdk-overhead/run.mjs --calls 3000 --runs 1
```

`--dist <path>` points at another build, for a before/after comparison. The
build can live anywhere: its own folder, not a folder named `dist`, decides
which loaded modules count as NeuroLink's.

## What each script measures

| Script               | Measures                                                                                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `call-bench.mjs`     | In one fresh process: import time, CPU and memory, then `new NeuroLink()` timed on its own; the first call; CPU per call, p50 and p95 latency and calls per second over sequential calls; then 50 calls at once; memory and heap at the end |
| `import-modules.mjs` | How many modules one import loads, and which packages they come from                                                                                                                                                                        |
| `cpu-helpers.mjs`    | Median time to chunk and tokenize 1 MB of text with each strategy, BM25 indexing and search over 10,000 documents, and 10,000 cosine similarities at 1,536 dimensions                                                                       |
| `mock-server.mjs`    | The fake server. It also runs alone: `node benchmarks/sdk-overhead/mock-server.mjs 18765`                                                                                                                                                   |

## Reading the numbers

Import time varies a lot between runs (1.7 to 6.0 s was seen on one
machine), because it is mostly file reads and compiling. Compare medians over
several runs, on the same machine, with nothing else heavy running. The fake
server runs in the parent process, so its CPU is never counted in the child's
figures.

These are not part of CI, and nothing in `test/` depends on them.
