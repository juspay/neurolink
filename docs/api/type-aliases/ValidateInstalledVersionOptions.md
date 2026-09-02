[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2628)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2629)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2630)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2631)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2632)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2633)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2634)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2635)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
