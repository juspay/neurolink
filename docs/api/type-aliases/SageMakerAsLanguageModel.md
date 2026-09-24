[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1973](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1973)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1974](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1974)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1975](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1975)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1976](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1976)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1977](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1977)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1978](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1978)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1979](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1979)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
