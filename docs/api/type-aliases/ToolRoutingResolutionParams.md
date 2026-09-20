[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingResolutionParams

# Type Alias: ToolRoutingResolutionParams

> **ToolRoutingResolutionParams** = `object`

Defined in: [types/toolRouting.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L296)

Parameters for `resolveToolRoutingExclusions()`.

## Properties

### catalog

> **catalog**: [`ToolRoutingCatalogEntry`](ToolRoutingCatalogEntry.md)[]

Defined in: [types/toolRouting.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L298)

Full catalog; always-include servers are filtered out internally.

---

### alwaysIncludeServerIds

> **alwaysIncludeServerIds**: `string`[]

Defined in: [types/toolRouting.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L300)

Server ids never offered to the router.

---

### userQuery

> **userQuery**: `string`

Defined in: [types/toolRouting.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L302)

Current user query (the stream input text, before memory enrichment).

---

### routerPromptPrefix?

> `optional` **routerPromptPrefix?**: `string`

Defined in: [types/toolRouting.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L304)

Instruction text placed before the user query. Defaults to the SDK built-in.

---

### routerModel

> **routerModel**: [`ToolRoutingModelConfig`](ToolRoutingModelConfig.md)

Defined in: [types/toolRouting.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L306)

Router LLM settings, already resolved against the stream call's options.

---

### timeoutMs

> **timeoutMs**: `number`

Defined in: [types/toolRouting.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L308)

Timeout for the router call in milliseconds.

---

### generateFn

> **generateFn**: (`options`) => `Promise`\<[`GenerateResult`](GenerateResult.md)\>

Defined in: [types/toolRouting.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L310)

Invokes the router LLM — `NeuroLink.generate` bound by the caller.

#### Parameters

##### options

[`GenerateOptions`](GenerateOptions.md)

#### Returns

`Promise`\<[`GenerateResult`](GenerateResult.md)\>

---

### decideFn?

> `optional` **decideFn?**: [`DecisionCallerFn`](DecisionCallerFn.md)

Defined in: [types/toolRouting.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L322)

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

Defined in: [types/toolRouting.ts:329](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L329)

How confidently the decision router must answer "no" before a server's
tools are withheld. Default 0.6. Deliberately asymmetric: a wrongly
dropped server breaks the turn, a wrongly kept one costs a few hundred
tokens.

---

### emitDecision?

> `optional` **emitDecision?**: (`decision`) => `void`

Defined in: [types/toolRouting.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L336)

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

Defined in: [types/toolRouting.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L347)

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

Defined in: [types/toolRouting.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L352)

Embedding fast-path configuration forwarded from `ToolRoutingConfig`.
Only consulted when `embedFn` is provided.

---

### granularity?

> `optional` **granularity?**: `"server"` \| `"tool"`

Defined in: [types/toolRouting.ts:356](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L356)

Routing granularity forwarded from `ToolRoutingConfig`. Default: "server".

---

### embeddingVectorCache?

> `optional` **embeddingVectorCache?**: `Map`\<`string`, `number`[]\>

Defined in: [types/toolRouting.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L367)

Optional shared vector cache for the L2 embedding fast-path. When
supplied, tool embedding vectors computed on prior turns are reused rather
than re-fetched from the embedding provider on every call.

The NeuroLink instance manages the lifecycle: it creates the Map once and
passes the same reference across turns. It clears the reference when the
tool catalog changes (via `setToolRoutingServers`) so stale vectors are
never used after a catalog update.
