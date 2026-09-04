[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2634)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2635)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2636)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2637)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2638)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2639)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2640)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2641)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
