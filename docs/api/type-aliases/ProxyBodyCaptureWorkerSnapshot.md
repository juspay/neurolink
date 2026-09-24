[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureWorkerSnapshot

# Type Alias: ProxyBodyCaptureWorkerSnapshot

> **ProxyBodyCaptureWorkerSnapshot** = `object` & `ProxyBodyCaptureWaitingSnapshot`

Defined in: [types/proxy.ts:909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L909)

## Type Declaration

### processing?

> `optional` **processing?**: `number`

### publishing?

> `optional` **publishing?**: `number`

### oldestAdmissionWaitMs?

> `optional` **oldestAdmissionWaitMs?**: `number`

### oldestProcessingMs?

> `optional` **oldestProcessingMs?**: `number`

### oldestPublicationMs?

> `optional` **oldestPublicationMs?**: `number`

### attempted

> **attempted**: `number`

### completed

> **completed**: `number`

### rejected

> **rejected**: `number`

### failed

> **failed**: `number`

### pending

> **pending**: `number`

### pendingBytes

> **pendingBytes**: `number`

### maxPending

> **maxPending**: `number`

### maxPendingBytes

> **maxPendingBytes**: `number`

### highWaterPending

> **highWaterPending**: `number`

### highWaterBytes

> **highWaterBytes**: `number`

### rejectionReasons

> **rejectionReasons**: `Record`\<`string`, `number`\>

Admission failures by exact guard, independent of processing failures.

### lastError?

> `optional` **lastError?**: `string`

### lastRejectedAt?

> `optional` **lastRejectedAt?**: `string`
