[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CobraInstance

# Type Alias: CobraInstance

> **CobraInstance** = `object`

Defined in: [types/server.ts:1498](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1498)

Structural type for Picovoice Cobra VAD instance.
Defined here so the optional `@picovoice/cobra-node` package
is not required at typecheck time.

## Properties

### frameLength

> **frameLength**: `number`

Defined in: [types/server.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1499)

---

### process

> **process**: (`pcm`) => `number`

Defined in: [types/server.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1500)

#### Parameters

##### pcm

`Int16Array`

#### Returns

`number`

---

### release

> **release**: () => `void`

Defined in: [types/server.ts:1501](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1501)

#### Returns

`void`
