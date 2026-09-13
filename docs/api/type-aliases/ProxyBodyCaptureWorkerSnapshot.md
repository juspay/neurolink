[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCaptureWorkerSnapshot

# Type Alias: ProxyBodyCaptureWorkerSnapshot

> **ProxyBodyCaptureWorkerSnapshot** = `object`

Defined in: [types/proxy.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L757)

## Properties

### attempted

> **attempted**: `number`

Defined in: [types/proxy.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L758)

---

### completed

> **completed**: `number`

Defined in: [types/proxy.ts:759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L759)

---

### rejected

> **rejected**: `number`

Defined in: [types/proxy.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L760)

---

### failed

> **failed**: `number`

Defined in: [types/proxy.ts:761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L761)

---

### pending

> **pending**: `number`

Defined in: [types/proxy.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L762)

---

### pendingBytes

> **pendingBytes**: `number`

Defined in: [types/proxy.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L763)

---

### maxPending

> **maxPending**: `number`

Defined in: [types/proxy.ts:764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L764)

---

### maxPendingBytes

> **maxPendingBytes**: `number`

Defined in: [types/proxy.ts:765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L765)

---

### rejectionReasons

> **rejectionReasons**: `Record`\<`string`, `number`\>

Defined in: [types/proxy.ts:767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L767)

Admission failures by exact guard, independent of processing failures.

---

### lastError?

> `optional` **lastError?**: `string`

Defined in: [types/proxy.ts:768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L768)
