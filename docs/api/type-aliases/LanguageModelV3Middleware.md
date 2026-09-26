[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3Middleware

# Type Alias: LanguageModelV3Middleware

> **LanguageModelV3Middleware** = `object`

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `"v3"`

---

### overrideProvider?

> `optional` **overrideProvider?**: (`options`) => `string`

#### Parameters

##### options

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`string`

---

### overrideModelId?

> `optional` **overrideModelId?**: (`options`) => `string`

#### Parameters

##### options

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`string`

---

### overrideSupportedUrls?

> `optional` **overrideSupportedUrls?**: (`options`) => `Record`\<`string`, `RegExp`[]\> \| `PromiseLike`\<`Record`\<`string`, `RegExp`[]\>\>

#### Parameters

##### options

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`Record`\<`string`, `RegExp`[]\> \| `PromiseLike`\<`Record`\<`string`, `RegExp`[]\>\>

---

### transformParams?

> `optional` **transformParams?**: (`options`) => `PromiseLike`\<[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)\>

#### Parameters

##### options

###### type

`"generate"` \| `"stream"`

###### params

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)\>

---

### wrapGenerate?

> `optional` **wrapGenerate?**: (`options`) => `PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

#### Parameters

##### options

###### doGenerate

() => `PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

###### doStream

() => `PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>

###### params

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

---

### wrapStream?

> `optional` **wrapStream?**: (`options`) => `PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>

#### Parameters

##### options

###### doGenerate

() => `PromiseLike`\<[`LanguageModelV3GenerateResult`](LanguageModelV3GenerateResult.md)\>

###### doStream

() => `PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>

###### params

[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`PromiseLike`\<[`LanguageModelV3StreamResult`](LanguageModelV3StreamResult.md)\>
