[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2390)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2391)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2392](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2392)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2393)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2394)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2395)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2397)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
