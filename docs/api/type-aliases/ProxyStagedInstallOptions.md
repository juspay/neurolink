[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStagedInstallOptions

# Type Alias: ProxyStagedInstallOptions

> **ProxyStagedInstallOptions** = `object`

Defined in: [types/proxy.ts:5049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5049)

Bounded asynchronous package installation with injectable subprocesses.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:5050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5050)

---

### packagesDir

> **packagesDir**: `string`

Defined in: [types/proxy.ts:5051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5051)

---

### installer

> **installer**: `Pick`\<[`GlobalInstallerProbe`](GlobalInstallerProbe.md), `"kind"` \| `"bin"`\>

Defined in: [types/proxy.ts:5052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5052)

---

### idleTimeoutMs?

> `optional` **idleTimeoutMs?**: `number`

Defined in: [types/proxy.ts:5053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5053)

---

### maxDurationMs?

> `optional` **maxDurationMs?**: `number`

Defined in: [types/proxy.ts:5054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5054)

---

### killGraceMs?

> `optional` **killGraceMs?**: `number`

Defined in: [types/proxy.ts:5055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5055)

---

### spawn?

> `optional` **spawn?**: `spawn`

Defined in: [types/proxy.ts:5056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5056)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:5057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5057)

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

Defined in: [types/proxy.ts:5058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5058)

#### Parameters

##### progress

###### elapsedMs

`number`

###### outputBytes

`number`

#### Returns

`void`
