[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:3202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3202)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:3203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3203)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:3204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3204)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:3207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3207)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3208)

#### Returns

`Promise`\<`void`\>
