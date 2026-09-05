[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:2855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2855)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:2856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2856)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:2857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2857)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:2860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2860)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2861)

#### Returns

`Promise`\<`void`\>
