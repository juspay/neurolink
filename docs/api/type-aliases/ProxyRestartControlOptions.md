[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRestartControlOptions

# Type Alias: ProxyRestartControlOptions

> **ProxyRestartControlOptions** = `object`

Supervisor-owned restart dependencies, injectable for isolated process tests.

## Properties

### stateDir

> **stateDir**: `string`

---

### server

> **server**: [`RollingProxyServer`](RollingProxyServer.md)

---

### getInstalledVersion

> **getInstalledVersion**: () => `Promise`\<`string` \| `undefined`\>

#### Returns

`Promise`\<`string` \| `undefined`\>

---

### isUpdatePending

> **isUpdatePending**: () => `boolean`

#### Returns

`boolean`

---

### getStatus

> **getStatus**: () => `Promise`\<`unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### getTelemetry?

> `optional` **getTelemetry?**: () => [`ProxyProcessTelemetrySnapshot`](ProxyProcessTelemetrySnapshot.md)

Current supervisor process evidence; never infer it from a worker/plist.

#### Returns

[`ProxyProcessTelemetrySnapshot`](ProxyProcessTelemetrySnapshot.md)

---

### log?

> `optional` **log?**: (`message`) => `void`

Report control-server errors without stopping the serving listener.

#### Parameters

##### message

`string`

#### Returns

`void`
