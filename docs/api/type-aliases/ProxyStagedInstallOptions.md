[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStagedInstallOptions

# Type Alias: ProxyStagedInstallOptions

> **ProxyStagedInstallOptions** = `object`

Defined in: [types/proxy.ts:4807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4807)

Bounded asynchronous package installation with injectable subprocesses.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:4808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4808)

---

### packagesDir

> **packagesDir**: `string`

Defined in: [types/proxy.ts:4809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4809)

---

### installer

> **installer**: `Pick`\<[`GlobalInstallerProbe`](GlobalInstallerProbe.md), `"kind"` \| `"bin"`\>

Defined in: [types/proxy.ts:4810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4810)

---

### idleTimeoutMs?

> `optional` **idleTimeoutMs?**: `number`

Defined in: [types/proxy.ts:4811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4811)

---

### maxDurationMs?

> `optional` **maxDurationMs?**: `number`

Defined in: [types/proxy.ts:4812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4812)

---

### killGraceMs?

> `optional` **killGraceMs?**: `number`

Defined in: [types/proxy.ts:4813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4813)

---

### spawn?

> `optional` **spawn?**: `spawn`

Defined in: [types/proxy.ts:4814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4814)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:4815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4815)

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

Defined in: [types/proxy.ts:4816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4816)

#### Parameters

##### progress

###### elapsedMs

`number`

###### outputBytes

`number`

#### Returns

`void`
