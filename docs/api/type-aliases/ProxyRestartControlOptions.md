[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRestartControlOptions

# Type Alias: ProxyRestartControlOptions

> **ProxyRestartControlOptions** = `object`

Defined in: [types/proxyRestart.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L53)

Supervisor-owned restart dependencies, injectable for isolated process tests.

## Properties

### stateDir

> **stateDir**: `string`

Defined in: [types/proxyRestart.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L54)

---

### server

> **server**: [`RollingProxyServer`](RollingProxyServer.md)

Defined in: [types/proxyRestart.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L55)

---

### getInstalledVersion

> **getInstalledVersion**: () => `Promise`\<`string` \| `undefined`\>

Defined in: [types/proxyRestart.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L56)

#### Returns

`Promise`\<`string` \| `undefined`\>

---

### isUpdatePending

> **isUpdatePending**: () => `boolean`

Defined in: [types/proxyRestart.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L57)

#### Returns

`boolean`

---

### getStatus

> **getStatus**: () => `Promise`\<`unknown`\>

Defined in: [types/proxyRestart.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L58)

#### Returns

`Promise`\<`unknown`\>

---

### log?

> `optional` **log?**: (`message`) => `void`

Defined in: [types/proxyRestart.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyRestart.ts#L60)

Report control-server errors without stopping the serving listener.

#### Parameters

##### message

`string`

#### Returns

`void`
