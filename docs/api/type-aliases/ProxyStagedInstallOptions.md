[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStagedInstallOptions

# Type Alias: ProxyStagedInstallOptions

> **ProxyStagedInstallOptions** = `object`

Defined in: [types/proxy.ts:4904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4904)

Bounded asynchronous package installation with injectable subprocesses.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:4905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4905)

---

### packagesDir

> **packagesDir**: `string`

Defined in: [types/proxy.ts:4906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4906)

---

### installer

> **installer**: `Pick`\<[`GlobalInstallerProbe`](GlobalInstallerProbe.md), `"kind"` \| `"bin"`\>

Defined in: [types/proxy.ts:4907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4907)

---

### idleTimeoutMs?

> `optional` **idleTimeoutMs?**: `number`

Defined in: [types/proxy.ts:4908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4908)

---

### maxDurationMs?

> `optional` **maxDurationMs?**: `number`

Defined in: [types/proxy.ts:4909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4909)

---

### killGraceMs?

> `optional` **killGraceMs?**: `number`

Defined in: [types/proxy.ts:4910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4910)

---

### spawn?

> `optional` **spawn?**: `spawn`

Defined in: [types/proxy.ts:4911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4911)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:4912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4912)

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

Defined in: [types/proxy.ts:4913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4913)

#### Parameters

##### progress

###### elapsedMs

`number`

###### outputBytes

`number`

#### Returns

`void`
