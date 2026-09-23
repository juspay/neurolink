[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2387)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2388)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2389)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2390)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2391)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2392)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2394)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
