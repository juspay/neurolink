[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2640)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2641)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2642)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2643)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2644)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2645)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2646)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2647)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
