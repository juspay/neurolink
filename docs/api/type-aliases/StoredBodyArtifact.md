[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredBodyArtifact

# Type Alias: StoredBodyArtifact

> **StoredBodyArtifact** = `object`

Persisted artifact produced when a body is stored to disk.

## Properties

### inputRetainedBytes?

> `optional` **inputRetainedBytes?**: `number`

Bytes supplied to redaction, after any source observer limit.

---

### inputEncoding?

> `optional` **inputEncoding?**: `"utf8_text"` \| `"structured_object"`

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

---

### processingTruncated?

> `optional` **processingTruncated?**: `boolean`

---

### redactionLossy?

> `optional` **redactionLossy?**: `boolean`

Invalid structured frames were removed for secret safety.

---

### unparseableRedactedFrames?

> `optional` **unparseableRedactedFrames?**: `number`

---

### bodyPath?

> `optional` **bodyPath?**: `string`

---

### bodySha256?

> `optional` **bodySha256?**: `string`

---

### redactedBodyBytes?

> `optional` **redactedBodyBytes?**: `number`

---

### storedFileBytes?

> `optional` **storedFileBytes?**: `number`

---

### redactedBody?

> `optional` **redactedBody?**: `string`

---

### bodyTruncated?

> `optional` **bodyTruncated?**: `boolean`

---

### bodyCaptureLimitBytes?

> `optional` **bodyCaptureLimitBytes?**: `number`

---

### originalRedactedBodyBytes?

> `optional` **originalRedactedBodyBytes?**: `number`

---

### bodyWriteFailed?

> `optional` **bodyWriteFailed?**: `boolean`
