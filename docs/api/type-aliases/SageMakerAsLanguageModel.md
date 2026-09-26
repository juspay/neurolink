[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerAsLanguageModel

# Type Alias: SageMakerAsLanguageModel

> **SageMakerAsLanguageModel** = `object`

Defined in: [types/providers.ts:1982](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1982)

Structural type that captures what AI SDK's `streamText` / `generateText`
actually invoke at runtime on a model object.

`SageMakerLanguageModel` satisfies this type. Consumers can cast
`new SageMakerLanguageModel(...)` to `LanguageModel` via this
intermediate type, avoiding `as unknown as LanguageModel`.

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `string`

Defined in: [types/providers.ts:1983](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1983)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/providers.ts:1984](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1984)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/providers.ts:1985](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1985)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\>

Defined in: [types/providers.ts:1986](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1986)

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1987](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1987)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### doStream()

> **doStream**(`options`): `Promise`\<`unknown`\>

Defined in: [types/providers.ts:1988](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1988)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>
