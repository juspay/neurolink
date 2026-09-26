[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingResolutionParams

# Type Alias: ToolRoutingResolutionParams

> **ToolRoutingResolutionParams** = `object`

Parameters for `resolveToolRoutingExclusions()`.

## Properties

### catalog

> **catalog**: [`ToolRoutingCatalogEntry`](ToolRoutingCatalogEntry.md)[]

Full catalog; always-include servers are filtered out internally.

---

### alwaysIncludeServerIds

> **alwaysIncludeServerIds**: `string`[]

Server ids never offered to the router.

---

### userQuery

> **userQuery**: `string`

Current user query (the stream input text, before memory enrichment).

---

### routerPromptPrefix?

> `optional` **routerPromptPrefix?**: `string`

Instruction text placed before the user query. Defaults to the SDK built-in.

---

### routerModel

> **routerModel**: [`ToolRoutingModelConfig`](ToolRoutingModelConfig.md)

Router LLM settings, already resolved against the stream call's options.

---

### timeoutMs

> **timeoutMs**: `number`

Timeout for the router call in milliseconds.

---

### generateFn

> **generateFn**: (`options`) => `Promise`\<[`GenerateResult`](GenerateResult.md)\>

Invokes the router LLM — `NeuroLink.generate` bound by the caller.

#### Parameters

##### options

[`GenerateOptions`](GenerateOptions.md)

#### Returns

`Promise`\<[`GenerateResult`](GenerateResult.md)\>

---

### decideFn?

> `optional` **decideFn?**: [`DecisionCallerFn`](DecisionCallerFn.md)

Invokes a decision model — `NeuroLink.tryDecide` bound by the caller.
When supplied AND a decision provider is configured, one yes/no question
per server replaces the router LLM call: ~400ms and ~$0.00002 instead of
a generative call on a 15-second budget, and a calibrated probability per
server instead of a list that cannot express doubt.

Omitting it reproduces the LLM-only behaviour exactly, and so does
supplying it with no decision provider configured — the caller's bound
`tryDecide` returns null and the LLM path runs.

---

### decisionMinDropConfidence?

> `optional` **decisionMinDropConfidence?**: `number`

How confidently the decision router must answer "no" before a server's
tools are withheld. Default 0.6. Deliberately asymmetric: a wrongly
dropped server breaks the turn, a wrongly kept one costs a few hundred
tokens.

---

### emitDecision?

> `optional` **emitDecision?**: (`decision`) => `void`

Optional callback invoked once per resolution with a structured summary of
the routing decision. Called on every return path (applied, skipped,
failed-open). Must never throw — any error inside is swallowed by
the resolver.

#### Parameters

##### decision

[`ToolRoutingDecision`](ToolRoutingDecision.md)

#### Returns

`void`

---

### embedFn?

> `optional` **embedFn?**: (`texts`) => `Promise`\<`number`[][]\>

Injected async function that converts an array of texts into embedding
vectors. Built by the caller (NeuroLink) from the configured embedding
provider so the resolver stays pure and free of provider imports.
When undefined the embedding fast-path is skipped entirely.

#### Parameters

##### texts

`string`[]

#### Returns

`Promise`\<`number`[][]\>

---

### embeddingConfig?

> `optional` **embeddingConfig?**: [`ToolRoutingEmbeddingConfig`](ToolRoutingEmbeddingConfig.md)

Embedding fast-path configuration forwarded from `ToolRoutingConfig`.
Only consulted when `embedFn` is provided.

---

### granularity?

> `optional` **granularity?**: `"server"` \| `"tool"`

Routing granularity forwarded from `ToolRoutingConfig`. Default: "server".

---

### embeddingVectorCache?

> `optional` **embeddingVectorCache?**: `Map`\<`string`, `number`[]\>

Optional shared vector cache for the L2 embedding fast-path. When
supplied, tool embedding vectors computed on prior turns are reused rather
than re-fetched from the embedding provider on every call.

The NeuroLink instance manages the lifecycle: it creates the Map once and
passes the same reference across turns. It clears the reference when the
tool catalog changes (via `setToolRoutingServers`) so stale vectors are
never used after a catalog update.
