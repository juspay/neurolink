[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AIProvider

# Type Alias: AIProvider

> **AIProvider** = `object`

Defined in: [types/providers.ts:597](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L597)

AI Provider type with flexible parameter support

## Methods

### stream()

> **stream**(`optionsOrPrompt`, `analysisSchema?`): `Promise`\<[`StreamResult`](StreamResult.md)\>

Defined in: [types/providers.ts:599](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L599)

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

Defined in: [types/providers.ts:604](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L604)

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

Defined in: [types/providers.ts:609](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L609)

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

Defined in: [types/providers.ts:614](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L614)

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

Defined in: [types/providers.ts:616](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L616)

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

Defined in: [types/providers.ts:619](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L619)

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

Defined in: [types/providers.ts:631](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L631)

Propagate trace context from NeuroLink SDK for parent-child span hierarchy.
Use this method instead of accessing `_traceContext` directly.

#### Parameters

##### ctx

\{ `traceId`: `string`; `parentSpanId`: `string`; \} \| `null`

#### Returns

`void`
