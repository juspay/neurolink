[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestKindInput

# Type Alias: RequestKindInput

> **RequestKindInput** = `object`

Defined in: [types/dispatch.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/dispatch.ts#L22)

Narrow structural subset of TextGenerationOptions/GenerateOptions that
resolveRequestKind() actually reads. Kept intentionally minimal (rather
than importing the full options type) so this module has no dependency
on the wider options type graph.

## Properties

### output?

> `optional` **output?**: `object`

Defined in: [types/dispatch.ts:23](https://github.com/juspay/neurolink/blob/release/src/lib/types/dispatch.ts#L23)

#### mode?

> `optional` **mode?**: `string`

#### format?

> `optional` **format?**: `string`

---

### tts?

> `optional` **tts?**: `object`

Defined in: [types/dispatch.ts:27](https://github.com/juspay/neurolink/blob/release/src/lib/types/dispatch.ts#L27)

#### enabled?

> `optional` **enabled?**: `boolean`

#### useAiResponse?

> `optional` **useAiResponse?**: `boolean`
