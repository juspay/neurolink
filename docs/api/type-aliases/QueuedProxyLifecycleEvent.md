[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2488)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2489)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2490)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2491)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2492)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2493)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2495)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
