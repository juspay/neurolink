[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedactionConfig

# Type Alias: RedactionConfig

> **RedactionConfig** = `object`

Configuration for stream redaction

IMPORTANT: Redaction is DISABLED by default (enabled: false)
This is an opt-in security feature to prevent accidental data exposure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Enable stream redaction (default: false)

When false, redactStreamChunk() returns chunks unchanged.
Must be explicitly set to true to enable redaction.

---

### additionalFields?

> `optional` **additionalFields?**: `string`[]

Additional field names to redact (case-insensitive)

---

### preserveFields?

> `optional` **preserveFields?**: `string`[]

Field names to preserve (not redact)

---

### redactToolArgs?

> `optional` **redactToolArgs?**: `boolean`

Whether to redact tool arguments when enabled (default: true)

---

### redactToolResults?

> `optional` **redactToolResults?**: `boolean`

Whether to redact tool results when enabled (default: true)

---

### placeholder?

> `optional` **placeholder?**: `string`

Custom redaction placeholder (default: "[REDACTED]")
