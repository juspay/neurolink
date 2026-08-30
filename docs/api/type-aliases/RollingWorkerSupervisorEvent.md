[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:2734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2734)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:2735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2735)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"`

Defined in: [types/proxy.ts:2736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2736)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:2737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2737)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:2738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2738)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:2739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2739)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:2740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2740)
