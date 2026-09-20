[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkConstructorConfig

# Type Alias: NeurolinkConstructorConfig

> **NeurolinkConstructorConfig** = `object`

Defined in: [types/config.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L70)

Configuration object for NeuroLink constructor.

## Properties

### conversationMemory?

> `optional` **conversationMemory?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/config.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L71)

---

### enableOrchestration?

> `optional` **enableOrchestration?**: `boolean`

Defined in: [types/config.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L72)

---

### hitl?

> `optional` **hitl?**: [`HITLConfig`](HITLConfig.md)

Defined in: [types/config.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L73)

---

### tools?

> `optional` **tools?**: [`ToolConfig`](ToolConfig.md)

Defined in: [types/config.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L79)

Instance-level tool policy: master switch, include/exclude lists
(with `*` glob support), and on-demand MCP tool discovery.
See [ToolConfig](ToolConfig.md).

---

### toolRegistry?

> `optional` **toolRegistry?**: [`MCPToolRegistry`](../classes/MCPToolRegistry.md)

Defined in: [types/config.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L80)

---

### observability?

> `optional` **observability?**: [`ObservabilityConfig`](ObservabilityConfig.md)

Defined in: [types/config.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L81)

---

### modelAliasConfig?

> `optional` **modelAliasConfig?**: [`ModelAliasConfig`](ModelAliasConfig.md)

Defined in: [types/config.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L82)

---

### mcp?

> `optional` **mcp?**: [`MCPEnhancementsConfig`](MCPEnhancementsConfig.md)

Defined in: [types/config.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L84)

MCP enhancement modules configuration (cache, router, batcher, annotations, middleware)

---

### artifacts?

> `optional` **artifacts?**: [`ArtifactStorageConfig`](ArtifactStorageConfig.md)

Defined in: [types/config.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L90)

Artifact storage: where externalized MCP tool outputs and banked payloads
live. The backend follows `STORAGE_TYPE` exactly like conversation memory
unless chosen here. See [ArtifactStorageConfig](ArtifactStorageConfig.md).

---

### auth?

> `optional` **auth?**: [`NeuroLinkAuthConfig`](NeuroLinkAuthConfig.md)

Defined in: [types/config.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L92)

Authentication provider configuration

---

### tasks?

> `optional` **tasks?**: [`TaskManagerConfig`](TaskManagerConfig.md)

Defined in: [types/config.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L94)

TaskManager configuration (scheduled and self-running tasks)

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/config.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L100)

Per-provider credential overrides.
When set here, applies as the default for all generate()/stream() calls
from this NeuroLink instance. Per-call credentials override these.

---

### providerFallback?

> `optional` **providerFallback?**: [`ProviderFallbackCallback`](ProviderFallbackCallback.md)

Defined in: [types/config.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L111)

Curator P2-3: callback invoked when a generate/stream call fails with
any error except a genuine caller cancel — i.e. the caller-supplied
`abortSignal` fired (network errors, 5xx, timeouts, auth failures,
model-access-denied, and internal watchdog aborts all invoke it). Lets
a host (e.g. Curator) centrally drive fallback policy — "provider A
primary, provider B on failure". The callback receives the original
error unmodified and returns the next `{ provider, model }` to try, or
`null` to bubble the error.

---

### modelChain?

> `optional` **modelChain?**: `string`[]

Defined in: [types/config.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L120)

Curator P2-3: ordered list of model names to try in sequence. Sugar
over `providerFallback`, but with a narrower trigger: without an
explicit callback the chain only advances on model-access-denied
errors — other failures (network, 5xx, timeouts) bubble immediately.
The current provider is preserved across the chain; only the model
name changes.

---

### toolRouting?

> `optional` **toolRouting?**: [`ToolRoutingConfig`](ToolRoutingConfig.md)

Defined in: [types/config.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L127)

Pre-call tool routing: a cheap router LLM picks the tool servers
relevant to each stream() turn and the unpicked servers' tools are
dropped from the request via `excludeTools`. Fails open (all tools) on
any router failure. See [ToolRoutingConfig](ToolRoutingConfig.md).

