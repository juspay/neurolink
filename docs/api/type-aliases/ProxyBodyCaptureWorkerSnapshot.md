[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureWorkerSnapshot

# Type Alias: ProxyBodyCaptureWorkerSnapshot

> **ProxyBodyCaptureWorkerSnapshot** = `object`

Defined in: [types/proxy.ts:775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L775)

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L776)

---

### completed

> **completed**: `number`

Defined in: [types/proxy.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L777)

---

### rejected

> **rejected**: `number`

Defined in: [types/proxy.ts:778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L778)

---

### failed

> **failed**: `number`

Defined in: [types/proxy.ts:779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L779)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L780)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L781)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L782)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L783)

---

### highWaterPending

> **highWaterPending**: `number`

Defined in: [types/proxy.ts:784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L784)

---

### highWaterBytes

> **highWaterBytes**: `number`

Defined in: [types/proxy.ts:785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L785)

---

### rejectionReasons

> **rejectionReasons**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L787)

Admission failures by exact guard, independent of processing failures.

---

### lastError?

> `optional` **lastError?**: `string`

Defined in: [types/proxy.ts:788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L788)

---

### lastRejectedAt?

> `optional` **lastRejectedAt?**: `string`

Defined in: [types/proxy.ts:789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L789)
