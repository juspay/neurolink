[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedactionConfig

# Type Alias: RedactionConfig

> **RedactionConfig** = `object`

Defined in: [types/server.ts:211](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L211)

Configuration for stream redaction

IMPORTANT: Redaction is DISABLED by default (enabled: false)
This is an opt-in security feature to prevent accidental data exposure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/server.ts:218](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L218)

Enable stream redaction (default: false)

When false, redactStreamChunk() returns chunks unchanged.
Must be explicitly set to true to enable redaction.

---

### additionalFields?

> `optional` **additionalFields?**: `string`[]

Defined in: [types/server.ts:221](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L221)

Additional field names to redact (case-insensitive)

---

### preserveFields?

> `optional` **preserveFields?**: `string`[]

Defined in: [types/server.ts:224](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L224)

Field names to preserve (not redact)

---

### redactToolArgs?

> `optional` **redactToolArgs?**: `boolean`

Defined in: [types/server.ts:227](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L227)

Whether to redact tool arguments when enabled (default: true)

---

### redactToolResults?

> `optional` **redactToolResults?**: `boolean`

Defined in: [types/server.ts:230](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L230)

Whether to redact tool results when enabled (default: true)

---

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: [types/server.ts:233](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L233)

Custom redaction placeholder (default: "[REDACTED]")
