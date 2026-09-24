[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedProxyBodyCapture

# Type Alias: ProcessedProxyBodyCapture

> **ProcessedProxyBodyCapture** = `object`

Defined in: [types/proxy.ts:887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L887)

## Properties

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L888)

---

### stored

> **stored**: [`StoredBodyArtifact`](StoredBodyArtifact.md)

Defined in: [types/proxy.ts:889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L889)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L890)

---

### queueWaitMs?

> `optional` **queueWaitMs?**: `number`

Defined in: [types/proxy.ts:892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L892)

Admission plus worker queue time; retained for existing consumers.

---

### admissionWaitMs?

> `optional` **admissionWaitMs?**: `number`

Defined in: [types/proxy.ts:893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L893)

---

### workerQueueWaitMs?

> `optional` **workerQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L894)

---

### processingMs?

> `optional` **processingMs?**: `number`

Defined in: [types/proxy.ts:895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L895)

---

### admission?

> `optional` **admission?**: [`ProxyBodyCaptureAdmission`](ProxyBodyCaptureAdmission.md)

Defined in: [types/proxy.ts:896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L896)
