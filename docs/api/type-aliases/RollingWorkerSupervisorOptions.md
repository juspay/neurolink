[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3464)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3465)

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

Defined in: [types/proxy.ts:3469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3469)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3470)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3472)

Bound IPC socket offers independently of active HTTP requests.

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3473)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3474)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3475)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3476)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:3477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3477)

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

Defined in: [types/proxy.ts:3486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3486)

#### Parameters

##### message

`string`

#### Returns

`void`
