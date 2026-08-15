[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AzureTTSOptions

# Type Alias: AzureTTSOptions

> **AzureTTSOptions** = [`TTSOptions`](TTSOptions.md) & `object`

Defined in: [types/voice.ts:438](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/voice.ts#L438)

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
