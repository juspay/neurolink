[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:3510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3510)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:3511](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3511)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:3512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3512)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:3515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3515)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3516)

#### Returns

`Promise`\<`void`\>
