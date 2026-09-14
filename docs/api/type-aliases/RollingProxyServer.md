[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:3163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3163)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:3164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3164)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:3165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3165)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:3168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3168)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3169)

#### Returns

`Promise`\<`void`\>
