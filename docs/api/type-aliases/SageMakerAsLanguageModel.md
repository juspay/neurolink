[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1882)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1883)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1884)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1885)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1886)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1887)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1888)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
