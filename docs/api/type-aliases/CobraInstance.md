[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CobraInstance

# Type Alias: CobraInstance

> **CobraInstance** = `object`

Defined in: [types/server.ts:1479](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1479)

Structural type for Picovoice Cobra VAD instance.
Defined here so the optional `@picovoice/cobra-node` package
is not required at typecheck time.

## Properties

### frameLength

> **frameLength**: `number`

Defined in: [types/server.ts:1480](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1480)

---

### process

> **process**: (`pcm`) => `number`

Defined in: [types/server.ts:1481](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1481)

#### Parameters

##### pcm

`Int16Array`

#### Returns

`number`

---

### release

> **release**: () => `void`

Defined in: [types/server.ts:1482](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1482)

#### Returns

`void`
