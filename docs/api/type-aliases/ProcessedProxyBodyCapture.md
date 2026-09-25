[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedProxyBodyCapture

# Type Alias: ProcessedProxyBodyCapture

> **ProcessedProxyBodyCapture** = `object`

Defined in: [types/proxy.ts:878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L878)

## Properties

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L879)

---

### stored

> **stored**: [`StoredBodyArtifact`](StoredBodyArtifact.md)

Defined in: [types/proxy.ts:880](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L880)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L881)

---

### queueWaitMs?

> `optional` **queueWaitMs?**: `number`

Defined in: [types/proxy.ts:883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L883)

Admission plus worker queue time; retained for existing consumers.

---

### admissionWaitMs?

> `optional` **admissionWaitMs?**: `number`

Defined in: [types/proxy.ts:884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L884)

---

### workerQueueWaitMs?

> `optional` **workerQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L885)

---

### processingMs?

> `optional` **processingMs?**: `number`

Defined in: [types/proxy.ts:886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L886)

---

### admission?

> `optional` **admission?**: [`ProxyBodyCaptureAdmission`](ProxyBodyCaptureAdmission.md)

Defined in: [types/proxy.ts:887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L887)
