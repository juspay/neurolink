[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BodyParserConfig

# Type Alias: BodyParserConfig

> **BodyParserConfig** = `object`

Body parser configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Enable body parsing (default: true)

---

### maxSize?

> `optional` **maxSize?**: `string`

Maximum body size for parsed bodies (default: "10mb")

---

### jsonLimit?

> `optional` **jsonLimit?**: `string`

JSON body limit (default: "10mb")

---

### rawMaxSize?

> `optional` **rawMaxSize?**: `string`

Maximum size of a raw upload: `multipart/form-data`, `audio/*` and
`application/octet-stream` bodies, which reach a route as bytes
(the transcription routes). Default: `maxSize` when set, else "64mb";
the transcription routes apply their own `maxAudioBytes` (50 MB)
beneath it.

---

### urlEncoded?

> `optional` **urlEncoded?**: `boolean`

Enable URL-encoded body parsing
