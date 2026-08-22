[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CobraInstance

# Type Alias: CobraInstance

> **CobraInstance** = `object`

Defined in: [types/server.ts:1489](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1489)

Structural type for Picovoice Cobra VAD instance.
Defined here so the optional `@picovoice/cobra-node` package
is not required at typecheck time.

## Properties

### frameLength

> **frameLength**: `number`

Defined in: [types/server.ts:1490](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1490)

---

### process

> **process**: (`pcm`) => `number`

Defined in: [types/server.ts:1491](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1491)

#### Parameters

##### pcm

`Int16Array`

#### Returns

`number`

---

### release

> **release**: () => `void`

Defined in: [types/server.ts:1492](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1492)

#### Returns

`void`
