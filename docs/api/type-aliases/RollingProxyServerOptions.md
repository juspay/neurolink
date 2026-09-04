[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:2823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2823)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:2824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2824)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:2825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2825)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:2826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2826)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:2827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2827)

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

Defined in: [types/proxy.ts:2831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2831)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:2832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2832)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2833)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2834)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:2835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2835)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:2836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2836)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:2837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2837)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2838)

#### Parameters

##### message

`string`

#### Returns

`void`
