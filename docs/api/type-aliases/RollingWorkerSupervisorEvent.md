[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:2756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2756)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:2757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2757)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"`

Defined in: [types/proxy.ts:2758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2758)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:2759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2759)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:2760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2760)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:2761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2761)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:2762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2762)
