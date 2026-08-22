[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeurolinkConstructorConfig

# Type Alias: NeurolinkConstructorConfig

> **NeurolinkConstructorConfig** = `object`

Defined in: [types/config.ts:68](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L68)

Configuration object for NeuroLink constructor.

## Properties

### conversationMemory?

> `optional` **conversationMemory?**: `Partial`\<[`ConversationMemoryConfig`](ConversationMemoryConfig.md)\>

Defined in: [types/config.ts:69](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L69)

---

### enableOrchestration?

> `optional` **enableOrchestration?**: `boolean`

Defined in: [types/config.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L70)

---

### hitl?

> `optional` **hitl?**: [`HITLConfig`](HITLConfig.md)

Defined in: [types/config.ts:71](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L71)

---

### tools?

> `optional` **tools?**: [`ToolConfig`](ToolConfig.md)

Defined in: [types/config.ts:77](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L77)

Instance-level tool policy: master switch, include/exclude lists
(with `*` glob support), and on-demand MCP tool discovery.
See [ToolConfig](ToolConfig.md).

---

### toolRegistry?

> `optional` **toolRegistry?**: [`MCPToolRegistry`](../classes/MCPToolRegistry.md)

Defined in: [types/config.ts:78](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L78)

---

### observability?

> `optional` **observability?**: [`ObservabilityConfig`](ObservabilityConfig.md)

Defined in: [types/config.ts:79](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L79)

---

### modelAliasConfig?

> `optional` **modelAliasConfig?**: [`ModelAliasConfig`](ModelAliasConfig.md)

Defined in: [types/config.ts:80](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L80)

---

### mcp?

> `optional` **mcp?**: [`MCPEnhancementsConfig`](MCPEnhancementsConfig.md)

Defined in: [types/config.ts:82](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L82)

MCP enhancement modules configuration (cache, router, batcher, annotations, middleware)

---

### auth?

> `optional` **auth?**: [`NeuroLinkAuthConfig`](NeuroLinkAuthConfig.md)

Defined in: [types/config.ts:84](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L84)

Authentication provider configuration

---

### tasks?

> `optional` **tasks?**: [`TaskManagerConfig`](TaskManagerConfig.md)

Defined in: [types/config.ts:86](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L86)

TaskManager configuration (scheduled and self-running tasks)

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/config.ts:92](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L92)

Per-provider credential overrides.
When set here, applies as the default for all generate()/stream() calls
from this NeuroLink instance. Per-call credentials override these.

---

### providerFallback?

> `optional` **providerFallback?**: [`ProviderFallbackCallback`](ProviderFallbackCallback.md)

Defined in: [types/config.ts:103](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L103)

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

Defined in: [types/config.ts:112](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L112)

Curator P2-3: ordered list of model names to try in sequence. Sugar
over `providerFallback`, but with a narrower trigger: without an
explicit callback the chain only advances on model-access-denied
errors — other failures (network, 5xx, timeouts) bubble immediately.
The current provider is preserved across the chain; only the model
name changes.

---

### toolRouting?

> `optional` **toolRouting?**: [`ToolRoutingConfig`](ToolRoutingConfig.md)

Defined in: [types/config.ts:119](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L119)

Pre-call tool routing: a cheap router LLM picks the tool servers
relevant to each stream() turn and the unpicked servers' tools are
dropped from the request via `excludeTools`. Fails open (all tools) on
any router failure. See [ToolRoutingConfig](ToolRoutingConfig.md).

---

### toolDedup?

> `optional` **toolDedup?**: [`ToolDedupConfig`](ToolDedupConfig.md)

Defined in: [types/config.ts:132](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L132)

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

Defined in: [types/config.ts:140](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L140)

Multi-provider pool for error-class-aware failover with per-member
cooldown. When set, generate() and stream() source their candidate
provider sequence from the pool instead of (or in addition to) the
static providerPriority fallback. Fails open: a pool error leaves
existing behavior unchanged.

---

### requestRouter?

> `optional` **requestRouter?**: [`RequestRouter`](RequestRouter.md)

Defined in: [types/config.ts:148](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L148)

Pluggable pre-call router: inspects lightweight request characteristics
(token estimate, tools, vision, thinkingLevel) and returns an optional
provider/model/region override. Only runs when the caller did NOT
explicitly set options.provider/options.model. Fails open: a router
error proceeds unrouted.

---

### classifierRouter?

> `optional` **classifierRouter?**: [`ClassifierRouterConfig`](ClassifierRouterConfig.md)

Defined in: [types/config.ts:157](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L157)

Pre-call classifier router: classifies each request by difficulty and
selects a provider/model from a configured "available base" pool — routing
harder tasks to more capable models and easier tasks to cheaper/faster
ones — and optionally narrows the tool set. Opt-in (`enabled: false` by
default) and fails open. Skipped when a `modelPool` is configured or the
caller pinned both `provider` and `model`. See [ClassifierRouterConfig](ClassifierRouterConfig.md).

---

### skills?

> `optional` **skills?**: [`SkillsConfig`](SkillsConfig.md)

Defined in: [types/config.ts:166](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L166)

Native skills: versioned, discoverable instruction packs (SOPs,
playbooks) with progressive disclosure. When enabled, each
generate()/stream() call gets a skills discovery listing plus
use_skill / read_skill_resource tools; activated skill instructions
pin to the session so they are loaded once and replayed from history.
Opt-in and fails open on read paths. See [SkillsConfig](SkillsConfig.md).

---

### knowledgeGrounding?

> `optional` **knowledgeGrounding?**: [`KnowledgeGroundingConfig`](KnowledgeGroundingConfig.md)

Defined in: [types/config.ts:177](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L177)

Knowledge grounding: lexical-first host-supplied knowledge retrieval. When
enabled with at least one source, a deterministic in-memory retrieval runs
before each generate()/stream() turn — independently of tool routing — and
attaches a token-bounded, ephemeral knowledge block to the model call. No
embeddings or vector store. Opt-in (`enabled: false` by default) and fails
open: any retrieval failure leaves the turn ungrounded. Sources are fixed
for the lifetime of the instance. See
[KnowledgeGroundingConfig](KnowledgeGroundingConfig.md).
