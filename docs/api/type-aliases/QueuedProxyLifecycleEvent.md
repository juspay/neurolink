[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2455)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2456)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2457)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2458)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2459)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2460)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2462)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
