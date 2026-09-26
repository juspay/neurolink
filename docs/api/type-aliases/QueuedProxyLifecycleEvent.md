[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueuedProxyLifecycleEvent

# Type Alias: QueuedProxyLifecycleEvent

> **QueuedProxyLifecycleEvent** = `object`

Serialized lifecycle line awaiting a bounded batch write.

## Properties

### filePrefix?

> `optional` **filePrefix?**: `string`

---

### logDir

> **logDir**: `string`

---

### date

> **date**: `string`

---

### record

> **record**: `Record`\<`string`, `unknown`\>

---

### writeRetries

> **writeRetries**: `number`

---

### onPersisted?

> `optional` **onPersisted?**: (`confirmed`) => `void`

Resolve only after the original append settles; uncertain writes fail.

#### Parameters

##### confirmed

`boolean`

#### Returns

`void`
