[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingConfig

# Type Alias: ToolRoutingConfig

> **ToolRoutingConfig** = `object`

Constructor-level configuration for pre-call tool routing.

## Properties

### enabled

> **enabled**: `boolean`

Master switch. Routing runs only when true AND the server catalog is non-empty.

---

### servers?

> `optional` **servers?**: [`ToolRoutingServerDescriptor`](ToolRoutingServerDescriptor.md)[]

Routable server catalog. Hosts that only know their servers after
constructing NeuroLink can supply it later via
`neurolink.setToolRoutingServers()` instead.

---

### alwaysIncludeServerIds?

> `optional` **alwaysIncludeServerIds?**: `string`[]

Server ids whose tools are always kept and never offered to the router
(e.g. utility / reasoning / chart servers every turn may need).

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Hard ceiling for the router LLM call before failing open. Default: 15000.

---

### routerModel?

> `optional` **routerModel?**: [`ToolRoutingModelConfig`](ToolRoutingModelConfig.md)

Router LLM override. Defaults to the stream call's provider/model/region at temperature 0.

---

### routerPromptPrefix?

> `optional` **routerPromptPrefix?**: `string`

Override for the instruction text placed before the user query in the
router prompt (role + task framing). When omitted, the SDK built-in
default is used. The server catalog, user query, and output rules are
always appended by the SDK regardless of this value.

---

### cache?

> `optional` **cache?**: `object`

LRU+TTL cache for routing decisions. When enabled, identical routing
queries within the TTL window skip the router LLM entirely and reuse
the cached exclusion list.

#### enabled?

> `optional` **enabled?**: `boolean`

Whether the cache is active. Default: false.

#### ttlMs?

> `optional` **ttlMs?**: `number`

Time-to-live in milliseconds for each cached entry. Default: 60000.

#### maxEntries?

> `optional` **maxEntries?**: `number`

Maximum number of entries in the LRU cache. Default: 256.

---

### stickiness?

> `optional` **stickiness?**: `object`

Session stickiness: once the router picks a set of servers for a session,
those servers are kept warm (not excluded) for the next N turns to prevent
flapping.

#### enabled?

> `optional` **enabled?**: `boolean`

Whether session stickiness is active. Default: false.

#### turns?

> `optional` **turns?**: `number`

Number of turns for which a previously-selected server stays warm. Default: 3.

---

### embedding?

> `optional` **embedding?**: [`ToolRoutingEmbeddingConfig`](ToolRoutingEmbeddingConfig.md)

L2 embedding fast-path (ITEM B). When enabled the SDK ranks tools by
semantic + lexical relevance using a hybrid cosine/BM25 score and narrows
the candidate set BEFORE (or instead of) the LLM router. Disabled by
default for backward compatibility.

---

### granularity?

> `optional` **granularity?**: `"server"` \| `"tool"`

Routing granularity (ITEM D).

- `"server"` (default) — routing excludes the tools of entire unpicked
  servers. This is the original behavior.
- `"tool"` — routing excludes individual tools that are not in the
  embedding top-K candidate set, regardless of which server they belong
  to. Requires `embedding.enabled: true`; if the embedding fast-path is
  off (or fails) the granularity falls back to `"server"` automatically.

---

### minDropConfidence?

> `optional` **minDropConfidence?**: `number`

How confidently a decision model must rule a server OUT before its tools
are withheld. Default 0.6.

Only consulted when a decision provider is configured, in which case one
calibrated yes/no question per server replaces the generative router. The
bar is deliberately asymmetric and high: keeping an unneeded server costs
a few hundred tokens, while dropping a needed one costs the turn, because
the model cannot call — or even ask for — a tool it was never shown.
