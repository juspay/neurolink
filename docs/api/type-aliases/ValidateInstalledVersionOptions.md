[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2946)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2947)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2948)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2949)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2950)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2951)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2952)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2953)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
