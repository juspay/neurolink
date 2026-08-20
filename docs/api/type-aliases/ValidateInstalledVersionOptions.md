[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:2530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2530)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:2531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2531)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:2532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2532)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:2533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2533)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:2534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2534)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:2535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2535)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:2536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2536)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:2537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2537)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
