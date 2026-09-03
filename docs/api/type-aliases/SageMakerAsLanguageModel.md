[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1910)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1911)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1912)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1913)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1914](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1914)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1915)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1916)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
