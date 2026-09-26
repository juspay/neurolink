[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:3319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3319)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:3320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3320)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:3321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3321)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:3322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3322)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:3323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3323)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:3324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3324)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:3325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3325)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3326)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
