[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2195)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2196)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2197)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2198)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2199)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2200)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2202)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
