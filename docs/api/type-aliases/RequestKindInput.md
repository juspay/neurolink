[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestKindInput

# Type Alias: RequestKindInput

> **RequestKindInput** = `object`

Narrow structural subset of TextGenerationOptions/GenerateOptions that
resolveRequestKind() actually reads. Kept intentionally minimal (rather
than importing the full options type) so this module has no dependency
on the wider options type graph.

## Properties

### output?

> `optional` **output?**: `object`

#### mode?

> `optional` **mode?**: `string`

#### format?

> `optional` **format?**: `string`

---

### tts?

> `optional` **tts?**: `object`

#### enabled?

> `optional` **enabled?**: `boolean`

#### useAiResponse?

> `optional` **useAiResponse?**: `boolean`
