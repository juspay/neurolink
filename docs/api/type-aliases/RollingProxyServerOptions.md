[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServerOptions

# Type Alias: RollingProxyServerOptions

> **RollingProxyServerOptions** = `object`

Defined in: [types/proxy.ts:2808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2808)

## Properties

### host

> **host**: `string`

Defined in: [types/proxy.ts:2809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2809)

---

### port

> **port**: `number`

Defined in: [types/proxy.ts:2810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2810)

---

### initialVersion

> **initialVersion**: `string`

Defined in: [types/proxy.ts:2811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2811)

---

### spawnWorker

> **spawnWorker**: (`generation`, `expectedVersion`) => [`RollingWorkerHandle`](RollingWorkerHandle.md)

Defined in: [types/proxy.ts:2812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2812)

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

Defined in: [types/proxy.ts:2816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2816)

---

### socketQueueLimit?

> `optional` **socketQueueLimit?**: `number`

Defined in: [types/proxy.ts:2817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2817)

---

### socketQueueTimeoutMs?

> `optional` **socketQueueTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2818)

---

### shutdownTimeoutMs?

> `optional` **shutdownTimeoutMs?**: `number`

Defined in: [types/proxy.ts:2819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2819)

---

### recoveryDelayMs?

> `optional` **recoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:2820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2820)

---

### maxRecoveryDelayMs?

> `optional` **maxRecoveryDelayMs?**: `number`

Defined in: [types/proxy.ts:2821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2821)

---

### onStateChange?

> `optional` **onStateChange?**: (`snapshot`) => `void`

Defined in: [types/proxy.ts:2822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2822)

#### Parameters

##### snapshot

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

#### Returns

`void`

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxy.ts:2823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2823)

#### Parameters

##### message

`string`

#### Returns

`void`
