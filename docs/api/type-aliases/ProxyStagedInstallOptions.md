[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStagedInstallOptions

# Type Alias: ProxyStagedInstallOptions

> **ProxyStagedInstallOptions** = `object`

Defined in: [types/proxy.ts:4924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4924)

Bounded asynchronous package installation with injectable subprocesses.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:4925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4925)

---

### packagesDir

> **packagesDir**: `string`

Defined in: [types/proxy.ts:4926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4926)

---

### installer

> **installer**: `Pick`\<[`GlobalInstallerProbe`](GlobalInstallerProbe.md), `"kind"` \| `"bin"`\>

Defined in: [types/proxy.ts:4927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4927)

---

### idleTimeoutMs?

> `optional` **idleTimeoutMs?**: `number`

Defined in: [types/proxy.ts:4928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4928)

---

### maxDurationMs?

> `optional` **maxDurationMs?**: `number`

Defined in: [types/proxy.ts:4929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4929)

---

### killGraceMs?

> `optional` **killGraceMs?**: `number`

Defined in: [types/proxy.ts:4930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4930)

---

### spawn?

> `optional` **spawn?**: `spawn`

Defined in: [types/proxy.ts:4931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4931)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:4932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4932)

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

Defined in: [types/proxy.ts:4933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4933)

#### Parameters

##### progress

###### elapsedMs

`number`

###### outputBytes

`number`

#### Returns

`void`
