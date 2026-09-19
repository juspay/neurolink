[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:3332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3332)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:3333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3333)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:3334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3334)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:3337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3337)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3338)

#### Returns

`Promise`\<`void`\>
