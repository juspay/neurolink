[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:2790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2790)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:2791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2791)

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

Defined in: [types/proxy.ts:2795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2795)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:2796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2796)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2797)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2798](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2798)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:2799](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2799)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:2800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2800)

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

Defined in: [types/proxy.ts:2805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2805)

#### Parameters

##### message

`string`

#### Returns

`void`
