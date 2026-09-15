[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2942)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2943)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2944)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2945)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2946)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2947)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2948)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2949)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
