[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1892](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1892)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1893)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1894](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1894)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1895)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1896](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1896)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1897)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1898](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1898)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
