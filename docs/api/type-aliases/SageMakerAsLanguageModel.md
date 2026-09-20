[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1953](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1953)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1954](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1954)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1955](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1955)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1956](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1956)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1957](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1957)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1958](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1958)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1959](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1959)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
