[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicResult

# Type Alias: MusicResult

> **MusicResult** = `object`

Result of a music generation request.

## Properties

### buffer

> **buffer**: `Buffer`

Generated audio buffer.

---

### format

> **format**: [`MusicAudioFormat`](MusicAudioFormat.md)

Output format.

---

### size

> **size**: `number`

File size in bytes.

---

### duration?

> `optional` **duration?**: `number`

Duration in seconds (when reported by the provider).

---

### provider?

> `optional` **provider?**: `string`

Provider used for generation.

---

### metadata?

> `optional` **metadata?**: `object`

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
