[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:3169](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3169)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:3170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3170)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:3171](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3171)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:3172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3172)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:3173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3173)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:3174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3174)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:3175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3175)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3176)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
