[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredBodyArtifact

# Type Alias: StoredBodyArtifact

> **StoredBodyArtifact** = `object`

Defined in: [types/proxy.ts:3031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3031)

Persisted artifact produced when a body is stored to disk.

## Properties

### inputRetainedBytes?

> `optional` **inputRetainedBytes?**: `number`

Defined in: [types/proxy.ts:3033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3033)

Bytes supplied to redaction, after any source observer limit.

---

### inputEncoding?

> `optional` **inputEncoding?**: `"utf8_text"` \| `"structured_object"`

Defined in: [types/proxy.ts:3034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3034)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:3035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3035)

---

### processingTruncated?

> `optional` **processingTruncated?**: `boolean`

Defined in: [types/proxy.ts:3036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3036)

---

### redactionLossy?

> `optional` **redactionLossy?**: `boolean`

Defined in: [types/proxy.ts:3038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3038)

Invalid structured frames were removed for secret safety.

---

### unparseableRedactedFrames?

> `optional` **unparseableRedactedFrames?**: `number`

Defined in: [types/proxy.ts:3039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3039)

---

### bodyPath?

> `optional` **bodyPath?**: `string`

Defined in: [types/proxy.ts:3040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3040)

---

### bodySha256?

> `optional` **bodySha256?**: `string`

Defined in: [types/proxy.ts:3041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3041)

---

### redactedBodyBytes?

> `optional` **redactedBodyBytes?**: `number`

Defined in: [types/proxy.ts:3042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3042)

---

### storedFileBytes?

> `optional` **storedFileBytes?**: `number`

Defined in: [types/proxy.ts:3043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3043)

---

### redactedBody?

> `optional` **redactedBody?**: `string`

Defined in: [types/proxy.ts:3044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3044)

---

### bodyTruncated?

> `optional` **bodyTruncated?**: `boolean`

Defined in: [types/proxy.ts:3045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3045)

---

### bodyCaptureLimitBytes?

> `optional` **bodyCaptureLimitBytes?**: `number`

Defined in: [types/proxy.ts:3046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3046)

---

### originalRedactedBodyBytes?

> `optional` **originalRedactedBodyBytes?**: `number`

Defined in: [types/proxy.ts:3047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3047)

---

### bodyWriteFailed?

> `optional` **bodyWriteFailed?**: `boolean`

Defined in: [types/proxy.ts:3048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3048)
