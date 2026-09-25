[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoredBodyArtifact

# Type Alias: StoredBodyArtifact

> **StoredBodyArtifact** = `object`

Defined in: [types/proxy.ts:2969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2969)

Persisted artifact produced when a body is stored to disk.

## Properties

### inputRetainedBytes?

> `optional` **inputRetainedBytes?**: `number`

Defined in: [types/proxy.ts:2971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2971)

Bytes supplied to redaction, after any source observer limit.

---

### inputEncoding?

> `optional` **inputEncoding?**: `"utf8_text"` \| `"structured_object"`

Defined in: [types/proxy.ts:2972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2972)

---

### sourceTruncated?

> `optional` **sourceTruncated?**: `boolean`

Defined in: [types/proxy.ts:2973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2973)

---

### processingTruncated?

> `optional` **processingTruncated?**: `boolean`

Defined in: [types/proxy.ts:2974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2974)

---

### redactionLossy?

> `optional` **redactionLossy?**: `boolean`

Defined in: [types/proxy.ts:2976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2976)

Invalid structured frames were removed for secret safety.

---

### unparseableRedactedFrames?

> `optional` **unparseableRedactedFrames?**: `number`

Defined in: [types/proxy.ts:2977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2977)

---

### bodyPath?

> `optional` **bodyPath?**: `string`

Defined in: [types/proxy.ts:2978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2978)

---

### bodySha256?

> `optional` **bodySha256?**: `string`

Defined in: [types/proxy.ts:2979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2979)

---

### redactedBodyBytes?

> `optional` **redactedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2980)

---

### storedFileBytes?

> `optional` **storedFileBytes?**: `number`

Defined in: [types/proxy.ts:2981](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2981)

---

### redactedBody?

> `optional` **redactedBody?**: `string`

Defined in: [types/proxy.ts:2982](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2982)

---

### bodyTruncated?

> `optional` **bodyTruncated?**: `boolean`

Defined in: [types/proxy.ts:2983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2983)

---

### bodyCaptureLimitBytes?

> `optional` **bodyCaptureLimitBytes?**: `number`

Defined in: [types/proxy.ts:2984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2984)

---

### originalRedactedBodyBytes?

> `optional` **originalRedactedBodyBytes?**: `number`

Defined in: [types/proxy.ts:2985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2985)

---

### bodyWriteFailed?

> `optional` **bodyWriteFailed?**: `boolean`

Defined in: [types/proxy.ts:2986](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2986)
