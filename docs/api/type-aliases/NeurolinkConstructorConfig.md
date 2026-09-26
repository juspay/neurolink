[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkConstructorConfig

# Type Alias: NeurolinkConstructorConfig

> **NeurolinkConstructorConfig** = `object`

Configuration object for NeuroLink constructor.

## Properties

### conversationMemory?

> `optional` **conversationMemory?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

---

### enableOrchestration?

> `optional` **enableOrchestration?**: `boolean`

---

### hitl?

> `optional` **hitl?**: [`HITLConfig`](HITLConfig.md)

---

### tools?

> `optional` **tools?**: [`ToolConfig`](ToolConfig.md)

Instance-level tool policy: master switch, include/exclude lists
(with `*` glob support), and on-demand MCP tool discovery.
See [ToolConfig](ToolConfig.md).

---

### toolRegistry?

> `optional` **toolRegistry?**: [`MCPToolRegistry`](../classes/MCPToolRegistry.md)

---

### observability?

> `optional` **observability?**: [`ObservabilityConfig`](ObservabilityConfig.md)

---

### modelAliasConfig?

> `optional` **modelAliasConfig?**: [`ModelAliasConfig`](ModelAliasConfig.md)

---

### mcp?

> `optional` **mcp?**: [`MCPEnhancementsConfig`](MCPEnhancementsConfig.md)

MCP enhancement modules configuration (cache, router, batcher, annotations, middleware)

---

### artifacts?

> `optional` **artifacts?**: [`ArtifactStorageConfig`](ArtifactStorageConfig.md)

Artifact storage: where externalized MCP tool outputs and banked payloads
live. The backend follows `STORAGE_TYPE` exactly like conversation memory
unless chosen here. See [ArtifactStorageConfig](ArtifactStorageConfig.md).

---

### auth?

> `optional` **auth?**: [`NeuroLinkAuthConfig`](NeuroLinkAuthConfig.md)

Authentication provider configuration

---

### tasks?

> `optional` **tasks?**: [`TaskManagerConfig`](TaskManagerConfig.md)

TaskManager configuration (scheduled and self-running tasks)

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Per-provider credential overrides.
When set here, applies as the default for all generate()/stream() calls
from this NeuroLink instance. Per-call credentials override these.

---

### providerFallback?

> `optional` **providerFallback?**: [`ProviderFallbackCallback`](ProviderFallbackCallback.md)

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

Curator P2-3: ordered list of model names to try in sequence. Sugar
over `providerFallback`, but with a narrower trigger: without an
explicit callback the chain only advances on model-access-denied
errors — other failures (network, 5xx, timeouts) bubble immediately.
The current provider is preserved across the chain; only the model
name changes.

---

### toolRouting?

> `optional` **toolRouting?**: [`ToolRoutingConfig`](ToolRoutingConfig.md)

Pre-call tool routing: a cheap router LLM picks the tool servers
relevant to each stream() turn and the unpicked servers' tools are
dropped from the request via `excludeTools`. Fails open (all tools) on
any router failure. See [ToolRoutingConfig](ToolRoutingConfig.md).

---

### toolDedup?

> `optional` **toolDedup?**: [`ToolDedupConfig`](ToolDedupConfig.md)

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

Multi-provider pool for error-class-aware failover with per-member
cooldown. When set, generate() and stream() source their candidate
provider sequence from the pool instead of (or in addition to) the
static providerPriority fallback. Fails open: a pool error leaves
existing behavior unchanged.

---

### requestRouter?

> `optional` **requestRouter?**: [`RequestRouter`](RequestRouter.md)

Pluggable pre-call router: inspects lightweight request characteristics
(token estimate, tools, vision, thinkingLevel) and returns an optional
provider/model/region override. Only runs when the caller did NOT
explicitly set options.provider/options.model. Fails open: a router
error proceeds unrouted.

---

### classifierRouter?

> `optional` **classifierRouter?**: [`ClassifierRouterConfig`](ClassifierRouterConfig.md)

Pre-call classifier router: classifies each request by difficulty and
selects a provider/model from a configured "available base" pool — routing
harder tasks to more capable models and easier tasks to cheaper/faster
ones — and optionally narrows the tool set. Opt-in (`enabled: false` by
default) and fails open. Skipped when a `modelPool` is configured or the
caller pinned both `provider` and `model`. See [ClassifierRouterConfig](ClassifierRouterConfig.md).

---

### contextRelevance?

> `optional` **contextRelevance?**: [`ContextRelevanceOptions`](ContextRelevanceOptions.md)

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

Native skills: versioned, discoverable instruction packs (SOPs,
playbooks) with progressive disclosure. When enabled, each
generate()/stream() call gets a skills discovery listing plus
use_skill / read_skill_resource tools; activated skill instructions
pin to the session so they are loaded once and replayed from history.
Opt-in and fails open on read paths. See [SkillsConfig](SkillsConfig.md).

---

### knowledgeGrounding?

> `optional` **knowledgeGrounding?**: [`KnowledgeGroundingConfig`](KnowledgeGroundingConfig.md)

Knowledge grounding: lexical-first host-supplied knowledge retrieval. When
enabled with at least one source, a deterministic in-memory retrieval runs
before each generate()/stream() turn — independently of tool routing — and
attaches a token-bounded, ephemeral knowledge block to the model call. No
embeddings or vector store. Opt-in (`enabled: false` by default) and fails
open: any retrieval failure leaves the turn ungrounded. Sources are fixed
for the lifetime of the instance. See
[KnowledgeGroundingConfig](KnowledgeGroundingConfig.md).