---

### toolDedup?

> `optional` **toolDedup?**: [`ToolDedupConfig`](ToolDedupConfig.md)

Defined in: [types/config.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L140)

Opt-in tool-signature deduplication. When enabled, tools whose
canonical signatures are sufficiently similar (Jaccard ≥ threshold) are
collapsed to a single representative before being sent to the model,
reducing token cost and model confusion caused by near-identical tools.

Disabled by default — enabling this changes nothing unless you
explicitly set `enabled: true`. Always fails open: any error in the
dedup pass returns the original tool set unchanged.

See [ToolDedupConfig](ToolDedupConfig.md).

---

### modelPool?

> `optional` **modelPool?**: [`ModelPoolConfig`](ModelPoolConfig.md)

Defined in: [types/config.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L148)

Multi-provider pool for error-class-aware failover with per-member
cooldown. When set, generate() and stream() source their candidate
provider sequence from the pool instead of (or in addition to) the
static providerPriority fallback. Fails open: a pool error leaves
existing behavior unchanged.

---

### requestRouter?

> `optional` **requestRouter?**: [`RequestRouter`](RequestRouter.md)

Defined in: [types/config.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L156)

Pluggable pre-call router: inspects lightweight request characteristics
(token estimate, tools, vision, thinkingLevel) and returns an optional
provider/model/region override. Only runs when the caller did NOT
explicitly set options.provider/options.model. Fails open: a router
error proceeds unrouted.

---

### classifierRouter?

> `optional` **classifierRouter?**: [`ClassifierRouterConfig`](ClassifierRouterConfig.md)

Defined in: [types/config.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L165)

Pre-call classifier router: classifies each request by difficulty and
selects a provider/model from a configured "available base" pool — routing
harder tasks to more capable models and easier tasks to cheaper/faster
ones — and optionally narrows the tool set. Opt-in (`enabled: false` by
default) and fails open. Skipped when a `modelPool` is configured or the
caller pinned both `provider` and `model`. See [ClassifierRouterConfig](ClassifierRouterConfig.md).

---

### contextRelevance?

> `optional` **contextRelevance?**: [`ContextRelevanceOptions`](ContextRelevanceOptions.md)

Defined in: [types/config.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L176)

Relevance-driven context compaction. When a decision provider is
configured, compaction gains a stage-zero pass that drops the earlier
messages the current request provably does not need, before the
positional stages (which protect by recency alone) get to choose.

This object only TUNES that stage; it does not enable it. The stage runs
whenever a decision provider is configured, and does nothing otherwise,
which is the same activation rule every other decision consumer uses.

---

### skills?

> `optional` **skills?**: [`SkillsConfig`](SkillsConfig.md)

Defined in: [types/config.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L185)

Native skills: versioned, discoverable instruction packs (SOPs,
playbooks) with progressive disclosure. When enabled, each
generate()/stream() call gets a skills discovery listing plus
use_skill / read_skill_resource tools; activated skill instructions
pin to the session so they are loaded once and replayed from history.
Opt-in and fails open on read paths. See [SkillsConfig](SkillsConfig.md).

---

### knowledgeGrounding?

> `optional` **knowledgeGrounding?**: [`KnowledgeGroundingConfig`](KnowledgeGroundingConfig.md)

Defined in: [types/config.ts:196](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L196)

Knowledge grounding: lexical-first host-supplied knowledge retrieval. When
enabled with at least one source, a deterministic in-memory retrieval runs
before each generate()/stream() turn — independently of tool routing — and
attaches a token-bounded, ephemeral knowledge block to the model call. No
embeddings or vector store. Opt-in (`enabled: false` by default) and fails
open: any retrieval failure leaves the turn ungrounded. Sources are fixed
for the lifetime of the instance. See
[KnowledgeGroundingConfig](KnowledgeGroundingConfig.md).
