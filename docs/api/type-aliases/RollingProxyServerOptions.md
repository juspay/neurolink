[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3161)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3162)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3163)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3164)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3165)

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

Defined in: [types/proxy.ts:3169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3169)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3170)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3171)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3172)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3173)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3174)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3175)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3176)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3177)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3178)

#### Parameters

##### message

`string`

#### Returns

`void`
