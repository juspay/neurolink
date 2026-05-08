[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AzureTTSOptions

# Type Alias: AzureTTSOptions

> **AzureTTSOptions** = [`TTSOptions`](TTSOptions.md) & `object`

Defined in: [types/voice.ts:438](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L438)

## Type Declaration

### useSSML?

> `optional` **useSSML?**: `boolean`

### ssmlTemplate?

> `optional` **ssmlTemplate?**: `string`

### outputFormat?

> `optional` **outputFormat?**: `string`

### wordBoundary?

> `optional` **wordBoundary?**: `boolean`

### allowRawSSML?

> `optional` **allowRawSSML?**: `boolean`

Pass `text` through as raw SSML when it begins with `<speak`.

**Security:** raw SSML can change voice, embed external content, or
inject markup. Only enable when `text` originates from a TRUSTED source
(your own server-built template, not end-user input). When this flag
is false (default), all input — including text starting with `<speak`
— is XML-escaped, preventing SSML injection.

#### Default

```ts
false;
```
