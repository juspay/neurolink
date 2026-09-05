[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorEvent

# Type Alias: RollingWorkerSupervisorEvent

> **RollingWorkerSupervisorEvent** = `object`

Defined in: [types/proxy.ts:2780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2780)

## Properties

### at

> **at**: `string`

Defined in: [types/proxy.ts:2781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2781)

---

### type

> **type**: `"activated"` \| `"failure"` \| `"failed_transfer"` \| `"rejected_socket"`

Defined in: [types/proxy.ts:2782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2782)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:2783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2783)

---

### version

> **version**: `string` \| `null`

Defined in: [types/proxy.ts:2784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2784)

---

### phase?

> `optional` **phase?**: `"startup"` \| `"activation"` \| `"runtime"` \| `"transfer"`

Defined in: [types/proxy.ts:2785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2785)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/proxy.ts:2786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2786)
