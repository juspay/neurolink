[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2597](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2597)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2598)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2599)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2600)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2601)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2602)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2603)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2604)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
