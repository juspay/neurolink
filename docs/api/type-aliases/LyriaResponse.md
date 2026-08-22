[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LyriaResponse

# Type Alias: LyriaResponse

> **LyriaResponse** = `object`

Defined in: [types/music.ts:194](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/music.ts#L194)

Google Lyria 3 Pro :generateContent response shape.

The audio comes back as a part with `inlineData: { mimeType, data }`
where `data` is base64-encoded WAV.

## Properties

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/music.ts:195](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/music.ts#L195)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]

#### finishReason?

> `optional` **finishReason?**: `string`

#### index?

> `optional` **index?**: `number`

---

### usageMetadata?

> `optional` **usageMetadata?**: `object`

Defined in: [types/music.ts:208](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/music.ts#L208)

#### promptTokenCount?

> `optional` **promptTokenCount?**: `number`

#### candidatesTokenCount?

> `optional` **candidatesTokenCount?**: `number`

#### totalTokenCount?

> `optional` **totalTokenCount?**: `number`
