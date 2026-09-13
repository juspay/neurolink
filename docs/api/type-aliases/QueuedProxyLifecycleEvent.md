[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2085)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2086)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2087)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2088)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2089)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2090)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2092)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
