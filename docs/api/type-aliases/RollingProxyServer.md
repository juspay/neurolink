[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:3422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3422)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:3423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3423)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:3424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3424)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:3427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3427)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3428)

#### Returns

`Promise`\<`void`\>
