[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedProxyBodyCapture

# Type Alias: ProcessedProxyBodyCapture

> **ProcessedProxyBodyCapture** = `object`

Defined in: [types/proxy.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L806)

## Properties

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L807)

---

### stored

> **stored**: [`StoredBodyArtifact`](StoredBodyArtifact.md)

Defined in: [types/proxy.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L808)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/proxy.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L809)

---

### queueWaitMs?

> `optional` **queueWaitMs?**: `number`

Defined in: [types/proxy.ts:811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L811)

Admission plus worker queue time; retained for existing consumers.

---

### admissionWaitMs?

> `optional` **admissionWaitMs?**: `number`

Defined in: [types/proxy.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L812)

---

### workerQueueWaitMs?

> `optional` **workerQueueWaitMs?**: `number`

Defined in: [types/proxy.ts:813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L813)

---

### processingMs?

> `optional` **processingMs?**: `number`

Defined in: [types/proxy.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L814)

---

### admission?

> `optional` **admission?**: [`ProxyBodyCaptureAdmission`](ProxyBodyCaptureAdmission.md)

Defined in: [types/proxy.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L815)
