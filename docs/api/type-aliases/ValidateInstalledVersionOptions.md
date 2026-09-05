[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2635)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2636)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2637)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2638)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2639)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2640)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2641)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2642)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
