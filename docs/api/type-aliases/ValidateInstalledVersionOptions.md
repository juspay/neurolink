[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:3192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3192)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:3193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3193)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:3194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3194)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:3195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3195)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:3196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3196)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:3197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3197)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:3198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3198)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3199)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
