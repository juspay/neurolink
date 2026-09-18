[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2212)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2213)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2214)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2215)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2216)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2217)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2219)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
