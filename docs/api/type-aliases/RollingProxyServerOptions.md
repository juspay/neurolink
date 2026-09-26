[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:3489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3489)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:3490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3490)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:3491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3491)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:3492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3492)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:3493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3493)

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

Defined in: [types/proxy.ts:3497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3497)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:3498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3498)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:3499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3499)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3500)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:3501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3501)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3502)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:3503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3503)

---

### stallReplacementDelayMs?

> `optional` **stallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3505)

Backoff after failed pressure-induced replacement, while old worker serves.

---

### maxStallReplacementDelayMs?

> `optional` **maxStallReplacementDelayMs?**: `number`

Defined in: [types/proxy.ts:3506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3506)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:3507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3507)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### onEvent?

> `optional` **onEvent?**: (`event`) => `void`

Defined in: [types/proxy.ts:3508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3508)

#### Parameters

##### event

[`RollingWorkerSupervisorEvent`](RollingWorkerSupervisorEvent.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:3509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3509)

#### Parameters

##### message

`string`

#### Returns

`void`
