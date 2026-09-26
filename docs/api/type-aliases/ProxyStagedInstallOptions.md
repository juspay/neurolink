[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStagedInstallOptions

# Type Alias: ProxyStagedInstallOptions

> **ProxyStagedInstallOptions** = `object`

Defined in: [types/proxy.ts:5059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5059)

Bounded asynchronous package installation with injectable subprocesses.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:5060](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5060)

---

### packagesDir

> **packagesDir**: `string`

Defined in: [types/proxy.ts:5061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5061)

---

### installer

> **installer**: `Pick`\<[`GlobalInstallerProbe`](GlobalInstallerProbe.md), `"kind"` \| `"bin"`\>

Defined in: [types/proxy.ts:5062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5062)

---

### idleTimeoutMs?

> `optional` **idleTimeoutMs?**: `number`

Defined in: [types/proxy.ts:5063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5063)

---

### maxDurationMs?

> `optional` **maxDurationMs?**: `number`

Defined in: [types/proxy.ts:5064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5064)

---

### killGraceMs?

> `optional` **killGraceMs?**: `number`

Defined in: [types/proxy.ts:5065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5065)

---

### spawn?

> `optional` **spawn?**: `spawn`

Defined in: [types/proxy.ts:5066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5066)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:5067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5067)

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

Defined in: [types/proxy.ts:5068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5068)

#### Parameters

##### progress

###### elapsedMs

`number`

###### outputBytes

`number`

#### Returns

`void`
