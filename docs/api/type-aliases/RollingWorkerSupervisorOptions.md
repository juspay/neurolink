[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingWorkerSupervisorOptions

# Type Alias: RollingWorkerSupervisorOptions

> **RollingWorkerSupervisorOptions** = `object`

Defined in: [types/proxy.ts:3157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3157)

## Properties

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3158)

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

Defined in: [types/proxy.ts:3162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3162)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3163)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3165)

Bound IPC socket offers independently of active HTTP requests.

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3166)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3167)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3168)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3169)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### onReplacementRequested?

> `optional` **onReplacementRequested?**: (`request`) => `void`

Defined in: [types/proxy.ts:3170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3170)

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

Defined in: [types/proxy.ts:3179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3179)

#### Parameters

##### message

`string`

#### Returns

`void`
