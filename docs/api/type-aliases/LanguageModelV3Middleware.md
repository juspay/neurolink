[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LanguageModelV3Middleware

# Type Alias: LanguageModelV3Middleware

> **LanguageModelV3Middleware** = `object`

Defined in: [types/aiCompat.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L506)

## Properties

### specificationVersion

> `readonly` **specificationVersion**: `"v3"`

Defined in: [types/aiCompat.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L507)

---

### overrideProvider?

> `optional` **overrideProvider?**: (`options`) => `string`

Defined in: [types/aiCompat.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L508)

#### Parameters

##### options

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`string`

---

### overrideModelId?

> `optional` **overrideModelId?**: (`options`) => `string`

Defined in: [types/aiCompat.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L509)

#### Parameters

##### options

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`string`

---

### overrideSupportedUrls?

> `optional` **overrideSupportedUrls?**: (`options`) => `Record`\<`string`, `RegExp`[]\> \| `PromiseLike`\<`Record`\<`string`, `RegExp`[]\>\>

Defined in: [types/aiCompat.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L510)

#### Parameters

##### options

###### model

[`LanguageModelV3`](LanguageModelV3.md)

#### Returns

`Record`\<`string`, `RegExp`[]\> \| `PromiseLike`\<`Record`\<`string`, `RegExp`[]\>\>

---

### transformParams?

> `optional` **transformParams?**: (`options`) => `PromiseLike`\<[`LanguageModelV3CallOptions`](LanguageModelV3CallOptions.md)\>

Defined in: [types/aiCompat.ts:513](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L513)

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

Defined in: [types/aiCompat.ts:518](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L518)

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

Defined in: [types/aiCompat.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L524)

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
