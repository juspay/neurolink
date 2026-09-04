[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:2805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2805)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:2806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2806)

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

Defined in: [types/proxy.ts:2810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2810)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:2811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2811)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2812)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2813)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:2814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2814)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:2815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2815)

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

Defined in: [types/proxy.ts:2820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2820)

#### Parameters

##### message

`string`

#### Returns

`void`
