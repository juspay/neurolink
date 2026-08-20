[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:2667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2667)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:2668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2668)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"`

Defined in: [types/proxy.ts:2669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2669)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:2670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2670)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:2671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2671)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:2672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2672)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:2673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2673)
