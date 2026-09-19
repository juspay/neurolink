[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1923)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1924)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1925)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1926)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1927)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1928)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1929)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
