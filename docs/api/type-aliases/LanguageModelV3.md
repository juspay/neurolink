[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3

# Type Alias: LanguageModelV3

> **LanguageModelV3** = `object`

Defined in: [types/aiCompat.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L491)

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `"v3"`

Defined in: [types/aiCompat.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L492)

---

### provider

> `readonly` **provider**: `string`

Defined in: [types/aiCompat.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L493)

---

### modelId

> `readonly` **modelId**: `string`

Defined in: [types/aiCompat.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L494)

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\> \| `PromiseLike`\<`Record`\<`string`, `RegExp`[]\>\>

Defined in: [types/aiCompat.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L495)

## Methods

### doGenerate()

> **doGenerate**(`options`): `PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

Defined in: [types/aiCompat.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L498)

#### Parameters

##### options

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

---

### doStream()

> **doStream**(`options`): `PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>

Defined in: [types/aiCompat.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L501)

#### Parameters

##### options

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>
