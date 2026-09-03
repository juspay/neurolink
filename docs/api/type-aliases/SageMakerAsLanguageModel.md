[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1900](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1900)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1901](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1901)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1902](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1902)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1903)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1904](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1904)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1905)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1906](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1906)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
