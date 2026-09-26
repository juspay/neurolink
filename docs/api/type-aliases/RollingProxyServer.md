[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:3572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3572)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:3573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3573)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:3574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3574)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:3577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3577)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3578)

#### Returns

`Promise`\<`void`\>
