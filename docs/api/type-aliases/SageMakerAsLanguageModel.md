[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1917)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1918)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1919)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1920)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1921)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1922)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1923)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
