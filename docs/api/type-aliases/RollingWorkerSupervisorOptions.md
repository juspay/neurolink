[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3132)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3133)

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

Defined in: [types/proxy.ts:3137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3137)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3138)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3140)

Bound IPC socket offers independently of active HTTP requests.

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3141)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3142)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3143)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3144)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:3145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3145)

#### Parameters

##### request

###### generation

`number`

###### pid

`number`

###### reason

`"environment"` \| `"socket_offer_timeout"` \| `"socket_commit_timeout"` \| `"socket_transfer_failure"`

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3154)

#### Parameters

##### message

`string`

#### Returns

`void`
