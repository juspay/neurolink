[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStagedInstallOptions

# Type Alias: ProxyStagedInstallOptions

> **ProxyStagedInstallOptions** = `object`

Defined in: [types/proxy.ts:4999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4999)

Bounded asynchronous package installation with injectable subprocesses.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:5000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5000)

---

### packagesDir

> **packagesDir**: `string`

Defined in: [types/proxy.ts:5001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5001)

---

### installer

> **installer**: `Pick`\<[`GlobalInstallerProbe`](GlobalInstallerProbe.md), `"kind"` \| `"bin"`\>

Defined in: [types/proxy.ts:5002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5002)

---

### idleTimeoutMs?

> `optional` **idleTimeoutMs?**: `number`

Defined in: [types/proxy.ts:5003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5003)

---

### maxDurationMs?

> `optional` **maxDurationMs?**: `number`

Defined in: [types/proxy.ts:5004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5004)

---

### killGraceMs?

> `optional` **killGraceMs?**: `number`

Defined in: [types/proxy.ts:5005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5005)

---

### spawn?

> `optional` **spawn?**: `spawn`

Defined in: [types/proxy.ts:5006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5006)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:5007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5007)

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

Defined in: [types/proxy.ts:5008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L5008)

#### Parameters

##### progress

###### elapsedMs

`number`

###### outputBytes

`number`

#### Returns

`void`
