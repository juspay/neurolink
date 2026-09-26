[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessedProxyBodyCapture

# Type Alias: ProcessedProxyBodyCapture

> **ProcessedProxyBodyCapture** = `object`

## Properties

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

---

### stored

> **stored**: [`StoredBodyArtifact`](StoredBodyArtifact.md)

---

### error?

> `optional` **error?**: `string`

---

### queueWaitMs?

> `optional` **queueWaitMs?**: `number`

Admission plus worker queue time; retained for existing consumers.

---

### admissionWaitMs?

> `optional` **admissionWaitMs?**: `number`

---

### workerQueueWaitMs?

> `optional` **workerQueueWaitMs?**: `number`

---

### processingMs?

> `optional` **processingMs?**: `number`

---

### admission?

> `optional` **admission?**: [`ProxyBodyCaptureAdmission`](ProxyBodyCaptureAdmission.md)
