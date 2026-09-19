[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3312)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3313)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3314)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3315)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3316)

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

Defined in: [types/proxy.ts:3320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3320)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3321)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3322)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3323)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3324)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3325)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3326)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3327)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3328)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3329)

#### Parameters

##### message

`string`

#### Returns

`void`
