[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LyriaResponse

# Type Alias: LyriaResponse

> **LyriaResponse** = `object`

Google Lyria 3 Pro :generateContent response shape.

The audio comes back as a part with `inlineData: { mimeType, data }`
where `data` is base64-encoded WAV.

## Properties

### candidates?

> `optional` **candidates?**: `object`[]

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

#### promptTokenCount?

> `optional` **promptTokenCount?**: `number`

#### candidatesTokenCount?

> `optional` **candidatesTokenCount?**: `number`

#### totalTokenCount?

> `optional` **totalTokenCount?**: `number`
