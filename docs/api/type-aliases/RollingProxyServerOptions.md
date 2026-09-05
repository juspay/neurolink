[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:2836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2836)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:2837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2837)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:2838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2838)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:2839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2839)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:2840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2840)

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

Defined in: [types/proxy.ts:2844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2844)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:2845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2845)

---

### maxPendingTransfers?

> `optional` **maxPendingTransfers?**: `number`

Defined in: [types/proxy.ts:2846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2846)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2847)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2848)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:2849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2849)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:2850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2850)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:2851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2851)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2852)

#### Parameters

##### message

`string`

#### Returns

`void`
