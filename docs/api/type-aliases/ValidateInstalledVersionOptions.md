[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2928)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2929)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2930)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2931)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2932)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2933)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2934)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2935)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
