[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:2841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2841)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:2842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2842)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:2843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2843)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:2846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2846)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2847)

#### Returns

`Promise`\<`void`\>
