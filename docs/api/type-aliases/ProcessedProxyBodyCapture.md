[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedProxyBodyCapture

# Type Alias: ProcessedProxyBodyCapture

> **ProcessedProxyBodyCapture** = `object`

Defined in: [types/proxy.ts:826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L826)

## Properties

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L827)

---

### stored

> **stored**: [`StoredBodyArtifact`](StoredBodyArtifact.md)

Defined in: [types/proxy.ts:828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L828)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L829)

---

### queueWaitMs?

> `optional` **queueWaitMs?**: `number`

Defined in: [types/proxy.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L831)

Admission plus worker queue time; retained for existing consumers.

---

### admissionWaitMs?

> `optional` **admissionWaitMs?**: `number`

Defined in: [types/proxy.ts:832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L832)

---

### workerQueueWaitMs?

> `optional` **workerQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L833)

---

### processingMs?

> `optional` **processingMs?**: `number`

Defined in: [types/proxy.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L834)

---

### admission?

> `optional` **admission?**: [`ProxyBodyCaptureAdmission`](ProxyBodyCaptureAdmission.md)

Defined in: [types/proxy.ts:835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L835)
