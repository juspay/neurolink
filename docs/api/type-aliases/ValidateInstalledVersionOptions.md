[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

---

### expectedVersion

> **expectedVersion**: `string`

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

---

### delayMs?

> `optional` **delayMs?**: `number`

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
