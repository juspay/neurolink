[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Defined in: [types/proxy.ts:2367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2367)

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

Defined in: [types/proxy.ts:2368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2368)

---

### logDir

> **logDir**: `string`

Defined in: [types/proxy.ts:2369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2369)

---

### date

> **date**: `string`

Defined in: [types/proxy.ts:2370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2370)

---

### record

> **record**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2371)

---

### writeRetries

> **writeRetries**: `number`

Defined in: [types/proxy.ts:2372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2372)

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Defined in: [types/proxy.ts:2374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2374)

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
