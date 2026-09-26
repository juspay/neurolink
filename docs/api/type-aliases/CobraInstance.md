[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CobraInstance

# Type Alias: CobraInstance

> **CobraInstance** = `object`

Structural type for Picovoice Cobra VAD instance.
Defined here so the optional `@picovoice/cobra-node` package
is not required at typecheck time.

## Properties

### frameLength

> **frameLength**: `number`

---

### process

> **process**: (`pcm`) => `number`

#### Parameters

##### pcm

`Int16Array`

#### Returns

`number`

---

### release

> **release**: () => `void`

#### Returns

`void`
