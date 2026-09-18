[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2967)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2968)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2969)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2970)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2971)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2972)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2973)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2974)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
