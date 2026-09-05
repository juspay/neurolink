[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:2772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2772)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:2773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2773)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"`

Defined in: [types/proxy.ts:2774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2774)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:2775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2775)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:2776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2776)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:2777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2777)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:2778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2778)
