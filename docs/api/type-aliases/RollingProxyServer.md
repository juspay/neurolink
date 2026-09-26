[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:3512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3512)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:3513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3513)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:3514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3514)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:3517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3517)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3518)

#### Returns

`Promise`\<`void`\>
