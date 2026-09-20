# Per-query RAG retrieval planning

`RAGPipeline.query()` has always resolved four knobs — `topK`, `hybrid`,
`graph`, `rerank` — from config, with an optional per-call override on each.
Nothing inspected the query itself: "what is the refund window?" (one precise
passage, worth matching by an exact phrase) and "how does billing relate to
entitlements?" (many passages, relationships across documents) got the same
plan. `RAGPipelineConfig.decide` lets a
[decision model](/docs/features/decide-inference-type) answer all four for
the query in hand, in one ~400ms request.

**The degradation contract.** `config.decide` is optional and defaults to
unset. Without it, `query()` behaves exactly as before — the configured
defaults and any explicit `QueryOptions` are all that determine `topK`,
`hybrid`, `graph` and `rerank`. Setting `plan: false` on a call skips
planning for that one call even when `decide` is configured, without
touching anything else.

> ⚠️ **This is opt-in wiring, not automatic.** Per-query planning lives on
> `RAGPipeline`. The `rag: { files }` shortcut on `generate()` / `stream()` does
> not construct one, so that path keeps its fixed `topK`/`hybrid`/`graph`/
> `rerank` settings. To get planning you build the pipeline yourself and pass a
> `decide` function, as below.

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { RAGPipeline } from "@juspay/neurolink";

const nl = new NeuroLink();

const pipeline = new RAGPipeline({
  enableHybridSearch: true,
  enableReranking: true,
  rerankingModel: "simple",
  decide: (options) => nl.decide(options),
});

const response = await pipeline.query(
  "How does billing relate to entitlements across services?",
);
// response.metadata.plan describes what the decision model suggested,
// when it ran.
```

## What gets asked

One request always asks `breadth` — a `score` question rather than a raw
number, because a decision model places a query on an ordered scale
reliably and reads a digit string as text, not as a quantity to reason with:

| Level | Criterion                                                                           | topK multiplier |
| ----- | ----------------------------------------------------------------------------------- | --------------- |
| 0     | One specific fact, definition or value. A single passage answers it completely.     | 0.5×            |
| 1     | A handful of related points — a procedure, a short comparison, one topic explained. | 1×              |
| 2     | Several distinct areas that each need their own supporting passage.                 | 1.5×            |
| 3     | A broad survey that needs evidence from across the whole corpus.                    | 2.5×            |

The multiplier is applied to the pipeline's own configured `defaultTopK` and
clamped to between **1** and **50**. Below **0.5** confidence the breadth
reading is dropped entirely and the configured `topK` stands untouched.

`hybrid`, `graph` and `rerank` are each a plain boolean — and each is asked
**only when the pipeline was actually configured with that capability**.
Asking about a knob nobody can act on would cost input tokens for nothing
and invite the mistake of acting on it anyway:

- **hybrid**: "This question contains exact terms that must be matched
  literally — an identifier, error code, file name, version number, API
  name, or a quoted phrase — rather than only a topic to match by meaning."
- **graph**: "Answering this requires connecting information that lives in
  separate documents, such as how two things relate, what depends on what,
  or tracing a chain across sources."
- **rerank**: "This question is specific enough that the ORDER of the
  retrieved passages matters — a nearly-right passage would produce a wrong
  answer, so precision is worth an extra ranking pass."

## A deliberately lower bar than tool routing or compaction

`hybrid`, `graph` and `rerank` are each read with the plain library default —
0.5 probability, 0.4 confidence — not the stricter 0.6 confidence override
that [tool routing](/docs/features/tool-routing-decision-model) and
[relevance compaction](/docs/features/relevance-compaction) both apply. This
is a deliberate asymmetry, not an oversight: a wrong guess here is cheap (an
extra ranking pass that didn't help, or a missed lexical match on an
otherwise-fine semantic result), where a wrong guess on a dropped tool
server or a dropped conversation message breaks the turn outright. The bar
matches the cost of being wrong.

## Precedence: explicit always wins, capability is a hard ceiling

```ts
if (plan) {
  if (options?.topK === undefined && plan.topK !== undefined) {
    topK = plan.topK;
  }
  if (options?.hybrid === undefined && plan.hybrid !== undefined) {
    useHybrid = plan.hybrid;
  }
  // ...graph, rerank follow the same pattern
}
```

An explicit `QueryOptions` field always wins over the plan, per field —
setting `hybrid: true` on one call while letting `topK` be planned works
exactly as written. And the plan can never turn on a capability the pipeline
itself was not configured with: `canHybrid`/`canGraph`/`canRerank` gate
whether the question is even asked, so `graph: true` cannot appear in a plan
for a pipeline with no graph index. This is the same "suggestion, not an
override of capability" contract every other consumer of `decide` in this
codebase follows.

## What this is bad at

- **Breadth is a rubric, not a real answer-length estimate.** A level-3
  reading multiplies `topK` by 2.5× regardless of how large the corpus
  actually is — for a small collection that can mean requesting more
  passages than exist.
- **The three capability booleans don't interact.** `hybrid` and `rerank`
  are decided independently even though a rerank pass changes how much a
  lexical-match boost from hybrid search actually matters; there's no joint
  reasoning about the combination, only three separate yes/no answers.
- **It only sees the query text.** It has no visibility into what's actually
  indexed, so "a broad survey that needs evidence from across the whole
  corpus" is judged from the question's phrasing alone, not from how much
  relevant material exists to survey.
- **It shares the base model's general limits** — literal reading, no
  arithmetic, degraded accuracy under a noisy state — all described in
  [what `decide` is bad at](/docs/features/decide-inference-type#what-it-is-bad-at).
- **No memory across queries.** Each call to `query()` is planned from
  scratch; a session that alternates between narrow and broad questions gets
  no benefit from what the previous plan decided.

## See also

- [The `decide` inference type](/docs/features/decide-inference-type)
- [Tool / MCP routing by decision model](/docs/features/tool-routing-decision-model)
- [Relevance-driven compaction](/docs/features/relevance-compaction)
