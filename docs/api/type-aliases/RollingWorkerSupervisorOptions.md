[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:2701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2701)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:2702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2702)

#### Parameters

##### generation

`number`

##### expectedVersion

`string`

#### Returns

[`RollingWorkerHandle`](RollingWorkerHandle.md)

---

### readyTimeoutMs?

> `optional` **readyTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2706)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:2707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2707)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2708)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2709)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:2710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2710)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:2711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2711)

#### Parameters

##### request

###### generation

`number`

###### pid

`number`

###### reason

`"environment"`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2716)

#### Parameters

##### message

`string`

#### Returns

`void`
