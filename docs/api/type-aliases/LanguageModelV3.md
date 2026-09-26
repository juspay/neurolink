[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3

# Type Alias: LanguageModelV3

> **LanguageModelV3** = `object`

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `"v3"`

---

### provider

> `readonly` **provider**: `string`

---

### modelId

> `readonly` **modelId**: `string`

---

### supportedUrls

> `readonly` **supportedUrls**: `Record`\<`string`, `RegExp`[]\> \| `PromiseLike`\<`Record`\<`string`, `RegExp`[]\>\>

## Methods

### doGenerate()

> **doGenerate**(`options`): `PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

#### Parameters

##### options

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

---

### doStream()

> **doStream**(`options`): `PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>

#### Parameters

##### options

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>
