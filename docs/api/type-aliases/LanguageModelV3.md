[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3

# Type Alias: LanguageModelV3

> **LanguageModelV3** = `object`

Defined in: [types/aiCompat.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L487)

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `"v3"`

Defined in: [types/aiCompat.ts:488](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L488)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/aiCompat.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L489)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/aiCompat.ts:490](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L490)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\> \| `PromiseLike`\<`Record`\<`string`, `RegExp`[]\>\>

Defined in: [types/aiCompat.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L491)

## Methods

### doGenerate()

> **doGenerate**(`options`): `PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

Defined in: [types/aiCompat.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L494)

#### Parameters

##### options

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

---

### doStream()

> **doStream**(`options`): `PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>

Defined in: [types/aiCompat.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L497)

#### Parameters

##### options

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>
