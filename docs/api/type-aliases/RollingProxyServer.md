[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:2737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2737)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:2738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2738)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:2739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2739)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:2742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2742)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2743)

#### Returns

`Promise`\<`void`\>
