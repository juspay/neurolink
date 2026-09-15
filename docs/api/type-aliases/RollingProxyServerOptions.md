[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3157)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3158)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3159)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3160)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3161)

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

Defined in: [types/proxy.ts:3165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3165)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3166)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3167)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3168)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3169)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3170)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3171)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3172)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3173)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3174)

#### Parameters

##### message

`string`

#### Returns

`void`
