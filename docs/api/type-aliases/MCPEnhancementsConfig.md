[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPEnhancementsConfig

# Type Alias: MCPEnhancementsConfig

> **MCPEnhancementsConfig** = `object`

Defined in: [types/config.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L101)

Configuration for MCP enhancement modules wired into generate()/stream() paths.

These modules are automatically applied during tool execution when configured:

- cache: Tool result caching (enabled by default, opt out with enabled: false)
- annotations: Auto-infer tool safety metadata (enabled by default)
- router: Multi-server tool routing (auto-activates with 2+ servers)
- batcher: Batch programmatic tool calls (disabled by default)
- discovery: Enhanced tool search and filtering (enabled by default)
- middleware: Global tool execution middleware chain (empty by default)

## Properties

### cache?

> `optional` **cache?**: `object`

Defined in: [types/config.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L103)

Tool result caching. Default: enabled. Set enabled: false to opt out.

#### enabled?

> `optional` **enabled?**: `boolean`

#### ttl?

> `optional` **ttl?**: `number`

Cache TTL in milliseconds. Default: 300000 (5 min)

#### maxSize?

> `optional` **maxSize?**: `number`

Maximum cache entries. Default: 500

#### strategy?

> `optional` **strategy?**: [`CacheStrategy`](CacheStrategy.md)

Eviction strategy. Default: 'lru'

---

### annotations?

> `optional` **annotations?**: `object`

Defined in: [types/config.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L113)

Tool annotation auto-inference. Default: enabled.

#### enabled?

> `optional` **enabled?**: `boolean`

#### autoInfer?

> `optional` **autoInfer?**: `boolean`

Auto-infer annotations from tool name/description. Default: true

---

### router?

> `optional` **router?**: `object`

Defined in: [types/config.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L119)

Tool routing for multi-server environments. Auto-activates when 2+ external servers exist.

#### enabled?

> `optional` **enabled?**: `boolean`

#### strategy?

> `optional` **strategy?**: [`RoutingStrategy`](RoutingStrategy.md)

Routing strategy. Default: 'least-loaded'

#### enableAffinity?

> `optional` **enableAffinity?**: `boolean`

Enable session affinity. Default: false

---

### batcher?

> `optional` **batcher?**: `object`

Defined in: [types/config.ts:127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L127)

Request batching for programmatic executeTool() calls. Default: disabled.

#### enabled?

> `optional` **enabled?**: `boolean`

#### maxBatchSize?

> `optional` **maxBatchSize?**: `number`

Max requests per batch. Default: 10

#### maxWaitMs?

> `optional` **maxWaitMs?**: `number`

Max wait before flushing batch in ms. Default: 100

---

### discovery?

> `optional` **discovery?**: `object`

Defined in: [types/config.ts:135](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L135)

Enhanced tool discovery. Default: enabled.

#### enabled?

> `optional` **enabled?**: `boolean`

---

### middleware?

> `optional` **middleware?**: [`ToolMiddleware`](ToolMiddleware.md)[]

Defined in: [types/config.ts:139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L139)

Global tool middleware applied to every tool execution. Default: empty.

---

### outputLimits?

> `optional` **outputLimits?**: `object`

Defined in: [types/config.ts:165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L165)

Large MCP tool output handling.

MCP servers can return arbitrarily large payloads. Without limits these
are loaded entirely into memory, cached in full, stored whole in Redis, and
injected into the LLM context window — all of which silently fail at scale.

When configured, NeuroLink intercepts oversized outputs at the tool boundary
(before caching and before memory persistence) and applies the chosen
strategy so the model receives a compact surrogate instead of a firehose.

Two strategies:

- "inline" Keep sending the full payload to the model regardless of
  size. A warning is emitted above warnBytes.
- "externalize" Store the full payload on disk as an artifact and return a
  compact surrogate with a head/tail preview and an artifact
  ID. The model uses `retrieve_context` with that ID to read
  the full output on demand, with offset/limit pagination.

Defaults (when `outputLimits` is set):
strategy = "externalize"
maxBytes = 100 KB (100 _ 1024)
warnBytes = 50 KB (50 _ 1024)

#### strategy?

> `optional` **strategy?**: `"inline"` \| `"externalize"`

What to do when output exceeds maxBytes. Default: "externalize".

#### maxBytes?

> `optional` **maxBytes?**: `number`

Byte ceiling above which the strategy fires. Default: 102400 (100 KB).

#### warnBytes?

> `optional` **warnBytes?**: `number`

Bytes at which a warning is emitted even when still inline. Default: 51200 (50 KB).
