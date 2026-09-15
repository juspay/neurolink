[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2191)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2192)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2193)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2194)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2195)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2196)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2198)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
