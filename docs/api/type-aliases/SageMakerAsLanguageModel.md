[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1961](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1961)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1962](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1962)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1963](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1963)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1964](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1964)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1965](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1965)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1966](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1966)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1967](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1967)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
