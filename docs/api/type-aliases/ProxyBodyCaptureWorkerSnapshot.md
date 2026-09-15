[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureWorkerSnapshot

# Type Alias: ProxyBodyCaptureWorkerSnapshot

> **ProxyBodyCaptureWorkerSnapshot** = `object`

Defined in: [types/proxy.ts:779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L779)

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L780)

---

### completed

> **completed**: `number`

Defined in: [types/proxy.ts:781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L781)

---

### rejected

> **rejected**: `number`

Defined in: [types/proxy.ts:782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L782)

---

### failed

> **failed**: `number`

Defined in: [types/proxy.ts:783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L783)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L784)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L785)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L786)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:787](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L787)

---

### highWaterPending

> **highWaterPending**: `number`

Defined in: [types/proxy.ts:788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L788)

---

### highWaterBytes

> **highWaterBytes**: `number`

Defined in: [types/proxy.ts:789](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L789)

---

### rejectionReasons

> **rejectionReasons**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L791)

Admission failures by exact guard, independent of processing failures.

---

### lastError?

> `optional` **lastError?**: `string`

Defined in: [types/proxy.ts:792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L792)

---

### lastRejectedAt?

> `optional` **lastRejectedAt?**: `string`

Defined in: [types/proxy.ts:793](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L793)
