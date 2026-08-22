[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingConfig

# Type Alias: ToolRoutingConfig

> **ToolRoutingConfig** = `object`

Defined in: [types/toolRouting.ts:113](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L113)

Constructor-level configuration for pre-call tool routing.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/toolRouting.ts:115](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L115)

Master switch. Routing runs only when true AND the server catalog is non-empty.

---

### servers?

> `optional` **servers?**: [`ToolRoutingServerDescriptor`](ToolRoutingServerDescriptor.md)[]

Defined in: [types/toolRouting.ts:121](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L121)

Routable server catalog. Hosts that only know their servers after
constructing NeuroLink can supply it later via
`neurolink.setToolRoutingServers()` instead.

---

### alwaysIncludeServerIds?

> `optional` **alwaysIncludeServerIds?**: `string`[]

Defined in: [types/toolRouting.ts:126](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L126)

Server ids whose tools are always kept and never offered to the router
(e.g. utility / reasoning / chart servers every turn may need).

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/toolRouting.ts:128](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L128)

Hard ceiling for the router LLM call before failing open. Default: 15000.

---

### routerModel?

> `optional` **routerModel?**: [`ToolRoutingModelConfig`](ToolRoutingModelConfig.md)

Defined in: [types/toolRouting.ts:130](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L130)

Router LLM override. Defaults to the stream call's provider/model/region at temperature 0.

---

### routerPromptPrefix?

> `optional` **routerPromptPrefix?**: `string`

Defined in: [types/toolRouting.ts:137](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L137)

Override for the instruction text placed before the user query in the
router prompt (role + task framing). When omitted, the SDK built-in
default is used. The server catalog, user query, and output rules are
always appended by the SDK regardless of this value.

---

### cache?

> `optional` **cache?**: `object`

Defined in: [types/toolRouting.ts:143](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L143)

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

Defined in: [types/toolRouting.ts:156](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L156)

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

Defined in: [types/toolRouting.ts:168](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L168)

L2 embedding fast-path (ITEM B). When enabled the SDK ranks tools by
semantic + lexical relevance using a hybrid cosine/BM25 score and narrows
the candidate set BEFORE (or instead of) the LLM router. Disabled by
default for backward compatibility.

---

### granularity?

> `optional` **granularity?**: `"server"` \| `"tool"`

Defined in: [types/toolRouting.ts:179](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/toolRouting.ts#L179)

Routing granularity (ITEM D).

- `"server"` (default) — routing excludes the tools of entire unpicked
  servers. This is the original behavior.
- `"tool"` — routing excludes individual tools that are not in the
  embedding top-K candidate set, regardless of which server they belong
  to. Requires `embedding.enabled: true`; if the embedding fast-path is
  off (or fails) the granularity falls back to `"server"` automatically.
