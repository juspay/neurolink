[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredBodyArtifact

# Type Alias: StoredBodyArtifact

> **StoredBodyArtifact** = `object`

Defined in: [types/proxy.ts:2904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2904)

Persisted artifact produced when a body is stored to disk.

## Properties

### inputRetainedBytes?

> `optional` **inputRetainedBytes?**: `number`

Defined in: [types/proxy.ts:2906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2906)

Bytes supplied to redaction, after any source observer limit.

---

### inputEncoding?

> `optional` **inputEncoding?**: `"utf8_text"` \| `"structured_object"`

Defined in: [types/proxy.ts:2907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2907)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2908)

---

### processingTruncated?

> `optional` **processingTruncated?**: `boolean`

Defined in: [types/proxy.ts:2909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2909)

---

### redactionLossy?

> `optional` **redactionLossy?**: `boolean`

Defined in: [types/proxy.ts:2911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2911)

Invalid structured frames were removed for secret safety.

---

### unparseableRedactedFrames?

> `optional` **unparseableRedactedFrames?**: `number`

Defined in: [types/proxy.ts:2912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2912)

---

### bodyPath?

> `optional` **bodyPath?**: `string`

Defined in: [types/proxy.ts:2913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2913)

---

### bodySha256?

> `optional` **bodySha256?**: `string`

Defined in: [types/proxy.ts:2914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2914)

---

### redactedBodyBytes?

> `optional` **redactedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2915)

---

### storedFileBytes?

> `optional` **storedFileBytes?**: `number`

Defined in: [types/proxy.ts:2916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2916)

---

### redactedBody?

> `optional` **redactedBody?**: `string`

Defined in: [types/proxy.ts:2917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2917)

---

### bodyTruncated?

> `optional` **bodyTruncated?**: `boolean`

Defined in: [types/proxy.ts:2918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2918)

---

### bodyCaptureLimitBytes?

> `optional` **bodyCaptureLimitBytes?**: `number`

Defined in: [types/proxy.ts:2919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2919)

---

### originalRedactedBodyBytes?

> `optional` **originalRedactedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2920)

---

### bodyWriteFailed?

> `optional` **bodyWriteFailed?**: `boolean`

Defined in: [types/proxy.ts:2921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2921)
