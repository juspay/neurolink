[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredBodyArtifact

# Type Alias: StoredBodyArtifact

> **StoredBodyArtifact** = `object`

Defined in: [types/proxy.ts:2901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2901)

Persisted artifact produced when a body is stored to disk.

## Properties

### inputRetainedBytes?

> `optional` **inputRetainedBytes?**: `number`

Defined in: [types/proxy.ts:2903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2903)

Bytes supplied to redaction, after any source observer limit.

---

### inputEncoding?

> `optional` **inputEncoding?**: `"utf8_text"` \| `"structured_object"`

Defined in: [types/proxy.ts:2904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2904)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2905)

---

### processingTruncated?

> `optional` **processingTruncated?**: `boolean`

Defined in: [types/proxy.ts:2906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2906)

---

### redactionLossy?

> `optional` **redactionLossy?**: `boolean`

Defined in: [types/proxy.ts:2908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2908)

Invalid structured frames were removed for secret safety.

---

### unparseableRedactedFrames?

> `optional` **unparseableRedactedFrames?**: `number`

Defined in: [types/proxy.ts:2909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2909)

---

### bodyPath?

> `optional` **bodyPath?**: `string`

Defined in: [types/proxy.ts:2910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2910)

---

### bodySha256?

> `optional` **bodySha256?**: `string`

Defined in: [types/proxy.ts:2911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2911)

---

### redactedBodyBytes?

> `optional` **redactedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2912)

---

### storedFileBytes?

> `optional` **storedFileBytes?**: `number`

Defined in: [types/proxy.ts:2913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2913)

---

### redactedBody?

> `optional` **redactedBody?**: `string`

Defined in: [types/proxy.ts:2914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2914)

---

### bodyTruncated?

> `optional` **bodyTruncated?**: `boolean`

Defined in: [types/proxy.ts:2915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2915)

---

### bodyCaptureLimitBytes?

> `optional` **bodyCaptureLimitBytes?**: `number`

Defined in: [types/proxy.ts:2916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2916)

---

### originalRedactedBodyBytes?

> `optional` **originalRedactedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2917)

---

### bodyWriteFailed?

> `optional` **bodyWriteFailed?**: `boolean`

Defined in: [types/proxy.ts:2918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2918)
