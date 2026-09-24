[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStagedInstallOptions

# Type Alias: ProxyStagedInstallOptions

> **ProxyStagedInstallOptions** = `object`

Defined in: [types/proxy.ts:4927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4927)

Bounded asynchronous package installation with injectable subprocesses.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:4928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4928)

---

### packagesDir

> **packagesDir**: `string`

Defined in: [types/proxy.ts:4929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4929)

---

### installer

> **installer**: `Pick`\<[`GlobalInstallerProbe`](GlobalInstallerProbe.md), `"kind"` \| `"bin"`\>

Defined in: [types/proxy.ts:4930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4930)

---

### idleTimeoutMs?

> `optional` **idleTimeoutMs?**: `number`

Defined in: [types/proxy.ts:4931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4931)

---

### maxDurationMs?

> `optional` **maxDurationMs?**: `number`

Defined in: [types/proxy.ts:4932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4932)

---

### killGraceMs?

> `optional` **killGraceMs?**: `number`

Defined in: [types/proxy.ts:4933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4933)

---

### spawn?

> `optional` **spawn?**: `spawn`

Defined in: [types/proxy.ts:4934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4934)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:4935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4935)

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

Defined in: [types/proxy.ts:4936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4936)

#### Parameters

##### progress

###### elapsedMs

`number`

###### outputBytes

`number`

#### Returns

`void`
