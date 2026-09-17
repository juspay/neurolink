[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureWorkerSnapshot

# Type Alias: ProxyBodyCaptureWorkerSnapshot

> **ProxyBodyCaptureWorkerSnapshot** = `object` & `ProxyBodyCaptureWaitingSnapshot`

Defined in: [types/proxy.ts:779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L779)

## Type Declaration

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
