[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:2657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2657)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:2658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2658)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"`

Defined in: [types/proxy.ts:2659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2659)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:2660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2660)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:2661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2661)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:2662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2662)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:2663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2663)
