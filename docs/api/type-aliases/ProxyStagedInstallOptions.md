[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStagedInstallOptions

# Type Alias: ProxyStagedInstallOptions

> **ProxyStagedInstallOptions** = `object`

Bounded asynchronous package installation with injectable subprocesses.

## Properties

### version

> **version**: `string`

---

### packagesDir

> **packagesDir**: `string`

---

### installer

> **installer**: `Pick`\<[`GlobalInstallerProbe`](GlobalInstallerProbe.md), `"kind"` \| `"bin"`\>

---

### idleTimeoutMs?

> `optional` **idleTimeoutMs?**: `number`

---

### maxDurationMs?

> `optional` **maxDurationMs?**: `number`

---

### killGraceMs?

> `optional` **killGraceMs?**: `number`

---

### spawn?

> `optional` **spawn?**: `spawn`

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

---

### onProgress?

> `optional` **onProgress?**: (`progress`) => `void`

#### Parameters

##### progress

###### elapsedMs

`number`

###### outputBytes

`number`

#### Returns

`void`
