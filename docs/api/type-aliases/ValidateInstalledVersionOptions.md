[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidateInstalledVersionOptions

# Type Alias: ValidateInstalledVersionOptions

> **ValidateInstalledVersionOptions** = `object`

Defined in: [types/proxy.ts:3259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3259)

Options for validating a newly installed CLI through its stable executable.

## Properties

### binPath

> **binPath**: `string`

Defined in: [types/proxy.ts:3260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3260)

---

### expectedVersion

> **expectedVersion**: `string`

Defined in: [types/proxy.ts:3261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3261)

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/proxy.ts:3262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3262)

---

### delayMs?

> `optional` **delayMs?**: `number`

Defined in: [types/proxy.ts:3263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3263)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/proxy.ts:3264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3264)

---

### execFileSync?

> `optional` **execFileSync?**: [`GlobalInstallerExecFile`](GlobalInstallerExecFile.md)

Defined in: [types/proxy.ts:3265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3265)

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3266)

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
