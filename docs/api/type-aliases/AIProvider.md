[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AIProvider

# Type Alias: AIProvider

> **AIProvider** = `object`

Defined in: [types/providers.ts:912](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L912)

AI Provider type with flexible parameter support

## Methods

### stream()

> **stream**(`optionsOrPrompt`, `analysisSchema?`): `Promise`\<[`StreamResult`](StreamResult.md)\>

Defined in: [types/providers.ts:914](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L914)

#### Parameters

##### optionsOrPrompt

`string` \| [`StreamOptions`](StreamOptions.md)

##### analysisSchema?

[`ValidationSchema`](ValidationSchema.md)

#### Returns

`Promise`\<[`StreamResult`](StreamResult.md)\>

---

### generate()

> **generate**(`optionsOrPrompt`, `analysisSchema?`): `Promise`\<[`EnhancedGenerateResult`](EnhancedGenerateResult.md) \| `null`\>

Defined in: [types/providers.ts:919](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L919)

#### Parameters

##### optionsOrPrompt

`string` \| [`TextGenerationOptions`](TextGenerationOptions.md)

##### analysisSchema?

[`ValidationSchema`](ValidationSchema.md)

#### Returns

`Promise`\<[`EnhancedGenerateResult`](EnhancedGenerateResult.md) \| `null`\>

---

### gen()

> **gen**(`optionsOrPrompt`, `analysisSchema?`): `Promise`\<[`EnhancedGenerateResult`](EnhancedGenerateResult.md) \| `null`\>

Defined in: [types/providers.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L924)

#### Parameters

##### optionsOrPrompt

`string` \| [`TextGenerationOptions`](TextGenerationOptions.md)

##### analysisSchema?

[`ValidationSchema`](ValidationSchema.md)

#### Returns

`Promise`\<[`EnhancedGenerateResult`](EnhancedGenerateResult.md) \| `null`\>

---

### embed()

> **embed**(`input`, `modelName?`): `Promise`\<`number`[]\>

Defined in: [types/providers.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L934)

Generate an embedding vector for text or multi-modal input.
Accepts either a plain string (text-only) or an EmbedInput object
for multi-modal embeddings (text + image).

#### Parameters

##### input

`string` \| [`EmbedInput`](EmbedInput.md)

##### modelName?

`string`

#### Returns

`Promise`\<`number`[]\>

---

### embedMany()

> **embedMany**(`texts`, `modelName?`): `Promise`\<`number`[][]\>

Defined in: [types/providers.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L939)

Generate embedding vectors for multiple text inputs in batch.

#### Parameters

##### texts

`string`[]

##### modelName?

`string`

#### Returns

`Promise`\<`number`[][]\>

---

### decide()?

> `optional` **decide**(`request`): `Promise`\<[`DecisionResult`](DecisionResult.md)\>

Defined in: [types/providers.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L950)

Evaluate a state against a batch of typed questions — the `decide`
inference type. Implemented by BaseProvider (throws by default, as
`embed` does); only providers whose descriptor declares `"decide"` in
`inferenceKinds` override it.

Optional so external AIProvider implementations still compile; callers
must treat absence as "this provider cannot decide".

#### Parameters

##### request

[`DecisionRequest`](DecisionRequest.md)

#### Returns

`Promise`\<[`DecisionResult`](DecisionResult.md)\>

---

### setupToolExecutor()

> **setupToolExecutor**(`sdk`, `functionTag`): `void`

Defined in: [types/providers.ts:953](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L953)

#### Parameters

##### sdk

###### customTools

`Map`\<`string`, `unknown`\>

###### executeTool

(`toolName`, `params`) => `Promise`\<`unknown`\>

##### functionTag

`string`

#### Returns

`void`

---

### setTraceContext()

> **setTraceContext**(`ctx`): `void`

Defined in: [types/providers.ts:965](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L965)

Propagate trace context from NeuroLink SDK for parent-child span hierarchy.
Use this method instead of accessing `_traceContext` directly.

#### Parameters

##### ctx

\{ `traceId`: `string`; `parentSpanId`: `string`; \} \| `null`

#### Returns

`void`

---

### setFileToolRootPolicy()?

> `optional` **setFileToolRootPolicy**(`policy`): `void`

Defined in: [types/providers.ts:971](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L971)

Bind the built-in file tools to one request's root policy. Optional so
custom provider implementations keep compiling; BaseProvider implements it.

#### Parameters

##### policy

[`FileToolRootPolicy`](FileToolRootPolicy.md) \| `undefined`

#### Returns

`void`

---

### supportsTools()?

> `optional` **supportsTools**(): `boolean`

Defined in: [types/providers.ts:980](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L980)

Whether this provider supports native tool/function calling for the
current model. Implemented by BaseProvider (default true); overridden by
providers with model-dependent or absent tool support (ollama,
huggingface, image providers). Optional for compile compatibility with
external AIProvider implementations — callers treat absence as `true`.

#### Returns

`boolean`

---

### ensureModelLimits()?

> `optional` **ensureModelLimits**(): `Promise`\<`void`\>

Defined in: [types/providers.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L990)

Ensure runtime-discovered model limits (context window, output-token
ceiling) are registered before budget math runs. Implemented by
BaseProvider (default no-op); providers with a discovery source override
it (LiteLLM `/model/info`). Must never reject — discovery failure
degrades to static defaults. Optional for compile compatibility with
external AIProvider implementations — callers treat absence as no-op.

#### Returns

`Promise`\<`void`\>
