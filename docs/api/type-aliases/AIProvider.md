[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AIProvider

# Type Alias: AIProvider

> **AIProvider** = `object`

Defined in: [types/providers.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L831)

AI Provider type with flexible parameter support

## Methods

### stream()

> **stream**(`optionsOrPrompt`, `analysisSchema?`): `Promise`\<[`StreamResult`](StreamResult.md)\>

Defined in: [types/providers.ts:833](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L833)

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

Defined in: [types/providers.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L838)

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

Defined in: [types/providers.ts:843](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L843)

#### Parameters

##### optionsOrPrompt

`string` \| [`TextGenerationOptions`](TextGenerationOptions.md)

##### analysisSchema?

[`ValidationSchema`](ValidationSchema.md)

#### Returns

`Promise`\<[`EnhancedGenerateResult`](EnhancedGenerateResult.md) \| `null`\>

---

### embed()

> **embed**(`text`, `modelName?`): `Promise`\<`number`[]\>

Defined in: [types/providers.ts:848](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L848)

#### Parameters

##### text

`string`

##### modelName?

`string`

#### Returns

`Promise`\<`number`[]\>

---

### embedMany()

> **embedMany**(`texts`, `modelName?`): `Promise`\<`number`[][]\>

Defined in: [types/providers.ts:850](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L850)

#### Parameters

##### texts

`string`[]

##### modelName?

`string`

#### Returns

`Promise`\<`number`[][]\>

---

### setupToolExecutor()

> **setupToolExecutor**(`sdk`, `functionTag`): `void`

Defined in: [types/providers.ts:853](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L853)

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

Defined in: [types/providers.ts:865](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L865)

Propagate trace context from NeuroLink SDK for parent-child span hierarchy.
Use this method instead of accessing `_traceContext` directly.

#### Parameters

##### ctx

\{ `traceId`: `string`; `parentSpanId`: `string`; \} \| `null`

#### Returns

`void`

---

### supportsTools()?

> `optional` **supportsTools**(): `boolean`

Defined in: [types/providers.ts:874](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L874)

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

Defined in: [types/providers.ts:884](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L884)

Ensure runtime-discovered model limits (context window, output-token
ceiling) are registered before budget math runs. Implemented by
BaseProvider (default no-op); providers with a discovery source override
it (LiteLLM `/model/info`). Must never reject — discovery failure
degrades to static defaults. Optional for compile compatibility with
external AIProvider implementations — callers treat absence as no-op.

#### Returns

`Promise`\<`void`\>
