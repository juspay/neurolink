[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RollingProxyServer

# Type Alias: RollingProxyServer

> **RollingProxyServer** = `object`

Defined in: [types/proxy.ts:2826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2826)

## Properties

### address

> **address**: `object`

Defined in: [types/proxy.ts:2827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2827)

#### host

> **host**: `string`

#### port

> **port**: `number`

---

### replace

> **replace**: (`expectedVersion`) => `Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

Defined in: [types/proxy.ts:2828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2828)

#### Parameters

##### expectedVersion

`string`

#### Returns

`Promise`\<[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)\>

---

### snapshot

> **snapshot**: () => [`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

Defined in: [types/proxy.ts:2831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2831)

#### Returns

[`RollingWorkerSupervisorSnapshot`](RollingWorkerSupervisorSnapshot.md)

---

### close

> **close**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2832)

#### Returns

`Promise`\<`void`\>
