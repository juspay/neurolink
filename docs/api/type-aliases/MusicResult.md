[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicResult

# Type Alias: MusicResult

> **MusicResult** = `object`

Defined in: [types/music.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/music.ts#L90)

Result of a music generation request.

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/music.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/music.ts#L92)

Generated audio buffer.

---

### format

> **format**: [`MusicAudioFormat`](MusicAudioFormat.md)

Defined in: [types/music.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/music.ts#L94)

Output format.

---

### size

> **size**: `number`

Defined in: [types/music.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/music.ts#L96)

File size in bytes.

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/music.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/music.ts#L98)

Duration in seconds (when reported by the provider).

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/music.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/music.ts#L100)

Provider used for generation.

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/music.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/music.ts#L102)

Performance / request metadata.

#### Index Signature

\[`key`: `string`\]: `unknown`

Any additional provider-specific metadata.

#### latency

> **latency**: `number`

Request latency in milliseconds.

#### provider?

> `optional` **provider?**: `string`

Provider name.

#### model?

> `optional` **model?**: `string`

Model variant used (when applicable).

#### sampleRate?

> `optional` **sampleRate?**: `number`

Sample rate (when known).

#### bitRate?

> `optional` **bitRate?**: `number`

Bit rate (when known).

#### jobId?

> `optional` **jobId?**: `string`

Track / job identifier from the upstream.
