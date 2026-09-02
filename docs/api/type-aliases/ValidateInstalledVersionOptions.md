[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2619)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2620)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2621)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2622)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2623)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2624)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2625)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2626)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
