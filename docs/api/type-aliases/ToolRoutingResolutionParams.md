[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingResolutionParams

# Type Alias: ToolRoutingResolutionParams

> **ToolRoutingResolutionParams** = `object`

Defined in: [types/toolRouting.ts:278](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L278)

Parameters for `resolveToolRoutingExclusions()`.

## Properties

### catalog

> **catalog**: [`ToolRoutingCatalogEntry`](ToolRoutingCatalogEntry.md)[]

Defined in: [types/toolRouting.ts:280](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L280)

Full catalog; always-include servers are filtered out internally.

---

### alwaysIncludeServerIds

> **alwaysIncludeServerIds**: `string`[]

Defined in: [types/toolRouting.ts:282](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L282)

Server ids never offered to the router.

---

### userQuery

> **userQuery**: `string`

Defined in: [types/toolRouting.ts:284](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L284)

Current user query (the stream input text, before memory enrichment).

---

### routerPromptPrefix?

> `optional` **routerPromptPrefix?**: `string`

Defined in: [types/toolRouting.ts:286](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L286)

Instruction text placed before the user query. Defaults to the SDK built-in.

---

### routerModel

> **routerModel**: [`ToolRoutingModelConfig`](ToolRoutingModelConfig.md)

Defined in: [types/toolRouting.ts:288](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L288)

Router LLM settings, already resolved against the stream call's options.

---

### timeoutMs

> **timeoutMs**: `number`

Defined in: [types/toolRouting.ts:290](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L290)

Timeout for the router call in milliseconds.

---

### generateFn

> **generateFn**: (`options`) => `Promise`\<[`GenerateResult`](GenerateResult.md)\>

Defined in: [types/toolRouting.ts:292](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L292)

Invokes the router LLM — `NeuroLink.generate` bound by the caller.

#### Parameters

##### options

[`GenerateOptions`](GenerateOptions.md)

#### Returns

`Promise`\<[`GenerateResult`](GenerateResult.md)\>

---

### emitDecision?

> `optional` **emitDecision?**: (`decision`) => `void`

Defined in: [types/toolRouting.ts:299](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L299)

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

Defined in: [types/toolRouting.ts:310](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L310)

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

Defined in: [types/toolRouting.ts:315](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L315)

Embedding fast-path configuration forwarded from `ToolRoutingConfig`.
Only consulted when `embedFn` is provided.

---

### granularity?

> `optional` **granularity?**: `"server"` \| `"tool"`

Defined in: [types/toolRouting.ts:319](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L319)

Routing granularity forwarded from `ToolRoutingConfig`. Default: "server".

---

### embeddingVectorCache?

> `optional` **embeddingVectorCache?**: `Map`\<`string`, `number`[]\>

Defined in: [types/toolRouting.ts:330](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L330)

Optional shared vector cache for the L2 embedding fast-path. When
supplied, tool embedding vectors computed on prior turns are reused rather
than re-fetched from the embedding provider on every call.

The NeuroLink instance manages the lifecycle: it creates the Map once and
passes the same reference across turns. It clears the reference when the
tool catalog changes (via `setToolRoutingServers`) so stale vectors are
never used after a catalog update.
